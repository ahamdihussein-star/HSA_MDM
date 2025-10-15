// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
const axios = require('axios');
const https = require('https');
const xml2js = require('xml2js');
const csvParse = require('csv-parse/sync');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ==========================================
// Environment Configuration
// ==========================================
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_REAL_APIS = process.env.USE_REAL_SANCTIONS_APIS !== 'false'; // Default true

// OpenAI API Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Initialize OpenAI client
let openai = null;
if (OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
  console.log('✅ [SERVER] OpenAI client initialized');
  console.log('✅ [SERVER] OpenAI API Key loaded:', OPENAI_API_KEY.substring(0, 20) + '...' + OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4));
} else {
  console.warn('⚠️ [SERVER] OpenAI API Key NOT found in environment variables');
}

// OpenSanctions API Configuration  
const OPENSANCTIONS_API_KEY = process.env.OPENSANCTIONS_API_KEY;

if (OPENSANCTIONS_API_KEY) {
  console.log('✅ [SERVER] OpenSanctions API Key configured');
} else {
  console.warn('⚠️ [SERVER] OpenSanctions API Key NOT configured');
  console.warn('   📝 To get real sanctions data, register at: https://www.opensanctions.org/api/');
  console.warn('   📝 Free 30-day trial available. Add OPENSANCTIONS_API_KEY to .env file');
}

// ==========================================
// SSL Configuration for Development
// ==========================================
const isDevelopment = NODE_ENV === 'development';

// ✅ Create axios instance with proper SSL handling
const axiosInstance = axios.create({
  timeout: 30000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: !isDevelopment, // ⚠️ Disable SSL verification in dev only
    keepAlive: true,
    maxSockets: 10
  }),
  headers: {
    'User-Agent': 'Compliance-Agent/1.0 (MDM-System)',
    'Accept': 'application/json, application/xml, text/csv'
  }
});

// ==========================================
// External APIs Configuration
// ==========================================
const EXTERNAL_APIS = {
  OPENSANCTIONS: {
    name: 'OpenSanctions',
    baseUrl: 'https://api.opensanctions.org',
    searchEndpoint: '/search/default',  // ✅ Fixed: No /api/v1 prefix
    timeout: 15000,  // ⚡ Reduced from 20s to 15s for faster timeout
    enabled: true,
    requiresAuth: false,  // ✅ No API key needed
    retries: 1,  // ⚡ Reduced from 2 to 1 retry to save API calls (with cache, fewer retries needed)
    params: {
      limit: 5,  // ⚡ Reduced from 10 to 5 for faster response (most relevant matches are in top 5)
      fuzzy: true,
      schema: 'Company'  // ⚡ Filter: Only companies (excludes Persons, Vessels, etc.)
    }
  },
  
  OFAC: {
    name: 'OFAC (US Treasury)',
    baseUrl: 'https://www.treasury.gov',
    searchEndpoint: '/ofac/downloads/sdn.xml',
    timeout: 30000,
    enabled: false,  // ⚡ Available as fallback - User can enable on-demand if OpenSanctions fails
    requiresAuth: false,
    retries: 2,
    fallbackOnly: true  // ✅ Only use as fallback when OpenSanctions fails
  },
  
  EU_SANCTIONS: {
    name: 'EU Financial Sanctions',
    baseUrl: 'https://webgate.ec.europa.eu',
    searchEndpoint: '/fsd/fsf/public/files/xmlFullSanctionsList/content',
    timeout: 25000,
    enabled: false,  // ⚡ Available as fallback - User can enable on-demand if OpenSanctions fails
    requiresAuth: false,
    retries: 2,
    fallbackOnly: true,  // ✅ Only use as fallback when OpenSanctions fails
    params: {
      token: 'dG9rZW4tMjAxNw'
    }
  }
};

console.log('🌐 [SERVER] Sanctions APIs Configuration:');
console.log('  - Environment:', NODE_ENV);
console.log('  - Use Real APIs:', USE_REAL_APIS);
console.log('  - SSL Verification:', !isDevelopment ? '✅ Enabled' : '⚠️ Disabled (Dev)');
Object.entries(EXTERNAL_APIS).forEach(([key, config]) => {
  if (config.enabled) {
    console.log(`  - ${config.name}: ✅ Enabled`);
  }
});

console.log('🌐 [SERVER] Base URL:', BASE_URL);

// ✅ NEW: File upload configuration with date-based folder structure
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sessionId = req.body.sessionId || 'temp';
    const uploadPath = path.join(UPLOADS_DIR, today, sessionId);
    
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      console.log(`📁 [FILE UPLOAD] Created directory: ${uploadPath}`);
      cb(null, uploadPath);
    } catch (error) {
      console.error(`❌ [FILE UPLOAD] Error creating directory: ${error.message}`);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const documentId = `doc_${Date.now()}_${nanoid(8)}`;
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${documentId}_${originalName}`;
    console.log(`📁 [FILE UPLOAD] Generated filename: ${fileName}`);
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    console.log(`🔍 [MULTER FILTER] File received:`, {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Only allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      console.log(`✅ [MULTER FILTER] File accepted: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`❌ [MULTER FILTER] File rejected: ${file.originalname} (type: ${file.mimetype})`);
      cb(new Error('Only images and PDF files are allowed!'), false);
    }
  }
});

// Enhanced Middlewares with better limits
app.use(cors());

// ✅ REQUEST LOGGING MIDDLEWARE
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/uploads', express.static(UPLOADS_DIR)); // ✅ NEW: Serve uploaded files
app.use(express.json({ 
  limit: '20mb',  // Reduced from 50mb for stability
  verify: (req, res, buf) => {
    // Log large requests
    if (buf.length > 5 * 1024 * 1024) { // 5MB
      console.log(`⚠️ Large request: ${(buf.length / 1024 / 1024).toFixed(2)}MB`);
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
// Static hosting for uploaded avatars
try {
  const fs = require('fs');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
    console.log('📁 Created uploads directory:', UPLOADS_DIR);
  } else {
    console.log('📁 Uploads directory exists:', UPLOADS_DIR);
  }
  app.use('/uploads', express.static(UPLOADS_DIR));
  console.log('🌐 Static file serving configured for /uploads');
} catch (e) {
  console.error('Failed to prepare uploads dir', e);
}

// Add timeout middleware
app.use((req, res, next) => {
  // Set timeout for all requests
  req.setTimeout(30000, () => { // 30 seconds
    console.error('Request timeout');
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// Request Logger
app.use((req, res, next) => {
  const started = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (['POST','PUT','PATCH'].includes(req.method) && req.body) {
    const bodySize = JSON.stringify(req.body).length;
    console.log(`  Body size: ${(bodySize/1024).toFixed(2)}KB`);
  }
  res.on('finish', () => {
    console.log(`  -> ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});

// Database Setup
const dbPath = path.join(__dirname, 'mdm_database.db');
console.log('Database location:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000'); // Add 5 second timeout
db.pragma('cache_size = -10000');  // 10MB cache

console.log('Connected to SQLite database');

// Initialize Database Schema

// Helper function to build complete contact string

// Helper function to compare contacts
function compareContacts(oldContact, newContact) {
    const fields = ['name', 'nameAr', 'jobTitle', 'jobTitleAr', 
                   'email', 'mobile', 'landline', 'preferredLanguage'];
    
    const changes = [];
    fields.forEach(field => {
        if (oldContact[field] !== newContact[field]) {
            changes.push({
                field,
                oldValue: oldContact[field],
                newValue: newContact[field]
            });
        }
    });
    
    return changes;
}


function buildContactString(contact) {
    return [
        contact.name || '',
        contact.jobTitle || '',
        contact.email || '',
        contact.mobile || '',
        contact.landline || '',
        contact.preferredLanguage || ''
    ].join(' | ');
}

function initializeDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('data_entry', 'reviewer', 'compliance', 'admin')),
      fullName TEXT,
      email TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      avatarUrl TEXT
    )
  `);
  console.log('Users table ready');

  // Ensure avatarUrl column exists (for legacy DBs)
  try {
    const cols = db.prepare("PRAGMA table_info(users)").all();
    const hasAvatar = cols.some(c => c.name === 'avatarUrl');
    if (!hasAvatar) {
      db.prepare('ALTER TABLE users ADD COLUMN avatarUrl TEXT').run();
      console.log('users.avatarUrl column added');
    }
  } catch (e) {
    console.warn('Could not ensure users.avatarUrl column:', e.message);
  }

  // 2. Requests Table - UPDATED WITH originalRequestType
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      requestId TEXT,
      
      -- Company Info
      firstName TEXT,
      firstNameAr TEXT,
      tax TEXT,
      CustomerType TEXT,
      CompanyOwner TEXT,
      
      -- Address
      buildingNumber TEXT,
      street TEXT,
      country TEXT,
      city TEXT,
      
      -- Primary Contact
      ContactName TEXT,
      EmailAddress TEXT,
      MobileNumber TEXT,
      JobTitle TEXT,
      Landline TEXT,
      PrefferedLanguage TEXT,
      
      -- Sales Info
      SalesOrgOption TEXT,
      DistributionChannelOption TEXT,
      DivisionOption TEXT,
      
      -- Status & Workflow
      status TEXT DEFAULT 'Pending',
      ComplianceStatus TEXT,
      companyStatus TEXT,
      assignedTo TEXT DEFAULT 'reviewer',
      
      -- Rejection/Block Info
      rejectReason TEXT,
      blockReason TEXT,
      IssueDescription TEXT,
      
      -- System Fields
      origin TEXT DEFAULT 'dataEntry',
      sourceSystem TEXT DEFAULT 'Data Steward',
      isGolden INTEGER DEFAULT 0,
      goldenRecordCode TEXT,
      
      -- User tracking
      createdBy TEXT,
      reviewedBy TEXT,
      complianceBy TEXT,
      
      -- Timestamps
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME,
      
      -- Duplicate linking & Golden Edit Support
      masterId TEXT,
      isMaster INTEGER DEFAULT 0,
      confidence REAL,
      sourceGoldenId TEXT,
      notes TEXT,
      
      -- Master Record Builder Support
      builtFromRecords TEXT,
      selectedFieldSources TEXT,
      buildStrategy TEXT,
      
      -- Merge Support
      isMerged INTEGER DEFAULT 0,
      mergedIntoId TEXT,
      
      -- Request Type - UPDATED
      requestType TEXT,
      originalRequestType TEXT
    )
  `);
  console.log('Requests table ready');

  // 3. Contacts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId TEXT NOT NULL,
      name TEXT,
      jobTitle TEXT,
      email TEXT,
      mobile TEXT,
      landline TEXT,
      preferredLanguage TEXT,
      isPrimary INTEGER DEFAULT 0,
      source TEXT,
      addedBy TEXT,
      addedWhen DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
    )
  `);
  console.log('Contacts table ready');

  // 4. Documents Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId TEXT NOT NULL,
      documentId TEXT UNIQUE,
      name TEXT,
      type TEXT,
      description TEXT,
      size INTEGER,
      mime TEXT,
      contentBase64 TEXT,
      document_path TEXT,
      source TEXT,
      uploadedBy TEXT,
      uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
    )
  `);
  console.log('Documents table ready');

  // 5. Workflow History
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId TEXT NOT NULL,
      action TEXT,
      fromStatus TEXT,
      toStatus TEXT,
      performedBy TEXT,
      performedByRole TEXT,
      note TEXT,
      payload TEXT,
      performedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
    )
  `);
  console.log('Workflow history table ready');

  // 6. Issues Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId TEXT NOT NULL,
      description TEXT,
      reviewedBy TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved INTEGER DEFAULT 0,
      FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
    )
  `);
  console.log('Issues table ready');

  // Create sync tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      targetSystem TEXT NOT NULL, -- 'oracle_forms', 'sap_4hana', 'sap_bydesign'
      syncDirection TEXT DEFAULT 'outbound', -- 'outbound', 'inbound', 'bidirectional'
      filterCriteria TEXT, -- JSON string with filter conditions
      fieldMapping TEXT, -- JSON string with field mappings
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdBy TEXT,
      updatedAt DATETIME,
      updatedBy TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ruleId INTEGER,
      targetSystem TEXT NOT NULL,
      syncType TEXT, -- 'manual', 'scheduled'
      status TEXT, -- 'pending', 'in_progress', 'completed', 'failed', 'partial'
      totalRecords INTEGER DEFAULT 0,
      syncedRecords INTEGER DEFAULT 0,
      failedRecords INTEGER DEFAULT 0,
      startedAt DATETIME,
      completedAt DATETIME,
      executedBy TEXT,
      errorDetails TEXT, -- JSON string with error details
      FOREIGN KEY (ruleId) REFERENCES sync_rules(id)
    );

    CREATE TABLE IF NOT EXISTS sync_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operationId INTEGER NOT NULL,
      requestId TEXT NOT NULL,
      targetSystem TEXT NOT NULL,
      syncStatus TEXT, -- 'success', 'failed', 'skipped'
      targetRecordId TEXT, -- ID in the target system
      syncedAt DATETIME,
      errorMessage TEXT,
      responseData TEXT, -- JSON response from target system
      FOREIGN KEY (operationId) REFERENCES sync_operations(id),
      FOREIGN KEY (requestId) REFERENCES requests(id)
    );
  `);
  console.log('Sync tables ready');

  // Add sync columns to requests table if they don't exist
  try {
    db.exec(`ALTER TABLE requests ADD COLUMN lastSyncedAt DATETIME;`);
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE requests ADD COLUMN syncStatus TEXT DEFAULT 'not_synced';`);
  } catch (e) {
    // Column already exists
  }

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_origin ON requests(origin);
    CREATE INDEX IF NOT EXISTS idx_requests_assignedTo ON requests(assignedTo);
    CREATE INDEX IF NOT EXISTS idx_requests_sourceSystem ON requests(sourceSystem);
    CREATE INDEX IF NOT EXISTS idx_requests_isGolden ON requests(isGolden);
    CREATE INDEX IF NOT EXISTS idx_requests_createdBy ON requests(createdBy);
    CREATE INDEX IF NOT EXISTS idx_requests_tax ON requests(tax);
    CREATE INDEX IF NOT EXISTS idx_requests_masterId ON requests(masterId);
    CREATE INDEX IF NOT EXISTS idx_requests_isMaster ON requests(isMaster);
    CREATE INDEX IF NOT EXISTS idx_requests_requestType ON requests(requestType);
    CREATE INDEX IF NOT EXISTS idx_requests_originalRequestType ON requests(originalRequestType);
    CREATE INDEX IF NOT EXISTS idx_workflow_requestId ON workflow_history(requestId);
    CREATE INDEX IF NOT EXISTS idx_contacts_requestId ON contacts(requestId);
    CREATE INDEX IF NOT EXISTS idx_documents_requestId ON documents(requestId);
    CREATE INDEX IF NOT EXISTS idx_issues_requestId ON issues(requestId);
    CREATE INDEX IF NOT EXISTS idx_requests_sync_status ON requests(syncStatus);
    CREATE INDEX IF NOT EXISTS idx_requests_last_synced ON requests(lastSyncedAt);
    CREATE INDEX IF NOT EXISTS idx_sync_rules_system ON sync_rules(targetSystem);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
    CREATE INDEX IF NOT EXISTS idx_sync_operations_system ON sync_operations(targetSystem);
    CREATE INDEX IF NOT EXISTS idx_sync_records_operation ON sync_records(operationId);
    CREATE INDEX IF NOT EXISTS idx_sync_records_request ON sync_records(requestId);
  `);
  // 7. Notifications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      companyName TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('rejected', 'approved', 'pending', 'quarantine')),
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      isRead INTEGER DEFAULT 0,
      taskId TEXT NOT NULL,
      userRole TEXT NOT NULL CHECK(userRole IN ('data-entry', 'reviewer', 'compliance')),
      requestType TEXT NOT NULL CHECK(requestType IN ('new', 'review', 'compliance')),
      fromUser TEXT,
      toUser TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Notifications table ready');

  // 8. Unified Sanctions Database Schema (OFAC + EU + UK + UN)
  // ═══════════════════════════════════════════════════════════════════
  db.exec(`
    -- Main entities table (Unified: supports OFAC, EU, UK, UN)
    CREATE TABLE IF NOT EXISTS ofac_entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE NOT NULL,                    -- Unique ID (OFAC-12345, EU-67890, UK-111, UN-222)
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 Source: OFAC, EU, UK, UN
      source_id TEXT,                              -- Original ID in source system
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Entity', 'Individual', 'Organization', 'Vessel', 'Aircraft')),
      sector TEXT CHECK(sector IN ('Food & Agriculture', 'Construction', NULL)),
      listed_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source, source_id)                    -- Prevent duplicates per source
    );

    -- Countries (with source tracking)
    CREATE TABLE IF NOT EXISTS entity_countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_uid TEXT NOT NULL,
      country TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 Track which source provided this country
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
    );

    -- Programs (SDN, SDGT, etc.)
    CREATE TABLE IF NOT EXISTS entity_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_uid TEXT NOT NULL,
      program TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 Track program source
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
    );

    -- Legal Basis (Executive Orders, etc.)
    CREATE TABLE IF NOT EXISTS entity_legal_basis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_uid TEXT NOT NULL,
      legal_basis TEXT NOT NULL,
      reason TEXT,
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 Track source
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
    );

    -- Aliases (alternative names)
    CREATE TABLE IF NOT EXISTS entity_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_uid TEXT NOT NULL,
      alias TEXT NOT NULL,
      alias_type TEXT,
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 Track which source provided this alias
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
    );

    -- Addresses
    CREATE TABLE IF NOT EXISTS entity_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_uid TEXT NOT NULL,
      address TEXT NOT NULL,
      country TEXT,
      city TEXT,
      street TEXT,
      province TEXT,
      postal_code TEXT,
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 Track address source
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
    );

    -- ID Numbers (registration numbers, tax IDs, etc.)
    CREATE TABLE IF NOT EXISTS entity_id_numbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_uid TEXT NOT NULL,
      id_type TEXT NOT NULL,
      id_number TEXT NOT NULL,
      issuing_authority TEXT,
      issuing_country TEXT,
      issued_date TEXT,
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 Track ID source
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
    );

    -- Remarks (additional information)
    CREATE TABLE IF NOT EXISTS entity_remarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_uid TEXT NOT NULL,
      remark TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 Track remark source
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
    );

    -- Sanctions Entry (links entity to sanctions info)
    CREATE TABLE IF NOT EXISTS sanctions_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL UNIQUE,              -- SanctionsEntry ID from XML
      profile_id TEXT NOT NULL,                    -- ProfileID from XML
      entity_uid TEXT NOT NULL,                    -- Link to ofac_entities
      list_id TEXT,                                -- ListID (e.g., SDN, SSI, etc.)
      entry_event_date TEXT,                       -- Date when entity was added to list
      entry_event_type_id TEXT,                    -- Type of entry event
      legal_basis_id TEXT,                         -- Legal basis for sanctions
      entry_event_comment TEXT,                    -- Additional comments
      source TEXT NOT NULL DEFAULT 'OFAC',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE
    );

    -- Sanctions Measures (types of sanctions imposed)
    CREATE TABLE IF NOT EXISTS sanctions_measures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL,                      -- Link to sanctions_entry
      measure_id TEXT NOT NULL,                    -- Measure ID from XML
      sanctions_type_id TEXT NOT NULL,             -- Type ID (e.g., 1=travel ban, 2=asset freeze)
      sanctions_type_name TEXT,                    -- Human-readable type name
      date_period_start TEXT,                      -- When sanction started
      date_period_end TEXT,                        -- When sanction ends (if applicable)
      comment TEXT,                                -- Additional comments
      source TEXT NOT NULL DEFAULT 'OFAC',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entry_id) REFERENCES sanctions_entry(entry_id) ON DELETE CASCADE
    );

    -- Sync metadata (per source)
    CREATE TABLE IF NOT EXISTS ofac_sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL DEFAULT 'OFAC',         -- 🔥 OFAC, EU, UK, UN
      last_sync_date DATETIME,
      total_entities INTEGER DEFAULT 0,
      filtered_entities INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Source tracking summary (useful for queries)
    CREATE TABLE IF NOT EXISTS entity_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_uid TEXT NOT NULL,
      source TEXT NOT NULL,                        -- OFAC, EU, UK, UN
      first_seen_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_updated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,                 -- 1=active, 0=removed from source
      FOREIGN KEY (entity_uid) REFERENCES ofac_entities(uid) ON DELETE CASCADE,
      UNIQUE(entity_uid, source)                   -- One entry per entity per source
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_ofac_uid ON ofac_entities(uid);
    CREATE INDEX IF NOT EXISTS idx_ofac_source ON ofac_entities(source);
    CREATE INDEX IF NOT EXISTS idx_ofac_source_id ON ofac_entities(source, source_id);
    CREATE INDEX IF NOT EXISTS idx_ofac_sector ON ofac_entities(sector);
    CREATE INDEX IF NOT EXISTS idx_ofac_name ON ofac_entities(name);
    CREATE INDEX IF NOT EXISTS idx_country ON entity_countries(country);
    CREATE INDEX IF NOT EXISTS idx_country_source ON entity_countries(source);
    CREATE INDEX IF NOT EXISTS idx_entity_country ON entity_countries(entity_uid);
    CREATE INDEX IF NOT EXISTS idx_program ON entity_programs(program);
    CREATE INDEX IF NOT EXISTS idx_program_source ON entity_programs(source);
    CREATE INDEX IF NOT EXISTS idx_alias ON entity_aliases(alias);
    CREATE INDEX IF NOT EXISTS idx_alias_source ON entity_aliases(source);
    CREATE INDEX IF NOT EXISTS idx_id_number ON entity_id_numbers(id_number);
    CREATE INDEX IF NOT EXISTS idx_remark ON entity_remarks(remark);
    CREATE INDEX IF NOT EXISTS idx_entity_sources ON entity_sources(entity_uid);
    CREATE INDEX IF NOT EXISTS idx_source_filter ON entity_sources(source, is_active);
    CREATE INDEX IF NOT EXISTS idx_sanctions_entry_uid ON sanctions_entry(entity_uid);
    CREATE INDEX IF NOT EXISTS idx_sanctions_entry_id ON sanctions_entry(entry_id);
    CREATE INDEX IF NOT EXISTS idx_sanctions_measures_entry ON sanctions_measures(entry_id);
  `);
  console.log('✅ Unified Sanctions tables ready (OFAC + EU + UK + UN support)');

  // Create indexes for notifications
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
    CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications(isRead);
    CREATE INDEX IF NOT EXISTS idx_notifications_taskId ON notifications(taskId);
    CREATE INDEX IF NOT EXISTS idx_notifications_userRole ON notifications(userRole);
    CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp);
  `);
  console.log('Notification indexes created');

  console.log('Indexes created for optimal performance');

  // Insert default users
  insertDefaultUsers();
  
  // Insert sample data
  insertSampleData();
  
  // Insert default sync rules
  insertDefaultSyncRules();
  insertSampleSyncRules();
}

function insertDefaultSyncRules() {
  const count = db.prepare("SELECT COUNT(*) as count FROM sync_rules").get();
  
  if (count.count === 0) {
    console.log('Creating default sync rules...');
    
    const defaultRules = [
      {
        name: 'Oracle Forms - Customer Sync',
        description: 'Sync customer data to Oracle Forms system',
        targetSystem: 'oracle_forms',
        syncDirection: 'outbound',
        filterCriteria: JSON.stringify({
          customerType: ['Limited Liability Company', 'Joint Stock Company'],
          status: 'Active',
          country: ['Saudi Arabia', 'Egypt', 'United Arab Emirates']
        }),
        fieldMapping: JSON.stringify({
          'firstName': 'CUSTOMER_NAME',
          'tax': 'TAX_NUMBER',
          'country': 'COUNTRY_CODE',
          'city': 'CITY_CODE',
          'CustomerType': 'CUSTOMER_TYPE',
          'salesOrganization': 'SALES_ORG',
          'distributionChannel': 'DIST_CHANNEL',
          'division': 'DIVISION'
        }),
        createdBy: 'system'
      },
      {
        name: 'SAP S/4HANA - Customer Master',
        description: 'Sync customer master data to SAP S/4HANA',
        targetSystem: 'sap_4hana',
        syncDirection: 'outbound',
        filterCriteria: JSON.stringify({
          customerType: ['Limited Liability Company', 'Joint Stock Company', 'Retail Chain'],
          status: 'Active'
        }),
        fieldMapping: JSON.stringify({
          'firstName': 'KUNNR',
          'firstNameAr': 'NAME1_AR',
          'tax': 'STCD1',
          'country': 'LAND1',
          'city': 'ORT01',
          'CustomerType': 'KTOKD',
          'salesOrganization': 'VKORG',
          'distributionChannel': 'VTWEG',
          'division': 'SPART'
        }),
        createdBy: 'system'
      },
      {
        name: 'SAP ByDesign - Business Partner',
        description: 'Sync business partner data to SAP ByDesign',
        targetSystem: 'sap_bydesign',
        syncDirection: 'outbound',
        filterCriteria: JSON.stringify({
          customerType: ['Limited Liability Company', 'Joint Stock Company'],
          status: 'Active',
          salesOrganization: ['1000', '2000', '3000']
        }),
        fieldMapping: JSON.stringify({
          'firstName': 'BusinessPartnerID',
          'firstNameAr': 'BusinessPartnerName_AR',
          'tax': 'TaxID',
          'country': 'CountryCode',
          'city': 'CityName',
          'CustomerType': 'BusinessPartnerRole',
          'salesOrganization': 'SalesOrganisationID'
        }),
        createdBy: 'system'
      }
    ];

    const insertRule = db.prepare(`
      INSERT INTO sync_rules (name, description, targetSystem, syncDirection, filterCriteria, fieldMapping, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    defaultRules.forEach(rule => {
      insertRule.run(
        rule.name,
        rule.description,
        rule.targetSystem,
        rule.syncDirection,
        rule.filterCriteria,
        rule.fieldMapping,
        rule.createdBy
      );
    });

    console.log('✅ Default sync rules created');
  }
}

// Insert sample sync rules with proper criteria
function insertSampleSyncRules() {
  const existingRules = db.prepare("SELECT COUNT(*) as count FROM sync_rules").get();
  
  if (existingRules.count > 0) {
    console.log('Sync rules already exist');
    return;
  }
  
  console.log('Creating sample sync rules...');
  
  const sampleRules = [
    {
      name: 'Oracle Forms - Egypt Customers',
      description: 'Sync Egypt customers to Oracle Forms',
      targetSystem: 'Oracle Forms',
      filterCriteria: JSON.stringify({
        conditions: [
          { field: 'country', operator: 'equals', value: 'Egypt' }
        ],
        logic: 'AND'
      }),
      isActive: 1,
      createdBy: 'admin'
    },
    {
      name: 'SAP S/4 - Saudi Customers',
      description: 'Sync Saudi Arabia customers to SAP S/4HANA',
      targetSystem: 'SAP S/4HANA',
      filterCriteria: JSON.stringify({
        conditions: [
          { field: 'country', operator: 'equals', value: 'Saudi Arabia' }
        ],
        logic: 'AND'
      }),
      isActive: 1,
      createdBy: 'admin'
    },
    {
      name: 'SAP ByD - UAE & Limited Liability',
      description: 'Sync UAE Limited Liability companies to SAP ByDesign',
      targetSystem: 'SAP ByD',
      filterCriteria: JSON.stringify({
        conditions: [
          { field: 'country', operator: 'equals', value: 'United Arab Emirates' },
          { field: 'CustomerType', operator: 'equals', value: 'Limited Liability Company' }
        ],
        logic: 'AND'
      }),
      isActive: 1,
      createdBy: 'admin'
    }
  ];
  
  const insertRule = db.prepare(`
    INSERT INTO sync_rules (name, description, targetSystem, filterCriteria, fieldMapping, isActive, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  sampleRules.forEach(rule => {
    insertRule.run(
      rule.name,
      rule.description,
      rule.targetSystem,
      rule.filterCriteria,
      '{}',
      rule.isActive,
      rule.createdBy
    );
  });
  
  console.log('✅ Sample sync rules created');
}

function insertDefaultUsers() {
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get();
  
  if (count.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, role, fullName, email) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const users = [
      ['admin', 'admin123', 'admin', 'System Administrator', 'admin@mdm.com'],
      ['data_entry', 'pass123', 'data_entry', 'Data Entry User', 'entry@mdm.com'],
      ['reviewer', 'pass123', 'reviewer', 'Data Reviewer', 'reviewer@mdm.com'],
      ['compliance', 'pass123', 'compliance', 'Compliance Officer', 'compliance@mdm.com'],
      ['manager', 'manager123', 'manager', 'Business Manager', 'manager@mdm.com']
    ];
    
    users.forEach(user => {
      try {
        insertUser.run(user);
      } catch (error) {
        // User might already exist, that's okay
        console.log(`User ${user[0]} already exists or error inserting`);
      }
    });
    
    // Force add manager if not exists
    try {
      const managerExists = db.prepare(`SELECT * FROM users WHERE username = 'manager'`).get();
      if (!managerExists) {
        insertUser.run(['manager', 'manager123', 'manager', 'Business Manager', 'manager@mdm.com']);
        console.log('Manager user added successfully');
      } else {
        console.log('Manager user already exists');
      }
    } catch (error) {
      console.log('Error checking/adding manager user:', error);
    }
    
    console.log('Default users created');
  }
}

function insertSampleData() {
  const count = db.prepare("SELECT COUNT(*) as count FROM requests").get();
  
  if (count.count === 0) {
    const insertRequest = db.prepare(`
      INSERT INTO requests (id, firstName, firstNameAr, tax, CustomerType, 
                          CompanyOwner, country, city, status, ComplianceStatus, 
                          origin, rejectReason, isGolden, assignedTo, createdBy, 
                          requestType, originalRequestType)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const samples = [
      {
        id: '1',
        firstName: 'Unilever Egypt',
        firstNameAr: 'يونيليفر مصر',
        tax: 'EG00000000000001',
        CustomerType: 'limited_liability',
        CompanyOwner: 'John Smith',
        country: 'Egypt',
        city: 'Cairo',
        status: 'Pending',
        origin: 'dataEntry',
        assignedTo: 'reviewer',
        createdBy: 'data_entry',
        requestType: 'new',
        originalRequestType: 'new'
      },
      {
        id: '2',
        firstName: 'Nestle Middle East',
        firstNameAr: 'نستله الشرق الأوسط',
        tax: 'EG00000000000002',
        CustomerType: 'corporation',
        CompanyOwner: 'Maria Garcia',
        country: 'Egypt',
        city: 'Alexandria',
        status: 'Approved',
        ComplianceStatus: null,
        origin: 'dataEntry',
        isGolden: 0,
        assignedTo: 'compliance',
        createdBy: 'data_entry',
        requestType: 'new',
        originalRequestType: 'new'
      },
      {
        id: '3',
        firstName: 'P&G Arabia',
        firstNameAr: 'بروكتر آند جامبل',
        tax: 'EG00000000000003',
        CustomerType: 'limited_liability',
        CompanyOwner: 'David Johnson',
        country: 'Saudi Arabia',
        city: 'Riyadh',
        status: 'Rejected',
        rejectReason: 'Missing required documents',
        origin: 'quarantine',
        assignedTo: 'data_entry',
        createdBy: 'data_entry',
        requestType: 'quarantine',
        originalRequestType: 'quarantine'
      }
    ];

    samples.forEach(s => {
      insertRequest.run([
        s.id, s.firstName, s.firstNameAr, s.tax, s.CustomerType,
        s.CompanyOwner, s.country, s.city, s.status, s.ComplianceStatus || null,
        s.origin, s.rejectReason || null, s.isGolden || 0, s.assignedTo, s.createdBy,
        s.requestType, s.originalRequestType
      ]);
    });
    
    console.log('Sample data inserted');
  }

  // ✅ Session Staging Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_staging (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      
      -- Company Basic Info
      first_name TEXT,
      first_name_ar TEXT,
      tax_number TEXT,
      customer_type TEXT,
      company_owner TEXT,
      
      -- Address Info
      building_number TEXT,
      street TEXT,
      country TEXT,
      city TEXT,
      
      -- Document Content for parsing
      document_content TEXT,
      
      -- Sales Info
      sales_org TEXT,
      distribution_channel TEXT,
      division TEXT,
      
      -- Additional Info
      registration_number TEXT,
      legal_form TEXT,
      
      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(session_id, company_id)
    );

    CREATE TABLE IF NOT EXISTS session_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      document_name TEXT NOT NULL,
      document_content TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_size INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(session_id, company_id, document_name)
    );

    CREATE TABLE IF NOT EXISTS session_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT,
      contact_phone TEXT,
      contact_position TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS session_documents_temp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      document_name TEXT NOT NULL,
      document_content TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_size INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(session_id, document_id)
    );
  `);
  console.log('Session staging tables ready');
}

// Initialize database
initializeDatabase();

// Helper Functions - حوالي سطر 264
function logWorkflow(requestId, action, fromStatus, toStatus, user, role, note, payload = null, performedAt = null) {
  const stmt = db.prepare(`
    INSERT INTO workflow_history (requestId, action, fromStatus, toStatus, 
                                performedBy, performedByRole, note, payload, performedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const payloadJson = payload ? JSON.stringify(payload) : null;
  const timestamp = performedAt || new Date().toISOString();
  
  stmt.run(requestId, action, fromStatus, toStatus, user || 'system', role || 'system', note, payloadJson, timestamp);
  
  console.log(`Workflow logged: ${action} for ${requestId} by ${user} (${role}) at ${timestamp}`);
  if (payload) {
    console.log(`Payload logged: ${JSON.stringify(payload, null, 2).substring(0, 200)}...`);
  }
}

function detectFieldChanges(oldRecord, newRecord, requestId) {
  const changes = {
    fields: {},
    contacts: { added: [], removed: [], changed: [] },
    documents: { added: [], removed: [], changed: [] }
  };

  const trackableFields = [
    'firstName', 'firstNameAr', 'tax', 'CustomerType', 'CompanyOwner',
    'buildingNumber', 'street', 'country', 'city',
    'ContactName', 'EmailAddress', 'MobileNumber', 'JobTitle', 'Landline', 'PrefferedLanguage',
    'SalesOrgOption', 'DistributionChannelOption', 'DivisionOption'
  ];

  trackableFields.forEach(field => {
    const oldValue = oldRecord ? oldRecord[field] : null;
    const newValue = newRecord[field] || null;
    
    if (oldValue !== newValue) {
      changes.fields[field] = {
        from: oldValue,
        to: newValue,
        fieldName: getFieldDisplayName(field)
      };
    }
  });

  return changes;
}

function getFieldDisplayName(field) {
  const displayNames = {
    firstName: 'Company Name',
    firstNameAr: 'Company Name (Arabic)',
    tax: 'Tax Number',
    CustomerType: 'Customer Type',
    CompanyOwner: 'Company Owner',
    buildingNumber: 'Building Number',
    street: 'Street',
    country: 'Country',
    city: 'City',
    ContactName: 'Contact Name',
    EmailAddress: 'Email Address',
    MobileNumber: 'Mobile Number',
    JobTitle: 'Job Title',
    Landline: 'Landline',
    PrefferedLanguage: 'Preferred Language',
    SalesOrgOption: 'Sales Organization',
    DistributionChannelOption: 'Distribution Channel',
    DivisionOption: 'Division'
  };
  
  return displayNames[field] || field;
}

function getPermissionsForRole(role) {
  const permissions = {
    'data_entry': ['create', 'edit_own', 'view_own'],
    '1': ['create', 'edit_own', 'view_own'],
    'reviewer': ['view_all', 'approve', 'reject', 'assign'],
    '2': ['view_all', 'approve', 'reject', 'assign'],
    'master': ['view_all', 'approve', 'reject', 'assign'],
    'compliance': ['view_approved', 'compliance_approve', 'compliance_block'],
    '3': ['view_approved', 'compliance_approve', 'compliance_block'],
    'admin': ['all'],
    'demo-admin': ['all']
  };
  
  return permissions[role] || ['view_own'];
}

function calculateFieldQuality(value, fieldName) {
  if (!value) return 0;
  
  let score = 50; // Base score
  const valueStr = value.toString().trim();
  
  // Length bonus (but not too long)
  if (valueStr.length > 3 && valueStr.length < 100) score += 20;
  
  // Arabic content bonus for Arabic fields
  if (fieldName === 'firstNameAr' && /[\u0600-\u06FF]/.test(valueStr)) score += 30;
  
  // Email validation
  if (fieldName === 'EmailAddress' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueStr)) score += 30;
  
  // Phone validation
  if ((fieldName === 'MobileNumber' || fieldName === 'Landline') && /^\+?[\d\s\-()]{7,15}$/.test(valueStr)) score += 20;
  
  // Tax number validation
  if (fieldName === 'tax' && valueStr.length >= 10) score += 25;
  
  // No special characters in names
  if (fieldName === 'firstName' && !/[^a-zA-Z\s&.-]/.test(valueStr)) score += 15;
  
  return Math.min(score, 100);
}

// ============= API ENDPOINTS =============

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    ts: new Date().toISOString(),
    database: 'SQLite (better-sqlite3)',
    dbPath: dbPath
  });
});

// ===== ANALYTICAL ENDPOINTS =====

// Count analytics
app.get('/api/analytics/count', (req, res) => {
    try {
        const { country, city, type, timeFilter } = req.query;
        let query = 'SELECT COUNT(*) as count FROM requests WHERE 1=1';
        const params = [];

        if (country) {
            query += ' AND country = ?';
            params.push(country);
        }
        if (city) {
            query += ' AND city = ?';
            params.push(city);
        }
        if (type) {
            query += ' AND CustomerType = ?';
            params.push(type);
        }
        if (timeFilter === 'this_month') {
            query += ' AND createdAt >= date("now", "start of month")';
        }
        if (timeFilter === 'this_year') {
            query += ' AND createdAt >= date("now", "start of year")';
        }

        const result = db.prepare(query).get(...params);
        res.json({ count: result.count, filters: req.query });
    } catch (error) {
        console.error('Count analytics error:', error);
        res.status(500).json({ error: 'Failed to get count analytics' });
    }
});

// Ranking analytics
app.get('/api/analytics/ranking', (req, res) => {
    try {
        const { rankBy, limit = 10 } = req.query;
        const validRankBy = ['CustomerType', 'SalesOrgOption', 'city', 'country'];
        
        if (!validRankBy.includes(rankBy)) {
            return res.status(400).json({ error: 'Invalid rankBy parameter' });
        }

        const query = `
            SELECT ${rankBy} as name, COUNT(*) as count 
            FROM requests 
            WHERE ${rankBy} IS NOT NULL 
            GROUP BY ${rankBy} 
            ORDER BY count DESC 
            LIMIT ?
        `;

        const results = db.prepare(query).all(parseInt(limit));
        res.json({ ranking: results, rankBy, limit });
    } catch (error) {
        console.error('Ranking analytics error:', error);
        res.status(500).json({ error: 'Failed to get ranking analytics' });
    }
});

// Distribution analytics
app.get('/api/analytics/distribution', (req, res) => {
    try {
        const { groupBy } = req.query;
        const validGroupBy = ['CustomerType', 'SalesOrgOption', 'city', 'country'];
        
        if (!validGroupBy.includes(groupBy)) {
            return res.status(400).json({ error: 'Invalid groupBy parameter' });
        }

        const query = `
            SELECT ${groupBy} as name, COUNT(*) as count 
            FROM requests 
            WHERE ${groupBy} IS NOT NULL 
            GROUP BY ${groupBy}
        `;

        const results = db.prepare(query).all();
        const total = results.reduce((sum, row) => sum + row.count, 0);
        
        const distribution = results.map(row => ({
            name: row.name,
            count: row.count,
            percentage: ((row.count / total) * 100).toFixed(1)
        }));

        res.json({ distribution, groupBy, total });
    } catch (error) {
        console.error('Distribution analytics error:', error);
        res.status(500).json({ error: 'Failed to get distribution analytics' });
    }
});

// Comparison analytics
app.get('/api/analytics/comparison', (req, res) => {
    try {
        const { compare } = req.query;
        if (!compare || !Array.isArray(compare)) {
            return res.status(400).json({ error: 'compare parameter must be an array' });
        }

        const results = [];
        for (const item of compare) {
            const query = 'SELECT COUNT(*) as count FROM requests WHERE country = ? OR city = ?';
            const result = db.prepare(query).get(item, item);
            results.push({ name: item, count: result.count });
        }

        res.json({ comparison: results, compared: compare });
    } catch (error) {
        console.error('Comparison analytics error:', error);
        res.status(500).json({ error: 'Failed to get comparison analytics' });
    }
});

// Trend analytics
app.get('/api/analytics/trend', (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        let dateFormat, groupBy;

        switch (period) {
            case 'daily':
                dateFormat = '%Y-%m-%d';
                groupBy = 'DATE(created_at)';
                break;
            case 'weekly':
                dateFormat = '%Y-%W';
                groupBy = 'strftime("%Y-%W", created_at)';
                break;
            case 'monthly':
                dateFormat = '%Y-%m';
                groupBy = 'strftime("%Y-%m", created_at)';
                break;
            case 'yearly':
                dateFormat = '%Y';
                groupBy = 'strftime("%Y", created_at)';
                break;
            default:
                return res.status(400).json({ error: 'Invalid period parameter' });
        }

        const query = `
            SELECT ${groupBy} as period, COUNT(*) as count 
            FROM requests 
            WHERE createdAt IS NOT NULL 
            GROUP BY ${groupBy} 
            ORDER BY period
        `;

        const results = db.prepare(query).all();
        res.json({ trend: results, period });
    } catch (error) {
        console.error('Trend analytics error:', error);
        res.status(500).json({ error: 'Failed to get trend analytics' });
    }
});

// General analytics
app.get('/api/analytics/general', (req, res) => {
    try {
        const { query } = req.query;
        
        // Get basic statistics
        const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM requests').get();
        const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
        const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents').get();
        
        const recentCustomers = db.prepare(`
            SELECT COUNT(*) as count 
            FROM requests 
            WHERE createdAt >= date('now', '-7 days')
        `).get();

        res.json({
            summary: {
                totalCustomers: totalCustomers.count,
                totalContacts: totalContacts.count,
                totalDocuments: totalDocuments.count,
                recentCustomers: recentCustomers.count
            },
            query: query
        });
    } catch (error) {
        console.error('General analytics error:', error);
        res.status(500).json({ error: 'Failed to get general analytics' });
    }
});

// Get current user info endpoint
app.get('/api/auth/me', (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] || req.query.role;
    const userId = req.headers['x-user-id'] || req.query.userId;
    const username = req.headers['x-username'] || req.query.username;

    // If username is provided, always try to resolve from DB to get fullName
    if (username) {
      const user = db.prepare(
        "SELECT id, username, role, fullName, email, isActive, avatarUrl FROM users WHERE username = ?"
      ).get(username);
      if (user) {
        return res.json({
          ...user,
          permissions: getPermissionsForRole(user.role)
        });
      }
    }

    // If userId is provided, try lookup as well
    if (userId) {
      const userById = db.prepare(
        "SELECT id, username, role, fullName, email, isActive, avatarUrl FROM users WHERE id = ?"
      ).get(userId);
      if (userById) {
        return res.json({
          ...userById,
          permissions: getPermissionsForRole(userById.role)
        });
      }
    }

    // Fallback (no DB match) – return minimal info
    return res.json({
      id: userId || 'user_' + Date.now(),
      username: username || 'current_user',
      fullName: username || 'User',
      role: userRole || 'reviewer',
      email: username ? `${username}@company.com` : 'user@company.com',
      isActive: 1,
      avatarUrl: null,
      permissions: getPermissionsForRole(userRole)
    });
  } catch (e) {
    console.error('auth/me error', e);
    return res.status(500).json({ error: 'Failed to get current user' });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = db.prepare(
      "SELECT id, username, role, fullName, email, avatarUrl FROM users WHERE username = ? AND password = ? AND isActive = 1"
    ).get(username, password);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = 'dummy-token-' + nanoid(8);
    
    res.json({ 
      user: {
        ...user,
        permissions: getPermissionsForRole(user.role)
      },
      token: token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Session Staging API Endpoints

// ✅ NEW: Direct file upload endpoint (bypasses base64 encoding)
app.post('/api/session/upload-files-direct', upload.array('files', 5), async (req, res) => {
  const { sessionId } = req.body;
  
  try {
    console.log('📁 [DIRECT UPLOAD] Starting direct file upload...');
    console.log('📁 [DIRECT UPLOAD] Session ID:', sessionId);
    console.log('📁 [DIRECT UPLOAD] Files count:', req.files?.length || 0);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // ✅ FIX: Don't clear old documents - append new ones instead!
    console.log('📎 [DIRECT UPLOAD] Appending new documents to existing ones...');
    
    // Process uploaded files
    const documentIds = [];
    const stmt = db.prepare(`
      INSERT INTO session_documents_temp 
      (session_id, document_id, document_name, document_path, document_type, document_size, document_content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, '', CURRENT_TIMESTAMP)
    `);
    
    for (const file of req.files) {
      const documentId = file.filename.split('_')[1] + '_' + file.filename.split('_')[2];
      const relativePath = path.relative(UPLOADS_DIR, file.path);
      
      console.log(`📁 [DIRECT UPLOAD] Processing file:`, {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        relativePath: relativePath,
        size: file.size,
        mimetype: file.mimetype
      });
      
      stmt.run(sessionId, documentId, file.originalname, relativePath, file.mimetype, file.size);
      
      documentIds.push({
        documentId,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        path: relativePath
      });
      
      console.log(`✅ [DIRECT UPLOAD] File saved with ID: ${documentId}`);
    }
    
    console.log('✅ [DIRECT UPLOAD] All files uploaded successfully');
    console.log('📁 [DIRECT UPLOAD] Document IDs:', documentIds.map(d => d.documentId));
    
    res.json({
      success: true,
      sessionId,
      documentIds,
      message: 'Files uploaded directly to filesystem. Ready for AI processing.'
    });
    
  } catch (error) {
    console.error('❌ [DIRECT UPLOAD] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Get documents for display in modal (from filesystem)
app.get('/api/session/documents/:sessionId/:companyId', async (req, res) => {
  const { sessionId, companyId } = req.params;
  
  try {
    console.log('📄 [MODAL DOCS] Getting documents for modal display...');
    console.log('📄 [MODAL DOCS] Session ID:', sessionId);
    console.log('📄 [MODAL DOCS] Company ID:', companyId);
    
    // Get documents from database
    const documents = db.prepare(`
      SELECT document_id, document_name, document_path, document_type, document_size
      FROM session_documents_temp
      WHERE session_id = ?
    `).all(sessionId);
    
    console.log('📄 [MODAL DOCS] Retrieved documents:', documents.length);
    
    // Convert to display format with file URLs
    const documentsForModal = documents.map(doc => {
      const fileUrl = `${BASE_URL}/uploads/${doc.document_path}`;
      
      console.log(`📄 [MODAL DOCS] Document:`, {
        id: doc.document_id,
        name: doc.document_name,
        type: doc.document_type,
        size: doc.document_size,
        fileUrl: fileUrl
      });
      
      return {
        id: doc.document_id,
        name: doc.document_name,
        type: doc.document_type,
        size: doc.document_size,
        fileUrl: fileUrl,
        document_path: doc.document_path,  // ✅ FIX: Include document_path for submission
        mime: doc.document_type
      };
    });
    
    res.json({
      success: true,
      documents: documentsForModal
    });
    
  } catch (error) {
    console.error('❌ [MODAL DOCS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Get documents for AI processing (from filesystem)
app.post('/api/session/get-documents-for-processing-files', async (req, res) => {
  const { sessionId, documentIds } = req.body;
  
  try {
    console.log('📥 [FILES PROCESSING] Retrieving documents from filesystem...');
    console.log('📥 [FILES PROCESSING] Session ID:', sessionId);
    console.log('📥 [FILES PROCESSING] Document IDs:', documentIds);
    
    const placeholders = documentIds.map(() => '?').join(',');
    const documents = db.prepare(`
      SELECT document_id, document_name, document_path, document_type, document_size
      FROM session_documents_temp
      WHERE session_id = ? AND document_id IN (${placeholders})
    `).all(sessionId, ...documentIds);
    
    console.log('✅ [FILES PROCESSING] Retrieved documents:', documents.length);
    
    // Read files from filesystem and convert to base64
    const documentsWithContent = [];
    const fs = require('fs');
    
    for (const doc of documents) {
      const fullPath = path.join(UPLOADS_DIR, doc.document_path);
      
      try {
        console.log(`📁 [FILES PROCESSING] Reading file: ${fullPath}`);
        const fileBuffer = fs.readFileSync(fullPath);
        const base64Content = fileBuffer.toString('base64');
        
        console.log(`📁 [FILES PROCESSING] File read:`, {
          id: doc.document_id,
          name: doc.document_name,
          type: doc.document_type,
          size: doc.document_size,
          contentLength: base64Content.length,
          contentPreview: base64Content.substring(0, 50) + '...'
        });
        
        documentsWithContent.push({
          document_id: doc.document_id,
          document_name: doc.document_name,
          document_type: doc.document_type,
          document_size: doc.document_size,
          document_content: base64Content
        });
        
      } catch (fileError) {
        console.error(`❌ [FILES PROCESSING] Error reading file ${doc.document_name}:`, fileError);
        throw new Error(`Failed to read file: ${doc.document_name}`);
      }
    }
    
    res.json({
      success: true,
      documents: documentsWithContent
    });
    
  } catch (error) {
    console.error('❌ [FILES PROCESSING] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Save documents FIRST without company data
app.post('/api/session/save-documents-only', (req, res) => {
  const { sessionId, documents } = req.body;
  
  try {
    console.log('📄 [DOCS ONLY] Saving documents without extraction...');
    console.log('📄 [DOCS ONLY] Session ID:', sessionId);
    console.log('📄 [DOCS ONLY] Documents count:', documents?.length || 0);
    
    if (!documents || documents.length === 0) {
      return res.status(400).json({ error: 'No documents provided' });
    }
    
    // ✅ CRITICAL FIX: Clear ALL old documents from temp table for this session first!
    console.log('🗑️ [DOCS ONLY] Clearing old documents from session_documents_temp...');
    const deleteStmt = db.prepare(`
      DELETE FROM session_documents_temp 
      WHERE session_id = ?
    `);
    const deleteResult = deleteStmt.run(sessionId);
    console.log(`🗑️ [DOCS ONLY] Cleared ${deleteResult.changes} old documents`);
    
    // Generate document IDs
    const documentIds = [];
    
    const stmt = db.prepare(`
      INSERT INTO session_documents_temp 
      (session_id, document_id, document_name, document_content, document_type, document_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    for (const doc of documents) {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`📄 [DOCS ONLY] Saving NEW document: ${doc.name}`, {
        documentId,
        size: doc.size,
        type: doc.type,
        contentLength: doc.content?.length || 0,
        contentPreview: doc.content?.substring(0, 50)
      });
      
      console.log(`🔍 [BACKEND DEBUG] Base64 content start: ${doc.content?.substring(0, 50)}...`);
      console.log(`🔍 [BACKEND DEBUG] Base64 content end: ...${doc.content?.substring(doc.content.length - 50)}`);
      
      // ✅ Validate document has content before saving
      if (!doc.content || doc.content.trim() === '') {
        console.warn(`⚠️ [DOCS ONLY] Skipping document with empty content: ${doc.name}`);
        continue;
      }
      
      stmt.run(sessionId, documentId, doc.name, doc.content, doc.type, doc.size);
      
      documentIds.push({
        documentId,
        name: doc.name,
        type: doc.type,
        size: doc.size
      });
      
      console.log(`✅ [DOCS ONLY] Document saved with ID: ${documentId}`);
    }
    
    console.log('✅ [DOCS ONLY] All NEW documents saved successfully');
    console.log('✅ [DOCS ONLY] Document IDs:', documentIds.map(d => d.documentId));
    
    res.json({
      success: true,
      sessionId,
      documentIds,
      message: 'Documents saved successfully. Ready for AI processing.'
    });
    
  } catch (error) {
    console.error('❌ [DOCS ONLY] Error saving documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Get documents for AI processing
app.post('/api/session/get-documents-for-processing', (req, res) => {
  const { sessionId, documentIds } = req.body;
  
  try {
    console.log('📥 [GET DOCS] Retrieving documents for AI processing...');
    console.log('📥 [GET DOCS] Session ID:', sessionId);
    console.log('📥 [GET DOCS] Document IDs:', documentIds);
    
    const placeholders = documentIds.map(() => '?').join(',');
    const documents = db.prepare(`
      SELECT document_id, document_name, document_content, document_type, document_size
      FROM session_documents_temp
      WHERE session_id = ? AND document_id IN (${placeholders})
    `).all(sessionId, ...documentIds);
    
    console.log('✅ [GET DOCS] Retrieved documents:', documents.length);
    
    documents.forEach((doc, index) => {
      console.log(`📄 [GET DOCS] Document ${index + 1}:`, {
        id: doc.document_id,
        name: doc.document_name,
        type: doc.document_type,
        size: doc.document_size,
        contentLength: doc.document_content?.length || 0,
        contentPreview: doc.document_content?.substring(0, 50)
      });
      
      console.log(`🔍 [RETRIEVAL DEBUG] Base64 content start: ${doc.document_content?.substring(0, 50)}...`);
      console.log(`🔍 [RETRIEVAL DEBUG] Base64 content end: ...${doc.document_content?.substring(doc.document_content.length - 50)}`);
    });
    
    res.json({
      success: true,
      documents
    });
    
  } catch (error) {
    console.error('❌ [GET DOCS] Error retrieving documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Get all temp documents for a session
app.post('/api/session/get-all-temp-documents', (req, res) => {
  const { sessionId } = req.body;
  
  try {
    console.log('📥 [GET ALL TEMP] Getting all temp documents for session:', sessionId);
    
    const documents = db.prepare(`
      SELECT document_id, document_name, document_content, document_type, document_size, created_at
      FROM session_documents_temp
      WHERE session_id = ?
      ORDER BY created_at DESC
    `).all(sessionId);
    
    console.log('✅ [GET ALL TEMP] Retrieved documents:', documents.length);
    
    documents.forEach((doc, index) => {
      console.log(`📄 [GET ALL TEMP] Document ${index + 1}:`, {
        id: doc.document_id,
        name: doc.document_name,
        type: doc.document_type,
        size: doc.document_size,
        contentLength: doc.document_content?.length || 0
      });
    });
    
    res.json({
      success: true,
      documents
    });
    
  } catch (error) {
    console.error('❌ [GET ALL TEMP] Error retrieving temp documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NEW: Clear temp documents after processing
app.post('/api/session/clear-temp-documents', (req, res) => {
  const { sessionId } = req.body;
  
  try {
    console.log('🗑️ [CLEAR TEMP] Clearing temp documents for session:', sessionId);
    
    const deleteStmt = db.prepare(`
      DELETE FROM session_documents_temp 
      WHERE session_id = ?
    `);
    
    const result = deleteStmt.run(sessionId);
    console.log(`✅ [CLEAR TEMP] Cleared ${result.changes} temp documents`);
    
    res.json({
      success: true,
      deletedCount: result.changes
    });
    
  } catch (error) {
    console.error('❌ [CLEAR TEMP] Error clearing temp documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save company data and documents
app.post('/api/session/save-company', (req, res) => {
  const { 
    sessionId, companyId, companyName,
    firstName, firstNameAr, taxNumber, customerType, companyOwner,
    buildingNumber, street, country, city, documentContent,
    salesOrg, distributionChannel, division,
    registrationNumber, legalForm,
    documents, contacts
  } = req.body;
  
  try {
    console.log('🏛️ [SESSION] Saving company data:', {
      sessionId,
      companyId,
      companyName,
      documentsCount: documents?.length || 0,
      contactsCount: contacts?.length || 0
    });
    
    console.log('🏛️ [SESSION] Full request body keys:', Object.keys(req.body));
    console.log('🏛️ [SESSION] Extracted values:', {
      sessionId, companyId, companyName, firstName, firstNameAr, taxNumber, 
      customerType, companyOwner, buildingNumber, street, country, city, documentContent,
      salesOrg, distributionChannel, division, registrationNumber, legalForm
    });
    
    // Save company data (upsert) - ✅ better-sqlite3 synchronous method
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO session_staging 
      (session_id, company_id, company_name, first_name, first_name_ar, 
       tax_number, customer_type, company_owner, building_number, street, 
       country, city, sales_org, distribution_channel, division, 
       registration_number, legal_form, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    console.log('🏛️ [SESSION] About to execute INSERT with values...');
    stmt.run(sessionId, companyId, companyName, firstName, firstNameAr, 
        taxNumber, customerType, companyOwner, buildingNumber, street, 
        country, city, salesOrg, distributionChannel, division,
        registrationNumber, legalForm);
    console.log('🏛️ [SESSION] INSERT successful');
    
    console.log('✅ [SESSION] Company data saved to session_staging');
    
    // Save documents
    if (documents && documents.length > 0) {
      console.log('📄 [SESSION] Saving documents:', documents.length);
      console.log('📄 [SESSION] Document names:', documents.map(d => d.name));
      console.log('📄 [SESSION] Document sizes:', documents.map(d => d.size));
      
      // ✅ CRITICAL FIX: Clear ALL existing documents for this company first
      // This ensures we always store the LATEST uploaded documents
      const deleteStmt = db.prepare(`
        DELETE FROM session_documents 
        WHERE session_id = ? AND company_id = ?
      `);
      const deleteResult = deleteStmt.run(sessionId, companyId);
      console.log(`🗑️ [SESSION] Cleared ${deleteResult.changes} existing documents`);
      
      // Now insert the new documents
      const docStmt = db.prepare(`
        INSERT INTO session_documents 
        (session_id, company_id, document_name, document_content, document_type, document_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      let savedCount = 0;
      for (const doc of documents) {
        // Validate document has content
        if (!doc.content || doc.content.trim() === '') {
          console.warn(`⚠️ [SESSION] Skipping document with empty content: ${doc.name}`);
          continue;
        }
        
        // Log first 100 chars of base64 content for verification
        const contentPreview = doc.content.substring(0, 100);
        console.log(`📄 [SESSION] Saving document "${doc.name}" (${doc.size} bytes, content starts with: ${contentPreview}...)`);
        
        docStmt.run(sessionId, companyId, doc.name, doc.content, doc.type, doc.size);
        savedCount++;
        console.log(`✅ [SESSION] Document saved: ${doc.name}`);
      }
      
      console.log(`✅ [SESSION] Total documents saved: ${savedCount}/${documents.length}`);
    } else {
      console.log('⚠️ [SESSION] No documents provided to save');
    }
    
    // Save contacts
    if (contacts && contacts.length > 0) {
      // Clear existing contacts for this company
      const deleteStmt = db.prepare(`DELETE FROM session_contacts WHERE session_id = ? AND company_id = ?`);
      deleteStmt.run(sessionId, companyId);
      
      const contactStmt = db.prepare(`
        INSERT INTO session_contacts 
        (session_id, company_id, contact_name, contact_email, contact_phone, contact_position)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const contact of contacts) {
        contactStmt.run(sessionId, companyId, contact.name, contact.email, contact.phone, contact.position);
      }
      
      console.log('✅ [SESSION] Contacts saved:', contacts.length);
    }
    
    console.log('✅ [SESSION] All data saved successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [SESSION] Error saving company data:', error);
    console.error('❌ [SESSION] Error details:', error.message);
    console.error('❌ [SESSION] Request body:', req.body);
    res.status(500).json({ error: error.message });
  }
});

// Get all companies for session
app.get('/api/session/companies/:sessionId', (req, res) => {
  try {
    const companies = db.prepare(`
      SELECT 
        company_id, company_name, first_name, tax_number, country,
        COUNT(d.id) as document_count,
        created_at, updated_at
      FROM session_staging s
      LEFT JOIN session_documents d ON s.session_id = d.session_id AND s.company_id = d.company_id
      WHERE s.session_id = ?
      GROUP BY s.company_id
      ORDER BY updated_at DESC
    `).all(req.params.sessionId);
    
    res.json(companies);
  } catch (error) {
    console.error('Error getting companies:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get company data and documents
app.get('/api/session/company/:sessionId/:companyId', (req, res) => {
  try {
    console.log('📋 [GET SESSION] Request params:', req.params);
    
    // Get company data
    const company = db.prepare(`
      SELECT * FROM session_staging 
      WHERE session_id = ? AND company_id = ?
    `).get(req.params.sessionId, req.params.companyId);
    
    if (!company) {
      console.log('❌ [GET SESSION] Company not found:', req.params.companyId);
      return res.status(404).json({ error: 'Company not found' });
    }
    
    console.log('✅ [GET SESSION] Company data found:', company.company_name);
    
    // Get documents
    const documents = db.prepare(`
      SELECT document_name, document_content, document_type, document_size, created_at
      FROM session_documents 
      WHERE session_id = ? AND company_id = ?
    `).all(req.params.sessionId, req.params.companyId);
    
    console.log('📄 [GET SESSION] Documents found:', documents.length);
    documents.forEach((doc, index) => {
      const contentLength = doc.document_content ? doc.document_content.length : 0;
      const contentPreview = doc.document_content ? doc.document_content.substring(0, 50) : 'empty';
      console.log(`📄 [GET SESSION] Document ${index + 1}: ${doc.document_name} (${contentLength} chars, starts with: ${contentPreview}...)`);
    });
    
    // Get contacts
    const contacts = db.prepare(`
      SELECT contact_name, contact_email, contact_phone, contact_position
      FROM session_contacts 
      WHERE session_id = ? AND company_id = ?
    `).all(req.params.sessionId, req.params.companyId);
    
    console.log('👥 [GET SESSION] Contacts query params:', { sessionId: req.params.sessionId, companyId: req.params.companyId });
    console.log('👥 [GET SESSION] Contacts found:', contacts.length);
    if (contacts.length > 0) {
      console.log('👥 [GET SESSION] Contacts details:', contacts.map(c => ({ name: c.contact_name, email: c.contact_email })));
    }
    
    const response = {
      ...company,
      documents,
      contacts
    };
    
    console.log('✅ [GET SESSION] Sending response with', documents.length, 'documents and', contacts.length, 'contacts');
    res.json(response);
  } catch (error) {
    console.error('❌ [GET SESSION] Error getting company data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear session data by session ID
app.delete('/api/session/:sessionId', (req, res) => {
  try {
    console.log('🗑️ [SESSION CLEAR] Clearing session:', req.params.sessionId);
    
    const stagingResult = db.prepare(`DELETE FROM session_staging WHERE session_id = ?`).run(req.params.sessionId);
    const documentsResult = db.prepare(`DELETE FROM session_documents WHERE session_id = ?`).run(req.params.sessionId);
    const contactsResult = db.prepare(`DELETE FROM session_contacts WHERE session_id = ?`).run(req.params.sessionId);
    
    // ✅ FIX: Also clear temp documents!
    const tempDocsResult = db.prepare(`DELETE FROM session_documents_temp WHERE session_id = ?`).run(req.params.sessionId);
    
    console.log('✅ [SESSION CLEAR] Cleared:', {
      staging: stagingResult.changes,
      documents: documentsResult.changes,
      contacts: contactsResult.changes,
      tempDocs: tempDocsResult.changes
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear ALL session data (for testing)
app.delete('/api/session/admin/clear-all', (req, res) => {
  try {
    console.log('🗑️ [ADMIN] Clearing ALL session data...');
    
    const stagingResult = db.prepare(`DELETE FROM session_staging`).run();
    const documentsResult = db.prepare(`DELETE FROM session_documents`).run();
    const contactsResult = db.prepare(`DELETE FROM session_contacts`).run();
    
    console.log('✅ [ADMIN] Session data cleared:', {
      staging: stagingResult.changes,
      documents: documentsResult.changes,
      contacts: contactsResult.changes
    });
    
    res.json({ 
      success: true,
      deleted: {
        staging: stagingResult.changes,
        documents: documentsResult.changes,
        contacts: contactsResult.changes
      }
    });
  } catch (error) {
    console.error('❌ [ADMIN] Error clearing all session data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all requests
app.get('/api/requests', (req, res) => {
  try {
    const { status, origin, isGolden, assignedTo, createdBy, excludeTypes, requestType, originalRequestType, processedQuarantine, processedDuplicates, systemBreakdown, sourceSystem } = req.query;
    
    let query = "SELECT *, requestType, originalRequestType FROM requests WHERE 1=1";
    const params = [];
    
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (origin) {
      query += " AND origin = ?";
      params.push(origin);
    }
    if (isGolden !== undefined) {
      query += " AND isGolden = ?";
      params.push(isGolden === 'true' ? 1 : 0);
    }
    if (assignedTo) {
      query += " AND assignedTo = ?";
      params.push(assignedTo);
    }
    if (createdBy) {
      query += " AND createdBy = ?";
      params.push(createdBy);
    }
    if (requestType) {
      query += " AND requestType = ?";
      params.push(requestType);
    }
    if (excludeTypes) {
      const typesToExclude = excludeTypes.split(',');
      typesToExclude.forEach(type => {
        query += " AND requestType != ?";
        params.push(type.trim());
      });
    }
    if (originalRequestType) {
      query += " AND originalRequestType = ?";
      params.push(originalRequestType);
    }
    if (processedQuarantine === 'true') {
      // Get records that moved out of Quarantine status
      query += " AND status != 'Quarantine'";
    }
    if (processedDuplicates === 'true') {
      // Get processed duplicate records (Linked records only)
      query += " AND status = 'Linked'";
      query += " AND sourceSystem IS NOT NULL";
      query += " AND sourceSystem != ''";
      query += " AND sourceSystem != 'Master Builder'";
    }
    if (systemBreakdown === 'true' && sourceSystem) {
      // Get only quarantine and duplicate records from specific system
      query += " AND sourceSystem = ?";
      params.push(sourceSystem);
      query += " AND ((status = 'Quarantine' OR originalRequestType = 'quarantine') OR (requestType = 'duplicate' AND status = 'Duplicate') OR (status = 'Linked'))";
    } else if (sourceSystem) {
      query += " AND sourceSystem = ?";
      params.push(sourceSystem);
    }
    
    query += " ORDER BY createdAt DESC";
    
    const requests = db.prepare(query).all(...params);
    
    const getContacts = db.prepare("SELECT * FROM contacts WHERE requestId = ?");
    const getDocuments = db.prepare("SELECT * FROM documents WHERE requestId = ?");
    
    const result = requests.map(req => ({
      ...req,
      contacts: getContacts.all(req.id),
      documents: getDocuments.all(req.id).map(d => ({
        ...d,
        id: d.documentId || d.id
      }))
    }));
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single request
app.get('/api/requests/:id', (req, res) => {
  try {
    const requestId = req.params.id;
    
    const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Not found' });
    }
    
    const contacts = db.prepare("SELECT * FROM contacts WHERE requestId = ?").all(requestId);
    const documents = db.prepare("SELECT * FROM documents WHERE requestId = ?").all(requestId);
    const issues = db.prepare("SELECT * FROM issues WHERE requestId = ?").all(requestId);
    
    console.log('📄 [GET REQUEST] Documents from DB:', documents.length);
    
    // ✅ FIX: Support both filesystem and base64 documents
    const processedDocuments = (documents || []).map(d => {
      const doc = {
        ...d,
        id: d.documentId || d.id
      };
      
      // If document_path exists (filesystem), create fileUrl
      if (d.document_path) {
        doc.fileUrl = `${BASE_URL}/uploads/${d.document_path}`;
        console.log('📁 [FILESYSTEM] Document:', { name: d.name, fileUrl: doc.fileUrl });
        // Keep contentBase64 empty for filesystem docs
        doc.contentBase64 = '';
      } else if (d.contentBase64) {
        // Old way: base64 in database
        console.log('💾 [BASE64] Document:', { name: d.name, size: d.contentBase64?.length });
      }
      
      return doc;
    });
    
    console.log('✅ [GET REQUEST] Processed documents:', processedDocuments.length);
    
    // Get workflow history
    const workflowHistory = db.prepare(`
      SELECT * FROM workflow_history 
      WHERE requestId = ? 
      ORDER BY performedAt ASC
    `).all(requestId);
    
    // Parse payload for each entry
    const processedHistory = workflowHistory.map(entry => {
      let parsedPayload = {};
      
      if (entry.payload) {
        try {
          parsedPayload = JSON.parse(entry.payload);
        } catch (e) {
          console.error('Error parsing payload:', e);
          parsedPayload = {};
        }
      }
      
      return {
        ...entry,
        payload: parsedPayload
      };
    });
    
    const result = {
      ...request,
      contacts: contacts || [],
      documents: processedDocuments,
      issues: issues || [],
      workflowHistory: processedHistory
    };
    
    res.json(result);
  } catch (err) {
    console.error('Error getting single request:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new request
// Create new request
app.post('/api/requests', (req, res) => {
  try {
    const id = nanoid(8);
    const body = req.body || {};
    
    const isGoldenEdit = body.origin === 'goldenEdit';
    const fromQuarantine = body.fromQuarantine || body.origin === 'quarantine';
    
    let sourceRecord = null;
    if (isGoldenEdit && body.sourceGoldenId) {
      console.log('=== GOLDEN EDIT REQUEST ===');
      console.log('New Request ID:', id);
      console.log('Source Golden ID:', body.sourceGoldenId);
      
      sourceRecord = db.prepare("SELECT * FROM requests WHERE id = ?").get(body.sourceGoldenId);
      if (sourceRecord) {
        sourceRecord.contacts = db.prepare("SELECT * FROM contacts WHERE requestId = ?").all(body.sourceGoldenId);
        sourceRecord.documents = db.prepare("SELECT * FROM documents WHERE requestId = ?").all(body.sourceGoldenId);
      }
      
      const suspendTransaction = db.transaction(() => {
        const suspendStmt = db.prepare(`
          UPDATE requests 
          SET ComplianceStatus = 'Under Review',
              blockReason = COALESCE(blockReason, '') || ' | Being edited via request: ' || ?,
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND isGolden = 1
        `);
        
        suspendStmt.run(id, body.sourceGoldenId);
        
        logWorkflow(
          body.sourceGoldenId, 
          'GOLDEN_SUSPEND', 
          'Active', 
          'Under Review', 
          body.createdBy || 'data_entry', 
          'data_entry', 
          `Golden Record suspended for editing. New request: ${id}`,
          { newRequestId: id, reason: 'Golden record edit initiated' }
        );
      });
      
      suspendTransaction();
    }

    const changes = sourceRecord ? detectFieldChanges(sourceRecord, body, body.sourceGoldenId) : null;
    
    let reqType = body.requestType;
    if (!reqType) {
      if (isGoldenEdit) reqType = 'golden';
      else if (fromQuarantine) reqType = 'quarantine';
      else reqType = 'new';
    }
    
    const origReqType = body.originalRequestType || reqType;
    
    const transaction = db.transaction(() => {
      const insertRequest = db.prepare(`
        INSERT INTO requests (
          id, requestId, firstName, firstNameAr, tax,
          buildingNumber, street, country, city,
          CustomerType, CompanyOwner,
          ContactName, EmailAddress, MobileNumber, JobTitle, Landline, PrefferedLanguage,
          SalesOrgOption, DistributionChannelOption, DivisionOption,
          origin, sourceSystem, status, createdBy, assignedTo, sourceGoldenId, notes, 
          requestType, originalRequestType, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const creationTimestamp = new Date().toISOString();
      
      insertRequest.run(
        id, id,
        body.firstName, body.firstNameAr, body.tax,
        body.buildingNumber, body.street, body.country, body.city,
        body.CustomerType, body.CompanyOwner,
        body.ContactName, body.EmailAddress, body.MobileNumber,
        body.JobTitle, body.Landline, body.PrefferedLanguage,
        body.SalesOrgOption, body.DistributionChannelOption, body.DivisionOption,
        body.origin || 'dataEntry',
        body.sourceSystem || body.SourceSystem || 'Data Steward',
        body.status || 'Pending',
        body.createdBy || 'data_entry',
        body.assignedTo || 'reviewer',
        body.sourceGoldenId || null,
        body.notes || null,
        reqType,
        origReqType,
        creationTimestamp
      );
      
      // ENHANCED: Add contacts with proper timestamps and tracking
      if (Array.isArray(body.contacts) && body.contacts.length > 0) {
        const insertContact = db.prepare(`
          INSERT INTO contacts (
            requestId, name, jobTitle, email, mobile, landline, 
            preferredLanguage, isPrimary, source, addedBy, addedWhen
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        body.contacts.forEach((contact, index) => {
          // Generate unique timestamp for each contact (add milliseconds)
          const contactTimestamp = new Date(Date.now() + index).toISOString();
          
          insertContact.run(
            id,
            contact.name,
            contact.jobTitle,
            contact.email,
            contact.mobile,
            contact.landline,
            contact.preferredLanguage,
            contact.isPrimary ? 1 : 0,
            contact.source || body.sourceSystem || 'Data Steward',
            contact.addedBy || body.createdBy || 'data_entry',
            contactTimestamp  // Unique timestamp for each contact
          );
          
          console.log(`[CREATE] Added contact ${index + 1}: ${contact.name} at ${contactTimestamp}`);
        });
      }
      
      // ENHANCED: Add documents with proper timestamps and tracking
      if (Array.isArray(body.documents) && body.documents.length > 0) {
        console.log('📄 [SUBMIT] Saving documents:', body.documents.length);
        
        const insertDoc = db.prepare(`
          INSERT INTO documents (
            requestId, documentId, name, type, description, 
            size, mime, contentBase64, document_path, source, uploadedBy, uploadedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        body.documents.forEach((doc, index) => {
          // Generate unique timestamp for each document
          const docTimestamp = new Date(Date.now() + index).toISOString();
          
          console.log(`📄 [SUBMIT] Document ${index + 1}:`, {
            name: doc.name,
            hasPath: !!doc.document_path,
            hasBase64: !!doc.contentBase64,
            document_path: doc.document_path || null
          });
          
          insertDoc.run(
            id,
            doc.id || doc.documentId || nanoid(8),
            doc.name,
            doc.type,
            doc.description,
            doc.size,
            doc.mime,
            doc.contentBase64 || '',
            doc.document_path || null,  // ✅ NEW: Save filesystem path
            doc.source || body.sourceSystem || 'Data Steward',
            doc.uploadedBy || body.createdBy || 'data_entry',
            docTimestamp  // Unique timestamp for each document
          );
          
          console.log(`✅ [SUBMIT] Added document ${index + 1}: ${doc.name} at ${docTimestamp}`);
        });
        
        console.log('✅ [SUBMIT] All documents saved successfully');
      }
      
      const workflowNote = isGoldenEdit ? 
        `Created by editing Golden Record: ${body.sourceGoldenId}` : 
        fromQuarantine ?
        `Created from quarantine record` :
        (body._note || 'Created');
      
      // ENHANCED: Include contact and document info in workflow payload
      const workflowPayload = {
        operation: isGoldenEdit ? 'golden_edit' : fromQuarantine ? 'from_quarantine' : 'create',
        sourceGoldenId: body.sourceGoldenId || null,
        changes: changes || null,
        requestType: reqType,
        originalRequestType: origReqType,
        fromQuarantine: fromQuarantine,
        data: {
          firstName: body.firstName,
          firstNameAr: body.firstNameAr,
          tax: body.tax,
          CustomerType: body.CustomerType,
          CompanyOwner: body.CompanyOwner,
          country: body.country,
          city: body.city,
          buildingNumber: body.buildingNumber,
          street: body.street,
          ContactName: body.ContactName,
          EmailAddress: body.EmailAddress,
          MobileNumber: body.MobileNumber,
          JobTitle: body.JobTitle,
          Landline: body.Landline,
          PrefferedLanguage: body.PrefferedLanguage,
          SalesOrgOption: body.SalesOrgOption,
          DistributionChannelOption: body.DistributionChannelOption,
          DivisionOption: body.DivisionOption
        },
        contactsAdded: body.contacts ? body.contacts.length : 0,
        documentsAdded: body.documents ? body.documents.length : 0
      };
      
      logWorkflow(
        id, 
        'CREATE', 
        null, 
        'Pending', 
        body.createdBy || 'data_entry', 
        'data_entry', 
        workflowNote, 
        workflowPayload,
        creationTimestamp  // Use same timestamp as request creation
      );
      
      return id;
    });
    
    const newId = transaction();
    
    const created = db.prepare("SELECT * FROM requests WHERE id = ?").get(newId);
    const contacts = db.prepare("SELECT * FROM contacts WHERE requestId = ?").all(newId);
    const documents = db.prepare("SELECT * FROM documents WHERE requestId = ?").all(newId);
    
    res.status(201).json({ 
      ...created, 
      id: newId,
      contacts: contacts || [],
      documents: documents || []
    });
    
  } catch (err) {
    console.error('[CREATE] Error creating request:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update request
// Update request
// Update request endpoint - COMPLETE CODE
app.put('/api/requests/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        
        // Get existing request for comparison
        const existingRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
        if (!existingRequest) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        // Get existing contacts for comparison
        const existingContacts = db.prepare('SELECT * FROM contacts WHERE requestId = ?').all(id);
        
        // Track all changes for workflow history
        const changes = [];
        
        // Track field changes in main request
        const fieldsToTrack = [
            'firstName', 'firstNameAr', 'tax', 'CustomerType', 'CompanyOwner',
            'buildingNumber', 'street', 'country', 'city',
            'ContactName', 'EmailAddress', 'MobileNumber', 'JobTitle', 'Landline', 'PrefferedLanguage',
            'SalesOrgOption', 'DistributionChannelOption', 'DivisionOption'
        ];
        
        fieldsToTrack.forEach(field => {
            if (data[field] !== undefined && data[field] !== existingRequest[field]) {
                changes.push({
                    field,
                    oldValue: existingRequest[field],
                    newValue: data[field]
                });
            }
        });
        
        // Update main request
        db.prepare(`
            UPDATE requests 
            SET firstName = ?, firstNameAr = ?, tax = ?, CustomerType = ?, CompanyOwner = ?,
                buildingNumber = ?, street = ?, country = ?, city = ?,
                ContactName = ?, EmailAddress = ?, MobileNumber = ?, JobTitle = ?, Landline = ?, PrefferedLanguage = ?,
                SalesOrgOption = ?, DistributionChannelOption = ?, DivisionOption = ?,
                status = ?, assignedTo = ?, ComplianceStatus = ?, companyStatus = ?,
                rejectReason = ?, blockReason = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            data.firstName, data.firstNameAr, data.tax, data.CustomerType, data.CompanyOwner,
            data.buildingNumber, data.street, data.country, data.city,
            data.ContactName, data.EmailAddress, data.MobileNumber, data.JobTitle, data.Landline, data.PrefferedLanguage,
            data.SalesOrgOption, data.DistributionChannelOption, data.DivisionOption,
            data.status, data.assignedTo, data.ComplianceStatus, data.companyStatus,
            data.rejectReason, data.blockReason,
            id
        );
        console.log('Contacts received:', JSON.stringify(data.contacts, null, 2));
        // Handle contacts update with proper tracking
        // Handle contacts update with proper tracking
if (data.contacts && Array.isArray(data.contacts)) {
    // Get existing contacts for comparison
    const existingContacts = db.prepare('SELECT * FROM contacts WHERE requestId = ?').all(id);
    
    // Create maps for comparison
    const existingContactsMap = new Map();
    existingContacts.forEach(c => {
        existingContactsMap.set(c.id, c);
    });
    
    // Track contact changes
    data.contacts.forEach(contact => {
        if (typeof contact.id === 'number' && existingContactsMap.has(contact.id)) {
            // Existing contact - check for updates
            const existingContact = existingContactsMap.get(contact.id);
            
            // Build old and new value strings with ALL fields
            const oldContactString = buildContactString(existingContact);
            const newContactString = buildContactString(contact);
            
            // Check if any field changed
            if (oldContactString !== newContactString) {
                changes.push({
                    field: `Contact: ${contact.name || existingContact.name}`,
                    oldValue: oldContactString,
                    newValue: newContactString
                });
            }
            
            // Update the contact
            db.prepare(`
                UPDATE contacts 
                SET name = ?, jobTitle = ?, 
                    email = ?, mobile = ?, landline = ?, preferredLanguage = ?,
                    isPrimary = ?
                WHERE id = ?
            `).run(
                contact.name, contact.jobTitle,
                contact.email, contact.mobile, contact.landline, contact.preferredLanguage,
                contact.isPrimary || 0,
                contact.id
            );
            
            // Remove from map to track deletions
            existingContactsMap.delete(contact.id);
        } else if (typeof contact.id === 'string' || !contact.id) {
            // New contact (string ID or no ID means new)
            const newContactString = buildContactString(contact);
            changes.push({
                field: `Contact: ${contact.name}`,
                oldValue: null,
                newValue: newContactString
            });
            
            db.prepare(`
                INSERT INTO contacts (requestId, name, jobTitle, 
                                    email, mobile, landline, preferredLanguage, isPrimary, source, addedBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id, contact.name, contact.jobTitle,
                contact.email, contact.mobile, contact.landline, contact.preferredLanguage,
                contact.isPrimary || 0, 'Data Steward', data.updatedBy || 'data_entry'
            );
        }
    });
    
    // Check for deleted contacts (remaining in map)
    existingContactsMap.forEach(existingContact => {
        const oldContactString = buildContactString(existingContact);
        changes.push({
            field: `Contact: ${existingContact.name}`,
            oldValue: oldContactString,
            newValue: null
        });
        
        // Delete the contact
        db.prepare('DELETE FROM contacts WHERE id = ?').run(existingContact.id);
    });
}
        
        // Handle documents update - ENHANCED with filesystem support
        if (data.documents && Array.isArray(data.documents)) {
            console.log('📄 [UPDATE] Processing documents:', data.documents.length);
            
            // Get existing documents for comparison
            const existingDocuments = db.prepare('SELECT * FROM documents WHERE requestId = ?').all(id);
            
            // Create maps for easier comparison (use documentId as key)
            const existingDocsMap = new Map();
            existingDocuments.forEach(doc => {
                existingDocsMap.set(doc.documentId, doc);
            });
            
            const newDocsMap = new Map();
            data.documents.forEach(doc => {
                // ✅ FIX: Accept documents with EITHER contentBase64 OR fileUrl/document_path
                if (doc.name && (doc.contentBase64 || doc.fileUrl || doc.document_path)) {
                    const docId = doc.id || doc.documentId;
                    if (docId) {
                        newDocsMap.set(docId, doc);
                    }
                }
            });
            
            console.log('📄 [UPDATE] Existing documents:', existingDocsMap.size);
            console.log('📄 [UPDATE] New documents:', newDocsMap.size);
            
            // Track document changes
            const documentChanges = [];
            
            // Check for removed documents
            existingDocsMap.forEach((existingDoc, docId) => {
                if (!newDocsMap.has(docId)) {
                    console.log('📄 [UPDATE] Document removed:', existingDoc.name);
                    documentChanges.push({
                        field: `Document: ${existingDoc.name}`,
                        oldValue: existingDoc.name,
                        newValue: null,
                        changeType: 'Delete',
                        documentId: existingDoc.documentId
                    });
                }
            });
            
            // Check for added and modified documents
            newDocsMap.forEach((newDoc, docId) => {
                const existingDoc = existingDocsMap.get(docId);
                
                if (!existingDoc) {
                    // New document added
                    console.log('📄 [UPDATE] New document added:', newDoc.name);
                    documentChanges.push({
                        field: `Document: ${newDoc.name}`,
                        oldValue: null,
                        newValue: newDoc.name,
                        changeType: 'Create',
                        documentId: newDoc.id || newDoc.documentId
                    });
                } else {
                    // Document exists - check if we need to preserve filesystem path
                    console.log('📄 [UPDATE] Document exists, preserving:', newDoc.name);
                    // No change tracking needed - just preserve it
                }
            });
            
            console.log('📄 [UPDATE] Document changes:', documentChanges.length);
            
            // Only delete and re-insert documents if there are actual changes
            if (documentChanges.length > 0) {
                // Delete only the documents that were actually removed
                documentChanges.forEach(change => {
                    if (change.changeType === 'Delete') {
                        const docToDelete = existingDocuments.find(d => d.documentId === change.documentId);
                        if (docToDelete) {
                            console.log('🗑️ [UPDATE] Deleting document:', docToDelete.name);
                            db.prepare('DELETE FROM documents WHERE requestId = ? AND documentId = ?').run(id, change.documentId);
                        }
                    }
                });
                
                // Insert only new documents
                documentChanges.forEach(change => {
                    if (change.changeType === 'Create') {
                        const newDoc = data.documents.find(doc => (doc.id || doc.documentId) === change.documentId);
                        
                        if (newDoc && newDoc.name) {
                            const docTimestamp = new Date().toISOString();
                            
                            console.log('📄 [UPDATE] Inserting new document:', {
                                name: newDoc.name,
                                hasBase64: !!newDoc.contentBase64,
                                hasPath: !!newDoc.document_path,
                                hasFileUrl: !!newDoc.fileUrl
                            });
                            
                            db.prepare(`
                                INSERT INTO documents (requestId, documentId, name, type, description, size, mime, contentBase64, document_path, uploadedAt, uploadedBy, source)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).run(
                                id, 
                                newDoc.id || newDoc.documentId || nanoid(8),
                                newDoc.name, 
                                newDoc.type || 'other', 
                                newDoc.description || '',
                                newDoc.size || 0, 
                                newDoc.mime || 'application/octet-stream', 
                                newDoc.contentBase64 || '',  // ✅ Empty for filesystem docs
                                newDoc.document_path || null,  // ✅ NEW: Preserve filesystem path
                                docTimestamp,
                                data.updatedBy || 'system',
                                newDoc.source || 'Data Steward'
                            );
                            
                            console.log('✅ [UPDATE] Document inserted:', newDoc.name);
                        }
                    }
                });
            } else {
                console.log('✅ [UPDATE] No document changes detected - documents preserved');
            }
            
            // Add document changes to the main changes array only if there are actual changes
            if (documentChanges.length > 0) {
                changes.push(...documentChanges);
            }
        }
        
        // Log to workflow_history with detailed payload
        if (changes.length > 0) {
            const historyPayload = {
                changes,
                updatedBy: data.updatedBy || 'system',
                updateReason: data.updateReason || 'User update'
            };
            
            db.prepare(`
                INSERT INTO workflow_history (requestId, action, fromStatus, toStatus, 
                            performedBy, performedByRole, note, payload, performedAt)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(
               id, 'UPDATE', existingRequest.status, data.status,
    data.updatedBy || 'system', data.updatedByRole || 'data_entry',
    data.updateNote || 'Record updated',
    JSON.stringify(historyPayload)
            );
        }
        
        // Get updated request with contacts and documents
        const updatedRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
        updatedRequest.contacts = db.prepare('SELECT * FROM contacts WHERE requestId = ?').all(id);
        updatedRequest.documents = db.prepare('SELECT * FROM documents WHERE requestId = ?').all(id);
        
        res.json(updatedRequest);
        
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ error: 'Failed to update request', details: error.message });
    }
});


// Get data lineage for a request
app.get('/api/requests/:id/lineage', (req, res) => {
    try {
        const { id } = req.params;
        
        // Get workflow history
        const history = db.prepare(`
            SELECT * FROM workflow_history 
            WHERE requestId = ? 
            ORDER BY performedAt DESC
        `).all(id);
        
        // Process history to extract contact changes properly
        const processedHistory = history.map(entry => {
            let changes = [];
            
            if (entry.payload) {
                try {
                    const payload = JSON.parse(entry.payload);
                    if (payload.changes) {
                        changes = payload.changes.map(change => {
                            // Special handling for contact fields
                            if (change.field && change.field.startsWith('Contact:')) {
                                return {
                                    field: change.field,
                                    oldValue: change.oldValue,
                                    newValue: change.newValue,
                                    type: 'contact'
                                };
                            }
                            return {
                                ...change,
                                type: 'field'
                            };
                        });
                    }
                } catch (e) {
                    console.error('Error parsing payload:', e);
                }
            }
            
            return {
                ...entry,
                changes,
                performedAt: entry.performedAt,
                performedBy: entry.performedBy,
                source: entry.performedByRole || 'User'
            };
        });
        
        res.json({
            requestId: id,
            history: processedHistory,
            totalChanges: processedHistory.length
        });
        
    } catch (error) {
        console.error('Error getting lineage:', error);
        res.status(500).json({ error: 'Failed to get lineage', details: error.message });
    }
});


// Delete request
app.delete('/api/requests/:id', (req, res) => {
  try {
    const requestId = req.params.id;
    
    const current = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);
    
    if (!current) {
      return res.status(404).json({ message: 'Not found' });
    }
    
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM contacts WHERE requestId = ?").run(requestId);
      db.prepare("DELETE FROM documents WHERE requestId = ?").run(requestId);
      db.prepare("DELETE FROM issues WHERE requestId = ?").run(requestId);
      db.prepare("DELETE FROM workflow_history WHERE requestId = ?").run(requestId);
      db.prepare("DELETE FROM requests WHERE id = ?").run(requestId);
    });
    
    transaction();
    
    res.json({ ok: true, message: 'Request deleted successfully' });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Approve request - WITH QUARANTINE HANDLING
app.post('/api/requests/:id/approve', (req, res) => {
  try {
    const requestId = req.params.id;
    const { note, quarantineIds } = req.body;
    
    const current = db.prepare("SELECT status, originalRequestType FROM requests WHERE id = ?").get(requestId);
    
    if (!current) {
      return res.status(404).json({ message: 'Not found' });
    }
    
    const transaction = db.transaction(() => {
      // 1. وافق على الـ master record
      const stmt = db.prepare(`
        UPDATE requests 
        SET status = ?, 
            assignedTo = ?, 
            reviewedBy = ?, 
            updatedAt = ? 
        WHERE id = ?
      `);
      
      stmt.run('Approved', 'compliance', 'reviewer', new Date().toISOString(), requestId);
      
      // 2. حدث الـ quarantine records إذا موجودة
      if (quarantineIds && quarantineIds.length > 0) {
        console.log(`[APPROVE] Processing ${quarantineIds.length} quarantine records`);
        
        const quarantineStmt = db.prepare(`
          UPDATE requests 
          SET status = 'Quarantine',
              requestType = 'quarantine',
              originalRequestType = 'quarantine',  -- ✅ التعديل المطلوب: قطع العلاقة نهائياً بـ duplicate
              assignedTo = 'data_entry',
              masterId = NULL,
              isMaster = 0,
              isMerged = 0,
              mergedIntoId = NULL,
              notes = COALESCE(notes, '') || ' | Sent to quarantine (relationships cleared) after master approval on ' || datetime('now'),
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        quarantineIds.forEach(qId => {
          const result = quarantineStmt.run(qId);
          if (result.changes > 0) {
            console.log(`[APPROVE] Record ${qId} moved to Quarantine status with cleared relationships and originalRequestType changed to quarantine`);
            
            // Log workflow for each quarantine record
            logWorkflow(qId, 'SENT_TO_QUARANTINE', 'Linked', 'Quarantine', 
                       'reviewer', 'reviewer', 
                       'Sent to quarantine for separate processing after master approval - all duplicate relationships cleared and type changed',
                       { 
                         operation: 'quarantine_after_approval',
                         previousMasterId: requestId,
                         clearedRelationships: true,
                         originalRequestType: 'quarantine',  // ✅ تغيير لـ quarantine
                         previousOriginalType: 'duplicate'    // ✅ للتتبع: كان duplicate
                       });
          }
        });
      }
      
      // Log workflow for master
      logWorkflow(requestId, 'MASTER_APPROVE', current.status, 'Approved', 
                  'reviewer', 'reviewer', 
                  note || 'Approved by reviewer', 
                  { 
                    operation: 'reviewer_approve',
                    originalRequestType: current.originalRequestType,
                    quarantineRecords: quarantineIds || []
                  });
    });
    
    transaction();
    
    const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);
    res.json(updated);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// FIXED Reject request - Now properly handles quarantine records
app.post('/api/requests/:id/reject', (req, res) => {
  try {
    const requestId = req.params.id;
    const { reason } = req.body;
    
    const current = db.prepare("SELECT status, createdBy, requestType, originalRequestType FROM requests WHERE id = ?").get(requestId);
    
    if (!current) {
      return res.status(404).json({ message: 'Not found' });
    }
    
    // تحديد assignedTo بناءً على نوع السجل
    let assignedTo = 'data_entry'; // Default to data_entry
    
    // للتأكد من أن quarantine records ترجع لـ data_entry
    if (current.requestType === 'quarantine' || current.originalRequestType === 'quarantine') {
      assignedTo = 'data_entry';
      console.log(`[REJECT] Quarantine record detected, assigning to: ${assignedTo}`);
    } else if (current.createdBy) {
      // للسجلات العادية، أرجعها لمن أنشأها
      assignedTo = current.createdBy;
      // لكن تأكد أن يكون data_entry وليس system_import أو أي قيمة غريبة
      if (assignedTo === 'system_import' || assignedTo === 'system' || !assignedTo) {
        assignedTo = 'data_entry';
      }
      console.log(`[REJECT] Regular record, assigning to: ${assignedTo}`);
    }
    
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE requests 
        SET status = 'Rejected', 
            rejectReason = ?, 
            assignedTo = ?,
            reviewedBy = 'reviewer', 
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(
        reason || 'Rejected by reviewer',
        assignedTo,  // استخدم القيمة المحددة
        requestId
      );
      
      console.log(`[REJECT] Updated record ${requestId}: status=Rejected, assignedTo=${assignedTo}`);
      
      if (reason) {
        db.prepare(
          "INSERT INTO issues (requestId, description, reviewedBy) VALUES (?, ?, ?)"
        ).run(requestId, reason, 'reviewer');
      }
      
      logWorkflow(requestId, 'MASTER_REJECT', current.status, 'Rejected', 'reviewer', 'reviewer', reason,
                  { 
                    operation: 'reviewer_reject', 
                    rejectReason: reason,
                    requestType: current.requestType,
                    originalRequestType: current.originalRequestType,
                    assignedTo: assignedTo,
                    preservedTypes: true
                  });
    });
    
    transaction();
    
    const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);
    const contacts = db.prepare("SELECT * FROM contacts WHERE requestId = ?").all(requestId);
    const documents = db.prepare("SELECT * FROM documents WHERE requestId = ?").all(requestId);
    
    res.json({
      ...updated,
      contacts: contacts || [],
      documents: documents || []
    });
    
  } catch (err) {
    console.error('[REJECT] Error rejecting request:', err);
    res.status(500).json({ error: err.message });
  }
});

// Compliance approve
app.post('/api/requests/:id/compliance/approve', (req, res) => {
  try {
    const requestId = req.params.id;
    const { note } = req.body;
    
    const current = db.prepare("SELECT status, sourceGoldenId, originalRequestType FROM requests WHERE id = ?").get(requestId);
    
    if (!current) {
      return res.status(404).json({ message: 'Not found' });
    }
    
    const goldenCode = 'GR-' + nanoid(6).toUpperCase();
    
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE requests 
        SET ComplianceStatus = ?, 
            isGolden = 1, 
            companyStatus = ?, 
            goldenRecordCode = ?, 
            complianceBy = ?, 
            updatedAt = ? 
        WHERE id = ?
      `);
      
      stmt.run('Approved', 'Active', goldenCode, 'compliance', new Date().toISOString(), requestId);
      
      if (current.sourceGoldenId) {
        const supersede = db.prepare(`
          UPDATE requests 
          SET isGolden = 0,
              companyStatus = 'Superseded',
              ComplianceStatus = 'Superseded',
              blockReason = COALESCE(blockReason, '') || ' | Superseded by: ' || ?,
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        supersede.run(goldenCode, current.sourceGoldenId);
        
        logWorkflow(current.sourceGoldenId, 'GOLDEN_SUPERSEDE', 'Under Review', 'Superseded', 'system', 'system', 
                    `Superseded by new golden record: ${requestId} (${goldenCode})`,
                    { operation: 'supersede', newGoldenId: requestId, newGoldenCode: goldenCode });
        
        logWorkflow(requestId, 'GOLDEN_RESTORE', 'Approved', 'Active', 'compliance', 'compliance', 
                    `Became active golden record, replacing: ${current.sourceGoldenId}`,
                    { 
                      operation: 'golden_restore', 
                      replacedGoldenId: current.sourceGoldenId, 
                      goldenCode: goldenCode,
                      originalRequestType: current.originalRequestType
                    });
      } else {
        logWorkflow(requestId, 'COMPLIANCE_APPROVE', current.status, 'Approved', 'compliance', 'compliance', 
                    note || 'Approved as Golden Record',
                    { 
                      operation: 'compliance_approve', 
                      goldenCode: goldenCode,
                      originalRequestType: current.originalRequestType
                    });
      }
    });
    
    transaction();
    
    const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);
    res.json({ ...updated, goldenRecordCode: goldenCode });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Compliance block
app.post('/api/requests/:id/compliance/block', (req, res) => {
  try {
    const requestId = req.params.id;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Block reason is required' });
    }
    
    const current = db.prepare("SELECT status, sourceGoldenId, originalRequestType FROM requests WHERE id = ?").get(requestId);
    
    if (!current) {
      return res.status(404).json({ message: 'Not found' });
    }
    
    const goldenCode = 'GR-' + nanoid(6).toUpperCase();
    
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE requests 
        SET ComplianceStatus = ?, 
            isGolden = 1, 
            companyStatus = ?, 
            blockReason = ?, 
            goldenRecordCode = ?, 
            complianceBy = ?, 
            updatedAt = ? 
        WHERE id = ?
      `);
      
      stmt.run('Approved', 'Blocked', reason, goldenCode, 'compliance', new Date().toISOString(), requestId);
      
      if (current.sourceGoldenId) {
        const supersede = db.prepare(`
          UPDATE requests 
          SET isGolden = 0,
              companyStatus = 'Superseded',
              ComplianceStatus = 'Superseded',
              blockReason = COALESCE(blockReason, '') || ' | Superseded by blocked record: ' || ?,
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        supersede.run(goldenCode, current.sourceGoldenId);
        
        logWorkflow(current.sourceGoldenId, 'GOLDEN_SUPERSEDE', 'Under Review', 'Superseded', 'system', 'system', 
                    `Superseded by new blocked golden record: ${requestId} (${goldenCode})`,
                    { operation: 'supersede_blocked', newGoldenId: requestId, newGoldenCode: goldenCode });
      }
      
      logWorkflow(requestId, 'COMPLIANCE_BLOCK', current.status, 'Approved', 'compliance', 'compliance', reason,
                  { 
                    operation: 'compliance_block', 
                    blockReason: reason, 
                    goldenCode: goldenCode,
                    originalRequestType: current.originalRequestType
                  });
    });
    
    transaction();
    
    const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);
    res.json({ ...updated, goldenRecordCode: goldenCode });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Complete Quarantine Record
app.post('/api/requests/:id/complete-quarantine', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[QUARANTINE] POST /api/requests/${id}/complete-quarantine`);
    
    // Get current record
    const current = db.prepare("SELECT * FROM requests WHERE id = ?").get(id);
    
    if (!current) {
      return res.status(404).json({ 
        success: false, 
        error: 'Record not found' 
      });
    }
    
    if (current.status !== 'Quarantine') {
      return res.status(400).json({ 
        success: false, 
        error: 'Record is not in quarantine status' 
      });
    }
    
    // Update the record status
    const updateStmt = db.prepare(`
      UPDATE requests 
      SET status = 'Pending',
          assignedTo = 'reviewer',
          updatedAt = CURRENT_TIMESTAMP,
          notes = COALESCE(notes, '') || ' | Quarantine completed on ' || datetime('now')
      WHERE id = ?
    `);
    
    updateStmt.run(id);
    
    // Log workflow
    logWorkflow(
      id, 
      'QUARANTINE_COMPLETE', 
      'Quarantine', 
      'Pending', 
      'data_entry', 
      'data_entry', 
      'Quarantine record completed and sent for review',
      { 
        operation: 'complete_quarantine',
        originalRequestType: current.originalRequestType,
        completedFields: true
      }
    );
    
    // Get updated record
    const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(id);
    
    console.log(`[QUARANTINE] Record ${id} status changed from Quarantine to Pending`);
    
    res.json({
      success: true,
      message: 'Quarantine record completed successfully',
      record: updated
    });
    
  } catch (error) {
    console.error('[QUARANTINE] Error completing quarantine record:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Get workflow history
app.get('/api/requests/:id/history', (req, res) => {
  try {
    const history = db.prepare(
      "SELECT * FROM workflow_history WHERE requestId = ? ORDER BY performedAt DESC"
    ).all(req.params.id);
    
    const parsedHistory = history.map(entry => ({
      ...entry,
      payload: entry.payload ? JSON.parse(entry.payload) : null
    }));
    
    res.json(parsedHistory || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      total: db.prepare("SELECT COUNT(*) as count FROM requests").get().count,
      pending: db.prepare("SELECT COUNT(*) as count FROM requests WHERE status = 'Pending'").get().count,
      approved: db.prepare("SELECT COUNT(*) as count FROM requests WHERE status = 'Approved'").get().count,
      rejected: db.prepare("SELECT COUNT(*) as count FROM requests WHERE status = 'Rejected'").get().count,
      quarantined: db.prepare("SELECT COUNT(*) as count FROM requests WHERE status = 'Quarantine'").get().count,
      golden: db.prepare("SELECT COUNT(*) as count FROM requests WHERE isGolden = 1").get().count,
      active: db.prepare("SELECT COUNT(*) as count FROM requests WHERE companyStatus = 'Active'").get().count,
      blocked: db.prepare("SELECT COUNT(*) as count FROM requests WHERE companyStatus = 'Blocked'").get().count,
      byOrigin: db.prepare(`
        SELECT origin, COUNT(*) as count 
        FROM requests 
        GROUP BY origin
      `).all(),
      byStatus: db.prepare(`
        SELECT status, COUNT(*) as count 
        FROM requests 
        GROUP BY status
      `).all(),
      bySourceSystem: db.prepare(`
        SELECT sourceSystem, COUNT(*) as count 
        FROM requests 
        GROUP BY sourceSystem
      `).all(),
      byRequestType: db.prepare(`
        SELECT requestType, COUNT(*) as count 
        FROM requests 
        GROUP BY requestType
      `).all(),
      byOriginalRequestType: db.prepare(`
        SELECT originalRequestType, COUNT(*) as count 
        FROM requests 
        GROUP BY originalRequestType
      `).all()
    };
    
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============= DUPLICATE MANAGEMENT ENDPOINTS =============

// Get unprocessed duplicate records
app.get('/api/duplicates', (req, res) => {
  try {
    console.log('[DUPLICATES] GET /api/duplicates - Getting unprocessed duplicates');
    
    const query = `
      SELECT 
        r.id, r.requestId, r.firstName, r.firstNameAr, r.tax,
        r.CustomerType, r.CompanyOwner, r.buildingNumber, r.street,
        r.country, r.city, r.ContactName, r.EmailAddress,
        r.MobileNumber, r.JobTitle, r.Landline, r.PrefferedLanguage,
        r.SalesOrgOption, r.DistributionChannelOption, r.DivisionOption,
        r.status, r.sourceSystem, r.masterId, r.isMaster, r.confidence,
        r.createdAt, r.updatedAt, r.requestType, r.originalRequestType,
        r.assignedTo
      FROM requests r 
      WHERE r.status IN ('Duplicate', 'New', 'Draft') 
        AND r.isMaster != 1
        AND r.masterId IS NULL
        AND (r.isMerged IS NULL OR r.isMerged != 1)
      ORDER BY r.createdAt DESC
    `;
    
    const records = db.prepare(query).all();
    console.log(`[DUPLICATES] Found ${records.length} unprocessed duplicate records`);
    
    res.json({
      success: true,
      totalRecords: records.length,
      records: records
    });
    
  } catch (error) {
    console.error('[DUPLICATES] Error fetching duplicates:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Get quarantine records
app.get('/api/duplicates/quarantine', (req, res) => {
  try {
    console.log('[QUARANTINE] GET /api/duplicates/quarantine - Getting quarantine records');
    
    const query = `
      SELECT 
        r.id, r.requestId, r.firstName, r.firstNameAr, r.tax,
        r.CustomerType, r.CompanyOwner, r.buildingNumber, r.street,
        r.country, r.city, r.ContactName, r.EmailAddress,
        r.MobileNumber, r.JobTitle, r.Landline, r.PrefferedLanguage,
        r.SalesOrgOption, r.DistributionChannelOption, r.DivisionOption,
        r.status, r.sourceSystem, r.masterId, r.isMaster, r.confidence,
        r.notes, r.createdAt, r.updatedAt, r.requestType, r.originalRequestType,
        r.assignedTo
      FROM requests r 
      WHERE r.status = 'Quarantine'
      ORDER BY r.createdAt DESC
    `;
    
    const records = db.prepare(query).all();
    console.log(`[QUARANTINE] Found ${records.length} quarantine records`);
    
    // Get contacts and documents for each record
    const getContacts = db.prepare("SELECT * FROM contacts WHERE requestId = ?");
    const getDocuments = db.prepare("SELECT * FROM documents WHERE requestId = ?");
    
    const processedRecords = records.map(record => {
      const contacts = getContacts.all(record.id);
      const documents = getDocuments.all(record.id);
      
      return {
        ...record,
        contacts: contacts || [],
        documents: documents || []
      };
    });
    
    res.json({
      success: true,
      totalRecords: processedRecords.length,
      records: processedRecords
    });
    
  } catch (error) {
    console.error('[QUARANTINE] Error fetching quarantine records:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Get golden records
app.get('/api/duplicates/golden', (req, res) => {
  try {
    console.log('[GOLDEN] GET /api/duplicates/golden - Getting golden records');
    
    const query = `
      SELECT 
        r.id, r.requestId, r.firstName, r.firstNameAr, r.tax,
        r.CustomerType, r.CompanyOwner, r.buildingNumber, r.street,
        r.country, r.city, r.ContactName, r.EmailAddress,
        r.MobileNumber, r.JobTitle, r.Landline, r.PrefferedLanguage,
        r.SalesOrgOption, r.DistributionChannelOption, r.DivisionOption,
        r.status, r.ComplianceStatus, r.companyStatus, r.sourceSystem, 
        r.isGolden, r.goldenRecordCode,
        r.createdAt, r.updatedAt, r.requestType, r.originalRequestType
      FROM requests r 
      WHERE r.isGolden = 1 
        OR r.status = 'Golden'
        OR r.isMaster = 1
      ORDER BY r.createdAt DESC
    `;
    
    const records = db.prepare(query).all();
    console.log(`[GOLDEN] Found ${records.length} golden records`);
    
    res.json({
      success: true,
      totalRecords: records.length,
      records: records
    });
    
  } catch (error) {
    console.error('[GOLDEN] Error fetching golden records:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Get all duplicate groups
app.get('/api/duplicates/groups', (req, res) => {
  try {
    console.log('[DUPLICATES] GET /api/duplicates/groups - Getting active duplicate groups only');
    
    const query = `
      SELECT 
        r.tax as taxNumber,
        MIN(r.firstName) as firstName,
        COUNT(*) as recordCount
      FROM requests r
      WHERE r.status IN ('Duplicate', 'Linked')
        AND (r.isMerged IS NULL OR r.isMerged != 1)
      GROUP BY r.tax
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `;

    const groups = db.prepare(query).all();
    console.log(`[DUPLICATES] Found ${groups.length} active duplicate groups`);

    const processedGroups = groups.map(group => ({
      taxNumber: group.taxNumber,
      groupName: `${group.firstName} Group`,
      duplicatesCount: group.recordCount,
      totalRecords: group.recordCount
    }));

    res.json({
      success: true,
      totalGroups: processedGroups.length,
      groups: processedGroups
    });

  } catch (error) {
    console.error('[DUPLICATES] Error getting groups:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Get specific duplicate group by tax number
app.get('/api/duplicates/by-tax/:taxNumber', (req, res) => {
  try {
    const { taxNumber } = req.params;
    console.log(`[DUPLICATES] GET /api/duplicates/by-tax/${taxNumber} - Getting specific group`);

    const query = `
      SELECT 
        r.id, r.requestId, r.firstName, r.firstNameAr, r.tax,
        r.CustomerType, r.CompanyOwner, r.buildingNumber, r.street,
        r.country, r.city, r.ContactName, r.EmailAddress,
        r.MobileNumber, r.JobTitle, r.Landline, r.PrefferedLanguage,
        r.SalesOrgOption, r.DistributionChannelOption, r.DivisionOption,
        r.status, r.sourceSystem, r.masterId, r.isMaster, r.confidence,
        r.createdAt, r.updatedAt, r.isMerged, r.mergedIntoId,
        r.requestType, r.originalRequestType
      FROM requests r 
      WHERE r.tax = ? AND (r.isMerged IS NULL OR r.isMerged != 1)
      ORDER BY r.isMaster DESC, r.createdAt ASC
    `;

    const records = db.prepare(query).all(taxNumber);

    if (records.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No records found', 
        message: `No duplicate records found for tax number: ${taxNumber}` 
      });
    }

    console.log(`[DUPLICATES] Found ${records.length} records for tax number: ${taxNumber}`);

    const getContacts = db.prepare("SELECT * FROM contacts WHERE requestId = ?");
    const getDocuments = db.prepare("SELECT id, requestId, documentId, name, type, description, size, mime, uploadedBy, uploadedAt FROM documents WHERE requestId = ?");

    const processedRecords = records.map(record => {
      const contacts = getContacts.all(record.id);
      const documents = getDocuments.all(record.id);

      return {
        ...record,
        isMaster: record.isMaster === 1,
        isMerged: record.isMerged === 1,
        confidence: record.confidence || 0.9,
        contacts: contacts || [],
        documents: documents || []
      };
    });

    const masterRecord = processedRecords.find(r => r.isMaster);
    const groupName = masterRecord ? `${masterRecord.firstName} Group` : `Tax ${taxNumber} Group`;

    res.json({
      success: true,
      taxNumber: taxNumber,
      groupName: groupName,
      totalRecords: records.length,
      records: processedRecords
    });

  } catch (error) {
    console.error('[DUPLICATES] Error getting group by tax:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Get specific duplicate group by master ID
app.get('/api/duplicates/group/:masterId', (req, res) => {
  try {
    const { masterId } = req.params;
    console.log(`[DUPLICATES] GET /api/duplicates/group/${masterId} - Getting group by master ID`);

    const masterQuery = `SELECT * FROM requests WHERE id = ? AND isMaster = 1`;
    const master = db.prepare(masterQuery).get(masterId);

    if (!master) {
      return res.status(404).json({ 
        success: false,
        error: 'Master record not found', 
        message: `No master record found with ID: ${masterId}` 
      });
    }

    const groupQuery = `
      SELECT 
        r.id, r.requestId, r.firstName, r.firstNameAr, r.tax,
        r.CustomerType, r.CompanyOwner, r.buildingNumber, r.street,
        r.country, r.city, r.ContactName, r.EmailAddress,
        r.MobileNumber, r.JobTitle, r.Landline, r.PrefferedLanguage,
        r.SalesOrgOption, r.DistributionChannelOption, r.DivisionOption,
        r.status, r.sourceSystem, r.masterId, r.isMaster, r.confidence,
        r.createdAt, r.updatedAt, r.isMerged, r.mergedIntoId,
        r.requestType, r.originalRequestType
      FROM requests r 
      WHERE (r.id = ? OR r.masterId = ?) AND (r.isMerged IS NULL OR r.isMerged != 1)
      ORDER BY r.isMaster DESC, r.createdAt ASC
    `;

    const records = db.prepare(groupQuery).all(masterId, masterId);
    console.log(`[DUPLICATES] Found ${records.length} records in group ${masterId}`);

    const getContacts = db.prepare("SELECT * FROM contacts WHERE requestId = ?");
    const getDocuments = db.prepare("SELECT * FROM documents WHERE requestId = ?");

    const processedRecords = records.map(record => {
      const contacts = getContacts.all(record.id);
      const documents = getDocuments.all(record.id);

      return {
        ...record,
        isMaster: record.isMaster === 1,
        isMerged: record.isMerged === 1,
        confidence: record.confidence || 0.9,
        contacts: contacts || [],
        documents: documents || []
      };
    });

    res.json({
      success: true,
      masterId: masterId,
      taxNumber: master.tax,
      groupName: `${master.firstName} Group`,
      totalRecords: records.length,
      records: processedRecords
    });

  } catch (error) {
    console.error('[DUPLICATES] Error getting group by master ID:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Merge duplicate records
app.post('/api/duplicates/merge', (req, res) => {
  try {
    const { masterId, duplicateIds } = req.body;
    console.log(`[DUPLICATES] POST /api/duplicates/merge - Master: ${masterId}, Duplicates:`, duplicateIds);

    if (!masterId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid merge request',
        message: 'masterId and duplicateIds array are required' 
      });
    }

    const masterRecord = db.prepare("SELECT * FROM requests WHERE id = ? AND isMaster = 1").get(masterId);
    if (!masterRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Master record not found',
        message: `No master record found with ID: ${masterId}` 
      });
    }

    const transaction = db.transaction(() => {
      const mergeStmt = db.prepare(`
        UPDATE requests 
        SET isMerged = 1, 
            mergedIntoId = ?,
            status = 'Merged',
            notes = COALESCE(notes, '') || ' | Merged into master record: ' || ? || ' on ' || datetime('now'),
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND masterId = ?
      `);

      let mergedCount = 0;
      duplicateIds.forEach(duplicateId => {
        if (duplicateId !== masterId) {
          const result = mergeStmt.run(masterId, masterId, duplicateId, masterId);
          if (result.changes > 0) {
            mergedCount++;
            
            logWorkflow(duplicateId, 'MERGED', 'Duplicate', 'Merged', 
                        'system', 'system', 
                        `Merged into master record: ${masterId}`,
                        { 
                          operation: 'duplicate_merge', 
                          masterId: masterId,
                          masterName: masterRecord.firstName,
                          mergeTimestamp: new Date().toISOString()
                        });
          }
        }
      });

      if (mergedCount > 0) {
        logWorkflow(masterId, 'MERGE_MASTER', masterRecord.status, masterRecord.status, 
                    'system', 'system', 
                    `${mergedCount} duplicate records merged into this master record`,
                    { 
                      operation: 'master_merge_complete', 
                      mergedDuplicates: duplicateIds,
                      mergedCount: mergedCount,
                      mergeTimestamp: new Date().toISOString()
                    });
      }

      return mergedCount;
    });

    const mergedCount = transaction();

    console.log(`[DUPLICATES] Merged ${mergedCount} records into master ${masterId}`);

    res.json({
      success: true,
      message: `Successfully merged ${mergedCount} duplicate records`,
      masterId: masterId,
      mergedCount: mergedCount,
      mergedIds: duplicateIds.filter(id => id !== masterId)
    });

  } catch (error) {
    console.error('[DUPLICATES] Error merging records:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Build master record from selected fields
app.post('/api/duplicates/build-master', (req, res) => {
  try {
    const { 
      taxNumber, 
      selectedFields, 
      duplicateIds, 
      quarantineIds = [],
      masterContacts = [],
      masterDocuments = [],
      manualFields = {},
      masterData = {},
      builtFromRecords = {},
      fromQuarantine = false
    } = req.body;

    console.log(`[BUILDER] POST /api/duplicates/build-master - Tax: ${taxNumber}`);
    console.log(`[BUILDER] Duplicate IDs (TRUE duplicates):`, duplicateIds);
    console.log(`[BUILDER] Quarantine IDs (NOT duplicates):`, quarantineIds);
    console.log(`[BUILDER] From Quarantine:`, fromQuarantine);
    
    if (!taxNumber || !selectedFields || !duplicateIds || duplicateIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid build request',
        message: 'taxNumber, selectedFields, and duplicateIds are required' 
      });
    }

    const allRecords = db.prepare(`
      SELECT * FROM requests WHERE tax = ? AND (isMerged IS NULL OR isMerged != 1)
    `).all(taxNumber);

    if (allRecords.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No records found',
        message: `No records found for tax number: ${taxNumber}` 
      });
    }

    const transaction = db.transaction(() => {
      const masterId = nanoid(8);
      const finalMasterData = masterData.firstName ? masterData : {};
      
      if (!finalMasterData.firstName) {
        Object.keys(selectedFields).forEach(fieldName => {
          const sourceRecordId = selectedFields[fieldName];
          if (sourceRecordId === 'MANUAL_ENTRY') {
            finalMasterData[fieldName] = manualFields[fieldName] || '';
          } else if (sourceRecordId && !sourceRecordId.startsWith('MANUAL_')) {
            const sourceRecord = allRecords.find(r => r.id === sourceRecordId);
            if (sourceRecord) {
              finalMasterData[fieldName] = sourceRecord[fieldName];
            }
          }
        });
      }

      const reqType = fromQuarantine ? 'quarantine' : 'duplicate';
      const origReqType = fromQuarantine ? 'quarantine' : 'duplicate';

      const insertMaster = db.prepare(`
        INSERT INTO requests (
          id, firstName, firstNameAr, tax, CustomerType, CompanyOwner,
          buildingNumber, street, country, city,
          ContactName, EmailAddress, MobileNumber, JobTitle, Landline, PrefferedLanguage,
          SalesOrgOption, DistributionChannelOption, DivisionOption,
          status, assignedTo, sourceSystem, isMaster, confidence,
          builtFromRecords, selectedFieldSources, buildStrategy,
          createdAt, createdBy, requestType, originalRequestType
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // FIXED: Include the actual records data, not just IDs
      const finalBuiltFromRecords = {
        trueDuplicates: duplicateIds,
        quarantineRecords: quarantineIds,
        totalProcessed: duplicateIds.length + quarantineIds.length,
        fromQuarantine: fromQuarantine
      };

      // Add the actual record data with numeric keys
      if (builtFromRecords && Object.keys(builtFromRecords).length > 0) {
        // If builtFromRecords already has the data, use it
        Object.assign(finalBuiltFromRecords, builtFromRecords);
      } else {
        // Otherwise, build it from allRecords
        let recordIndex = 0;
        allRecords.forEach(record => {
          // Include all records that are part of the duplicate/quarantine sets
          if (duplicateIds.includes(record.id) || quarantineIds.includes(record.id)) {
            finalBuiltFromRecords[recordIndex] = {
              id: record.id,
              firstName: record.firstName,
              firstNameAr: record.firstNameAr,
              tax: record.tax,
              CustomerType: record.CustomerType,
              CompanyOwner: record.CompanyOwner,
              buildingNumber: record.buildingNumber,
              street: record.street,
              country: record.country,
              city: record.city,
              ContactName: record.ContactName,
              EmailAddress: record.EmailAddress,
              MobileNumber: record.MobileNumber,
              JobTitle: record.JobTitle,
              Landline: record.Landline,
              PrefferedLanguage: record.PrefferedLanguage,
              SalesOrgOption: record.SalesOrgOption,
              DistributionChannelOption: record.DistributionChannelOption,
              DivisionOption: record.DivisionOption,
              sourceSystem: record.sourceSystem,
              status: record.status,
              recordName: record.firstName
            };
            recordIndex++;
          }
        });
      }

      insertMaster.run(
        masterId,
        finalMasterData.firstName || '',
        finalMasterData.firstNameAr || '',
        taxNumber,
        finalMasterData.CustomerType || '',
        finalMasterData.CompanyOwner || '',
        finalMasterData.buildingNumber || '',
        finalMasterData.street || '',
        finalMasterData.country || '',
        finalMasterData.city || '',
        finalMasterData.ContactName || '',
        finalMasterData.EmailAddress || '',
        finalMasterData.MobileNumber || '',
        finalMasterData.JobTitle || '',
        finalMasterData.Landline || '',
        finalMasterData.PrefferedLanguage || '',
        finalMasterData.SalesOrgOption || '',
        finalMasterData.DistributionChannelOption || '',
        finalMasterData.DivisionOption || '',
        'Pending',
        'reviewer',
        'Master Builder',
        1,
        0.95,
        JSON.stringify(finalBuiltFromRecords),
        JSON.stringify(selectedFields),
        'manual',
        new Date().toISOString(),
        'data_entry',
        reqType,
        origReqType
      );

      if (masterContacts.length > 0) {
        const insertContact = db.prepare(`
          INSERT INTO contacts (requestId, name, jobTitle, email, mobile, landline, preferredLanguage, isPrimary, source, addedBy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        masterContacts.forEach((contact, index) => {
          const contactName = contact.name || 
                            contact.ContactName || 
                            contact.contactName || 
                            (contact.email ? contact.email.split('@')[0] : '') ||
                            (contact.jobTitle ? `${contact.jobTitle} Contact` : '') ||
                            `Contact ${index + 1}`;
          
          insertContact.run(
            masterId,
            contactName,
            contact.jobTitle || '',
            contact.email || '',
            contact.mobile || '',
            contact.landline || '',
            contact.preferredLanguage || 'EN',
            contact.isPrimary ? 1 : 0,
            contact.sourceRecord || contact.source || 'Master Builder',
            'data_entry'
          );
        });
      }

      if (masterDocuments.length > 0) {
        const insertDoc = db.prepare(`
          INSERT INTO documents (requestId, documentId, name, type, description, size, mime, contentBase64, source, uploadedBy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        masterDocuments.forEach(doc => {
          insertDoc.run(
            masterId,
            doc.documentId || nanoid(8),
            doc.name,
            doc.type,
            doc.description,
            doc.size,
            doc.mime,
            doc.contentBase64 || '',
            doc.sourceRecord || 'Master Builder',
            'data_entry'
          );
        });
      }

      let linkedCount = 0;
      if (duplicateIds.length > 0) {
        const linkDuplicatesStmt = db.prepare(`
          UPDATE requests 
          SET masterId = ?, 
              isMaster = 0,
              status = 'Linked',
              notes = COALESCE(notes, '') || ' | Linked to built master: ' || ? || ' on ' || datetime('now') || ' (CONFIRMED DUPLICATE)',
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND tax = ?
        `);

        duplicateIds.forEach(duplicateId => {
          if (duplicateId !== masterId && !duplicateId.startsWith('MANUAL_')) {
            const result = linkDuplicatesStmt.run(masterId, masterId, duplicateId, taxNumber);
            if (result.changes > 0) {
              linkedCount++;
              
              logWorkflow(duplicateId, 'LINKED_TO_MASTER', 'Duplicate', 'Linked', 
                          'data_entry', 'data_entry', 
                          `Confirmed as true duplicate and linked to built master record: ${masterId}`,
                          { 
                            operation: 'link_true_duplicate', 
                            masterId: masterId,
                            buildStrategy: 'manual',
                            recordType: 'confirmed_duplicate'
                          });
            }
          }
        });
      }

      let quarantineCount = 0;
      if (quarantineIds.length > 0) {
        const quarantineStmt = db.prepare(`
          UPDATE requests 
          SET status = 'Quarantine',
              requestType = 'quarantine',
              masterId = NULL,
              assignedTo = 'data_entry',
              isMaster = 0,
              isMerged = 0,
              mergedIntoId = NULL,
              notes = COALESCE(notes, '') || ' | Moved to quarantine on ' || datetime('now') || ' - Not a true duplicate, previously considered for master: ' || ?,
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND tax = ?
        `);

        quarantineIds.forEach(quarantineId => {
          if (quarantineId !== masterId && !quarantineId.startsWith('MANUAL_')) {
            const result = quarantineStmt.run(masterId, quarantineId, taxNumber);
            if (result.changes > 0) {
              quarantineCount++;
              
              logWorkflow(quarantineId, 'MOVED_TO_QUARANTINE', 'Duplicate', 'Quarantine', 
                          'data_entry', 'data_entry', 
                          `Determined NOT to be a true duplicate - moved to quarantine with cleared relationships`,
                          { 
                            operation: 'quarantine_non_duplicate', 
                            previousMasterId: masterId,
                            reason: 'Not a true duplicate - moved to quarantine',
                            clearedRelationships: true,
                            recordType: 'quarantine'
                          });
            }
          }
        });
      }

      // FIXED: Include the actual data in the workflow log
      logWorkflow(masterId, 'MASTER_BUILT', null, 'Pending', 
                  'data_entry', 'data_entry', 
                  `Master record built from ${duplicateIds.length} true duplicates and ${quarantineCount} quarantine records`,
                  { 
                    operation: 'build_master', 
                    sourceRecords: duplicateIds,
                    quarantineRecords: quarantineIds,
                    selectedFields: selectedFields,
                    selectedFieldSources: selectedFields, // Add this for clarity
                    builtFromRecords: finalBuiltFromRecords, // Include the full data
                    data: finalMasterData, // Include the master data
                    linkedCount: linkedCount,
                    quarantineCount: quarantineCount,
                    contactsAdded: masterContacts.length,
                    documentsAdded: masterDocuments.length,
                    fromQuarantine: fromQuarantine,
                    originalRequestType: origReqType
                  });

      return { 
        masterId, 
        linkedCount, 
        quarantineCount,
        contactsAdded: masterContacts.length,
        documentsAdded: masterDocuments.length
      };
    });

    const result = transaction();

    console.log(`[BUILDER] Built master ${result.masterId}:`);
    console.log(`  - ${result.linkedCount} TRUE duplicates linked`);
    console.log(`  - ${result.quarantineCount} records quarantined (NOT duplicates)`);
    console.log(`  - ${result.contactsAdded} contacts added`);
    console.log(`  - ${result.documentsAdded} documents added`);

    res.json({
      success: true,
      message: `Master record built successfully`,
      masterId: result.masterId,
      linkedCount: result.linkedCount,
      quarantineCount: result.quarantineCount,
      contactsAdded: result.contactsAdded,
      documentsAdded: result.documentsAdded,
      taxNumber: taxNumber,
      summary: {
        trueDuplicates: duplicateIds,
        quarantineRecords: quarantineIds,
        totalProcessed: duplicateIds.length + quarantineIds.length
      }
    });

  } catch (error) {
    console.error('[BUILDER] Error building master:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Resubmit rejected duplicate master record
app.post('/api/duplicates/resubmit-master', (req, res) => {
  try {
    const { 
      taxNumber, 
      selectedFields, 
      duplicateIds, 
      quarantineIds = [],
      masterContacts = [],
      masterDocuments = [],
      manualFields = {},
      masterData = {},
      originalRecordId,
      isResubmission,
      builtFromRecords = {}
    } = req.body;

    console.log(`[RESUBMIT] POST /api/duplicates/resubmit-master - Tax: ${taxNumber}`);
    console.log(`[RESUBMIT] Original Record ID: ${originalRecordId}`);
    console.log(`[RESUBMIT] Is Resubmission: ${isResubmission}`);
    
    if (!originalRecordId || !isResubmission) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid resubmission request',
        message: 'originalRecordId and isResubmission flag are required' 
      });
    }

    const originalRecord = db.prepare("SELECT originalRequestType FROM requests WHERE id = ?").get(originalRecordId);
    
    const allRecords = db.prepare(`
      SELECT * FROM requests WHERE tax = ? AND (isMerged IS NULL OR isMerged != 1) AND id != ?
    `).all(taxNumber, originalRecordId);

    const transaction = db.transaction(() => {
      const updateMaster = db.prepare(`
        UPDATE requests SET
          firstName = ?, firstNameAr = ?, CustomerType = ?, CompanyOwner = ?,
          buildingNumber = ?, street = ?, country = ?, city = ?,
          ContactName = ?, EmailAddress = ?, MobileNumber = ?, JobTitle = ?, 
          Landline = ?, PrefferedLanguage = ?,
          SalesOrgOption = ?, DistributionChannelOption = ?, DivisionOption = ?,
          status = 'Pending',
          assignedTo = 'reviewer',
          rejectReason = NULL,
          requestType = 'duplicate',
          builtFromRecords = ?,
          selectedFieldSources = ?,
          notes = COALESCE(notes, '') || ' | Resubmitted after rejection on ' || datetime('now'),
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const finalMasterData = masterData.firstName ? masterData : {};
      if (!finalMasterData.firstName) {
        Object.keys(selectedFields).forEach(fieldName => {
          const sourceRecordId = selectedFields[fieldName];
          if (sourceRecordId === 'MANUAL_ENTRY') {
            finalMasterData[fieldName] = manualFields[fieldName] || '';
          } else if (sourceRecordId && !sourceRecordId.startsWith('MANUAL_')) {
            const sourceRecord = allRecords.find(r => r.id === sourceRecordId);
            if (sourceRecord) {
              finalMasterData[fieldName] = sourceRecord[fieldName];
            }
          }
        });
      }

      const finalBuiltFromRecords = {
        trueDuplicates: duplicateIds,
        quarantineRecords: quarantineIds,
        totalProcessed: duplicateIds.length + quarantineIds.length,
        resubmission: true,
        originalRequestType: originalRecord?.originalRequestType,
        ...builtFromRecords
      };

      updateMaster.run(
        finalMasterData.firstName || '',
        finalMasterData.firstNameAr || '',
        finalMasterData.CustomerType || '',
        finalMasterData.CompanyOwner || '',
        finalMasterData.buildingNumber || '',
        finalMasterData.street || '',
        finalMasterData.country || '',
        finalMasterData.city || '',
        finalMasterData.ContactName || '',
        finalMasterData.EmailAddress || '',
        finalMasterData.MobileNumber || '',
        finalMasterData.JobTitle || '',
        finalMasterData.Landline || '',
        finalMasterData.PrefferedLanguage || '',
        finalMasterData.SalesOrgOption || '',
        finalMasterData.DistributionChannelOption || '',
        finalMasterData.DivisionOption || '',
        JSON.stringify(finalBuiltFromRecords),
        JSON.stringify(selectedFields),
        originalRecordId
      );

      db.prepare("DELETE FROM contacts WHERE requestId = ?").run(originalRecordId);
      db.prepare("DELETE FROM documents WHERE requestId = ?").run(originalRecordId);

      if (masterContacts.length > 0) {
        const insertContact = db.prepare(`
          INSERT INTO contacts (requestId, name, jobTitle, email, mobile, landline, preferredLanguage, isPrimary, source, addedBy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        masterContacts.forEach((contact, index) => {
          const contactName = contact.name || 
                            contact.ContactName || 
                            contact.contactName || 
                            (contact.email ? contact.email.split('@')[0] : '') ||
                            (contact.jobTitle ? `${contact.jobTitle} Contact` : '') ||
                            `Contact ${index + 1}`;
          
          insertContact.run(
            originalRecordId,
            contactName,
            contact.jobTitle || '',
            contact.email || '',
            contact.mobile || '',
            contact.landline || '',
            contact.preferredLanguage || 'EN',
            contact.isPrimary ? 1 : 0,
            contact.sourceRecord || contact.source || 'Master Builder',
            'data_entry'
          );
        });
      }

      if (masterDocuments.length > 0) {
        const insertDoc = db.prepare(`
          INSERT INTO documents (requestId, documentId, name, type, description, size, mime, contentBase64, source, uploadedBy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        masterDocuments.forEach(doc => {
          insertDoc.run(
            originalRecordId,
            doc.documentId || nanoid(8),
            doc.name,
            doc.type,
            doc.description,
            doc.size,
            doc.mime,
            doc.contentBase64 || '',
            doc.sourceRecord || 'Master Builder',
            'data_entry'
          );
        });
      }

      let linkedCount = 0;
      if (duplicateIds.length > 0) {
        const linkDuplicatesStmt = db.prepare(`
          UPDATE requests 
          SET masterId = ?, 
              isMaster = 0,
              status = 'Linked',
              notes = COALESCE(notes, '') || ' | Re-linked to resubmitted master: ' || ? || ' on ' || datetime('now'),
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND tax = ?
        `);

        duplicateIds.forEach(duplicateId => {
          if (duplicateId !== originalRecordId && !duplicateId.startsWith('MANUAL_')) {
            const result = linkDuplicatesStmt.run(originalRecordId, originalRecordId, duplicateId, taxNumber);
            if (result.changes > 0) {
              linkedCount++;
            }
          }
        });
      }

      let quarantineCount = 0;
      if (quarantineIds.length > 0) {
        const quarantineStmt = db.prepare(`
          UPDATE requests 
          SET status = 'Quarantine',
              masterId = ?,
              assignedTo = 'data_entry',
              notes = COALESCE(notes, '') || ' | Re-quarantined on ' || datetime('now'),
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ? AND tax = ?
        `);

        quarantineIds.forEach(quarantineId => {
          if (quarantineId !== originalRecordId && !quarantineId.startsWith('MANUAL_')) {
            const result = quarantineStmt.run(originalRecordId, quarantineId, taxNumber);
            if (result.changes > 0) {
              quarantineCount++;
            }
          }
        });
      }

      logWorkflow(originalRecordId, 'MASTER_RESUBMITTED', 'Rejected', 'Pending', 
                  'data_entry', 'data_entry', 
                  `Master record resubmitted after rejection. Fixed issues and resubmitted for review.`,
                  { 
                    operation: 'resubmit_master', 
                    sourceRecords: duplicateIds,
                    quarantineRecords: quarantineIds,
                    selectedFields: selectedFields,
                    linkedCount: linkedCount,
                    quarantineCount: quarantineCount,
                    contactsAdded: masterContacts.length,
                    documentsAdded: masterDocuments.length,
                    isResubmission: true,
                    originalRequestType: originalRecord?.originalRequestType
                  });

      return { 
        masterId: originalRecordId, 
        linkedCount, 
        quarantineCount,
        contactsAdded: masterContacts.length,
        documentsAdded: masterDocuments.length
      };
    });

    const result = transaction();

    console.log(`[RESUBMIT] Resubmitted master ${result.masterId}:`);
    console.log(`  - ${result.linkedCount} duplicates re-linked`);
    console.log(`  - ${result.quarantineCount} records re-quarantined`);
    console.log(`  - ${result.contactsAdded} contacts added`);
    console.log(`  - ${result.documentsAdded} documents added`);

    res.json({
      success: true,
      message: `Master record resubmitted successfully`,
      masterId: result.masterId,
      linkedCount: result.linkedCount,
      quarantineCount: result.quarantineCount,
      contactsAdded: result.contactsAdded,
      documentsAdded: result.documentsAdded,
      taxNumber: taxNumber,
      summary: {
        trueDuplicates: duplicateIds,
        quarantineRecords: quarantineIds,
        totalProcessed: duplicateIds.length + quarantineIds.length,
        resubmission: true
      }
    });

  } catch (error) {
    console.error('[RESUBMIT] Error resubmitting master:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// Get smart field recommendations
app.post('/api/duplicates/recommend-fields', (req, res) => {
  try {
    const { taxNumber } = req.body;
    
    console.log(`[BUILDER] POST /api/duplicates/recommend-fields - Tax: ${taxNumber}`);

    const records = db.prepare(`
      SELECT * FROM requests WHERE tax = ? AND (isMerged IS NULL OR isMerged != 1)
    `).all(taxNumber);

    if (records.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No records found' 
      });
    }

    const recommendations = {};
    const fieldPriority = [
      'firstName', 'firstNameAr', 'tax', 'CustomerType', 'CompanyOwner',
      'country', 'city', 'street', 'buildingNumber',
      'ContactName', 'EmailAddress', 'MobileNumber', 'JobTitle',
      'SalesOrgOption', 'DistributionChannelOption', 'DivisionOption'
    ];

    fieldPriority.forEach(field => {
      const candidates = records
        .filter(r => r[field] && r[field].toString().trim() !== '')
        .map(r => ({
          recordId: r.id,
          value: r[field],
          quality: calculateFieldQuality(r[field], field),
          sourceSystem: r.sourceSystem,
          recordName: r.firstName || r.id
        }))
        .sort((a, b) => b.quality - a.quality);

      if (candidates.length > 0) {
        recommendations[field] = {
          recommended: candidates[0],
          alternatives: candidates.slice(1),
          hasConflict: candidates.length > 1 && 
            candidates.some(c => c.value !== candidates[0].value)
        };
      }
    });

    res.json({
      success: true,
      recommendations: recommendations,
      totalRecords: records.length
    });

  } catch (error) {
    console.error('[BUILDER] Error getting recommendations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error', 
      details: error.message 
    });
  }
});

// ============= ADMIN ENDPOINTS =============

// Get admin data statistics
app.get('/api/requests/admin/data-stats', (req, res) => {
  try {
    console.log('[ADMIN] GET /api/requests/admin/data-stats');
    
    const stats = {
      // استخدم single quotes للقيم النصية
      duplicateRecords: db.prepare("SELECT COUNT(*) as count FROM requests WHERE isMaster = 1").get().count,
      quarantineRecords: db.prepare("SELECT COUNT(*) as count FROM requests WHERE status = 'Quarantine'").get().count,  // single quotes
      goldenRecords: db.prepare("SELECT COUNT(*) as count FROM requests WHERE isGolden = 1").get().count,
      totalRequests: db.prepare("SELECT COUNT(*) as count FROM requests").get().count,
      pendingRequests: db.prepare("SELECT COUNT(*) as count FROM requests WHERE status = 'Pending'").get().count  // single quotes
    };
    
    console.log('[ADMIN] Statistics retrieved:', stats);
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[ADMIN] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get technical dashboard statistics
app.get('/api/dashboard/technical-stats', (req, res) => {
  try {
    console.log('[TECH-DASHBOARD] Getting technical statistics...');
    
    // 1. Golden Records (isGolden = 1)
    const goldenRecords = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE isGolden = 1
    `).get().count;
    
    // 2. Unprocessed Quarantine Records (اللي لسه في data_entry)
    const quarantineRecords = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE status = 'Quarantine'
      AND assignedTo = 'data_entry'
    `).get().count;
    
    // 3. Unprocessed Duplicate Groups (count by tax number, not individual records)
    const unprocessedDuplicates = db.prepare(`
      SELECT COUNT(DISTINCT tax) as count 
      FROM requests 
      WHERE requestType = 'duplicate' 
      AND status = 'Duplicate'
      AND assignedTo = 'data_entry'
      AND sourceSystem IS NOT NULL
      AND sourceSystem != ''
      AND sourceSystem != 'Master Builder'
      AND tax IS NOT NULL
      AND tax != ''
    `).get().count;
    
    // 4. New Requests Created (NOT quarantine AND NOT duplicate)
    const newRequests = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE LOWER(requestType) = 'new'
      AND createdBy IN ('data_entry', 'Data Entry')
    `).get().count;
    
    // 5. Data Entry Task List
    const dataEntryTasks = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE assignedTo = 'data_entry' 
      AND status = 'Rejected'
    `).get().count;
    
    // 6. Reviewer Tasks
    const reviewerTasks = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE status = 'Pending' 
      AND assignedTo = 'reviewer'
    `).get().count;
    
    // 7. Compliance Tasks
    const complianceTasks = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE status = 'Approved' 
      AND assignedTo = 'compliance'
      AND isGolden = 0
    `).get().count;
    
    // System Sources - احسب كل الـ records (processed + unprocessed)
    const oracleFormsQuarantine = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'Oracle Forms'
      AND (status = 'Quarantine' OR originalRequestType = 'quarantine')
    `).get().count;

    // System Sources Duplicate Groups Calculations (count by tax, not individual records)
    // Oracle Forms - Unprocessed + Processed Groups
    const oracleFormsUnprocessed = db.prepare(`
      SELECT COUNT(DISTINCT tax) as count 
      FROM requests 
      WHERE sourceSystem = 'Oracle Forms'
      AND requestType = 'duplicate'
      AND status = 'Duplicate'
      AND tax IS NOT NULL
      AND tax != ''
    `).get().count;

    const oracleFormsProcessed = db.prepare(`
      SELECT COUNT(DISTINCT tax) as count 
      FROM requests 
      WHERE sourceSystem = 'Oracle Forms'
      AND status = 'Linked'
      AND tax IS NOT NULL
      AND tax != ''
    `).get().count;

    const oracleFormsDuplicate = oracleFormsUnprocessed + oracleFormsProcessed;

    // Total = Quarantine + Duplicate (processed + unprocessed)
    const oracleFormsTotal = oracleFormsQuarantine + oracleFormsDuplicate;

    const sapS4HanaQuarantine = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP S/4HANA'
      AND (status = 'Quarantine' OR originalRequestType = 'quarantine')
    `).get().count;

    // SAP S/4HANA - Unprocessed + Processed Groups
    const sapS4HanaUnprocessed = db.prepare(`
      SELECT COUNT(DISTINCT tax) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP S/4HANA'
      AND requestType = 'duplicate'
      AND status = 'Duplicate'
      AND tax IS NOT NULL
      AND tax != ''
    `).get().count;

    const sapS4HanaProcessed = db.prepare(`
      SELECT COUNT(DISTINCT tax) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP S/4HANA'
      AND status = 'Linked'
      AND tax IS NOT NULL
      AND tax != ''
    `).get().count;

    const sapS4HanaDuplicate = sapS4HanaUnprocessed + sapS4HanaProcessed;

    // Total = Quarantine + Duplicate (processed + unprocessed)
    const sapS4HanaTotal = sapS4HanaQuarantine + sapS4HanaDuplicate;

    const sapByDesignQuarantine = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP ByDesign'
      AND (status = 'Quarantine' OR originalRequestType = 'quarantine')
    `).get().count;

    // SAP ByDesign - Unprocessed + Processed Groups
    const sapByDesignUnprocessed = db.prepare(`
      SELECT COUNT(DISTINCT tax) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP ByDesign'
      AND requestType = 'duplicate'
      AND status = 'Duplicate'
      AND tax IS NOT NULL
      AND tax != ''
    `).get().count;

    const sapByDesignProcessed = db.prepare(`
      SELECT COUNT(DISTINCT tax) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP ByDesign'
      AND status = 'Linked'
      AND tax IS NOT NULL
      AND tax != ''
    `).get().count;

    const sapByDesignDuplicate = sapByDesignUnprocessed + sapByDesignProcessed;

    // Total = Quarantine + Duplicate (processed + unprocessed)
    const sapByDesignTotal = sapByDesignQuarantine + sapByDesignDuplicate;
    
    // 8. Processed Quarantine - محسّن
    // عد كل السجلات اللي كانت quarantine وخرجت منها
    const processedQuarantine = db.prepare(`
      SELECT COUNT(DISTINCT r.id) as count 
      FROM requests r
      WHERE EXISTS (
        SELECT 1 FROM workflow_history wh 
        WHERE wh.requestId = r.id 
        AND (
          wh.action = 'QUARANTINE_COMPLETE' 
          OR (wh.fromStatus = 'Quarantine' AND wh.toStatus != 'Quarantine')
        )
      )
    `).get().count;
    
    // 9. Processed Duplicate Groups (count by tax number - Linked records)
    const processedDuplicates = db.prepare(`
      SELECT COUNT(DISTINCT tax) as count 
      FROM requests 
      WHERE status = 'Linked'
      AND sourceSystem IS NOT NULL
      AND sourceSystem != ''
      AND sourceSystem != 'Master Builder'
      AND tax IS NOT NULL
      AND tax != ''
    `).get().count;
    
    console.log('[TECH-DASHBOARD] Statistics:', {
      goldenRecords,
      quarantineRecords,
      unprocessedDuplicates,
      newRequests,
      dataEntryTasks,
      reviewerTasks,
      complianceTasks,
      processedQuarantine,
      processedDuplicates
    });
    
    console.log('[TECH-DASHBOARD] System Sources Breakdown:', {
      oracleForms: { total: oracleFormsTotal, quarantine: oracleFormsQuarantine, duplicate: oracleFormsDuplicate },
      sapS4Hana: { total: sapS4HanaTotal, quarantine: sapS4HanaQuarantine, duplicate: sapS4HanaDuplicate },
      sapByDesign: { total: sapByDesignTotal, quarantine: sapByDesignQuarantine, duplicate: sapByDesignDuplicate }
    });
    
    res.json({
      stats: {
        goldenRecords,
        quarantineRecords,
        unprocessedDuplicates,
        newRequests,
        dataEntryTasks,
        reviewerTasks,
        complianceTasks,
        processedQuarantine,  // الجديد
        processedDuplicates   // الجديد
      },
      systemSources: {
        oracleForms: {
          total: oracleFormsTotal,
          quarantine: oracleFormsQuarantine,
          duplicate: oracleFormsDuplicate
        },
        sapS4Hana: {
          total: sapS4HanaTotal,
          quarantine: sapS4HanaQuarantine,
          duplicate: sapS4HanaDuplicate
        },
        sapByDesign: {
          total: sapByDesignTotal,
          quarantine: sapByDesignQuarantine,
          duplicate: sapByDesignDuplicate
        }
      }
    });
    
  } catch (error) {
    console.error('[TECH-DASHBOARD] Error fetching technical statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch technical statistics',
      details: error.message 
    });
  }
});

// Debug endpoint - أضفه بعد أي endpoint
app.get('/api/debug/source-systems', (req, res) => {
  try {
    // شوف كل القيم الموجودة في sourceSystem
    const allSystems = db.prepare(`
      SELECT DISTINCT sourceSystem, COUNT(*) as count
      FROM requests
      WHERE sourceSystem IS NOT NULL
      GROUP BY sourceSystem
    `).all();
    
    // شوف عدد records من كل status
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM requests
      GROUP BY status
    `).all();
    
    // شوف عدد records من كل requestType
    const typeCounts = db.prepare(`
      SELECT requestType, COUNT(*) as count
      FROM requests
      GROUP BY requestType
    `).all();
    
    res.json({
      sourceSystems: allSystems,
      statuses: statusCounts,
      requestTypes: typeCounts,
      totalRecords: db.prepare('SELECT COUNT(*) as count FROM requests').get().count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint مؤقت - لفهم المشكلة
app.get('/api/debug/duplicate-counts', (req, res) => {
  try {
    // عد كل أنواع الـ duplicates لكل system
    const systems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByDesign'];
    const result = {};
    
    systems.forEach(system => {
      result[system] = {
        // Records بـ requestType = 'duplicate'
        requestTypeDuplicate: db.prepare(`
          SELECT COUNT(*) as count FROM requests 
          WHERE sourceSystem = ? AND requestType = 'duplicate'
        `).get(system).count,
        
        // Records بـ originalRequestType = 'duplicate'  
        originalTypeDuplicate: db.prepare(`
          SELECT COUNT(*) as count FROM requests 
          WHERE sourceSystem = ? AND originalRequestType = 'duplicate'
        `).get(system).count,
        
        // Records بـ status = 'Duplicate'
        statusDuplicate: db.prepare(`
          SELECT COUNT(*) as count FROM requests 
          WHERE sourceSystem = ? AND status = 'Duplicate'
        `).get(system).count,
        
        // Master records
        masterRecords: db.prepare(`
          SELECT COUNT(*) as count FROM requests 
          WHERE sourceSystem = ? AND isMaster = 1
        `).get(system).count,
        
        // Linked records
        linkedRecords: db.prepare(`
          SELECT COUNT(*) as count FROM requests 
          WHERE sourceSystem = ? AND status = 'Linked'
        `).get(system).count,
        
        // Merged records
        mergedRecords: db.prepare(`
          SELECT COUNT(*) as count FROM requests 
          WHERE sourceSystem = ? AND status = 'Merged'
        `).get(system).count,
        
        // Records with masterId
        hasMaterId: db.prepare(`
          SELECT COUNT(*) as count FROM requests 
          WHERE sourceSystem = ? AND masterId IS NOT NULL AND masterId != ''
        `).get(system).count
      };
    });
    
    // إجمالي الـ duplicates بكل الطرق
    const totals = {
      allRequestTypeDuplicate: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE requestType = 'duplicate'
      `).get().count,
      
      allOriginalTypeDuplicate: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE originalRequestType = 'duplicate'
      `).get().count,
      
      allStatusDuplicate: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE status = 'Duplicate'
      `).get().count,
      
      allMasters: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE isMaster = 1
      `).get().count,
      
      allLinked: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE status = 'Linked'
      `).get().count,
      
      allMerged: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE status = 'Merged'
      `).get().count
    };
    
    res.json({
      perSystem: result,
      totals: totals,
      analysis: {
        expectedProcessed: 5,
        expectedUnprocessed: 9,
        expectedTotal: 14
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all data except users
app.delete('/api/requests/admin/clear-all', (req, res) => {
  try {
    console.log('[ADMIN] DELETE /api/requests/admin/clear-all - CLEARING ALL DATA');
    
    const transaction = db.transaction(() => {
      // حذف كل البيانات بالترتيب الصحيح (من الأبعد إلى الأقرب لتجنب foreign key errors)
      // 1. Sync records (references sync_operations and requests)
      db.prepare('DELETE FROM sync_records').run();
      
      // 2. Sync operations (references sync_rules)
      db.prepare('DELETE FROM sync_operations').run();
      
      // 3. Notifications (no foreign keys)
      db.prepare('DELETE FROM notifications').run();
      
      // 4. Workflow history (references requests)
      db.prepare('DELETE FROM workflow_history').run();
      
      // 5. Issues (references requests)
      db.prepare('DELETE FROM issues').run();
      
      // 6. Documents (references requests)
      db.prepare('DELETE FROM documents').run();
      
      // 7. Contacts (references requests)
      db.prepare('DELETE FROM contacts').run();
      
      // 8. Requests (parent table - delete last)
      db.prepare('DELETE FROM requests').run();
      
      console.log('[ADMIN] All data tables cleared (users and sync_rules retained)');
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: 'All data cleared successfully (users and sync rules retained)'
    });
    
  } catch (error) {
    console.error('[ADMIN] Error clearing data:', error);
    res.status(500).json({ error: error.message || 'Failed to clear data' });
  }
});

// Clear sync data
app.delete('/api/requests/admin/clear-sync', (req, res) => {
  try {
    console.log('[ADMIN] DELETE /api/requests/admin/clear-sync - CLEARING SYNC DATA');
    
    const transaction = db.transaction(() => {
      // Clear sync tables
      db.prepare('DELETE FROM sync_records').run();
      db.prepare('DELETE FROM sync_operations').run();
      db.prepare('DELETE FROM sync_rules').run();
      
      // Reset sync status in requests table
      db.prepare('UPDATE requests SET syncStatus = NULL, lastSyncedAt = NULL WHERE isGolden = 1').run();
      
      console.log('[ADMIN] Sync data cleared successfully');
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: 'Sync data cleared successfully'
    });
    
  } catch (error) {
    console.error('[ADMIN] Error clearing sync data:', error);
    res.status(500).json({ error: 'Failed to clear sync data' });
  }
});

// Clear specific data type
app.delete('/api/requests/admin/clear-:dataType', (req, res) => {
  try {
    const { dataType } = req.params;
    console.log(`[ADMIN] DELETE /api/requests/admin/clear-${dataType}`);
    
    const transaction = db.transaction(() => {
      let clearedCount = 0;
      
      switch(dataType) {
        case 'duplicates':
          // استخدم single quotes
          const duplicatesStmt = db.prepare(`
            DELETE FROM requests 
            WHERE (status = 'Duplicate' OR status = 'Linked' OR isMaster = 1) 
              AND isGolden = 0
          `);
          const duplicatesResult = duplicatesStmt.run();
          clearedCount = duplicatesResult.changes;
          break;
          
        case 'quarantine':
          // استخدم single quotes
          const quarantineStmt = db.prepare("DELETE FROM requests WHERE status = 'Quarantine'");
          const quarantineResult = quarantineStmt.run();
          clearedCount = quarantineResult.changes;
          break;
          
        case 'golden':
          const goldenStmt = db.prepare('DELETE FROM requests WHERE isGolden = 1');
          const goldenResult = goldenStmt.run();
          clearedCount = goldenResult.changes;
          break;
          
        case 'requests':
          const requestsStmt = db.prepare(`
            DELETE FROM requests 
            WHERE isGolden = 0 
              AND status NOT IN ('Duplicate', 'Quarantine', 'Linked')
              AND isMaster = 0
          `);
          const requestsResult = requestsStmt.run();
          clearedCount = requestsResult.changes;
          break;
          
        default:
          throw new Error('Invalid data type');
      }
      
      console.log(`[ADMIN] Cleared ${clearedCount} ${dataType} records`);
      return clearedCount;
    });
    
    const clearedCount = transaction();
    
    res.json({ 
      success: true, 
      message: `${dataType} data cleared successfully`,
      clearedCount: clearedCount
    });
    
  } catch (error) {
    console.error(`[ADMIN] Error clearing ${req.params.dataType}:`, error);
    res.status(500).json({ error: `Failed to clear ${req.params.dataType}` });
  }
});



// Generate sample duplicate data
// Generate sample duplicate data - شركات مختلفة تماماً عن الـ quarantine
// Generate sample quarantine data - مع القيم الصحيحة من lookup-data
// Generate sample quarantine data - using shared demo companies
const sharedDemoCompanies = require('./shared-demo-companies');

// Generate sample quarantine data - حوالي سطر 2325
app.post('/api/requests/admin/generate-quarantine', (req, res) => {
  try {
    console.log('[ADMIN] POST /api/requests/admin/generate-quarantine - Using Unified Demo Service');
    
    // Use shared demo company service
    const quarantineRecords = sharedDemoCompanies.generateQuarantineData(40);
    
    // OLD CODE - مش محتاجينه دلوقتي
    /*
    const realFoodCompanies = [
      { 
        name: 'Panda Retail Company', 
        nameAr: 'شركة بندة للتجزئة', 
        tax: 'SA1010998877',
        country: 'Saudi Arabia',
        city: 'Riyadh',
        owner: 'Savola Group',
        customerType: 'Joint Stock Company'
      },
      { 
        name: 'Carrefour Egypt', 
        nameAr: 'كارفور مصر', 
        tax: 'EG3005678901',
        country: 'Egypt',
        city: 'Cairo',
        owner: 'Majid Al Futtaim',
        customerType: 'Limited Liability Company'
      },
      { 
        name: 'Lulu Hypermarket UAE', 
        nameAr: 'لولو هايبر ماركت الإمارات', 
        tax: 'AE7009988776',
        country: 'United Arab Emirates',
        city: 'Dubai',
        owner: 'Yusuff Ali M.A.',
        customerType: 'Limited Liability Company'
      },
      { 
        name: 'Al Meera Consumer Goods', 
        nameAr: 'الميرة للسلع الاستهلاكية', 
        tax: 'QA4007766554',
        country: 'Qatar',
        city: 'Doha',
        owner: 'Qatar Government',
        customerType: 'Joint Stock Company'
      },
      { 
        name: 'Sultan Center Kuwait', 
        nameAr: 'مركز السلطان الكويت', 
        tax: 'KW6008877665',
        country: 'Kuwait',
        city: 'Kuwait City',
        owner: 'Al-Shaya Group',
        customerType: 'Limited Liability Company'
      },
      { 
        name: 'Metro Egypt Retail', 
        nameAr: 'مترو مصر للتجزئة', 
        tax: 'EG3006677889',
        country: 'Egypt',
        city: 'Alexandria',
        owner: 'Metro AG',
        customerType: 'Partnership'
      },
      { 
        name: 'Spinneys UAE', 
        nameAr: 'سبينيز الإمارات', 
        tax: 'AE7007788990',
        country: 'United Arab Emirates',
        city: 'Abu Dhabi',
        owner: 'Albwardy Investment',
        customerType: 'Limited Liability Company'
      },
      { 
        name: 'Al-Othaim Markets', 
        nameAr: 'أسواق العثيم', 
        tax: 'SA1010112233',
        country: 'Saudi Arabia',
        city: 'Riyadh',
        owner: 'Abdullah Al-Othaim',
        customerType: 'Joint Stock Company'
      }
    ];

    */
    
    const transaction = db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO requests (
          id, firstName, firstNameAr, tax, 
          CustomerType, CompanyOwner, country, city,
          buildingNumber, street,
          SalesOrgOption, DistributionChannelOption, DivisionOption,
          status, assignedTo, origin, sourceSystem,
          requestType, originalRequestType, 
          notes, createdBy, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const createdIds = [];
      
      quarantineRecords.forEach((company, index) => {
        const id = nanoid(8);
        const recordTimestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
        
        insertStmt.run(
          id,
          company.name,
          company.nameAr,
          company.taxNumber,
          company.customerType,
          company.ownerName,
          company.country,
          company.city || null,
          company.buildingNumber || null,
          company.street || null,
          company.salesOrg || null,
          company.distributionChannel || null,
          company.division || null,
          'Quarantine',
          'data_entry',
          'quarantine',
          company.source,
          'quarantine',
          'quarantine',
          company.rejectReason || 'Incomplete record',
          'system_import',
          recordTimestamp
        );
        
        createdIds.push(id);
        
        // Log workflow
        logWorkflow(id, 'IMPORTED_TO_QUARANTINE', null, 'Quarantine', 
                   'system', 'system', 
                   `Imported from ${company.source} - ${company.rejectReason}`,
                   { 
                     operation: 'import_quarantine',
                     sourceSystem: company.source,
                     country: company.country,
                     industry: company.industry,
                     missingFields: [
                       !company.city && 'City',
                       !company.buildingNumber && 'Building Number',
                       !company.street && 'Street'
                     ].filter(Boolean)
                   },
                   recordTimestamp
        );
      });
      
      return createdIds;
    });
    
    const createdIds = transaction();
    
    console.log(`[ADMIN] Generated ${createdIds.length} quarantine records using unified demo service`);
    
    res.json({
      success: true,
      message: `Generated ${createdIds.length} quarantine records`,
      recordIds: createdIds
    });
    
  } catch (error) {
    console.error('[ADMIN] Error generating quarantine data:', error);
    res.status(500).json({ error: 'Failed to generate quarantine data' });
  }
});

// Generate sample duplicate data - شركات مختلفة مع القيم الصحيحة
// Generate sample duplicate data - حوالي سطر 2520
app.post('/api/requests/admin/generate-duplicates', (req, res) => {
  try {
    console.log('[ADMIN] POST /api/requests/admin/generate-duplicates - Using Unified Demo Service');
    
    // Use shared demo company service
    const duplicateRecords = sharedDemoCompanies.generateDuplicateGroups(20);
    
    // OLD CODE - مش محتاجينه دلوقتي
    /*
    const sourceSystems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByDesign'];
    const customerTypes = ['Limited Liability Company', 'Joint Stock Company', 'Partnership', 'Wholesale Distributor'];
    const salesOrgs = ['HSA Saudi Arabia 2000', 'HSA UAE 3000', 'HSA Yemen 4000'];
    const distributionChannels = ['Modern Trade', 'Traditional Trade', 'HoReCa', 'Key Accounts', 'B2B'];
    const divisions = ['Food Products', 'Beverages', 'Dairy and Cheese', 'Frozen Products', 'Snacks and Confectionery'];
    const preferredLanguages = ['Arabic', 'English', 'Both'];
    
    const realDuplicateGroups = [
      {
        baseName: 'Almarai Company',
        baseNameAr: 'شركة المراعي',
        tax: 'SA1010334455',  // رقم ضريبي مختلف عن الـ quarantine
        country: 'Saudi Arabia',
        variations: [
          { 
            name: 'Almarai Company Limited',
            nameAr: 'شركة المراعي المحدودة',
            city: 'Riyadh',
            owner: 'Prince Sultan bin Mohammed bin Saud Al Kabeer',
            contact: 'Khalid Al-Rasheed',
            email: 'info@almarai.com',
            mobile: '+966501234567',
            street: 'Exit 8, Northern Ring Road',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'Modern Trade',
            division: 'Dairy and Cheese'
          },
          { 
            name: 'Almarai Co.',
            nameAr: 'المراعي',
            city: 'Jeddah',
            owner: 'Prince Sultan Al Kabeer',
            contact: 'Ahmed Al-Dosari',
            email: 'sales@almarai.sa',
            mobile: '+966507654321',
            street: 'Industrial City 2',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'Traditional Trade',
            division: 'Dairy and Cheese'
          },
          { 
            name: 'Al Marai Dairy Company',
            nameAr: 'شركة المراعي للألبان',
            city: 'Dammam',
            owner: 'Al Kabeer Family',
            contact: null,
            email: 'contact@almaraidairy.com',
            mobile: '+966509876543',
            street: 'Second Industrial City',
            salesOrg: null,
            distChannel: 'HoReCa',
            division: 'Dairy and Cheese'
          },
          { 
            name: 'Almarai Food Industries',
            nameAr: 'المراعي للصناعات الغذائية',
            city: 'Buraidah',
            owner: null,
            contact: 'Omar Al-Mutairi',
            email: null,
            mobile: '+966502345678',
            street: null,
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: null,
            division: 'Food Products'
          }
        ]
      },
      {
        baseName: 'Herfy Food Services',
        baseNameAr: 'هرفي للخدمات الغذائية',
        tax: 'SA2050887766',  // رقم ضريبي مختلف
        country: 'Saudi Arabia',
        variations: [
          { 
            name: 'Herfy Food Services Company',
            nameAr: 'شركة هرفي للخدمات الغذائية',
            city: 'Riyadh',
            owner: 'Abdullah Al-Muhaidib',
            contact: 'Mohammed Al-Rajhi',
            email: 'info@herfy.com',
            mobile: '+966551234567',
            street: 'King Fahd Road',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'HoReCa',
            division: 'Food Products'
          },
          { 
            name: 'Herfy Restaurants',
            nameAr: 'مطاعم هرفي',
            city: 'Jeddah',
            owner: 'Al-Muhaidib Group',
            contact: 'Khalid Al-Saud',
            email: 'franchise@herfy.sa',
            mobile: '+966557654321',
            street: 'Prince Sultan Road',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'Modern Trade',
            division: 'Food Products'
          },
          { 
            name: 'Herfy Fast Food',
            nameAr: 'هرفي للوجبات السريعة',
            city: 'Dammam',
            owner: null,
            contact: 'Ahmad Al-Qahtani',
            email: null,
            mobile: '+966559876543',
            street: 'Corniche Road',
            salesOrg: null,
            distChannel: 'Traditional Trade',
            division: 'Food Products'
          }
        ]
      },
      {
        baseName: 'Dominos Pizza Egypt',
        baseNameAr: 'دومينوز بيتزا مصر',
        tax: 'EG3009988774',  // رقم ضريبي مصري مختلف
        country: 'Egypt',
        variations: [
          { 
            name: 'Dominos Pizza Egypt LLC',
            nameAr: 'دومينوز بيتزا مصر ش.م.م',
            city: 'Cairo',
            owner: 'Dominos Pizza International',
            contact: 'Ahmed Mohamed',
            email: 'info@dominos.com.eg',
            mobile: '+201012345678',
            street: 'New Cairo District',
            salesOrg: 'HSA Egypt 7000',
            distChannel: 'HoReCa',
            division: 'Food Products'
          },
          { 
            name: 'Dominos Egypt',
            nameAr: 'دومينوز مصر',
            city: 'Alexandria',
            owner: 'Dominos Int.',
            contact: 'Mohamed Ali',
            email: 'franchise@dominos.eg',
            mobile: '+201098765432',
            street: 'Corniche Road',
            salesOrg: 'HSA Egypt 7000',
            distChannel: 'Modern Trade',
            division: 'Food Products'
          },
          { 
            name: 'Dominos Pizza Company Egypt',
            nameAr: 'شركة دومينوز بيتزا مصر',
            city: 'Giza',
            owner: null,
            contact: 'Omar Hassan',
            email: null,
            mobile: '+201087654321',
            street: 'Pyramids Road',
            salesOrg: null,
            distChannel: 'Traditional Trade',
            division: 'Food Products'
          }
        ]
      },
      {
        baseName: 'Careem Food UAE',
        baseNameAr: 'كريم فود الإمارات',
        tax: 'AE7008899001',  // رقم ضريبي إماراتي مختلف
        country: 'United Arab Emirates',
        variations: [
          { 
            name: 'Careem Food UAE Limited',
            nameAr: 'كريم فود الإمارات المحدودة',
            city: 'Dubai',
            owner: 'Careem Networks FZ-LLC',
            contact: 'Ali Al-Mansouri',
            email: 'info@careemfood.ae',
            mobile: '+971501234567',
            street: 'Business Bay',
            salesOrg: 'HSA UAE 3000',
            distChannel: 'HoReCa',
            division: 'Food Products'
          },
          { 
            name: 'Careem Food',
            nameAr: 'كريم فود',
            city: 'Abu Dhabi',
            owner: 'Careem Inc.',
            contact: 'Mohammed Al-Zaabi',
            email: 'delivery@careem.ae',
            mobile: '+971507654321',
            street: 'Corniche Road',
            salesOrg: 'HSA UAE 3000',
            distChannel: 'Modern Trade',
            division: 'Food Products'
          },
          { 
            name: 'Careem Food Services',
            nameAr: 'خدمات كريم للأغذية',
            city: 'Sharjah',
            owner: null,
            contact: 'Hassan Al-Qasimi',
            email: null,
            mobile: '+971509876543',
            street: 'Al Majaz District',
            salesOrg: null,
            distChannel: 'Traditional Trade',
            division: 'Food Products'
          }
        ]
      },
      {
        baseName: 'Chilis Restaurant Kuwait',
        baseNameAr: 'مطعم تشيليز الكويت',
        tax: 'KW6007788990',  // رقم ضريبي كويتي مختلف
        country: 'Kuwait',
        variations: [
          { 
            name: 'Chilis Restaurant Kuwait LLC',
            nameAr: 'مطعم تشيليز الكويت ش.م.م',
            city: 'Kuwait City',
            owner: 'Brinker International',
            contact: 'Fahad Al-Sabah',
            email: 'info@chilis.com.kw',
            mobile: '+96551234567',
            street: 'Salmiya District',
            salesOrg: 'HSA Kuwait 5000',
            distChannel: 'HoReCa',
            division: 'Food Products'
          },
          { 
            name: 'Chilis Kuwait',
            nameAr: 'تشيليز الكويت',
            city: 'Hawalli',
            owner: 'Brinker Int.',
            contact: 'Salem Al-Rashid',
            email: 'franchise@chilis.kw',
            mobile: '+96557654321',
            street: 'Salem Al-Mubarak Street',
            salesOrg: 'HSA Kuwait 5000',
            distChannel: 'Modern Trade',
            division: 'Food Products'
          },
          { 
            name: 'Chilis Restaurant Company',
            nameAr: 'شركة مطاعم تشيليز',
            city: 'Ahmadi',
            owner: null,
            contact: 'Nasser Al-Mutawa',
            email: null,
            mobile: '+96559876543',
            street: 'Fahaheel Highway',
            salesOrg: null,
            distChannel: 'Traditional Trade',
            division: 'Food Products'
          }
        ]
      }
    ];

    const duplicateGroups = realDuplicateGroups;
    
    */
    
    const transaction = db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO requests (
          id, firstName, firstNameAr, tax,
          CustomerType, CompanyOwner, 
          buildingNumber, street, country, city,
          SalesOrgOption, DistributionChannelOption, DivisionOption,
          status, assignedTo, origin, sourceSystem,
          requestType, originalRequestType,
          isMaster, masterId, confidence, notes, createdBy, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const createdIds = [];
      const groupMasterIds = new Map();
      
      duplicateRecords.forEach((record, index) => {
        const id = nanoid(8);
        const recordTimestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
        
        // Track master ID for this group
        if (record.isMaster) {
          groupMasterIds.set(record.masterId, id);
        }
        
        insertStmt.run(
          id,
          record.name,
          record.nameAr,
          record.taxNumber,
          record.customerType,
          record.ownerName,
          record.buildingNumber || null,
          record.street || null,
          record.country,
          record.city,
          record.salesOrg || null,
          record.distributionChannel || null,
          record.division || null,
          record.status,
          'data_entry',
          'duplicate',
          record.source,
          'duplicate',
          'duplicate',
          record.isMaster ? 1 : 0,
          record.masterId,
          record.confidence || 0.90,
          `${record.isMaster ? 'Master record' : 'Linked duplicate'} - Tax: ${record.taxNumber}`,
          'system_import',
          recordTimestamp
        );
        
        createdIds.push(id);
        
        // Log workflow
        logWorkflow(id, 'DUPLICATE_DETECTED', null, 'Duplicate', 
                   'system', 'system', 
                   `Duplicate detected from ${record.source} - Tax: ${record.taxNumber}`,
                   { 
                     operation: 'duplicate_detection',
                     taxNumber: record.taxNumber,
                     sourceSystem: record.source,
                     confidence: record.confidence,
                     isMaster: record.isMaster,
                     masterId: record.masterId,
                     industry: record.industry
                   },
                   recordTimestamp
        );
      });
      
      return createdIds;
    });
    
    const createdIds = transaction();
    const groups = [...new Set(duplicateRecords.map(r => r.masterId))].length;
    
    console.log(`[ADMIN] Generated ${createdIds.length} duplicate records in ${groups} groups using unified demo service`);
    
    res.json({
      success: true,
      message: `Generated ${createdIds.length} duplicate records in ${groups} groups`,
      recordIds: createdIds,
      groups: groups
    });
    
  } catch (error) {
    console.error('[ADMIN] Error generating duplicate data:', error);
    res.status(500).json({ error: 'Failed to generate duplicate data' });
  }
});

// =============================================================================
// SANCTIONED COMPANIES DATA APIs
// =============================================================================

// Get all sanctioned companies
app.get('/api/sanctioned-companies', (req, res) => {
  try {
    const sanctionedCompaniesModule = require('./sanctioned-demo-companies');
    const companies = sanctionedCompaniesModule.getAllSanctionedCompanies();
    
    res.json({
      success: true,
      data: companies,
      total: companies.length
    });
  } catch (error) {
    console.error('[SANCTIONED] Error fetching sanctioned companies:', error);
    res.status(500).json({ error: 'Failed to fetch sanctioned companies' });
  }
});

// Get sanctioned companies by country
app.get('/api/sanctioned-companies/country/:country', (req, res) => {
  try {
    const { country } = req.params;
    const sanctionedCompaniesModule = require('./sanctioned-demo-companies');
    const companies = sanctionedCompaniesModule.getSanctionedCompaniesByCountry(country);
    
    res.json({
      success: true,
      data: companies,
      total: companies.length,
      country: country
    });
  } catch (error) {
    console.error('[SANCTIONED] Error fetching sanctioned companies by country:', error);
    res.status(500).json({ error: 'Failed to fetch sanctioned companies' });
  }
});

// Get sanctioned companies by risk level
app.get('/api/sanctioned-companies/risk/:riskLevel', (req, res) => {
  try {
    const { riskLevel } = req.params;
    const sanctionedCompaniesModule = require('./sanctioned-demo-companies');
    const companies = sanctionedCompaniesModule.getSanctionedCompaniesByRiskLevel(riskLevel);
    
    res.json({
      success: true,
      data: companies,
      total: companies.length,
      riskLevel: riskLevel
    });
  } catch (error) {
    console.error('[SANCTIONED] Error fetching sanctioned companies by risk level:', error);
    res.status(500).json({ error: 'Failed to fetch sanctioned companies' });
  }
});

// Get sanctioned companies statistics
app.get('/api/sanctioned-companies/statistics', (req, res) => {
  try {
    const sanctionedCompaniesModule = require('./sanctioned-demo-companies');
    const stats = sanctionedCompaniesModule.getSanctionedCompaniesStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[SANCTIONED] Error fetching sanctioned companies statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// =============================================================================
// EXECUTIVE DASHBOARD APIs - WORLD CLASS ANALYTICS
// =============================================================================

// Get comprehensive dashboard statistics
app.get('/api/dashboard/executive-stats', (req, res) => {
  try {
    const { startDate, endDate, department, region } = req.query;
    
    // Overall Statistics
    const totalRequests = db.prepare(`
      SELECT COUNT(*) as total FROM requests
    `).get();
    
    const activeGoldenRecords = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE isGolden = 1
    `).get();
    
    const pendingRequests = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE status = 'Pending'
    `).get();
    
    const rejectedRequests = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE status = 'Rejected'
    `).get();
    
    // Processing Time Analysis
    const avgProcessingTime = db.prepare(`
      SELECT 
        AVG(JULIANDAY(updatedAt) - JULIANDAY(createdAt)) as avg_days
      FROM requests 
      WHERE status IN ('Approved', 'Rejected')
    `).get();
    
    // Monthly Growth
    const currentMonth = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE DATE(createdAt) >= DATE('now', 'start of month')
    `).get();
    
    const lastMonth = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE DATE(createdAt) >= DATE('now', '-1 month', 'start of month')
      AND DATE(createdAt) < DATE('now', 'start of month')
    `).get();
    
    const monthlyGrowth = lastMonth.count > 0 
      ? ((currentMonth.count - lastMonth.count) / lastMonth.count * 100).toFixed(1)
      : 0;
    
    // Data Quality Score
    const completeRecords = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE firstName IS NOT NULL 
      AND tax IS NOT NULL 
      AND country IS NOT NULL 
      AND city IS NOT NULL
    `).get();
    
    const dataQualityScore = totalRequests.total > 0 
      ? ((completeRecords.count / totalRequests.total) * 100).toFixed(1)
      : 0;
    
    // Compliance Rate
    const complianceApproved = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE ComplianceStatus = 'Approved'
    `).get();
    
    const complianceTotal = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE assignedTo = 'compliance'
    `).get();
    
    const complianceRate = complianceTotal.count > 0
      ? ((complianceApproved.count / complianceTotal.count) * 100).toFixed(1)
      : 100;
    
    // System Efficiency (based on rejection rate)
    const systemEfficiency = totalRequests.total > 0
      ? (((totalRequests.total - rejectedRequests.count) / totalRequests.total) * 100).toFixed(1)
      : 100;
    
    res.json({
      kpis: {
        activeGoldenRecords: activeGoldenRecords.count,
        dataQualityScore: parseFloat(dataQualityScore),
        avgProcessingTime: avgProcessingTime.avg_days ? avgProcessingTime.avg_days.toFixed(1) : 0,
        monthlyGrowth: parseFloat(monthlyGrowth),
        complianceRate: parseFloat(complianceRate),
        systemEfficiency: parseFloat(systemEfficiency),
        totalRequests: totalRequests.total,
        pendingRequests: pendingRequests.count,
        rejectedRequests: rejectedRequests.count
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get workflow distribution data
app.get('/api/dashboard/workflow-distribution', (req, res) => {
  try {
    const distribution = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM requests), 1) as percentage
      FROM requests
      GROUP BY status
    `).all();
    
    const requestTypes = db.prepare(`
      SELECT 
        COALESCE(requestType, 'new') as type,
        COUNT(*) as count
      FROM requests
      GROUP BY requestType
    `).all();
    
    res.json({
      statusDistribution: distribution,
      typeDistribution: requestTypes
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow distribution' });
  }
});

// Get time series data for trends
app.get('/api/dashboard/trends', (req, res) => {
  try {
    const { period = '7days' } = req.query;
    
    let dateFilter = "DATE('now', '-7 days')";
    if (period === '30days') dateFilter = "DATE('now', '-30 days')";
    if (period === '90days') dateFilter = "DATE('now', '-90 days')";
    
    const trends = db.prepare(`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
      FROM requests
      WHERE DATE(createdAt) >= ${dateFilter}
      GROUP BY DATE(createdAt)
      ORDER BY date
    `).all();
    
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trends data' });
  }
});

// Get user performance metrics
app.get('/api/dashboard/user-performance', (req, res) => {
  try {
    const userMetrics = db.prepare(`
      SELECT 
        createdBy as user,
        COUNT(*) as total_actions,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
        AVG(JULIANDAY(updatedAt) - JULIANDAY(createdAt)) as avg_processing_time
      FROM requests
      WHERE createdBy IS NOT NULL
      GROUP BY createdBy
      ORDER BY total_actions DESC
      LIMIT 10
    `).all();
    
    res.json(userMetrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user performance data' });
  }
});

// Get geographic distribution
app.get('/api/dashboard/geographic', (req, res) => {
  try {
    const geoData = db.prepare(`
      SELECT 
        country,
        city,
        COUNT(*) as count,
        SUM(CASE WHEN isGolden = 1 THEN 1 ELSE 0 END) as golden_records
      FROM requests
      WHERE country IS NOT NULL
      GROUP BY country, city
      ORDER BY count DESC
    `).all();
    
    res.json(geoData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch geographic data' });
  }
});

// Get real-time activity feed
app.get('/api/dashboard/activity-feed', (req, res) => {
  try {
    const activities = db.prepare(`
      SELECT 
        wh.*,
        r.firstName as company_name
      FROM workflow_history wh
      LEFT JOIN requests r ON wh.requestId = r.id
      ORDER BY wh.performedAt DESC
      LIMIT 20
    `).all();
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Get data quality metrics
app.get('/api/dashboard/quality-metrics', (req, res) => {
  try {
    const metrics = db.prepare(`
      SELECT 
        SUM(CASE WHEN firstName IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as name_completeness,
        SUM(CASE WHEN tax IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as tax_completeness,
        SUM(CASE WHEN EmailAddress IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as email_completeness,
        SUM(CASE WHEN country IS NOT NULL AND city IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as address_completeness,
        SUM(CASE WHEN ContactName IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as contact_completeness
      FROM requests
    `).get();
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quality metrics' });
  }
});

// Get bottleneck analysis
app.get('/api/dashboard/bottlenecks', (req, res) => {
  try {
    const bottlenecks = db.prepare(`
      SELECT 
        assignedTo as stage,
        status,
        COUNT(*) as stuck_count,
        AVG(JULIANDAY('now') - JULIANDAY(updatedAt)) as avg_days_stuck
      FROM requests
      WHERE status = 'Pending'
      GROUP BY assignedTo, status
      HAVING avg_days_stuck > 2
      ORDER BY avg_days_stuck DESC
    `).all();
    
    res.json(bottlenecks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bottleneck data' });
  }
});

// Add manager user endpoint
app.post('/api/admin/add-manager', (req, res) => {
  try {
    // Check if manager already exists
    const existingManager = db.prepare(`
      SELECT * FROM users WHERE username = 'manager'
    `).get();
    
    if (existingManager) {
      return res.json({ success: true, message: 'Manager user already exists' });
    }
    
    // Insert manager user as admin role to bypass CHECK constraint
    const insertManager = db.prepare(`
      INSERT INTO users (username, password, role, fullName, email) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insertManager.run(['manager', 'manager123', 'admin', 'Business Manager', 'manager@mdm.com']);
    
    console.log('Manager user created successfully');
    res.json({ success: true, message: 'Manager user created successfully' });
    
  } catch (error) {
    console.error('Error creating manager user:', error);
    res.status(500).json({ error: 'Failed to create manager user' });
  }
});

// Get source systems breakdown
app.get('/api/dashboard/source-systems', (req, res) => {
  try {
    const sourceSystems = db.prepare(`
      SELECT 
        COALESCE(sourceSystem, 'Manual Entry') as system,
        COUNT(*) as count
      FROM requests
      GROUP BY sourceSystem
    `).all();
    
    // Format for frontend
    const result = {
      oracleForms: 0,
      sapS4Hana: 0,
      sapByDesign: 0,
      manualEntry: 0
    };
    
    sourceSystems.forEach(item => {
      switch (item.system) {
        case 'Oracle Forms':
          result.oracleForms = item.count;
          break;
        case 'SAP S/4HANA':
          result.sapS4Hana = item.count;
          break;
        case 'SAP ByDesign':
          result.sapByDesign = item.count;
          break;
        case 'Manual Entry':
        case 'Data Steward':
        default:
          result.manualEntry += item.count;
          break;
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error('[DASHBOARD] Error fetching source systems:', error);
    res.status(500).json({ error: 'Failed to fetch source systems data' });
  }
});

// ====== SYNC ENDPOINTS ======

// Get all sync rules
app.get('/api/sync/rules', (req, res) => {
  try {
    console.log('[SYNC] Getting sync rules...');
    
    const rules = db.prepare(`
      SELECT * FROM sync_rules 
      WHERE isActive = 1 
      ORDER BY targetSystem, name
    `).all();
    
    // Parse JSON fields
    const parsedRules = rules.map(rule => ({
      ...rule,
      filterCriteria: rule.filterCriteria ? JSON.parse(rule.filterCriteria) : {},
      fieldMapping: rule.fieldMapping ? JSON.parse(rule.fieldMapping) : {}
    }));
    
    console.log(`[SYNC] Found ${parsedRules.length} active sync rules`);
    res.json(parsedRules);
  } catch (error) {
    console.error('[SYNC] Error fetching sync rules:', error);
    res.status(500).json({ error: 'Failed to fetch sync rules' });
  }
});

// Get sync operations history
app.get('/api/sync/operations', (req, res) => {
  try {
    console.log('[SYNC] Getting sync operations...');
    
    const { targetSystem, status, limit = 50 } = req.query;
    
    let query = `
      SELECT so.*, sr.name as ruleName, sr.targetSystem 
      FROM sync_operations so
      LEFT JOIN sync_rules sr ON so.ruleId = sr.id
      WHERE 1=1
    `;
    const params = [];
    
    if (targetSystem) {
      query += ` AND so.targetSystem = ?`;
      params.push(targetSystem);
    }
    
    if (status) {
      query += ` AND so.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY so.startedAt DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const operations = db.prepare(query).all(...params);
    
    // Parse JSON fields
    const parsedOperations = operations.map(op => ({
      ...op,
      errorDetails: op.errorDetails ? JSON.parse(op.errorDetails) : null
    }));
    
    console.log(`[SYNC] Found ${parsedOperations.length} sync operations`);
    res.json(parsedOperations);
  } catch (error) {
    console.error('[SYNC] Error fetching sync operations:', error);
    res.status(500).json({ error: 'Failed to fetch sync operations' });
  }
});

// Get sync statistics
app.get('/api/sync/stats', (req, res) => {
  try {
    console.log('[SYNC] Getting sync statistics...');
    
    const stats = {
      totalGoldenRecords: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE isGolden = 1
      `).get().count,
      
      syncedRecords: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE isGolden = 1 AND syncStatus = 'synced'
      `).get().count,
      
      pendingSync: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE isGolden = 1 AND (syncStatus = 'not_synced' OR syncStatus IS NULL)
      `).get().count,
      
      failedSync: db.prepare(`
        SELECT COUNT(*) as count FROM requests 
        WHERE isGolden = 1 AND syncStatus = 'sync_failed'
      `).get().count,
      
      systemBreakdown: {
        oracle_forms: db.prepare(`
          SELECT COUNT(*) as count FROM sync_records sr
          JOIN sync_operations so ON sr.operationId = so.id
          WHERE so.targetSystem = 'oracle_forms' AND sr.syncStatus = 'success'
        `).get().count,
        
        sap_4hana: db.prepare(`
          SELECT COUNT(*) as count FROM sync_records sr
          JOIN sync_operations so ON sr.operationId = so.id
          WHERE so.targetSystem = 'sap_4hana' AND sr.syncStatus = 'success'
        `).get().count,
        
        sap_bydesign: db.prepare(`
          SELECT COUNT(*) as count FROM sync_records sr
          JOIN sync_operations so ON sr.operationId = so.id
          WHERE so.targetSystem = 'sap_bydesign' AND sr.syncStatus = 'success'
        `).get().count
      },
      
      recentOperations: db.prepare(`
        SELECT so.*, sr.name as ruleName 
        FROM sync_operations so
        LEFT JOIN sync_rules sr ON so.ruleId = sr.id
        ORDER BY so.startedAt DESC 
        LIMIT 5
      `).all()
    };
    
    console.log('[SYNC] Statistics:', stats);
    res.json(stats);
  } catch (error) {
    console.error('[SYNC] Error fetching sync stats:', error);
    res.status(500).json({ error: 'Failed to fetch sync stats' });
  }
});

// Execute sync operation
app.post('/api/sync/execute', (req, res) => {
  try {
    console.log('[SYNC] Executing sync operation...');
    
    const { ruleId, targetSystem, executedBy } = req.body;
    
    if (!ruleId || !targetSystem || !executedBy) {
      return res.status(400).json({ error: 'Missing required fields: ruleId, targetSystem, executedBy' });
    }
    
    // Get sync rule
    const rule = db.prepare(`SELECT * FROM sync_rules WHERE id = ? AND isActive = 1`).get(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Sync rule not found or inactive' });
    }
    
    // Parse filter criteria
    const filterCriteria = rule.filterCriteria ? JSON.parse(rule.filterCriteria) : {};
    console.log('[SYNC EXECUTE] Filter criteria:', JSON.stringify(filterCriteria, null, 2));
    
    // Build query to get golden records matching criteria
    let query = `
      SELECT * FROM requests 
      WHERE isGolden = 1
    `;
    const params = [];
    
    // Apply filters from conditions array
    if (filterCriteria.conditions && filterCriteria.conditions.length > 0) {
      const logic = filterCriteria.logic || 'AND';
      const conditionClauses = [];
      
      filterCriteria.conditions.forEach(condition => {
        if (condition.field && condition.operator && condition.value) {
          switch (condition.operator) {
            case 'equals':
              conditionClauses.push(`${condition.field} = ?`);
              params.push(condition.value);
              break;
            case 'not_equals':
              conditionClauses.push(`${condition.field} != ?`);
              params.push(condition.value);
              break;
            case 'contains':
              conditionClauses.push(`${condition.field} LIKE ?`);
              params.push(`%${condition.value}%`);
              break;
            case 'starts_with':
              conditionClauses.push(`${condition.field} LIKE ?`);
              params.push(`${condition.value}%`);
              break;
            case 'ends_with':
              conditionClauses.push(`${condition.field} LIKE ?`);
              params.push(`%${condition.value}`);
              break;
            case 'in':
              const values = Array.isArray(condition.value) ? condition.value : [condition.value];
              conditionClauses.push(`${condition.field} IN (${values.map(() => '?').join(',')})`);
              params.push(...values);
              break;
            case 'not_in':
              const notValues = Array.isArray(condition.value) ? condition.value : [condition.value];
              conditionClauses.push(`${condition.field} NOT IN (${notValues.map(() => '?').join(',')})`);
              params.push(...notValues);
              break;
          }
        }
      });
      
      if (conditionClauses.length > 0) {
        query += ` AND (${conditionClauses.join(` ${logic} `)})`;
      }
    }
    
    console.log('[SYNC EXECUTE] Final query:', query);
    console.log('[SYNC EXECUTE] Query params:', params);
    
    const recordsToSync = db.prepare(query).all(...params);
    console.log(`[SYNC] Found ${recordsToSync.length} records matching criteria`);
    
    // Create sync operation
    const insertOperation = db.prepare(`
      INSERT INTO sync_operations (ruleId, targetSystem, syncType, status, totalRecords, startedAt, executedBy)
      VALUES (?, ?, 'manual', 'in_progress', ?, datetime('now'), ?)
    `);
    
    const operationResult = insertOperation.run(ruleId, targetSystem, recordsToSync.length, executedBy);
    const operationId = operationResult.lastInsertRowid;
    
    // Simulate sync process (in real implementation, this would call actual APIs)
    let syncedCount = 0;
    let failedCount = 0;
    
    const insertSyncRecord = db.prepare(`
      INSERT INTO sync_records (operationId, requestId, targetSystem, syncStatus, targetRecordId, syncedAt, responseData)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `);
    
    const updateRequestSync = db.prepare(`
      UPDATE requests 
      SET syncStatus = ?, lastSyncedAt = datetime('now')
      WHERE id = ?
    `);
    
    recordsToSync.forEach(record => {
      // No more random failures - always succeed unless there's a real error
      const targetRecordId = `${targetSystem.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      try {
        // Create sync record - always success unless real error occurs
        insertSyncRecord.run(
          operationId,
          record.id,
          targetSystem,
          'success',  // Always success
          targetRecordId,
          JSON.stringify({ 
            syncedAt: new Date().toISOString(),
            targetSystem: targetSystem 
          })
        );
        
        // Update the original record
        db.prepare(`
          UPDATE requests 
          SET syncStatus = 'synced', 
              lastSyncedAt = CURRENT_TIMESTAMP,
              lastSyncTarget = ?
          WHERE id = ?
        `).run(targetSystem, record.id);
        
        syncedCount++;
        
      } catch (error) {
        // Only fail if there's a real database error
        console.error(`Real sync error for record ${record.id}:`, error);
        
        insertSyncRecord.run(
          operationId,
          record.id,
          targetSystem,
          'failed',
          null,
          JSON.stringify({ 
            error: error.message || 'Database error',
            timestamp: new Date().toISOString()
          })
        );
        
        failedCount++;
      }
    });
    
    // Update operation status
    const updateOperation = db.prepare(`
      UPDATE sync_operations 
      SET status = ?, syncedRecords = ?, failedRecords = ?, completedAt = datetime('now')
      WHERE id = ?
    `);
    
    const finalStatus = failedCount === 0 ? 'completed' : (syncedCount > 0 ? 'partial' : 'failed');
    updateOperation.run(finalStatus, syncedCount, failedCount, operationId);
    
    console.log(`[SYNC] Operation ${operationId} completed: ${syncedCount} synced, ${failedCount} failed`);
    
    res.json({
      success: true,
      operationId,
      totalRecords: recordsToSync.length,
      syncedRecords: syncedCount,
      failedRecords: failedCount,
      status: finalStatus
    });
    
  } catch (error) {
    console.error('[SYNC] Error executing sync:', error);
    res.status(500).json({ error: 'Failed to execute sync operation' });
  }
});

// Get records eligible for sync
app.get('/api/sync/eligible-records', (req, res) => {
  try {
    console.log('[SYNC] Getting eligible records...');
    
    const { ruleId } = req.query;
    
    if (!ruleId) {
      return res.status(400).json({ error: 'ruleId is required' });
    }
    
    // Get sync rule
    const rule = db.prepare(`SELECT * FROM sync_rules WHERE id = ? AND isActive = 1`).get(ruleId);
    if (!rule) {
      return res.status(404).json({ error: 'Sync rule not found' });
    }
    
    // Parse filter criteria
    const filterCriteria = rule.filterCriteria ? JSON.parse(rule.filterCriteria) : {};
    console.log('[SYNC] Filter criteria:', JSON.stringify(filterCriteria, null, 2));
    
    // Build query
    let query = `
      SELECT id, firstName, firstNameAr, tax, country, city, CustomerType, 
             SalesOrgOption, DistributionChannelOption, DivisionOption, syncStatus, lastSyncedAt
      FROM requests 
      WHERE isGolden = 1
    `;
    const params = [];
    
    // Apply filters from conditions array
    if (filterCriteria.conditions && filterCriteria.conditions.length > 0) {
      const logic = filterCriteria.logic || 'AND';
      const conditionClauses = [];
      
      filterCriteria.conditions.forEach(condition => {
        if (condition.field && condition.operator && condition.value) {
          switch (condition.operator) {
            case 'equals':
              conditionClauses.push(`${condition.field} = ?`);
              params.push(condition.value);
              break;
            case 'not_equals':
              conditionClauses.push(`${condition.field} != ?`);
              params.push(condition.value);
              break;
            case 'contains':
              conditionClauses.push(`${condition.field} LIKE ?`);
              params.push(`%${condition.value}%`);
              break;
            case 'starts_with':
              conditionClauses.push(`${condition.field} LIKE ?`);
              params.push(`${condition.value}%`);
              break;
            case 'ends_with':
              conditionClauses.push(`${condition.field} LIKE ?`);
              params.push(`%${condition.value}`);
              break;
            case 'in':
              const values = Array.isArray(condition.value) ? condition.value : [condition.value];
              conditionClauses.push(`${condition.field} IN (${values.map(() => '?').join(',')})`);
              params.push(...values);
              break;
            case 'not_in':
              const notValues = Array.isArray(condition.value) ? condition.value : [condition.value];
              conditionClauses.push(`${condition.field} NOT IN (${notValues.map(() => '?').join(',')})`);
              params.push(...notValues);
              break;
          }
        }
      });
      
      if (conditionClauses.length > 0) {
        query += ` AND (${conditionClauses.join(` ${logic} `)})`;
      }
    }
    
    query += ` ORDER BY firstName`;
    
    console.log('[SYNC] Final query:', query);
    console.log('[SYNC] Query params:', params);
    
    const records = db.prepare(query).all(...params);
    
    console.log(`[SYNC] Found ${records.length} eligible records`);
    res.json(records);
    
  } catch (error) {
    console.error('[SYNC] Error fetching eligible records:', error);
    res.status(500).json({ error: 'Failed to fetch eligible records' });
  }
});

// Create new sync rule
app.post('/api/sync/rules', (req, res) => {
  try {
    console.log('[SYNC] Creating new sync rule...');
    console.log('[SYNC] Request body:', JSON.stringify(req.body, null, 2));
    
    const { name, description, targetSystem, filterCriteria, fieldMapping, isActive, createdBy } = req.body;
    
    // Validate required fields
    if (!name || !targetSystem) {
      return res.status(400).json({ error: 'Name and target system are required' });
    }
    
    const createRule = db.prepare(`
      INSERT INTO sync_rules (name, description, targetSystem, filterCriteria, fieldMapping, isActive, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = createRule.run(
      name,
      description || '',
      targetSystem,
      JSON.stringify(filterCriteria || {}),
      JSON.stringify(fieldMapping || {}),
      isActive ? 1 : 0,
      createdBy || 'system'
    );
    
    console.log(`[SYNC] Rule created with ID: ${result.lastInsertRowid}`);
    res.json({ id: result.lastInsertRowid, success: true });
    
  } catch (error) {
    console.error('[SYNC] Error creating sync rule:', error);
    console.error('[SYNC] Error details:', error.message);
    res.status(500).json({ error: 'Failed to create sync rule: ' + error.message });
  }
});

// Update sync rule
app.put('/api/sync/rules/:id', (req, res) => {
  try {
    console.log('[SYNC] Updating sync rule...');
    
    const { id } = req.params;
    const { name, description, filterCriteria, fieldMapping, isActive, updatedBy } = req.body;
    
    const updateRule = db.prepare(`
      UPDATE sync_rules 
      SET name = ?, description = ?, filterCriteria = ?, fieldMapping = ?, 
          isActive = ?, updatedAt = datetime('now'), updatedBy = ?
      WHERE id = ?
    `);
    
    const result = updateRule.run(
      name,
      description,
      JSON.stringify(filterCriteria),
      JSON.stringify(fieldMapping),
      isActive ? 1 : 0,
      updatedBy,
      id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Sync rule not found' });
    }
    
    console.log(`[SYNC] Rule ${id} updated successfully`);
    res.json({ success: true, message: 'Sync rule updated successfully' });
    
  } catch (error) {
    console.error('[SYNC] Error updating sync rule:', error);
    res.status(500).json({ error: 'Failed to update sync rule' });
  }
});

// Get sync operation details
app.get('/api/sync/operations/:id', (req, res) => {
  try {
    console.log('[SYNC] Getting sync operation details...');
    
    const { id } = req.params;
    
    // Get operation details
    const operation = db.prepare(`
      SELECT so.*, sr.name as ruleName, sr.description as ruleDescription
      FROM sync_operations so
      LEFT JOIN sync_rules sr ON so.ruleId = sr.id
      WHERE so.id = ?
    `).get(id);
    
    if (!operation) {
      return res.status(404).json({ error: 'Sync operation not found' });
    }
    
    // Get sync records for this operation
    const syncRecords = db.prepare(`
      SELECT sr.*, r.firstName, r.tax, r.country
      FROM sync_records sr
      LEFT JOIN requests r ON sr.requestId = r.id
      WHERE sr.operationId = ?
      ORDER BY sr.syncedAt DESC
    `).all(id);
    
    const result = {
      ...operation,
      errorDetails: operation.errorDetails ? JSON.parse(operation.errorDetails) : null,
      records: syncRecords.map(record => ({
        ...record,
        responseData: record.responseData ? JSON.parse(record.responseData) : null
      }))
    };
    
    console.log(`[SYNC] Operation ${id} details retrieved`);
    res.json(result);
    
  } catch (error) {
    console.error('[SYNC] Error fetching operation details:', error);
    res.status(500).json({ error: 'Failed to fetch operation details' });
  }
});

// Get sync statistics
app.get('/api/sync/stats', (req, res) => {
  try {
    const totalGoldenRecords = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE isGolden = 1
    `).get().count;

    const syncedRecords = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE isGolden = 1 AND syncStatus = 'synced'
    `).get().count;

    const pendingSync = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE isGolden = 1 AND (syncStatus IS NULL OR syncStatus = 'pending')
    `).get().count;

    const failedSync = db.prepare(`
      SELECT COUNT(*) as count FROM requests 
      WHERE isGolden = 1 AND syncStatus = 'sync_failed'
    `).get().count;

    res.json({
      totalGoldenRecords,
      syncedRecords,
      pendingSync,
      failedSync
    });
  } catch (error) {
    console.error('Error fetching sync stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get eligible records for sync
app.get('/api/sync/eligible-records', (req, res) => {
  try {
    console.log('[SYNC] Getting eligible records...');
    
    const records = db.prepare(`
      SELECT id, firstName, firstNameAr, tax, country, city, 
             CustomerType, companyStatus, syncStatus, lastSyncedAt,
             createdAt, updatedAt
      FROM requests 
      WHERE isGolden = 1
      ORDER BY createdAt DESC
      LIMIT 50
    `).all();

    console.log(`[SYNC] Found ${records.length} eligible records`);
    res.json(records);
  } catch (error) {
    console.error('[SYNC] Error fetching eligible records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete sync rule
app.delete('/api/sync/rules/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[SYNC] Deleting sync rule ${id}...`);
    
    const stmt = db.prepare(`DELETE FROM sync_rules WHERE id = ?`);
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    console.log(`[SYNC] Rule ${id} deleted successfully`);
    res.json({ success: true });
  } catch (error) {
    console.error('[SYNC] Error deleting sync rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Enhanced Sync APIs for New Design ============

// Clear sync data (operations and records) but keep rules
app.post('/api/sync/clear-data', (req, res) => {
  try {
    console.log('[SYNC] Clearing sync data...');
    
    // Clear sync_records table
    const clearRecords = db.prepare(`DELETE FROM sync_records`).run();
    console.log(`[SYNC] Cleared ${clearRecords.changes} sync records`);
    
    // Clear sync_operations table
    const clearOperations = db.prepare(`DELETE FROM sync_operations`).run();
    console.log(`[SYNC] Cleared ${clearOperations.changes} sync operations`);
    
    // Reset sync status in requests table
    const resetSyncStatus = db.prepare(`
      UPDATE requests 
      SET syncStatus = 'not_synced', lastSyncedAt = NULL 
      WHERE isGolden = 1
    `).run();
    console.log(`[SYNC] Reset sync status for ${resetSyncStatus.changes} golden records`);
    
    res.json({
      success: true,
      message: 'Sync data cleared successfully',
      clearedRecords: clearRecords.changes,
      clearedOperations: clearOperations.changes,
      resetRecords: resetSyncStatus.changes
    });
    
  } catch (error) {
    console.error('[SYNC] Error clearing sync data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear sync data: ' + error.message 
    });
  }
});

// Check for duplicate golden records
app.post('/api/requests/check-duplicate', (req, res) => {
  try {
    const { tax, CustomerType } = req.body;
    
    if (!tax || !CustomerType) {
      return res.status(400).json({ 
        error: 'Tax number and Customer Type are required' 
      });
    }
    
    console.log(`[DUPLICATE CHECK] Checking for tax: ${tax}, CustomerType: ${CustomerType}`);
    
    // Map frontend CustomerType to database CustomerType
    const customerTypeMapping = {
      'limited_liability': 'Limited Liability Company',
      'joint_stock': 'Joint Stock Company',
      'sole_proprietorship': 'Sole Proprietorship',
      'Corporate': 'Corporate',
      'SME': 'SME',
      'Retail Chain': 'Retail Chain'
    };
    
    const mappedCustomerType = customerTypeMapping[CustomerType] || CustomerType;
    console.log(`[DUPLICATE CHECK] Mapped CustomerType: ${CustomerType} -> ${mappedCustomerType}`);
    
    // Check if golden record exists with same tax and CustomerType
    const existingRecord = db.prepare(`
      SELECT id, firstName, tax, CustomerType, country, city 
      FROM requests 
      WHERE isGolden = 1 
      AND tax = ? 
      AND CustomerType = ?
    `).get(tax, mappedCustomerType);
    
    if (existingRecord) {
      console.log(`[DUPLICATE CHECK] Found duplicate: ${existingRecord.firstName}`);
      res.json({
        isDuplicate: true,
        existingRecord: {
          id: existingRecord.id,
          name: existingRecord.firstName,
          tax: existingRecord.tax,
          customerType: existingRecord.CustomerType,
          country: existingRecord.country,
          city: existingRecord.city
        },
        message: `Customer with tax number ${tax} and type ${CustomerType} already exists as golden record: ${existingRecord.firstName}`
      });
    } else {
      console.log(`[DUPLICATE CHECK] No duplicate found`);
      res.json({
        isDuplicate: false,
        message: 'No duplicate found'
      });
    }
    
  } catch (error) {
    console.error('[DUPLICATE CHECK] Error:', error);
    res.status(500).json({ 
      error: 'Failed to check for duplicates: ' + error.message 
    });
  }
});

// Get sync operations history (renamed from /api/sync/operations)
app.get('/api/sync/history', (req, res) => {
  try {
    console.log('[SYNC] Getting sync history...');

    const operations = db.prepare(`
      SELECT
        so.*,
        sr.name as ruleName,
        GROUP_CONCAT(sr2.requestId) as syncedRecordIds,
        GROUP_CONCAT(r.firstName || ' ' || r.lastName) as syncedRecordNames
      FROM sync_operations so
      LEFT JOIN sync_rules sr ON so.ruleId = sr.id
      LEFT JOIN sync_records sr2 ON so.id = sr2.operationId
      LEFT JOIN requests r ON sr2.requestId = r.id
      GROUP BY so.id
      ORDER BY so.startedAt DESC
      LIMIT 50
    `).all();

    // Parse the grouped data
    const formattedOperations = operations.map(op => ({
      ...op,
      syncedRecordIds: op.syncedRecordIds ? op.syncedRecordIds.split(',') : [],
      syncedRecordNames: op.syncedRecordNames ? op.syncedRecordNames.split(',') : []
    }));

    console.log(`[SYNC] Found ${formattedOperations.length} sync operations`);
    res.json(formattedOperations);
  } catch (error) {
    console.error('[SYNC] Error fetching sync history:', error);
    res.status(500).json({ error: 'Failed to fetch sync history' });
  }
});

// Execute sync for selected records with proper rule filtering
app.post('/api/sync/execute-selected', (req, res) => {
  const { recordIds, targetSystem, executedBy } = req.body;
  
  if (!targetSystem) {
    return res.status(400).json({ error: 'Target system is required' });
  }

  try {
    console.log(`[SYNC] Execute sync for ${targetSystem}`);
    console.log(`[SYNC] Received ${recordIds ? recordIds.length : 0} record IDs`);
    
    // Get the active rule for this target system
    const rule = db.prepare(`
      SELECT * FROM sync_rules 
      WHERE targetSystem = ? AND isActive = 1
      LIMIT 1
    `).get(targetSystem);

    if (!rule) {
      console.log(`[SYNC] No active rule found for ${targetSystem}`);
      return res.json({
        success: true,
        message: `No active sync rule for ${targetSystem}`,
        totalRecords: 0,
        syncedRecords: 0,
        failedRecords: 0
      });
    }

    console.log(`[SYNC] Found rule: ${rule.name}`);
    
    // Parse the filter criteria
    const criteria = rule.filterCriteria ? JSON.parse(rule.filterCriteria) : {};
    console.log(`[SYNC] Rule criteria:`, JSON.stringify(criteria, null, 2));

    // Build query to get only records that match the rule criteria
    let query = `
      SELECT * FROM requests 
      WHERE isGolden = 1 
      AND (companyStatus = 'Active' OR companyStatus = 'Blocked')
    `;
    
    const params = [];
    
    // If specific recordIds provided, filter by them
    if (recordIds && recordIds.length > 0) {
      query += ` AND id IN (${recordIds.map(() => '?').join(',')})`;
      params.push(...recordIds);
    }
    
    // Apply rule conditions
    if (criteria.conditions && criteria.conditions.length > 0) {
      const logic = criteria.logic || 'AND';
      const conditionClauses = [];
      
      criteria.conditions.forEach(condition => {
        if (condition.field && condition.operator && condition.value !== undefined && condition.value !== null) {
          console.log(`[SYNC] Applying condition: ${condition.field} ${condition.operator} ${condition.value}`);
          
          let conditionClause = '';
          switch (condition.operator) {
            case 'equals':
              conditionClause = `${condition.field} = ?`;
              params.push(condition.value);
              break;
            case 'not_equals':
              conditionClause = `${condition.field} != ?`;
              params.push(condition.value);
              break;
            case 'contains':
              conditionClause = `${condition.field} LIKE ?`;
              params.push(`%${condition.value}%`);
              break;
            case 'starts_with':
              conditionClause = `${condition.field} LIKE ?`;
              params.push(`${condition.value}%`);
              break;
            case 'ends_with':
              conditionClause = `${condition.field} LIKE ?`;
              params.push(`%${condition.value}`);
              break;
            case 'in':
              const values = Array.isArray(condition.value) ? condition.value : [condition.value];
              conditionClause = `${condition.field} IN (${values.map(() => '?').join(',')})`;
              params.push(...values);
              break;
            case 'not_in':
              const notValues = Array.isArray(condition.value) ? condition.value : [condition.value];
              conditionClause = `${condition.field} NOT IN (${notValues.map(() => '?').join(',')})`;
              params.push(...notValues);
              break;
            default:
              console.log(`[SYNC] Unknown operator: ${condition.operator}`);
              return;
          }
          
          if (conditionClause) {
            conditionClauses.push(conditionClause);
          }
        }
      });
      
      if (conditionClauses.length > 0) {
        if (logic === 'OR') {
          query += ` AND (${conditionClauses.join(' OR ')})`;
        } else {
          query += ` AND (${conditionClauses.join(' AND ')})`;
        }
      }
    }

    console.log(`[SYNC] Final query: ${query}`);
    console.log(`[SYNC] Query params:`, params);
    console.log(`[SYNC] Logic used: ${criteria.logic || 'AND'}`);
    
    const recordsToSync = db.prepare(query).all(...params);
    console.log(`[SYNC] Found ${recordsToSync.length} records matching criteria for ${targetSystem}`);

    if (recordsToSync.length === 0) {
      return res.json({
        success: true,
        message: `No records match the sync criteria for ${targetSystem}`,
        totalRecords: 0,
        syncedRecords: 0,
        failedRecords: 0
      });
    }

    // Log which records are being synced
    console.log(`[SYNC] Syncing records for ${targetSystem}:`);
    recordsToSync.forEach(r => {
      console.log(`  - ${r.firstName} (${r.country}, ${r.CustomerType})`);
    });

    // Create sync operation
    const operationResult = db.prepare(`
      INSERT INTO sync_operations (
        ruleId, targetSystem, syncType, status, totalRecords, 
        syncedRecords, failedRecords, startedAt, executedBy
      ) VALUES (?, ?, 'manual', 'in_progress', ?, 0, 0, datetime('now'), ?)
    `).run(rule.id, targetSystem, recordsToSync.length, executedBy || 'system');
    
    const operationId = operationResult.lastInsertRowid;

    // Prepare statements for batch operations
    const insertSyncRecord = db.prepare(`
      INSERT INTO sync_records (
        operationId, requestId, targetSystem, syncStatus, 
        targetRecordId, syncedAt, errorMessage
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `);

    const updateRequest = db.prepare(`
      UPDATE requests 
      SET syncStatus = 'synced', 
          lastSyncedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    let syncedCount = 0;
    let failedCount = 0;

    // Process each record - NO RANDOM FAILURES, only real errors
    recordsToSync.forEach(record => {
      const targetRecordId = `${targetSystem.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}_${record.id}_${Date.now()}`;
      
      try {
        // Always succeed unless there's a real database error
        insertSyncRecord.run(
          operationId,
          record.id,
          targetSystem,
          'success',
          targetRecordId,
          null
        );
        
        // Update the original record
        updateRequest.run(record.id);
        
        syncedCount++;
        console.log(`[SYNC] ✓ Synced: ${record.firstName} to ${targetSystem}`);
        
      } catch (error) {
        // Only fail on real database errors
        console.error(`[SYNC] ✗ Real error syncing ${record.id}:`, error);
        insertSyncRecord.run(
          operationId,
          record.id,
          targetSystem,
          'failed',
          null,
          error.message || 'Database error'
        );
        failedCount++;
      }
    });

    // Update operation status
    const finalStatus = failedCount === 0 ? 'completed' : 
                       syncedCount === 0 ? 'failed' : 'partial';
    
    db.prepare(`
      UPDATE sync_operations 
      SET status = ?, 
          syncedRecords = ?, 
          failedRecords = ?,
          completedAt = datetime('now')
      WHERE id = ?
    `).run(finalStatus, syncedCount, failedCount, operationId);

    console.log(`[SYNC] Operation ${operationId} for ${targetSystem} completed: ${syncedCount}/${recordsToSync.length} synced`);

    res.json({
      success: true,
      message: `Synced ${syncedCount} records to ${targetSystem}`,
      operationId: operationId,
      targetSystem: targetSystem,
      totalRecords: recordsToSync.length,
      syncedRecords: syncedCount,
      failedRecords: failedCount
    });

  } catch (error) {
    console.error('[SYNC] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ========================================
// OFAC LOCAL DATABASE ENDPOINTS
// ========================================

const { syncOFACData, searchLocalOFAC, searchLocalOFACWithAI } = require('./ofac-sync');

/**
 * Sync OFAC data to local database
 */
app.post('/api/ofac/sync', async (req, res) => {
  try {
    console.log('🔄 [API] Starting OFAC sync...');
    const result = await syncOFACData(db);
    res.json(result);
  } catch (error) {
    console.error('❌ [API] OFAC sync failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Get OFAC sync status
 */
app.get('/api/ofac/status', (req, res) => {
  try {
    const status = db.prepare(`
      SELECT * FROM ofac_sync_metadata 
      ORDER BY created_at DESC LIMIT 1
    `).get();
    
    const count = db.prepare(`
      SELECT COUNT(*) as total FROM ofac_entities
    `).get();
    
    res.json({
      lastSync: status,
      totalEntities: count.total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search local OFAC database with OpenAI fuzzy matching
 */
app.post('/api/ofac/search', async (req, res) => {
  try {
    const { companyName, country, useAI = true } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name required' });
    }
    
    console.log(`🔍 [OFAC SEARCH] Searching: "${companyName}"${country ? ` in ${country}` : ''}`);
    console.log(`🤖 [OFAC SEARCH] AI Fuzzy Matching: ${useAI ? 'Enabled ✅' : 'Disabled ❌'}`);
    
    // Use AI-powered search if enabled
    const results = useAI 
      ? await searchLocalOFACWithAI(db, companyName, country)
      : searchLocalOFAC(db, companyName, country);
    
    console.log(`✓ [OFAC SEARCH] Found ${results.length} results`);
    
    res.json(results);
  } catch (error) {
    console.error(`❌ [OFAC SEARCH] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get full OFAC entity details by ID or UID
 */
app.get('/api/ofac/entity/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [OFAC DETAILS] Fetching details for: ${id}`);
    
    // Get basic entity info
    const entity = db.prepare(`
      SELECT * FROM ofac_entities 
      WHERE id = ? OR uid = ?
    `).get(id, id);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Get countries
    const countries = db.prepare(`
      SELECT country FROM entity_countries 
      WHERE entity_uid = ?
    `).all(entity.uid).map(r => r.country);
    
    // Get aliases
    const aliases = db.prepare(`
      SELECT alias, alias_type FROM entity_aliases 
      WHERE entity_uid = ?
    `).all(entity.uid);
    
    // Get addresses
    const addresses = db.prepare(`
      SELECT * FROM entity_addresses 
      WHERE entity_uid = ?
    `).all(entity.uid);
    
    // Get ID numbers
    const idNumbers = db.prepare(`
      SELECT * FROM entity_id_numbers 
      WHERE entity_uid = ?
    `).all(entity.uid);
    
    // Get programs
    const programs = db.prepare(`
      SELECT program FROM entity_programs 
      WHERE entity_uid = ?
    `).all(entity.uid).map(r => r.program);
    
    // Get remarks
    const remarks = db.prepare(`
      SELECT remark FROM entity_remarks 
      WHERE entity_uid = ?
    `).all(entity.uid).map(r => r.remark);
    
    // Get sanctions entry info
    const sanctionsEntry = db.prepare(`
      SELECT * FROM sanctions_entry 
      WHERE entity_uid = ?
    `).get(entity.uid);
    
    // Get sanctions measures (if entry exists)
    let sanctionsMeasures = [];
    if (sanctionsEntry) {
      sanctionsMeasures = db.prepare(`
        SELECT * FROM sanctions_measures 
        WHERE entry_id = ?
      `).all(sanctionsEntry.entry_id);
    }
    
    // Get reference data for human-readable names
    let legalBasisName = null;
    let entryEventTypeName = null;
    let listName = null;
    
    if (sanctionsEntry) {
      // Get legal basis name
      const legalBasis = db.prepare('SELECT full_name, short_ref FROM ofac_legal_basis WHERE id = ?')
        .get(sanctionsEntry.legal_basis_id);
      legalBasisName = legalBasis ? legalBasis.short_ref : null;
      
      // Get entry event type name
      const eventType = db.prepare('SELECT name FROM ofac_entry_event_types WHERE id = ?')
        .get(sanctionsEntry.entry_event_type_id);
      entryEventTypeName = eventType ? eventType.name : null;
      
      // List ID 1550 is SDN (Specially Designated Nationals)
      if (sanctionsEntry.list_id === '1550') {
        listName = 'SDN (Specially Designated Nationals)';
      } else {
        listName = `List ${sanctionsEntry.list_id}`;
      }
    }
    
    const fullDetails = {
      ...entity,
      countries,
      aliases: aliases.map(a => a.alias),
      aliasDetails: aliases,
      addresses,
      idNumbers,
      programs,
      remarks,
      sanctionsInfo: sanctionsEntry ? {
        entryDate: sanctionsEntry.entry_event_date,
        entryEventType: entryEventTypeName || sanctionsEntry.entry_event_type_id,
        entryEventTypeId: sanctionsEntry.entry_event_type_id,
        legalBasis: legalBasisName || sanctionsEntry.legal_basis_id,
        legalBasisId: sanctionsEntry.legal_basis_id,
        listId: sanctionsEntry.list_id,
        listName: listName,
        comment: sanctionsEntry.entry_event_comment,
        measures: sanctionsMeasures.map(m => ({
          type: m.sanctions_type_name || m.sanctions_type_id,
          typeId: m.sanctions_type_id,
          startDate: m.date_period_start,
          endDate: m.date_period_end,
          comment: m.comment
        }))
      } : null
    };
    
    console.log(`✓ [OFAC DETAILS] Found entity: ${entity.name} with ${sanctionsMeasures.length} sanctions measures`);
    res.json(fullDetails);
    
  } catch (error) {
    console.error(`❌ [OFAC DETAILS] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload and parse OFAC XML file manually
 */
app.post('/api/ofac/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('📁 [OFAC UPLOAD] File received:', req.file.originalname);
    console.log('📊 [OFAC UPLOAD] File size:', (req.file.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Read file content
    const fs = require('fs').promises;
    const xmlContent = await fs.readFile(req.file.path, 'utf-8');
    
    console.log('✅ [OFAC UPLOAD] File read successfully');
    
    // Parse and import using ofac-sync module
    const { syncOFACData } = require('./ofac-sync');
    
    // Create a custom sync that uses the uploaded file
    const result = await syncOFACDataFromXML(db, xmlContent);
    
    // Clean up uploaded file
    await fs.unlink(req.file.path);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [OFAC UPLOAD] Upload failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * =====================================================
 * AI COMPLIANCE ANALYSIS ENDPOINT
 * =====================================================
 */

const { analyzeComplianceWithAI, ConversationContext } = require('./ai-compliance-agent');
const { 
  searchOFACWithPrecomputedEmbeddings, 
  searchUNWithPrecomputedEmbeddings 
} = require('./search-with-precomputed-embeddings');

// Store conversation contexts (in production, use Redis or DB)
const conversations = new Map();

/**
 * Intelligent compliance analysis with Claude Sonnet 4
 */
app.post('/api/compliance/ai-analyze', async (req, res) => {
  try {
    const { companyName, country, sector, requestType, sessionId } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name required' });
    }
    
    console.log(`🤖 [AI ANALYSIS] Starting intelligent analysis for: ${companyName}`);
    
    // Get or create conversation context
    let context = conversations.get(sessionId || 'default');
    if (!context) {
      context = new ConversationContext();
      conversations.set(sessionId || 'default', context);
    }
    
    // Search OFAC and UN using pre-computed embeddings
    const API_KEY = process.env.OPENAI_API_KEY;
    const [ofacResults, unResults] = await Promise.all([
      searchOFACWithPrecomputedEmbeddings(db, companyName, API_KEY, country),
      searchUNWithPrecomputedEmbeddings(db, companyName, API_KEY, country)
    ]);
    
    const allResults = [...ofacResults, ...unResults];
    console.log(`📊 [AI ANALYSIS] Total results: ${allResults.length} (OFAC: ${ofacResults.length}, UN: ${unResults.length})`);
    
    // Use AI to analyze results
    const analysis = await analyzeComplianceWithAI(
      companyName,
      allResults,
      { country, sector, requestType }
    );
    
    // Add to conversation context
    context.addMessage('user', `Check company: ${companyName}`, {
      country,
      sector
    });
    context.addMessage('assistant', analysis.explanation, {
      recommendation: analysis.recommendation,
      confidence: analysis.confidence
    });
    
    console.log(`✅ [AI ANALYSIS] Complete: ${analysis.recommendation} (${analysis.confidence}% confidence)`);
    
    res.json(analysis);
    
  } catch (error) {
    console.error(`❌ [AI ANALYSIS] Error:`, error.message);
    res.status(500).json({ 
      error: error.message,
      fallback: true
    });
  }
});

/**
 * Get conversation history
 */
app.get('/api/compliance/conversation/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const context = conversations.get(sessionId);
    
    if (!context) {
      return res.json({ history: [] });
    }
    
    res.json({
      history: context.getSummary()
    });
  } catch (error) {
    console.error(`❌ [CONVERSATION] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * =====================================================
 * UN SANCTIONS ENDPOINTS
 * =====================================================
 */

/**
 * Search UN sanctions with OpenAI fuzzy matching
 */
app.post('/api/un/search', async (req, res) => {
  try {
    const { companyName, country, useAI = true } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name required' });
    }
    
    console.log(`🇺🇳 [UN SEARCH] Searching: "${companyName}"${country ? ` in ${country}` : ''}`);
    console.log(`🤖 [UN SEARCH] AI Fuzzy Matching: ${useAI ? 'Enabled ✅' : 'Disabled ❌'}`);
    
    // Use AI-powered search if enabled
    const results = useAI 
      ? await searchUNWithAI(db, companyName, country)
      : searchLocalUN(db, companyName, country);
    
    console.log(`✓ [UN SEARCH] Found ${results.length} results`);
    
    res.json(results);
  } catch (error) {
    console.error(`❌ [UN SEARCH] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get full UN entity details by DATAID
 */
app.get('/api/un/entity/:dataid', (req, res) => {
  try {
    const { dataid } = req.params;
    console.log(`🇺🇳 [UN DETAILS] Fetching details for: ${dataid}`);
    
    // Get basic entity info
    const entity = db.prepare(`
      SELECT * FROM un_entities 
      WHERE dataid = ?
    `).get(dataid);
    
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Get aliases
    const aliases = db.prepare(`
      SELECT quality, alias_name FROM un_entity_aliases 
      WHERE entity_dataid = ?
    `).all(dataid);
    
    // Get addresses
    const addresses = db.prepare(`
      SELECT * FROM un_entity_addresses 
      WHERE entity_dataid = ?
    `).all(dataid);
    
    const fullDetails = {
      ...entity,
      aliases: aliases.map(a => a.alias_name),
      aliasDetails: aliases,
      addresses,
      source: 'UN'
    };
    
    console.log(`✓ [UN DETAILS] Found entity: ${entity.first_name}`);
    res.json(fullDetails);
    
  } catch (error) {
    console.error(`❌ [UN DETAILS] Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Basic UN search without AI (SQL LIKE)
 */
function searchLocalUN(db, companyName, country = null) {
  let query = `
    SELECT DISTINCT
      e.id,
      e.dataid,
      e.first_name as name,
      e.reference_number,
      e.un_list_type,
      e.listed_on,
      e.comments,
      e.last_updated,
      GROUP_CONCAT(DISTINCT a.country) as countries
    FROM un_entities e
    LEFT JOIN un_entity_addresses a ON e.dataid = a.entity_dataid
    WHERE (
      e.first_name LIKE ? 
      OR EXISTS (
        SELECT 1 FROM un_entity_aliases al 
        WHERE al.entity_dataid = e.dataid 
        AND al.alias_name LIKE ?
      )
    )
  `;
  
  const params = [`%${companyName}%`, `%${companyName}%`];
  
  if (country) {
    query += ` AND EXISTS (
      SELECT 1 FROM un_entity_addresses ad 
      WHERE ad.entity_dataid = e.dataid 
      AND ad.country LIKE ?
    )`;
    params.push(`%${country}%`);
  }
  
  query += ` GROUP BY e.dataid ORDER BY e.first_name LIMIT 50`;
  
  return db.prepare(query).all(...params);
}

/**
 * AI-powered UN search with OpenAI Embeddings
 */
async function searchUNWithAI(db, companyName, country = null) {
  // First get candidates using SQL LIKE
  const candidates = searchLocalUN(db, companyName, country);
  
  if (candidates.length === 0) {
    return [];
  }
  
  if (candidates.length === 1) {
    return candidates.map(c => ({
      ...c,
      matchScore: 95,
      matchReason: 'Only match found',
      source: 'UN'
    }));
  }
  
  // Use OpenAI Embeddings for semantic search
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn('⚠️  OpenAI API key not found, using basic search');
      return candidates.map(c => ({
        ...c,
        matchScore: 70,
        matchReason: 'Basic SQL match',
        source: 'UN'
      }));
    }
    
    // Use embeddings module
    const { searchOFACWithEmbeddings } = require('./ofac-embeddings');
    const embeddingResults = await searchOFACWithEmbeddings(companyName, candidates, openaiApiKey);
    
    // Add source tag
    return embeddingResults.map(r => ({
      ...r,
      source: 'UN'
    }));
    
  } catch (error) {
    console.error('❌ [UN AI] Embeddings error:', error.message);
    return candidates.map(c => ({
      ...c,
      matchScore: 70,
      matchReason: 'Basic SQL match (AI failed)',
      source: 'UN'
    }));
  }
}

// OLD GPT-based approach (deprecated - kept for reference)
async function searchUNWithAI_OLD_GPT(db, companyName, country = null) {
  const candidates = searchLocalUN(db, companyName, country);
  
  if (candidates.length === 0) return [];
  if (candidates.length === 1) {
    return candidates.map(c => ({
      ...c,
      matchScore: 95,
      matchReason: 'Only match found',
      source: 'UN'
    }));
  }
  
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn('⚠️  OpenAI API key not found, using basic search');
      return candidates.map(c => ({
        ...c,
        matchScore: 70,
        matchReason: 'Basic SQL match',
        source: 'UN'
      }));
    }
    
    const prompt = `You are a sanctions screening expert. Compare the search query with UN entities and rank them by relevance.

Search Query: "${companyName}"${country ? ` (Country: ${country})` : ''}

UN Entities to compare:
${candidates.map((c, i) => `${i + 1}. ${c.name} (${c.reference_number})
   - List Type: ${c.un_list_type}
   - Countries: ${c.countries || 'N/A'}
   - Listed: ${c.listed_on}
   - Reason: ${c.comments ? c.comments.substring(0, 150) : 'N/A'}`).join('\n\n')}

Return a JSON array with each entity's match score (0-100) and reason. Consider:
- Name similarity (exact, partial, transliteration, abbreviation)
- Country match
- Context and comments relevance
- List type relevance

Format: [{"index": 1, "score": 95, "reason": "Exact name match"}, ...]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a sanctions compliance expert. Return ONLY valid JSON array, no markdown or explanation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Remove markdown if present
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rankings = JSON.parse(jsonStr);
    
    // Merge scores with candidates
    const rankedResults = candidates.map((candidate, idx) => {
      const ranking = rankings.find(r => r.index === idx + 1);
      return {
        ...candidate,
        matchScore: ranking?.score || 50,
        matchReason: ranking?.reason || 'No AI analysis',
        source: 'UN'
      };
    });
    
    // Sort by score and filter low scores
    return rankedResults
      .sort((a, b) => b.matchScore - a.matchScore)
      .filter(r => r.matchScore >= 40);
    
  } catch (error) {
    console.error('❌ [UN AI] OpenAI error:', error.message);
    return candidates.map(c => ({
      ...c,
      matchScore: 70,
      matchReason: 'Basic SQL match (AI failed)',
      source: 'UN'
    }));
  }
}

// Helper function to sync from uploaded XML
async function syncOFACDataFromXML(db, xmlContent) {
  const xml2js = require('xml2js');
  const startTime = Date.now();
  
  console.log('🔍 [OFAC PARSE] Parsing XML...');
  
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlContent);
  
  // Parse entities from XML
  const sdnList = result?.sdnList?.sdnEntry || [];
  const entries = Array.isArray(sdnList) ? sdnList : [sdnList];
  
  console.log(`✓ [OFAC PARSE] Found ${entries.length} entries`);
  
  // Transform and filter
  const entities = entries
    .filter(entry => entry)
    .map(entry => parseOFACEntry(entry))
    .filter(entity => entity && shouldIncludeEntity(entity));
  
  console.log(`✓ [OFAC PARSE] Filtered to ${entities.length} matching entities`);
  
  // Clear old data
  clearOFACData(db);
  
  // Insert new data
  insertOFACEntities(db, entities);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  return {
    success: true,
    totalEntries: entries.length,
    filteredEntities: entities.length,
    duration: duration + 's'
  };
}

// Parse single OFAC entry
function parseOFACEntry(entry) {
  try {
    // Determine type
    const sdnType = (entry.sdnType || '').toLowerCase();
    let type = 'Entity';
    if (sdnType.includes('individual')) type = 'Individual';
    if (sdnType.includes('vessel')) type = 'Vessel';
    if (sdnType.includes('aircraft')) type = 'Aircraft';
    
    // Extract countries from addresses
    const countries = [];
    const addressList = entry.addressList?.address || [];
    const addresses = Array.isArray(addressList) ? addressList : [addressList];
    addresses.forEach(addr => {
      if (addr && addr.country) countries.push(addr.country);
    });
    
    // Extract aliases
    const aliases = [];
    const akaList = entry.akaList?.aka || [];
    const akas = Array.isArray(akaList) ? akaList : [akaList];
    akas.forEach(aka => {
      if (aka && aka.firstName && aka.lastName) {
        aliases.push(`${aka.firstName} ${aka.lastName}`.trim());
      } else if (aka && aka.name) {
        aliases.push(aka.name);
      }
    });
    
    return {
      uid: entry.uid || `OFAC-${Date.now()}-${Math.random()}`,
      name: entry.firstName && entry.lastName ? `${entry.firstName} ${entry.lastName}`.trim() : (entry.name || 'Unknown'),
      type: type,
      countries: [...new Set(countries)],
      aliases: aliases,
      programs: extractPrograms(entry),
      remarks: entry.remarks ? [entry.remarks] : []
    };
  } catch (error) {
    console.error('Error parsing entry:', error);
    return null;
  }
}

// Check if entity should be included (target countries + sectors)
function shouldIncludeEntity(entity) {
  if (!entity || entity.type !== 'Entity') return false;
  
  const TARGET_COUNTRIES = ['Egypt', 'Yemen', 'United Arab Emirates', 'Saudi Arabia', 'Oman', 'Qatar', 'Bahrain', 'Kuwait', 'UAE'];
  
  // Check country
  const hasTargetCountry = entity.countries.some(c => 
    TARGET_COUNTRIES.some(target => 
      c.toLowerCase().includes(target.toLowerCase()) || 
      target.toLowerCase().includes(c.toLowerCase())
    )
  );
  
  if (!hasTargetCountry) return false;
  
  // Check sector
  const FOOD_KEYWORDS = ['food', 'agriculture', 'farming', 'dairy', 'meat', 'poultry', 'grain', 'flour', 'bakery', 'beverage', 'restaurant'];
  const CONSTRUCTION_KEYWORDS = ['construction', 'building', 'cement', 'concrete', 'contractor', 'infrastructure', 'engineering', 'real estate', 'steel'];
  
  const allText = [entity.name, ...entity.aliases, ...entity.remarks].join(' ').toLowerCase();
  
  if (FOOD_KEYWORDS.some(k => allText.includes(k))) {
    entity.sector = 'Food & Agriculture';
    return true;
  }
  if (CONSTRUCTION_KEYWORDS.some(k => allText.includes(k))) {
    entity.sector = 'Construction';
    return true;
  }
  
  return false;
}

function clearOFACData(db) {
  db.prepare('DELETE FROM entity_remarks').run();
  db.prepare('DELETE FROM entity_id_numbers').run();
  db.prepare('DELETE FROM entity_addresses').run();
  db.prepare('DELETE FROM entity_aliases').run();
  db.prepare('DELETE FROM entity_legal_basis').run();
  db.prepare('DELETE FROM entity_programs').run();
  db.prepare('DELETE FROM entity_countries').run();
  db.prepare('DELETE FROM ofac_entities').run();
}

function insertOFACEntities(db, entities) {
  const insertEntity = db.prepare('INSERT INTO ofac_entities (uid, name, type, sector, listed_date) VALUES (?, ?, ?, ?, ?)');
  const insertCountry = db.prepare('INSERT INTO entity_countries (entity_uid, country) VALUES (?, ?)');
  const insertAlias = db.prepare('INSERT INTO entity_aliases (entity_uid, alias) VALUES (?, ?)');
  const insertProgram = db.prepare('INSERT INTO entity_programs (entity_uid, program) VALUES (?, ?)');
  const insertRemark = db.prepare('INSERT INTO entity_remarks (entity_uid, remark) VALUES (?, ?)');
  
  const insertAll = db.transaction(() => {
    entities.forEach(e => {
      insertEntity.run(e.uid, e.name, e.type, e.sector, '2023-01-01');
      e.countries.forEach(c => insertCountry.run(e.uid, c));
      e.aliases.forEach(a => insertAlias.run(e.uid, a));
      e.programs.forEach(p => insertProgram.run(e.uid, p));
      e.remarks.forEach(r => insertRemark.run(e.uid, r));
    });
  });
  
  insertAll();
}

function extractPrograms(entry) {
  const programList = entry.programList?.program || [];
  const programs = Array.isArray(programList) ? programList : [programList];
  return programs.filter(Boolean).map(p => typeof p === 'string' ? p : (p._ || p));
}

// Demo data endpoint removed - use real OFAC data only via upload

// ========================================
// COMPLIANCE AGENT API ENDPOINTS
// ========================================

/**
 * Search company compliance using external APIs and OpenAI orchestration
 */
app.post('/api/compliance/search', async (req, res) => {
  try {
    console.log('🔍 [COMPLIANCE] Starting compliance search:', req.body);
    
    const { companyName, country, legalForm, companyType, registrationNumber, address, searchType, fallbackSources, selectedSources } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // 1. Search external APIs (with optional fallback sources and selected sources)
    const externalResults = await searchExternalAPIs({
      companyName,
      country,
      legalForm,
      companyType,
      registrationNumber,
      address,
      fallbackSources,  // ✅ ['ofac', 'eu'] if user requested fallback
      selectedSources: selectedSources || ['opensanctions']  // ✅ Default to opensanctions if not specified
    });
    
    // 2. Use OpenAI for orchestration and matching
    const orchestratedResults = await orchestrateWithOpenAI({
      companyName,
      searchCriteria: req.body,
      externalResults
    });
    
    // 3. Calculate overall risk level
    const overallRiskLevel = calculateOverallRiskLevel(orchestratedResults.sanctions);
    
    // 4. Prepare final result with API statuses
    const complianceResult = {
      companyName,
      matchConfidence: orchestratedResults.matchConfidence,
      overallRiskLevel,
      sanctions: orchestratedResults.sanctions,
      sources: orchestratedResults.sources,
      searchTimestamp: new Date().toISOString(),
      searchCriteria: req.body,
      apiStatuses: externalResults.statuses  // ✅ Include API statuses for UI
    };
    
    console.log('✅ [COMPLIANCE] Search completed:', complianceResult);
    res.json(complianceResult);
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] Search failed:', error);
    
    // Check if it's a rate limit error from external API
    if (error.rateLimitError || error.status === 429 || error.message?.includes('429')) {
      return res.status(429).json({ 
        error: 'API Rate Limit Exceeded', 
        details: 'Monthly API quota has been exceeded. Service will resume next month.',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Compliance search failed', 
      details: error.message 
    });
  }
});

/**
 * Search local sanctions database with OpenAI Fuzzy Matching
 */
app.post('/api/compliance/search-local', async (req, res) => {
  try {
    console.log('🔍 [SANCTIONS DB] Starting intelligent local sanctions search:', req.body);
    
    const { companyName, country, sector, riskLevel } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // STEP 1: Get all companies from local database (or filtered by country/sector)
    let sql = `SELECT * FROM sanctions_database WHERE 1=1`;
    const params = [];
    
    // Apply filters to reduce dataset before sending to OpenAI
    if (country) {
      sql += ` AND Country = ?`;
      params.push(country);
    }
    
    if (sector) {
      sql += ` AND Sector LIKE ?`;
      params.push(`%${sector}%`);
    }
    
    if (riskLevel) {
      sql += ` AND RiskLevel = ?`;
      params.push(riskLevel);
    }
    
    console.log('📊 [SANCTIONS DB] Fetching companies from database...');
    const allCompanies = db.prepare(sql).all(...params);
    
    console.log(`📊 [SANCTIONS DB] Found ${allCompanies.length} companies in database`);
    
    // STEP 2: Use OpenAI for intelligent fuzzy matching
    if (openai && allCompanies.length > 0) {
      console.log('🤖 [OPENAI] Using AI for fuzzy matching...');
      
      const companiesList = allCompanies.map((c, i) => 
        `${i + 1}. "${c.CompanyName}" (${c.Country}, ${c.Sector || 'N/A'})`
      ).join('\n');
      
      // 📊 DETAILED LOGGING FOR DEBUGGING
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 [OPENAI DEBUG] SEARCH REQUEST DETAILS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎯 Search Query:', `"${companyName}"`);
      console.log('🌍 Country Filter:', country || 'None');
      console.log('🏭 Sector Filter:', sector || 'None');
      console.log('📊 Total Companies in DB:', allCompanies.length);
      console.log('');
      console.log('📋 COMPANIES SENT TO OPENAI:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      allCompanies.forEach((c, i) => {
        console.log(`${i + 1}. "${c.CompanyName}"`);
        console.log(`   Country: ${c.Country}`);
        console.log(`   Sector: ${c.Sector || 'N/A'}`);
        console.log(`   Risk Level: ${c.RiskLevel}`);
        console.log(`   Sanction Program: ${c.SanctionProgram}`);
        console.log(`   Reason: ${c.SanctionReason}`);
        console.log('');
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const prompt = `You are a world-class compliance and international sanctions expert with advanced AI capabilities.

**Your mission:** Intelligent company matching against sanctions lists using advanced AI reasoning.

**Your advanced capabilities:**
- Understand ALL languages (Arabic, English, Chinese, Russian, etc.)
- Recognize names written in different ways
- Understand cultural name differences
- Match Arabic names with English and vice versa
- Recognize abbreviations and trade names
- Analyze geographic and sector context

**Search Query:** "${companyName}"
${country ? `**Country Filter:** ${country}` : ''}
${sector ? `**Sector Filter:** ${sector}` : ''}

**Available Companies in Database:**
${companiesList}

**Intelligent matching criteria:**
1. **Name matching:** Use your intelligence to compare names regardless of language or spelling
2. **Geographic context:** Same country/region = higher likelihood
3. **Industry sector:** Same field = higher likelihood  
4. **Phonetic similarity:** Names that sound similar (especially cross-language)
5. **Business entities:** Ignore differences in (Company, Corp, LLC, Ltd, DMCC, etc.)

**Confidence levels:**
- 90-100%: Near certain match (almost same name + same country + same sector)
- 70-89%: Very strong match (highly similar name + similar context)
- 50-69%: Possible match (needs human review)
- Below 50%: Weak match (don't return)

**Risk levels:**
- Critical: 90%+ confidence in sensitive sector or serious sanctions
- High: 80%+ confidence or sensitive sector
- Medium: 60-79% confidence
- Low: 50-59% confidence

**⚠️ CRITICAL:**
- Use your FULL intelligence to understand names in ANY language
- Don't rely on simple text matching
- Think like a human expert analyzing names
- Explain in detail WHY this is a match
- Be conservative: High confidence only for clear matches

**Return ONLY a JSON array** with matched company indices and confidence scores (0-100):
[
  {"index": 1, "confidence": 95, "reason": "Strong phonetic match: Arabic 'صنوبر' transliterates to 'SINOPER' + same shipping sector"},
  {"index": 3, "confidence": 75, "reason": "Partial match: Query contains company name abbreviation"}
]

If NO matches found, return empty array: []`;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a world-class compliance expert with advanced multilingual intelligence. Use your full AI capabilities to match company names across ANY language using phonetic, semantic, and contextual analysis. Think like a human expert. Return ONLY valid JSON arrays with detailed reasoning. No explanations outside the JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });
        
        const aiResponse = completion.choices[0].message.content.trim();
        
        // 📊 LOG OPENAI RESPONSE
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖 [OPENAI RESPONSE] RAW AI OUTPUT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 OpenAI Response:', aiResponse);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Parse AI response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.warn('⚠️ [OPENAI] Could not parse JSON response, using fallback');
          throw new Error('Invalid JSON response from OpenAI');
        }
        
        const matches = JSON.parse(jsonMatch[0]);
        
        // 📊 LOG PARSED MATCHES
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ [OPENAI MATCHES] PARSED RESULTS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Number of matches found:', matches.length);
        matches.forEach((match, i) => {
          console.log(`Match ${i + 1}:`);
          console.log(`  Index: ${match.index}`);
          console.log(`  Confidence: ${match.confidence}%`);
          console.log(`  Reason: ${match.reason}`);
          console.log('');
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Map matched indices to actual company records
        const matchedCompanies = matches
          .filter(m => m.index >= 1 && m.index <= allCompanies.length)
          .map(match => {
            const company = allCompanies[match.index - 1];
            return {
              id: company.id.toString(),
              name: company.CompanyName,
              type: company.CustomerType || 'Company',
              country: company.Country,
              source: 'Local Database',
              confidence: match.confidence || 85,
              matchReason: match.reason || 'AI Match',
              riskLevel: company.RiskLevel,
              description: company.SanctionReason,
              reason: company.SanctionReason,
              sanctionType: company.SanctionProgram,
              sanctionDate: company.SanctionStartDate,
              sector: company.Sector,
              address: company.Address,
              city: company.City,
              sourceList: company.SourceList,
              sourceUrl: company.OpenSanctionsLink,
              datasetVersion: company.DatasetVersion,
              lastVerified: company.LastVerified
            };
          })
          .sort((a, b) => b.confidence - a.confidence); // Sort by confidence
        
        console.log(`✅ [OPENAI] Found ${matchedCompanies.length} intelligent matches`);
        
        const complianceResult = {
          companyName,
          matchConfidence: matchedCompanies.length > 0 ? matchedCompanies[0].confidence : 0,
          overallRiskLevel: matchedCompanies.length > 0 ? matchedCompanies[0].riskLevel : 'Low',
          sanctions: matchedCompanies,
          sources: ['Local Sanctions Database (AI Matched)'],
          searchTimestamp: new Date().toISOString(),
          searchCriteria: req.body,
          totalMatches: matchedCompanies.length,
          matchMethod: 'OpenAI Fuzzy Matching'
        };
        
        return res.json(complianceResult);
        
      } catch (aiError) {
        console.error('❌ [OPENAI] Fuzzy matching failed:', aiError);
        // Fallback to simple LIKE matching
      }
    }
    
    // FALLBACK: Simple SQL LIKE matching (when OpenAI not available or error)
    console.log('📊 [SANCTIONS DB] Using fallback SQL LIKE matching...');
    
    const likeResults = allCompanies.filter(c => 
      c.CompanyName.toLowerCase().includes(companyName.toLowerCase())
    );
    
    const sanctions = likeResults.map(record => ({
      id: record.id.toString(),
      name: record.CompanyName,
      type: record.CustomerType || 'Company',
      country: record.Country,
      source: 'Local Database',
      confidence: 100,
      matchReason: 'SQL LIKE Match',
      riskLevel: record.RiskLevel,
      description: record.SanctionReason,
      reason: record.SanctionReason,
      sanctionType: record.SanctionProgram,
      sanctionDate: record.SanctionStartDate,
      sector: record.Sector,
      address: record.Address,
      city: record.City,
      sourceList: record.SourceList,
      sourceUrl: record.OpenSanctionsLink,
      datasetVersion: record.DatasetVersion,
      lastVerified: record.LastVerified
    }));
    
    const complianceResult = {
      companyName,
      matchConfidence: sanctions.length > 0 ? 100 : 0,
      overallRiskLevel: sanctions.length > 0 ? sanctions[0].riskLevel : 'Low',
      sanctions,
      sources: ['Local Sanctions Database'],
      searchTimestamp: new Date().toISOString(),
      searchCriteria: req.body,
      totalMatches: sanctions.length,
      matchMethod: 'SQL LIKE (Fallback)'
    };
    
    console.log('✅ [SANCTIONS DB] Search completed');
    res.json(complianceResult);
    
  } catch (error) {
    console.error('❌ [SANCTIONS DB] Search failed:', error);
    res.status(500).json({ 
      error: 'Local sanctions search failed', 
      details: error.message 
    });
  }
});

/**
 * Get all sanctioned companies from local database
 */
app.get('/api/compliance/sanctioned-companies', async (req, res) => {
  try {
    console.log('📊 [SANCTIONS DB] Fetching all sanctioned companies...');
    
    const { country, riskLevel, sector, limit, offset } = req.query;
    
    // Build dynamic SQL query with filters
    let sql = `SELECT * FROM sanctions_database WHERE 1=1`;
    const params = [];
    
    if (country) {
      sql += ` AND Country = ?`;
      params.push(country);
    }
    
    if (riskLevel) {
      sql += ` AND RiskLevel = ?`;
      params.push(riskLevel);
    }
    
    if (sector) {
      sql += ` AND Sector LIKE ?`;
      params.push(`%${sector}%`);
    }
    
    sql += ` ORDER BY 
      CASE RiskLevel 
        WHEN 'Very High' THEN 1 
        WHEN 'Critical' THEN 2
        WHEN 'High' THEN 3 
        WHEN 'Medium' THEN 4 
        WHEN 'Low' THEN 5 
      END,
      created_at DESC
    `;
    
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(parseInt(limit));
    }
    
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(parseInt(offset));
    }
    
    console.log('📊 [SANCTIONS DB] SQL Query:', sql);
    console.log('📊 [SANCTIONS DB] Parameters:', params);
    
    const companies = db.prepare(sql).all(...params);
    
    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM sanctions_database WHERE 1=1`;
    const countParams = [];
    
    if (country) {
      countSql += ` AND Country = ?`;
      countParams.push(country);
    }
    
    if (riskLevel) {
      countSql += ` AND RiskLevel = ?`;
      countParams.push(riskLevel);
    }
    
    if (sector) {
      countSql += ` AND Sector LIKE ?`;
      countParams.push(`%${sector}%`);
    }
    
    const { total } = db.prepare(countSql).get(...countParams);
    
    console.log('✅ [SANCTIONS DB] Found companies:', companies.length, 'of', total);
    
    res.json({
      companies,
      total,
      limit: limit ? parseInt(limit) : total,
      offset: offset ? parseInt(offset) : 0
    });
    
  } catch (error) {
    console.error('❌ [SANCTIONS DB] Failed to fetch sanctioned companies:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sanctioned companies', 
      details: error.message 
    });
  }
});

/**
 * Get entity details from local sanctions database
 */
app.get('/api/compliance/entity/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 [COMPLIANCE] Fetching entity details for ID:', id);
    
    const entity = db.prepare(`
      SELECT * FROM sanctions_database 
      WHERE id = ?
    `).get(id);
    
    if (!entity) {
      console.log('❌ [COMPLIANCE] Entity not found:', id);
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    console.log('✅ [COMPLIANCE] Entity found:', entity.CompanyName);
    res.json({
      id: entity.id,
      name: entity.CompanyName,
      type: entity.CustomerType || 'Company',
      country: entity.Country,
      city: entity.City,
      address: entity.Address,
      sector: entity.Sector,
      riskLevel: entity.RiskLevel,
      sanctionProgram: entity.SanctionProgram,
      sanctionReason: entity.SanctionReason,
      sanctionStartDate: entity.SanctionStartDate,
      sourceList: entity.SourceList,
      sourceUrl: entity.OpenSanctionsLink,
      openSanctionsLink: entity.OpenSanctionsLink,
      datasetVersion: entity.DatasetVersion,
      lastVerified: entity.LastVerified,
      mainActivity: entity.MainActivity
    });
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] Error fetching entity:', error);
    res.status(500).json({ error: 'Failed to fetch entity details' });
  }
});

/**
 * Quick Risk Check - Fast preliminary check for potential sanctions
 */
app.post('/api/compliance/quick-risk-check', async (req, res) => {
  try {
    const { companyName, country } = req.body;
    
    console.log('⚡ [QUICK CHECK] Assessing risk for:', companyName, country);
    
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Get all sanctioned company names from database
    const allSanctions = db.prepare(`SELECT id, CompanyName, Country, City, Sector, RiskLevel, SanctionReason, SanctionProgram, SourceList FROM sanctions_database`).all();
    
    console.log(`⚡ [QUICK CHECK] Loaded ${allSanctions.length} sanctioned companies`);
    
    if (!openai || allSanctions.length === 0) {
      console.log('⚡ [QUICK CHECK] OpenAI not available or no sanctions data - returning safe');
      return res.json({
        hasMatch: false,
        matchCount: 0,
        riskLevel: 'Low',
        needsReview: false,
        companyName,
        country
      });
    }
    
    // Prepare company list for OpenAI
    const companyList = allSanctions.map((s, i) => `${i + 1}. ${s.CompanyName}`).join('\n');
    
    const prompt = `You are a sanctions compliance expert. Compare the search query with the list of sanctioned companies.

**Search Query:**
Company Name: ${companyName}
${country ? `Country: ${country}` : ''}

**Sanctioned Companies:**
${companyList}

**Task:** Determine if the search query matches ANY of the sanctioned companies. Consider:
- Exact matches
- Phonetic similarities (especially Arabic/English transliterations)
- Abbreviations and variations
- Company name parts (e.g., "ALDAR" matching "ALDAR PROPERTIES")

**Response Format (JSON only):**
If match found: {"hasMatch": true, "matchIndex": <number>, "confidence": <50-100>, "reason": "brief explanation"}
If no match: {"hasMatch": false}

Return ONLY the JSON, no other text.`;

    console.log('⚡ [QUICK CHECK] Sending to OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a sanctions compliance expert. Return ONLY valid JSON. No explanations outside JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 200
    });
    
    const aiResponse = completion.choices[0].message.content.trim();
    console.log('⚡ [QUICK CHECK] OpenAI response:', aiResponse);
    
    // Parse AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚡ [QUICK CHECK] Could not parse JSON, returning safe');
      return res.json({
        hasMatch: false,
        matchCount: 0,
        riskLevel: 'Low',
        needsReview: false,
        companyName,
        country
      });
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    if (result.hasMatch && result.matchIndex) {
      const matchedCompany = allSanctions[result.matchIndex - 1];
      
      console.log('⚡ [QUICK CHECK] ✅ Match found:', matchedCompany.CompanyName);
      
      return res.json({
        hasMatch: true,
        matchCount: 1,
        riskLevel: matchedCompany.RiskLevel || 'Medium',
        needsReview: true,
        companyName,
        country,
        sanctionData: {
          id: matchedCompany.id,
          name: matchedCompany.CompanyName,
          country: matchedCompany.Country,
          city: matchedCompany.City,
          sector: matchedCompany.Sector,
          riskLevel: matchedCompany.RiskLevel,
          sanctionReason: matchedCompany.SanctionReason,
          sanctionProgram: matchedCompany.SanctionProgram,
          sourceList: matchedCompany.SourceList
        }
      });
    }
    
    // No match - return safe
    console.log('⚡ [QUICK CHECK] ❌ No match - returning safe');
    
    res.json({
      hasMatch: false,
      matchCount: 0,
      riskLevel: 'Low',
      needsReview: false,
      companyName,
      country
    });
    
  } catch (error) {
    console.error('❌ [QUICK CHECK] Error:', error);
    res.status(500).json({ error: 'Quick risk check failed' });
  }
});

/**
 * OpenAI Analysis for No-Match Cases
 */
app.post('/api/openai/analyze-no-match', async (req, res) => {
  try {
    const { companyName, country, sector, language } = req.body;
    
    console.log('🤖 [OPENAI] Analyzing no-match case:', { companyName, country, sector, language });
    
    const prompt = language === 'ar' 
      ? `أنت خبير في الامتثال وقوائم العقوبات. قم بتحليل هذه الشركة:

**الشركة:** ${companyName}
**الدولة:** ${country || 'غير محددة'}
**القطاع:** ${sector || 'غير محدد'}

**النتيجة:** لم يتم العثور على هذه الشركة في قاعدة البيانات المحلية للعقوبات.

قم بتقديم تحليل ذكي باللغة العربية يتضمن:
1. تقييم مستوى الخطر (low/medium/high)
2. توصية واضحة (approve/review/block)
3. تفسير منطقي للقرار
4. نصائح إضافية إن وجدت

اجعل الرد محترفاً وواضحاً.`
      : `You are a compliance expert. Analyze this company:

**Company:** ${companyName}
**Country:** ${country || 'Unknown'}
**Sector:** ${sector || 'Unknown'}

**Result:** This company was NOT found in the local sanctions database.

Provide a smart analysis in English including:
1. Risk level assessment (low/medium/high)
2. Clear recommendation (approve/review/block)
3. Logical explanation for the decision
4. Additional advice if any

Make the response professional and clear.`;
    
    if (openai) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: language === 'ar' 
              ? 'أنت خبير في الامتثال وقوائم العقوبات. قدم تحليلات دقيقة ومفيدة باللغة العربية.'
              : 'You are a compliance and sanctions expert. Provide accurate and helpful analyses in English.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const aiAnalysis = completion.choices[0].message.content;
      
      // Parse AI response to extract structured data
      const riskLevel = aiAnalysis.toLowerCase().includes('high') ? 'high' 
                      : aiAnalysis.toLowerCase().includes('medium') ? 'medium' 
                      : 'low';
      
      const recommendation = aiAnalysis.toLowerCase().includes('block') ? 'block'
                           : aiAnalysis.toLowerCase().includes('review') ? 'review'
                           : 'approve';
      
      const response = {
        riskLevel,
        confidence: 90,
        recommendation,
        [`explanation_${language}`]: aiAnalysis,
        rawAnalysis: aiAnalysis
      };
      
      console.log('✅ [OPENAI] Analysis complete');
      res.json(response);
      
    } else {
      // Fallback when OpenAI is not available
      const response = {
        riskLevel: 'low',
        confidence: 85,
        recommendation: 'approve',
        explanation_ar: `✅ **لا توجد تطابقات**\n\nلم يتم العثور على الشركة "${companyName}" في قاعدة البيانات المحلية للعقوبات.\n\n• **التقييم:** الشركة غير مدرجة في قوائم العقوبات المحلية\n• **التوصية:** آمن للموافقة\n\n⚠️ **ملحوظة:** يُنصح بإجراء فحص إضافي للشركات عالية القيمة.`,
        explanation_en: `✅ **No Matches Found**\n\nCompany "${companyName}" not found in local sanctions database.\n\n• **Assessment:** Company not listed in local sanctions\n• **Recommendation:** Safe to approve\n\n⚠️ **Note:** Additional checks recommended for high-value companies.`
      };
      
      res.json(response);
    }
    
  } catch (error) {
    console.error('❌ [OPENAI] Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

/**
 * Get companies from database (compliance tasks + golden records)
 */
app.get('/api/compliance/database-companies', async (req, res) => {
  try {
    console.log('📊 [COMPLIANCE] Fetching golden records only...');
    
    // ✅ Get ONLY golden records (not compliance tasks)
    const goldenRecords = db.prepare(`
      SELECT 
        id,
        firstName as companyName,
        country,
        CustomerType as companyType,
        city,
        street,
        buildingNumber,
        'golden_record' as source,
        'Active' as status,
        updatedAt as lastUpdated
      FROM requests 
      WHERE isGolden = 1
      AND firstName IS NOT NULL
      AND firstName != ''
    `).all();
    
    console.log('✅ [COMPLIANCE] Golden records loaded:', goldenRecords.length);
    res.json(goldenRecords);
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] Failed to load database companies:', error);
    res.status(500).json({ 
      error: 'Failed to load database companies', 
      details: error.message 
    });
  }
});

/**
 * Bulk compliance check for multiple companies
 */
app.post('/api/compliance/bulk-check', async (req, res) => {
  try {
    console.log('🔄 [COMPLIANCE] Starting bulk compliance check:', req.body);
    
    const { companyIds } = req.body;
    
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({ error: 'Company IDs array is required' });
    }
    
    // Get company details from database
    const companies = db.prepare(`
      SELECT 
        id, 
        firstName as companyName, 
        country, 
        CustomerType as companyType,
        city,
        street,
        buildingNumber
      FROM requests 
      WHERE id IN (${companyIds.map(() => '?').join(',')})
    `).all(...companyIds);
    
    // Perform compliance check for each company
    const results = [];
    for (const company of companies) {
      try {
        const complianceResult = await performComplianceCheck(company);
        results.push(complianceResult);
      } catch (error) {
        console.error(`❌ [COMPLIANCE] Failed to check company ${company.companyName}:`, error);
        // Add error result
        results.push({
          companyName: company.companyName,
          matchConfidence: 0,
          overallRiskLevel: 'Unknown',
          sanctions: [],
          sources: [],
          searchTimestamp: new Date().toISOString(),
          searchCriteria: { companyName: company.companyName },
          error: error.message
        });
      }
    }
    
    console.log('✅ [COMPLIANCE] Bulk check completed:', results.length);
    res.json(results);
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] Bulk check failed:', error);
    res.status(500).json({ 
      error: 'Bulk compliance check failed', 
      details: error.message 
    });
  }
});

/**
 * Get compliance history for a specific company
 */
app.get('/api/compliance/history/:companyId', async (req, res) => {
  try {
    console.log('📜 [COMPLIANCE] Fetching compliance history for:', req.params.companyId);
    
    const companyId = req.params.companyId;
    
    // Get compliance check history
    const history = db.prepare(`
      SELECT * FROM compliance_history 
      WHERE companyId = ? 
      ORDER BY createdAt DESC
    `).all(companyId);
    
    console.log('✅ [COMPLIANCE] Compliance history loaded:', history.length);
    res.json(history);
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] Failed to load compliance history:', error);
    res.status(500).json({ 
      error: 'Failed to load compliance history', 
      details: error.message 
    });
  }
});

/**
 * Save compliance check result
 */
app.post('/api/compliance/save-result', async (req, res) => {
  try {
    console.log('💾 [COMPLIANCE] Saving compliance result:', req.body.companyName);
    
    const result = req.body;
    
    // Save to compliance history
    db.prepare(`
      INSERT INTO compliance_history (
        id, companyName, matchConfidence, overallRiskLevel, 
        sanctions, sources, searchCriteria, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nanoid(12),
      result.companyName,
      result.matchConfidence,
      result.overallRiskLevel,
      JSON.stringify(result.sanctions),
      JSON.stringify(result.sources),
      JSON.stringify(result.searchCriteria),
      new Date().toISOString()
    );
    
    console.log('✅ [COMPLIANCE] Compliance result saved');
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] Failed to save compliance result:', error);
    res.status(500).json({ 
      error: 'Failed to save compliance result', 
      details: error.message 
    });
  }
});

// Insert demo sanctions data
app.post('/api/compliance/insert-demo-data', async (req, res) => {
  try {
    console.log('📊 [COMPLIANCE] Inserting demo sanctions data...');
    
    const demoData = require('./demo-sanctions-data.js');
    const companies = demoData.companies;
    
    let insertedCount = 0;
    
    for (const company of companies) {
      try {
        // Insert into requests table as compliance tasks
        const requestId = nanoid(12);
        const timestamp = new Date().toISOString();
        
        // Check if complianceStatus and sanctionsData columns exist, if not add them
        try {
          db.prepare('ALTER TABLE requests ADD COLUMN complianceStatus TEXT').run();
          console.log('✅ [COMPLIANCE] Added complianceStatus column');
        } catch (e) {
          // Column already exists
        }
        
        try {
          db.prepare('ALTER TABLE requests ADD COLUMN sanctionsData TEXT').run();
          console.log('✅ [COMPLIANCE] Added sanctionsData column');
        } catch (e) {
          // Column already exists
        }

        db.prepare(`
          INSERT INTO requests (
            id, firstName, CustomerType, tax, city, street, buildingNumber, 
            country, status, isGolden, createdAt, updatedAt, createdBy, 
            source, complianceStatus, sanctionsData
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          requestId,
          company.companyName,
          company.companyType,
          company.registrationNumber,
          company.city,
          company.street,
          company.buildingNumber,
          company.country,
          'compliance_review',
          0, // Not golden record
          timestamp,
          timestamp,
          'system',
          'compliance_demo',
          'under_sanctions',
          JSON.stringify(company.sanctions)
        );
        
        insertedCount++;
        console.log(`✅ [COMPLIANCE] Inserted: ${company.companyName}`);
        
      } catch (error) {
        console.error(`❌ [COMPLIANCE] Failed to insert ${company.companyName}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully inserted ${insertedCount} demo companies`,
      insertedCount,
      totalCompanies: companies.length
    });
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] Failed to insert demo data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to insert demo data',
      details: error.message
    });
  }
});

// Get demo sanctions data
app.get('/api/compliance/demo-data', (req, res) => {
  try {
    const demoData = require('./demo-sanctions-data.js');
    res.json(demoData);
  } catch (error) {
    console.error('❌ [COMPLIANCE] Failed to get demo data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get demo data',
      details: error.message
    });
  }
});

// Debug endpoint to check environment variables
app.get('/api/compliance/debug-env', (req, res) => {
  res.json({
    hasOpenAIKey: !!OPENAI_API_KEY,
    openAIKeyPrefix: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 20) + '...' : 'NOT SET',
    nodeEnv: NODE_ENV,
    useRealAPIs: USE_REAL_APIS,
    isDevelopment: isDevelopment,
    apisConfig: {
      openSanctions: {
        enabled: EXTERNAL_APIS.OPENSANCTIONS.enabled,
        url: `${EXTERNAL_APIS.OPENSANCTIONS.baseUrl}${EXTERNAL_APIS.OPENSANCTIONS.searchEndpoint}`
      },
      ofac: {
        enabled: EXTERNAL_APIS.OFAC.enabled,
        url: `${EXTERNAL_APIS.OFAC.baseUrl}${EXTERNAL_APIS.OFAC.searchEndpoint}`
      },
      eu: {
        enabled: EXTERNAL_APIS.EU_SANCTIONS.enabled,
        url: `${EXTERNAL_APIS.EU_SANCTIONS.baseUrl}${EXTERNAL_APIS.EU_SANCTIONS.searchEndpoint}`
      }
    }
  });
});

/**
 * Smart Match with OpenAI - Compare request data with OFAC results
 */
app.post('/api/compliance/smart-match', async (req, res) => {
  try {
    const { requestData, ofacResults } = req.body;
    
    if (!requestData || !ofacResults || ofacResults.length === 0) {
      return res.json({
        matches: [],
        recommendation: 'approve',
        reasoning: 'No OFAC results to compare'
      });
    }
    
    console.log(`🤖 [COMPLIANCE AI] Smart matching ${ofacResults.length} OFAC results`);
    
    if (!OPENAI_API_KEY) {
      console.warn('⚠️ [COMPLIANCE AI] No OpenAI key - using simple matching');
      return res.json({
        matches: ofacResults.map(result => ({
          entity: result,
          confidence: 50,
          explanation: 'Simple name match (OpenAI not available)'
        })),
        recommendation: 'review',
        reasoning: 'Manual review required'
      });
    }
    
    // Build prompt for OpenAI
    const prompt = `أنت خبير في فحص العقوبات. قارن معلومات الشركة التالية مع قوائم العقوبات.

معلومات الطلب:
- الاسم: ${requestData.name || 'غير محدد'}
- الدولة: ${requestData.country || 'غير محدد'}
- القطاع: ${requestData.sector || 'غير محدد'}
- الرقم الضريبي: ${requestData.taxNumber || 'غير محدد'}

الكيانات المشتبه بها من OFAC (${ofacResults.length}):
${ofacResults.map((r, i) => `${i + 1}. ${r.name}
   الدولة: ${r.countries?.[0] || 'غير محدد'}
   القطاع: ${r.sector || 'غير محدد'}
   الأسماء البديلة: ${r.aliases?.slice(0, 3).join(', ') || 'لا يوجد'}`).join('\n\n')}

المطلوب:
1. حدد أي من هذه الكيانات يطابق الطلب
2. احسب نسبة التطابق لكل كيان (0-100%)
3. اعط توصية نهائية: "approve" أو "block" أو "review"
4. اشرح السبب بالعربي

أرجع JSON فقط (بدون markdown):
{
  "matches": [
    {
      "entityIndex": 1,
      "confidence": 85,
      "explanation": "تطابق قوي: نفس الاسم والدولة"
    }
  ],
  "recommendation": "block",
  "reasoning": "تم العثور على تطابق قوي مع قائمة OFAC"
}

JSON:`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'أنت خبير امتثال. أرجع JSON فقط بدون markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    let content = response.data.choices[0].message.content.trim();
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const aiResult = JSON.parse(content);
    
    // Enrich with full entity data
    aiResult.matches = aiResult.matches.map(match => ({
      entity: ofacResults[match.entityIndex - 1],
      confidence: match.confidence,
      explanation: match.explanation
    }));
    
    console.log(`✅ [COMPLIANCE AI] Smart match complete: ${aiResult.matches.length} matches`);
    
    res.json(aiResult);
    
  } catch (error) {
    console.error('❌ [COMPLIANCE AI] Smart match failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enhanced Block Endpoint - Save sanctions info
 */
app.post('/api/compliance/block-with-sanctions', async (req, res) => {
  try {
    const { requestId, blockReason, sanctionsInfo } = req.body;
    
    console.log(`🚫 [COMPLIANCE] Blocking request ${requestId} with sanctions info`);
    
    // Update request status
    db.prepare(`
      UPDATE requests 
      SET status = 'Blocked',
          ComplianceStatus = 'Blocked',
          blockReason = ?,
          sanctionsData = ?,
          ComplianceCheckedAt = datetime('now'),
          ComplianceMatchedEntity = ?,
          ComplianceMatchConfidence = ?,
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(
      blockReason,
      JSON.stringify(sanctionsInfo),
      sanctionsInfo.entityId || null,
      sanctionsInfo.matchConfidence || null,
      requestId
    );
    
    // Log to compliance history
    db.prepare(`
      INSERT INTO compliance_history (
        id, companyName, matchConfidence, overallRiskLevel,
        sanctions, sources, searchCriteria, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nanoid(12),
      sanctionsInfo.companyName || '',
      sanctionsInfo.matchConfidence || 0,
      'Critical',
      JSON.stringify([sanctionsInfo]),
      JSON.stringify(['OFAC']),
      JSON.stringify({ requestId }),
      new Date().toISOString()
    );
    
    console.log('✅ [COMPLIANCE] Request blocked and sanctions info saved');
    
    res.json({ 
      success: true,
      message: 'Request blocked successfully'
    });
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] Block failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// HELPER FUNCTIONS FOR COMPLIANCE
// ========================================

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COUNTRY ISO CODE MAPPING (195 countries)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const COUNTRY_CODES = {
  // Middle East & North Africa
  'IR': 'Iran', 'IQ': 'Iraq', 'SY': 'Syria', 'LB': 'Lebanon', 'YE': 'Yemen',
  'SA': 'Saudi Arabia', 'AE': 'United Arab Emirates', 'BH': 'Bahrain', 'KW': 'Kuwait',
  'QA': 'Qatar', 'OM': 'Oman', 'JO': 'Jordan', 'IL': 'Israel', 'PS': 'Palestine',
  'EG': 'Egypt', 'LY': 'Libya', 'TN': 'Tunisia', 'DZ': 'Algeria', 'MA': 'Morocco',
  'SD': 'Sudan', 'SS': 'South Sudan',
  
  // Major Powers
  'US': 'United States', 'GB': 'United Kingdom', 'FR': 'France', 'DE': 'Germany',
  'IT': 'Italy', 'ES': 'Spain', 'RU': 'Russia', 'CN': 'China', 'JP': 'Japan',
  'IN': 'India', 'BR': 'Brazil', 'CA': 'Canada', 'AU': 'Australia', 'KR': 'South Korea',
  
  // High-Risk Countries
  'KP': 'North Korea', 'CU': 'Cuba', 'VE': 'Venezuela', 'BY': 'Belarus', 'MM': 'Myanmar',
  'AF': 'Afghanistan', 'SO': 'Somalia', 'ZW': 'Zimbabwe',
  
  // Europe
  'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'HR': 'Croatia', 'CY': 'Cyprus',
  'CZ': 'Czech Republic', 'DK': 'Denmark', 'EE': 'Estonia', 'FI': 'Finland', 'GR': 'Greece',
  'HU': 'Hungary', 'IE': 'Ireland', 'LV': 'Latvia', 'LT': 'Lithuania', 'LU': 'Luxembourg',
  'MT': 'Malta', 'NL': 'Netherlands', 'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania',
  'SK': 'Slovakia', 'SI': 'Slovenia', 'SE': 'Sweden', 'CH': 'Switzerland', 'NO': 'Norway',
  'IS': 'Iceland', 'UA': 'Ukraine', 'TR': 'Turkey', 'RS': 'Serbia', 'AL': 'Albania',
  
  // Asia-Pacific
  'TH': 'Thailand', 'VN': 'Vietnam', 'MY': 'Malaysia', 'SG': 'Singapore', 'ID': 'Indonesia',
  'PH': 'Philippines', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Nepal',
  'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan', 'MN': 'Mongolia', 'KH': 'Cambodia', 'LA': 'Laos',
  
  // Africa
  'ZA': 'South Africa', 'NG': 'Nigeria', 'KE': 'Kenya', 'ET': 'Ethiopia', 'GH': 'Ghana',
  'TZ': 'Tanzania', 'UG': 'Uganda', 'AO': 'Angola', 'ZM': 'Zambia', 'ZW': 'Zimbabwe',
  'MZ': 'Mozambique', 'BW': 'Botswana', 'NA': 'Namibia', 'CI': 'Ivory Coast', 'SN': 'Senegal',
  'CM': 'Cameroon', 'CD': 'DR Congo', 'RW': 'Rwanda',
  
  // Latin America
  'MX': 'Mexico', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru',
  'EC': 'Ecuador', 'BO': 'Bolivia', 'PY': 'Paraguay', 'UY': 'Uruguay', 'CR': 'Costa Rica',
  'PA': 'Panama', 'GT': 'Guatemala', 'HN': 'Honduras', 'SV': 'El Salvador', 'NI': 'Nicaragua',
  
  // Caribbean
  'BS': 'Bahamas', 'BB': 'Barbados', 'JM': 'Jamaica', 'TT': 'Trinidad and Tobago',
  'DO': 'Dominican Republic', 'HT': 'Haiti', 'PR': 'Puerto Rico',
  
  // Other
  'NZ': 'New Zealand', 'FJ': 'Fiji', 'PG': 'Papua New Guinea'
};

/**
 * Convert ISO country code to full name
 */
function getCountryName(isoCode) {
  if (!isoCode) return 'Not specified';
  const code = isoCode.toUpperCase();
  return COUNTRY_CODES[code] || isoCode;
}

/**
 * Convert country name to ISO code (reverse lookup)
 */
function getCountryCode(countryName) {
  if (!countryName || typeof countryName !== 'string') return null;
  const normalized = countryName.toLowerCase();
  
  for (const [code, name] of Object.entries(COUNTRY_CODES)) {
    if (name.toLowerCase() === normalized) {
      return code;
    }
  }
  return null;
}

/**
 * In-Memory Cache for Search Results
 * TTL: 1 hour (3600000 ms)
 * Purpose: Reduce API calls for repeated searches
 */
const searchCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

function getCachedSearch(cacheKey) {
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`✅ [CACHE] Hit for key: ${cacheKey}`);
    return cached.data;
  }
  if (cached) {
    console.log(`🕐 [CACHE] Expired for key: ${cacheKey}`);
    searchCache.delete(cacheKey);
  }
  return null;
}

function setCachedSearch(cacheKey, data) {
  console.log(`💾 [CACHE] Storing key: ${cacheKey}`);
  searchCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up old entries (keep cache size manageable)
  if (searchCache.size > 100) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
    console.log(`🧹 [CACHE] Cleaned up old entry: ${firstKey}`);
  }
}

/**
 * Legal Form Mapping - Maps various legal forms from API to standard company types
 * This mapping ensures consistent filtering and display of company types
 */
const LEGAL_FORM_MAPPING = {
  // Limited Liability Company variations
  'Limited Liability Company': 'limited_liability',
  'Limited Liability': 'limited_liability',
  'LLC': 'limited_liability',
  'Ltd.': 'limited_liability',
  'L.L.C.': 'limited_liability',
  'Limited': 'limited_liability',
  'Private Limited Company': 'limited_liability',
  'Private Limited': 'limited_liability',
  
  // Joint Stock Companies
  'PJSC': 'joint_stock',
  'SJSC': 'joint_stock',
  'Joint Stock Company': 'joint_stock',
  'Public Joint Stock Company': 'joint_stock',
  'Saudi Joint Stock Company': 'joint_stock',
  'JSC': 'joint_stock',
  'Public Company': 'joint_stock',
  'Closed Joint Stock Company': 'joint_stock',
  'CJSC': 'joint_stock',
  
  // Sole Proprietorship
  'Sole Proprietorship': 'sole_proprietorship',
  'Individual': 'sole_proprietorship',
  'Sole Trader': 'sole_proprietorship',
  'Individual Entrepreneur': 'sole_proprietorship',
  
  // Corporate (catch-all for other types)
  'Corporation': 'Corporate',
  'Corp.': 'Corporate',
  'Inc.': 'Corporate',
  'Incorporated': 'Corporate',
  'Partnership': 'Corporate',
  'General Partnership': 'Corporate',
  'Limited Partnership': 'Corporate',
  'Company': 'Corporate'
};

/**
 * Check if a legal form matches the selected company type filter
 * Uses fuzzy matching with the LEGAL_FORM_MAPPING
 */
function matchesLegalFormFilter(legalForm, selectedCompanyType) {
  if (!legalForm || !selectedCompanyType) {
    return false;
  }
  
  const lowerLegalForm = legalForm.toLowerCase();
  const lowerSelectedType = selectedCompanyType.toLowerCase();
  
  // Check direct mapping
  const mappedValue = LEGAL_FORM_MAPPING[legalForm];
  if (mappedValue && mappedValue.toLowerCase() === lowerSelectedType) {
    return true;
  }
  
  // Check partial matches in mapping keys
  for (const [key, value] of Object.entries(LEGAL_FORM_MAPPING)) {
    if (lowerLegalForm.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerLegalForm)) {
      if (value.toLowerCase() === lowerSelectedType) {
        return true;
      }
    }
  }
  
  return false;
}

// ==========================================
// External APIs Search Functions
// ==========================================

/**
 * Search OpenSanctions API with optional filters
 */
async function searchOpenSanctions(companyName, country = null, legalForm = null, retryCount = 0) {
  const config = EXTERNAL_APIS.OPENSANCTIONS;
  
  if (!config.enabled) {
    console.log('ℹ️ [OPENSANCTIONS] API disabled');
    return [];
  }

  try {
    const filterInfo = [];
    if (country) filterInfo.push(`Country: ${country}`);
    if (legalForm) filterInfo.push(`Legal Form: ${legalForm}`);
    console.log(`🔍 [OPENSANCTIONS] Searching for: ${companyName}${filterInfo.length ? ` | Filters: ${filterInfo.join(', ')}` : ''}`);
    
    // Check cache first
    const cacheKey = `opensanctions:${companyName}:${country || 'all'}:${legalForm || 'all'}`.toLowerCase();
    const cachedResult = getCachedSearch(cacheKey);
    if (cachedResult) {
      console.log(`⚡ [OPENSANCTIONS] Returning cached results (${cachedResult.length} items)`);
      return cachedResult;
    }
    
    // Check if API key is configured
    if (!OPENSANCTIONS_API_KEY) {
      console.warn('⚠️ [OPENSANCTIONS] API key not configured - returning empty results');
      console.warn('   📝 Get free API key from: https://www.opensanctions.org/api/');
      return [];
    }
    
    const url = `${config.baseUrl}${config.searchEndpoint}`;
    
    // Build search params with country filter if provided
    const searchParams = {
      q: companyName,
      schema: 'Company',  // ⚡ Filter: Only companies (excludes Persons, Vessels, Organizations, etc.)
      limit: 5  // ⚡ Reduced from 10 to 5 for faster response
    };
    
    // Add country filter if provided (convert to ISO code)
    if (country) {
      const countryCode = getCountryCode(country) || country;
      searchParams.countries = countryCode;
      console.log(`🌍 [OPENSANCTIONS] Filtering by country: ${country} (${countryCode})`);
      console.log(`🌍 [OPENSANCTIONS] Search params with country filter:`, searchParams);
    } else {
      console.log(`🌍 [OPENSANCTIONS] No country filter applied`);
    }
    
    const response = await axiosInstance.get(url, {
      params: searchParams,
      headers: {
        'Authorization': `ApiKey ${OPENSANCTIONS_API_KEY}`,
        'Accept': 'application/json'
      },
      timeout: config.timeout
    });

    console.log('📦 [OPENSANCTIONS] Response status:', response.status);
    
    if (!response.data || !response.data.results) {
      console.warn('⚠️ [OPENSANCTIONS] No results in response');
      return [];
    }
    
    console.log(`📊 [OPENSANCTIONS] Found ${response.data.results.length} results`);
    
    // Debug: Log countries of returned results
    if (response.data.results.length > 0) {
      console.log('🌍 [OPENSANCTIONS] Countries in results:');
      response.data.results.forEach((result, index) => {
        const resultCountry = result.countries?.[0] || 'Unknown';
        console.log(`  ${index + 1}. ${result.name} - Country: ${resultCountry}`);
      });
    }
    
    // ✅ CLIENT-SIDE FILTERING (Country + Legal Form)
    let filteredResults = response.data.results;
    
    // Country filtering
    if (country && response.data.results.length > 0) {
      const countryCode = getCountryCode(country);
      console.log(`🔍 [OPENSANCTIONS] Applying client-side country filter: ${country} (${countryCode})`);
      
      filteredResults = filteredResults.filter(result => {
        const resultCountries = result.countries || [];
        const hasMatchingCountry = resultCountries.includes(countryCode) || 
                                  resultCountries.some(code => getCountryName(code).toLowerCase() === country.toLowerCase());
        
        if (hasMatchingCountry) {
          console.log(`✅ [OPENSANCTIONS] Country match found: ${result.name} - Countries: ${resultCountries.join(', ')}`);
        } else {
          console.log(`❌ [OPENSANCTIONS] Country filtered out: ${result.name} - Countries: ${resultCountries.join(', ')}`);
        }
        
        return hasMatchingCountry;
      });
      
      console.log(`🔍 [OPENSANCTIONS] After country filtering: ${filteredResults.length}/${response.data.results.length} results`);
    }
    
    // Legal Form filtering (using LEGAL_FORM_MAPPING)
    if (legalForm && filteredResults.length > 0) {
      console.log(`🏢 [OPENSANCTIONS] Applying client-side legal form filter: ${legalForm}`);
      
      filteredResults = filteredResults.filter(result => {
        const resultLegalForm = result.properties?.legalForm?.[0] || null;
        
        if (!resultLegalForm) {
          console.log(`❌ [OPENSANCTIONS] No legal form: ${result.name}`);
          return false;
        }
        
        // Use the matchesLegalFormFilter function for proper mapping
        const hasMatchingLegalForm = matchesLegalFormFilter(resultLegalForm, legalForm);
        
        if (hasMatchingLegalForm) {
          console.log(`✅ [OPENSANCTIONS] Legal form match found: ${result.name} - Legal Form: "${resultLegalForm}" → Mapped to: "${legalForm}"`);
        } else {
          console.log(`❌ [OPENSANCTIONS] Legal form filtered out: ${result.name} - Legal Form: "${resultLegalForm}" (doesn't match "${legalForm}")`);
        }
        
        return hasMatchingLegalForm;
      });
      
      console.log(`🏢 [OPENSANCTIONS] After legal form filtering: ${filteredResults.length} results`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Parse OpenSanctions results (Following OpenSanctions API Guide)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✅ Accept ALL results from OpenSanctions - they include:
    //    - Direct sanctions (OFAC, EU, UN, etc.)
    //    - Monitored entities (energy sector, ownership tracking)
    //    - Related/linked entities
    // If OpenSanctions returns it, it's relevant for compliance screening
    const results = filteredResults.map(item => {
      const props = item.properties || {};
      const topics = props.topics || [];
      const programs = props.program || [];
      const datasets = item.datasets || [];
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 1️⃣ NAME - Extract company name and aliases
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const name = item.caption || props.name?.[0] || 'Unknown';
      const aliases = props.alias || [];
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 2️⃣ COUNTRY - Priority: registrationCountry → jurisdiction → country → addressCountry
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const countryCode = props.registrationCountry?.[0] || 
                         props.jurisdiction?.[0] || 
                         props.country?.[0] || 
                         props.addressCountry?.[0] || 
                         null;
      const country = getCountryName(countryCode);
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 3️⃣ DATES - Extract sanction dates (Companies use createdAt, not startDate)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const startDate = props.createdAt?.[0] ||      // When added to sanctions list
                       props.startDate?.[0] ||       // For persons
                       props.listingDate?.[0] ||
                       props.modifiedAt?.[0] ||      // Last modified
                       item.first_seen || 
                       null;
      const endDate = props.endDate?.[0] || null;
      const incorporationDate = props.incorporationDate?.[0] || null;
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 4️⃣ TOPICS - Determine sanction type from topics
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const topicDescriptions = {
        'sanction': 'Official Sanction',
        'sanction.linked': 'Linked to Sanctioned Entity',
        'crime.terror': 'Terrorism',
        'crime.war': 'War Crimes',
        'crime': 'Criminal Activity',
        'crime.financial': 'Financial Crime',
        'crime.fraud': 'Fraud',
        'crime.traffick': 'Trafficking',
        'crime.boss': 'Criminal Organization Leader',
        'role.pep': 'Politically Exposed Person',
        'role.rca': 'Related to PEP',
        'poi': 'Person of Interest',
        'reg.warn': 'Regulatory Warning'
      };
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 5️⃣ RISK LEVEL - Calculate from topics
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let riskLevel = 'Low';
      if (topics.includes('crime.terror') || topics.includes('crime.war')) {
        riskLevel = 'Critical';
      } else if (topics.includes('sanction') || topics.includes('crime') || topics.includes('crime.financial')) {
        riskLevel = 'High';
      } else if (topics.includes('role.pep') || topics.includes('poi') || topics.includes('sanction.linked') || topics.includes('role.rca')) {
        riskLevel = 'Medium';
      } else if (topics.includes('reg.warn')) {
        riskLevel = 'Low';
      } else if (datasets.length > 0) {
        riskLevel = 'Medium';
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 6️⃣ SOURCE - Identify from datasets
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const datasetMapping = {
        'us_ofac_sdn': 'US OFAC - SDN List 🇺🇸',
        'us_ofac_sdgt': 'US OFAC - Global Terrorists 🇺🇸',
        'eu_sanctions': 'EU Consolidated Sanctions 🇪🇺',
        'eu_fsf': 'EU Financial Sanctions 🇪🇺',
        'gb_hmt_sanctions': 'UK HM Treasury 🇬🇧',
        'un_sc_sanctions': 'UN Security Council 🇺🇳',
        'ch_seco_sanctions': 'Swiss SECO 🇨🇭',
        'ca_dfatd_sema_sanctions': 'Canada DFATD 🇨🇦',
        'au_dfat_sanctions': 'Australia DFAT 🇦🇺'
      };
      
      const sourceDetail = datasets.length > 0 
        ? datasets.map(ds => datasetMapping[ds] || ds).join(', ')
        : 'OpenSanctions';
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 7️⃣ REASON - Extract sanction reason (priority order)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let reason = '';
      if (props.reason && props.reason[0]) {
        reason = props.reason[0];
      } else if (props.description && props.description[0]) {
        reason = props.description[0];
      } else if (props.summary && props.summary[0]) {
        reason = props.summary[0];
      } else if (props.notes && props.notes.length > 0) {
        // Use first meaningful note (skip technical notes)
        const meaningfulNotes = props.notes.filter(note => 
          !note.startsWith('(also') && 
          !note.startsWith('Website:') && 
          note.length > 20
        );
        reason = meaningfulNotes[0] || props.notes[0];
      } else if (programs.length > 0) {
        reason = `Subject to: ${programs.join(', ')}`;
      } else if (topics.length > 0) {
        const topicReasons = topics.map(t => topicDescriptions[t] || t);
        reason = topicReasons.join('; ');
      } else if (datasets.length > 0) {
        reason = `Listed in: ${sourceDetail}`;
      } else {
        reason = 'Listed in international sanctions database';
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 8️⃣ PENALTY - What sanctions are imposed
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let penalty = '';
      if (programs.length > 0) {
        penalty = `Sanctioned under: ${programs.join(', ')}`;
      } else if (props.sanctionType && props.sanctionType[0]) {
        penalty = props.sanctionType[0];
      } else if (props.provisions && props.provisions[0]) {
        penalty = `Subject to: ${props.provisions[0]}`;
      } else if (datasets.some(d => d.includes('us_ofac_sdn'))) {
        penalty = 'OFAC SDN: Asset blocking, US transaction prohibition, Criminal penalties up to $20M';
      } else if (datasets.some(d => d.includes('eu_sanctions'))) {
        penalty = 'EU Sanctions: Funds freeze, Travel ban to EU, Economic resource prohibition';
      } else if (datasets.some(d => d.includes('gb_hmt'))) {
        penalty = 'UK Sanctions: Asset freeze, UK financial service prohibition';
      } else if (datasets.some(d => d.includes('un_sc'))) {
        penalty = 'UN Sanctions: Asset freeze, Arms embargo, Travel ban';
      } else if (topics.includes('crime.terror')) {
        penalty = 'Counter-terrorism measures: Asset blocking, Travel ban, Transaction prohibitions';
      } else if (topics.includes('sanction')) {
        penalty = 'Asset freeze, Travel restrictions, Business prohibitions';
      } else if (topics.includes('crime.financial')) {
        penalty = 'Financial sanctions, Asset seizure, Banking restrictions';
      } else {
        penalty = 'Restrictive measures applied';
      }
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SANCTION TYPE - Categorize the sanction
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let sanctionType = 'Restrictive measures';
      if (datasets.some(d => d.includes('us_ofac_sdn'))) {
        sanctionType = 'SDN (Specially Designated National)';
      } else if (datasets.some(d => d.includes('eu_sanctions'))) {
        sanctionType = 'EU Consolidated Sanctions List';
      } else if (datasets.some(d => d.includes('un_sc'))) {
        sanctionType = 'UN Security Council Sanctions';
      } else if (datasets.some(d => d.includes('gb_hmt'))) {
        sanctionType = 'UK HM Treasury Sanctions';
      } else if (programs.length > 0) {
        sanctionType = programs[0];
      } else if (topics.includes('sanction')) {
        sanctionType = 'International sanctions';
      } else if (topics.includes('crime')) {
        sanctionType = 'Criminal listing';
      }
      
      return {
        // Basic Info
        id: item.id,
        name: name,
        aliases: aliases,
        type: item.schema || 'Company',
        country: country,
        countryCode: countryCode,
        
        // Descriptions
        description: props.description?.[0] || props.summary?.[0] || 'Sanctions list entry',
        
        // Sanction Classification
        datasets: datasets,
        topics: topics,
        programs: programs,
        programId: props.programId || [],
        source: 'OpenSanctions',
        sourceDetail: sourceDetail,
        riskLevel: riskLevel,
        confidence: 85,
        
        // URLs and References
        url: item.id ? `https://www.opensanctions.org/entities/${item.id}/` : null,
        sourceUrl: props.sourceUrl?.[0] || null,
        website: props.website?.[0] || null,
        
        // Dates
        date: startDate,
        sanctionDate: startDate,
        endDate: endDate,
        incorporationDate: incorporationDate,
        lastModified: props.modifiedAt?.[0] || item.last_change || null,
        lastSeen: item.last_seen || new Date().toISOString(),
        firstSeen: item.first_seen || null,
        
        // Address & Contact
        address: props.address?.[0] || null,
        phone: props.phone?.[0] || null,
        email: props.email?.[0] || null,
        
        // Registration Info
        registrationNumber: props.registrationNumber?.[0] || null,
        taxNumber: props.taxNumber?.[0] || null,
        leiCode: props.leiCode?.[0] || null,
        legalForm: props.legalForm?.[0] || null,
        sector: props.sector?.[0] || null,
        status: props.status?.[0] || 'Unknown',
        
        // ✅ Complete sanction information
        reason: reason,
        penalty: penalty,
        sanctionType: sanctionType
      };
    });

    console.log(`✅ [OPENSANCTIONS] Found ${results.length} results`);
    
    // 📊 LOG DETAILED MAPPING FOR TRACING
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 [OPENSANCTIONS] DETAILED DATA MAPPING - FOR TRACING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.forEach((result, index) => {
      console.log(`\n🔍 [RESULT ${index + 1}/${results.length}] ${result.name}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Basic Info
      console.log('📋 BASIC INFORMATION:');
      console.log(`   • ID: ${result.id || 'N/A'}`);
      console.log(`   • Name: ${result.name}`);
      console.log(`   • Aliases: ${result.aliases?.length > 0 ? result.aliases.join(', ') : 'None'}`);
      console.log(`   • Type: ${result.type}`);
      console.log(`   • Country: ${result.country || 'Unknown'} (${result.countryCode || 'N/A'})`);
      
      // Classification
      console.log('\n🔖 SANCTION CLASSIFICATION:');
      console.log(`   • Risk Level: ${result.riskLevel}`);
      console.log(`   • Confidence: ${result.confidence}%`);
      console.log(`   • Source: ${result.source}`);
      console.log(`   • Source Detail: ${result.sourceDetail}`);
      console.log(`   • Sanction Type: ${result.sanctionType}`);
      console.log(`   • Datasets: ${result.datasets?.length > 0 ? result.datasets.join(', ') : 'None'}`);
      console.log(`   • Topics: ${result.topics?.length > 0 ? result.topics.join(', ') : 'None'}`);
      console.log(`   • Programs: ${result.programs?.length > 0 ? result.programs.join(', ') : 'None'}`);
      
      // Descriptions
      console.log('\n📝 DESCRIPTIONS:');
      console.log(`   • Description: ${result.description}`);
      console.log(`   • Reason: ${result.reason}`);
      console.log(`   • Penalty: ${result.penalty}`);
      
      // Dates
      console.log('\n📅 DATES:');
      console.log(`   • Sanction Date: ${result.sanctionDate || 'N/A'}`);
      console.log(`   • End Date: ${result.endDate || 'N/A'}`);
      console.log(`   • Incorporation Date: ${result.incorporationDate || 'N/A'}`);
      console.log(`   • Last Modified: ${result.lastModified || 'N/A'}`);
      console.log(`   • First Seen: ${result.firstSeen || 'N/A'}`);
      console.log(`   • Last Seen: ${result.lastSeen || 'N/A'}`);
      
      // Address & Contact
      console.log('\n📍 ADDRESS & CONTACT:');
      console.log(`   • Address: ${result.address || 'N/A'}`);
      console.log(`   • Phone: ${result.phone || 'N/A'}`);
      console.log(`   • Email: ${result.email || 'N/A'}`);
      console.log(`   • Website: ${result.website || 'N/A'}`);
      
      // Registration
      console.log('\n🏢 REGISTRATION INFO:');
      console.log(`   • Registration Number: ${result.registrationNumber || 'N/A'}`);
      console.log(`   • Tax Number: ${result.taxNumber || 'N/A'}`);
      console.log(`   • LEI Code: ${result.leiCode || 'N/A'}`);
      console.log(`   • Legal Form: ${result.legalForm || 'N/A'}`);
      console.log(`   • Sector: ${result.sector || 'N/A'}`);
      console.log(`   • Status: ${result.status}`);
      
      // URLs
      console.log('\n🔗 REFERENCE URLS:');
      console.log(`   • OpenSanctions URL: ${result.url || 'N/A'}`);
      console.log(`   • Source URL: ${result.sourceUrl || 'N/A'}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Use OpenAI for fuzzy matching
    const matchedResults = await performFuzzyMatch(companyName, results);
    const finalResults = matchedResults.slice(0, 5); // Top 5 matches
    
    // Cache the results for 1 hour
    setCachedSearch(cacheKey, finalResults);
    
    return finalResults;

  } catch (error) {
    console.error('❌ [OPENSANCTIONS] Search failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url
    });

    // Check if it's a 429 Rate Limit error
    const isRateLimit = error.response?.status === 429 || error.message?.includes('429');
    
    if (isRateLimit) {
      console.error('🚨 [OPENSANCTIONS] Rate limit exceeded! Monthly quota reached.');
      // Don't retry on rate limit - throw error to propagate to frontend
      const rateLimitError = new Error('OpenSanctions API rate limit exceeded');
      rateLimitError.rateLimitError = true;
      rateLimitError.status = 429;
      throw rateLimitError;
    }

    // Retry logic for other errors
    if (retryCount < config.retries && error.code !== 'ENOTFOUND') {
      console.log(`🔄 [OPENSANCTIONS] Retrying... (${retryCount + 1}/${config.retries})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return searchOpenSanctions(companyName, country, legalForm, retryCount + 1);
    }

    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// OFAC Helper Functions
// ═══════════════════════════════════════════════════════════════════

function buildEntityDescription(entity) {
  const parts = [];
  
  if (entity.sector) {
    parts.push(`Sector: ${entity.sector}`);
  }
  
  if (entity.listed_date) {
    parts.push(`Listed: ${entity.listed_date}`);
  }
  
  if (entity.countries && entity.countries.length > 0) {
    parts.push(`Countries: ${entity.countries.join(', ')}`);
  }
  
  if (parts.length === 0) {
    return 'OFAC Sanctions List Entry';
  }
  
  return parts.join(' | ');
}

function calculateRiskLevel(entity) {
  // Higher risk if:
  // - Multiple countries
  // - Recently listed
  // - Many aliases
  
  const countryCount = entity.countries?.length || 0;
  const aliasCount = entity.aliases?.length || 0;
  
  if (countryCount >= 5 || aliasCount >= 10) {
    return 'Critical';
  }
  
  if (countryCount >= 3 || aliasCount >= 5) {
    return 'High';
  }
  
  return 'Medium';
}

function calculateConfidence(index, total) {
  // AI-ranked results: first result = highest confidence
  if (total === 0) return 50;
  
  const baseConfidence = 95;
  const penalty = (index * 5); // -5% per position
  
  return Math.max(50, baseConfidence - penalty);
}

/**
 * Search OFAC SDN List (using local database with AI fuzzy matching)
 */
async function searchOFAC(companyName, country = null, retryCount = 0) {
  console.log(`🔍 [OFAC] Searching local database: "${companyName}"${country ? ` in ${country}` : ''}`);
  
  // Use local database with AI-powered search
  try {
    // Use the new AI-powered search from ofac-sync.js
    const results = await searchLocalOFACWithAI(db, companyName, country);
    console.log(`✅ [OFAC] AI search returned ${results.length} ranked results`);
    
    // Transform to compliance service expected format
    const formattedResults = results.map((entity, index) => ({
      id: entity.uid,
      name: entity.name,
      aliases: entity.aliases || [],
      type: entity.type || 'Entity',
      country: entity.countries?.[0] || 'Unknown',
      countries: entity.countries || [],
      description: buildEntityDescription(entity),
      programs: entity.programs || ['SDN'],
      source: 'OFAC',
      sourceDetail: 'OFAC Sanctions List (Local Database - 917 Arab Entities)',
      riskLevel: calculateRiskLevel(entity),
      confidence: calculateConfidence(index, results.length),
      sector: entity.sector,
      listed_date: entity.listed_date,
      url: `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${entity.uid.replace('OFAC-', '')}`,
      // Additional fields
      address: entity.addresses?.[0] || null,
      registrationNumber: entity.id_numbers?.[0] || null
    }));
    
    console.log(`🎯 [OFAC] Returning ${formattedResults.length} formatted results`);
    return formattedResults.slice(0, 10); // Top 10 results
    
  } catch (error) {
    console.error('❌ [OFAC] Search failed:', error);
    return [];
  }
  
  // Old API code (kept as fallback if needed)
  const config = EXTERNAL_APIS.OFAC;
  
  if (!config.enabled) {
    console.log('ℹ️ [OFAC] API disabled (using local database instead)');
    return [];
  }

  try {
    console.log(`🔍 [OFAC] Downloading SDN list...`);
    
    const url = `${config.baseUrl}${config.searchEndpoint}`;
    const response = await axiosInstance.get(url, {
      timeout: config.timeout,
      responseType: 'text'
    });

    console.log('📦 [OFAC] Downloaded XML, size:', response.data.length);

    // ✅ Parse XML properly using xml2js
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });

    const parsedData = await parser.parseStringPromise(response.data);
    
    if (!parsedData || !parsedData.sdnList || !parsedData.sdnList.sdnEntry) {
      console.warn('⚠️ [OFAC] Invalid XML structure');
      return [];
    }

    // Extract SDN entries
    const sdnEntries = Array.isArray(parsedData.sdnList.sdnEntry) 
      ? parsedData.sdnList.sdnEntry 
      : [parsedData.sdnList.sdnEntry];

    console.log(`📋 [OFAC] Parsed ${sdnEntries.length} SDN entries`);

    // Filter for companies/entities
    const companyEntries = sdnEntries
      .filter(entry => {
        const sdnType = entry.sdnType?.toLowerCase() || '';
        return sdnType.includes('entity') || sdnType.includes('company') || !sdnType.includes('individual');
      })
      .map(entry => ({
        id: entry.uid,
        name: [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim() || 'Unknown',
        aliases: [], // OFAC has akaList but complex to parse
        type: entry.sdnType || 'Entity',
        country: entry.addressList?.address?.country || '',
        description: `OFAC SDN List - ${entry.programList?.program || 'Sanctions Program'}`,
        programs: Array.isArray(entry.programList?.program) 
          ? entry.programList.program 
          : [entry.programList?.program].filter(Boolean),
        source: 'OFAC',
        riskLevel: 'High',
        confidence: 95,
        remarks: entry.remarks || '',
        url: `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${entry.uid}`
      }));

    console.log(`✅ [OFAC] Found ${companyEntries.length} company entries`);

    // Use OpenAI for fuzzy matching
    const matchedResults = await performFuzzyMatch(companyName, companyEntries);
    
    return matchedResults.slice(0, 5);

  } catch (error) {
    console.error('❌ [OFAC] Search failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });

    // Retry logic
    if (retryCount < config.retries && error.code !== 'ENOTFOUND') {
      console.log(`🔄 [OFAC] Retrying... (${retryCount + 1}/${config.retries})`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return searchOFAC(companyName, retryCount + 1);
    }

    return [];
  }
}

/**
 * Search EU Sanctions List
 */
async function searchEUSanctions(companyName, retryCount = 0) {
  const config = EXTERNAL_APIS.EU_SANCTIONS;
  
  if (!config.enabled) {
    console.log('ℹ️ [EU] API disabled');
    return [];
  }

  try {
    console.log(`🔍 [EU] Downloading sanctions list...`);
    
    const url = `${config.baseUrl}${config.searchEndpoint}`;
    const response = await axiosInstance.get(url, {
      params: config.params,
      timeout: config.timeout,
      responseType: 'text'
    });

    console.log('📦 [EU] Downloaded data, size:', response.data.length);

    // Check if XML or CSV
    const isXML = response.data.trim().startsWith('<');
    
    let results = [];
    
    if (isXML) {
      // ✅ Parse XML
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false
      });
      
      const parsedData = await parser.parseStringPromise(response.data);
      
      // EU XML structure varies, adapt as needed
      const sanctionEntities = parsedData?.export?.sanctionEntity || [];
      const entities = Array.isArray(sanctionEntities) ? sanctionEntities : [sanctionEntities];
      
      results = entities
        .filter(entity => {
          const subjectType = entity.subjectType?.classificationCode || entity.subjectType;
          return subjectType === 'E' || subjectType === 'enterprise' || subjectType === 'entity';
        })
        .map(entity => ({
          id: entity.euReferenceNumber,
          name: entity.nameAlias?.wholeName || entity.nameAlias?.firstName || 'Unknown',
          aliases: [],
          type: 'Entity',
          country: entity.citizenship?.countryDescription || '',
          description: entity.remark || 'EU Sanctions List Entry',
          programs: [entity.regulation?.programme || 'EU Sanctions'],
          source: 'EU Sanctions',
          riskLevel: 'High',
          confidence: 88,
          url: entity.euReferenceNumber ? `https://webgate.ec.europa.eu/fsd/fsf/public/files/htmlPages/fsf_en.html#${entity.euReferenceNumber}` : null
        }));
        
    } else {
      // ✅ Parse CSV
      const records = csvParse.parse(response.data, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      results = records
        .filter(record => {
          const subjectType = record.Entity_SubjectType || record.SubjectType || '';
          return subjectType.toLowerCase().includes('enterprise') || 
                 subjectType.toLowerCase().includes('entity') ||
                 subjectType.toLowerCase() === 'e';
        })
        .map(record => ({
          id: record.Entity_Id || record.Id,
          name: record.Entity_Name || record.Name || 'Unknown',
          aliases: [],
          type: 'Entity',
          country: record.Entity_Country || record.Country || '',
          description: record.Entity_Remark || record.Remark || 'EU Sanctions List Entry',
          programs: [record.Entity_Programme || record.Programme || 'EU Sanctions'],
          source: 'EU Sanctions',
          riskLevel: 'High',
          confidence: 88,
          url: record.Entity_Id ? `https://webgate.ec.europa.eu/fsd/fsf/public/files/htmlPages/fsf_en.html#${record.Entity_Id}` : null
        }));
    }

    console.log(`✅ [EU] Found ${results.length} entities`);

    // Use OpenAI for fuzzy matching
    const matchedResults = await performFuzzyMatch(companyName, results);
    
    return matchedResults.slice(0, 5);

  } catch (error) {
    console.error('❌ [EU] Search failed:', {
      message: error.message,
      code: error.code,
      status: error.response?.status
    });

    // Retry logic
    if (retryCount < config.retries) {
      console.log(`🔄 [EU] Retrying... (${retryCount + 1}/${config.retries})`);
      await new Promise(resolve => setTimeout(resolve, 1500 * (retryCount + 1)));
      return searchEUSanctions(companyName, retryCount + 1);
    }

    return [];
  }
}

/**
 * Main search function - combines all APIs
 */
async function searchExternalAPIs(searchCriteria) {
  console.log('🌐 [COMPLIANCE] Searching external APIs:', searchCriteria);
  
  // ✅ Always use real APIs - NO DEMO DATA FALLBACK
  console.log('🌐 [COMPLIANCE] Using REAL APIs only - no demo data');
  console.log('📋 [COMPLIANCE] Search criteria:', searchCriteria);
  
  // Extract filters from search criteria
  const country = searchCriteria.country || null;
  const legalForm = searchCriteria.legalForm || null;
  const selectedSources = searchCriteria.selectedSources || ['opensanctions'];
  
  console.log(`📊 [COMPLIANCE] Selected sources: ${selectedSources.join(', ')}`);
  
  if (country) {
    console.log(`🌍 [COMPLIANCE] Country filter applied: ${country}`);
  }
  if (legalForm) {
    console.log(`🏢 [COMPLIANCE] Legal Form filter applied: ${legalForm}`);
  }
  
  // Search selected APIs in parallel with filters
  const searchPromises = {
    openSanctions: selectedSources.includes('opensanctions') 
      ? searchOpenSanctions(searchCriteria.companyName, country, legalForm) 
      : Promise.resolve([]),
    ofac: selectedSources.includes('ofac') 
      ? searchOFAC(searchCriteria.companyName, country) 
      : Promise.resolve([]),
    euUk: selectedSources.includes('eu') 
      ? searchEUSanctions(searchCriteria.companyName) 
      : Promise.resolve([])
  };
  
  const [openSanctions, ofac, euUk] = await Promise.all([
    searchPromises.openSanctions,
    searchPromises.ofac,
    searchPromises.euUk
  ]);

  // ✅ Return ONLY real API results (empty arrays if no results found)
  const results = {
    openSanctions: openSanctions,
    ofac: ofac,
    euUk: euUk
  };

  console.log('✅ [COMPLIANCE] Search completed:', {
    openSanctions: results.openSanctions.length,
    ofac: results.ofac.length,
    euUk: results.euUk.length
  });

  return results;
}

// ==========================================
// ✅ NO DEMO DATA - Using REAL APIs only
// ==========================================
// Demo data functions removed - system now returns only real sanctions data
// If no sanctions found, returns empty array (will show "No sanctions found" message)

// ==========================================
// OpenAI Fuzzy Matching
// ==========================================

/**
 * Use OpenAI to perform intelligent fuzzy matching
 * between user query and sanctions data
 */
async function performFuzzyMatch(userQuery, sanctionsData) {
  if (!sanctionsData || sanctionsData.length === 0) {
    return [];
  }

  if (!OPENAI_API_KEY) {
    console.warn('⚠️ [FUZZY] OpenAI API key not configured, using exact matching');
    return sanctionsData.filter(item => 
      item.name.toLowerCase().includes(userQuery.toLowerCase())
    );
  }

  try {
    console.log('🤖 [FUZZY] Using OpenAI for intelligent matching...');
    console.log(`   Query: "${userQuery}"`);
    console.log(`   Data items: ${sanctionsData.length}`);
    
    // Prepare sanctions names for comparison (limit to 50 for cost control)
    const limitedData = sanctionsData.slice(0, 50);
    const sanctionsList = limitedData.map((item, idx) => ({
      index: idx,
      name: item.name,
      aliases: item.aliases || [],
      country: item.country || ''
    }));

    const prompt = `You are an AI-powered multilingual sanctions matching expert. Your task is to find companies from a sanctions list that match a user's search query in ANY language (English, Arabic, French, Spanish, etc.).

User is searching for: "${userQuery}"

Available sanctions entries:
${JSON.stringify(sanctionsList, null, 2)}

Instructions:
1. **Understand the search query in ANY language:**
   - If query is in Arabic (e.g., "مصانع القاهرة"), translate it to English
   - If query is in English with Arabic transliteration (e.g., "Masane3 Cairo"), understand the meaning
   - If query uses different dialects (Egyptian, Gulf, etc.), understand the intent
   
2. **Find ALL entries that could match:**
   - Exact matches (highest priority)
   - Translated names (e.g., "Cairo Food" matches "مصانع القاهرة للأغذية")
   - Similar spellings, typos, or transliterations
   - Abbreviations or acronyms (LLC, Corp, Ltd, PJSC, etc.)
   - Semantic matches (e.g., "restaurant" matches "food industries")
   - Companies in the same sector/country
   - Aliases or alternate names
   
3. **Smart matching examples:**
   - "مصانع القاهرة" → "Cairo Food Industries" (translation match)
   - "Dubai للتجارة" → "Dubai Trading Company" (mixed language)
   - "Food Cairo" → "Cairo Food Industries" (word order)
   - "Cario Foods" → "Cairo Food Industries" (typo correction)
   
4. Assign a confidence score (0-100) for each match
5. Return ONLY matches with confidence >= 50 (lowered for multilingual matching)

Respond with a JSON object containing a "matches" array:
{
  "matches": [
    {
      "index": 0,
      "confidence": 95,
      "reason": "Exact match or translation match"
    },
    {
      "index": 2,
      "confidence": 85,
      "reason": "Similar name with common transliteration variation"
    }
  ]
}

If no good matches found, return: {"matches": []}`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          {
            role: 'system',
            content: 'You are a sanctions list matching expert. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Low temperature for consistent matching
        max_tokens: 1000,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    console.log('🤖 [FUZZY] OpenAI raw response:', aiResponse);

    let matches;
    try {
      const parsed = JSON.parse(aiResponse);
      matches = Array.isArray(parsed) ? parsed : (parsed.matches || []);
    } catch (parseError) {
      console.error('❌ [FUZZY] Failed to parse OpenAI response:', parseError);
      // Fallback to basic matching
      return sanctionsData.filter(item => 
        item.name.toLowerCase().includes(userQuery.toLowerCase())
      );
    }

    // Map matches back to original data with confidence scores
    const matchedResults = matches
      .filter(match => match.confidence >= 60 && match.index < limitedData.length)
      .map(match => ({
        ...limitedData[match.index],
        matchConfidence: match.confidence,
        matchReason: match.reason
      }))
      .sort((a, b) => b.matchConfidence - a.matchConfidence);

    console.log(`✅ [FUZZY] Found ${matchedResults.length} matches using OpenAI`);
    
    return matchedResults;

  } catch (error) {
    console.error('❌ [FUZZY] OpenAI matching failed:', {
      message: error.message,
      status: error.response?.status
    });
    
    // Fallback to simple string matching
    return sanctionsData.filter(item => 
      item.name.toLowerCase().includes(userQuery.toLowerCase())
    );
  }
}

/**
 * Use OpenAI for orchestration and matching
 */
async function orchestrateWithOpenAI(data) {
  console.log('🤖 [COMPLIANCE] OpenAI orchestration started');
  
  // ⚡ TEMPORARILY DISABLED - Use basic matching for faster response
  console.warn('⚡ [COMPLIANCE] Using basic matching (OpenAI disabled for performance)');
  return performBasicMatching(data);
  
  /* ORIGINAL CODE - Enable when needed
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ [COMPLIANCE] OpenAI API key not configured, using basic matching');
    return performBasicMatching(data);
  }
  
  try {
    // ✅ Reduce data sent to OpenAI to avoid timeout
    const simplifiedResults = {
      openSanctions: data.externalResults.openSanctions?.map(s => ({
        id: s.id,
        name: s.name,
        country: s.country,
        datasets: s.datasets,
        topics: s.topics,
        reason: s.reason,
        penalty: s.penalty,
        allFields: s  // Keep full data
      })),
      ofac: data.externalResults.ofac?.slice(0, 3),
      euUk: data.externalResults.euUk?.slice(0, 3)
    };
    
    const prompt = `
Analyze the following company compliance data and provide structured results:

Company: ${data.companyName}
Search Criteria: ${JSON.stringify(data.searchCriteria, null, 2)}

External API Results (simplified):
${JSON.stringify(simplifiedResults, null, 2)}

Please analyze and return a JSON response with:
1. matchConfidence: number (0-100) indicating how confident you are in the match
2. sanctions: array - **COPY ALL FIELDS** from external results exactly as they are, including:
   - All basic fields (id, name, type, country, countryCode, source, confidence, riskLevel, description)
   - All sanction fields (reason, penalty, sanctionType, programId, datasets, topics)
   - All date fields (date, sanctionDate, endDate, incorporationDate, lastModified, firstSeen, lastSeen)
   - All contact fields (address, phone, email, website)
   - All registration fields (registrationNumber, taxNumber, leiCode, legalForm, sector, status)
   - All other fields present in the external results
3. sources: array of source database names used

CRITICAL INSTRUCTIONS:
- **DO NOT create new fields or modify existing ones**
- **COPY the entire sanction object as-is from external results**
- **PRESERVE ALL fields including reason, penalty, date, address, programId, etc.**
- Only filter by company name match - keep all other data intact
- If you find a matching company, return its complete data structure

Focus on:
- Finding companies that match the search name (exact or similar)
- Keeping ALL original fields from the API response
- Not modifying or summarizing any data

Return only valid JSON.
`;

    const response = await axios.post(OPENAI_API_URL, {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a compliance expert specializing in sanctions screening. Analyze company data and return ONLY valid JSON results for compliance checking. Do not include any text before or after the JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    const rawContent = response.data.choices[0].message.content.trim();
    console.log('🤖 [COMPLIANCE] OpenAI raw response:', rawContent);

    // Try to extract JSON from the response
    let aiResult;
    try {
      // First, try direct parsing
      aiResult = JSON.parse(rawContent);
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON from the text
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('❌ [COMPLIANCE] Could not extract JSON from OpenAI response, falling back to basic matching');
        return performBasicMatching(data);
      }
    }

    console.log('✅ [COMPLIANCE] OpenAI orchestration completed');
    
    return aiResult;
    
  } catch (error) {
    console.error('❌ [COMPLIANCE] OpenAI orchestration failed:', error);
    return performBasicMatching(data);
  }
  */
}

/**
 * Perform basic matching when OpenAI is not available
 */
async function performBasicMatching(data) {
  console.log('🔍 [COMPLIANCE] Performing basic matching');
  
  const sanctions = [];
  const sources = [];
  let matchConfidence = 0;
  
  // Process OpenSanctions results
  if (data.externalResults.openSanctions?.length > 0) {
    sources.push('OpenSanctions');
    data.externalResults.openSanctions.forEach((result, index) => {
      sanctions.push({
        ...result,  // ✅ Include ALL fields from OpenSanctions API
        // Override/add specific fields
        id: result.id || `opensanctions_${index}`,
        source: 'OpenSanctions',
        confidence: calculateBasicConfidence(data.companyName, result.name),
        // Ensure critical fields have fallbacks
        name: result.name || 'Unknown',
        type: result.type || 'Unknown',
        country: result.country || 'Unknown',
        riskLevel: result.riskLevel || 'Medium',
        description: result.description || 'Sanctioned entity'
      });
    });
    matchConfidence = Math.max(matchConfidence, 70);
  }
  
  // Process OFAC results
  if (data.externalResults.ofac?.length > 0) {
    sources.push('OFAC');
    data.externalResults.ofac.forEach((result, index) => {
      sanctions.push({
        ...result,  // ✅ Include ALL fields from OFAC API
        // Override/add specific fields
        id: result.id || `ofac_${index}`,
        source: 'OFAC',
        confidence: calculateBasicConfidence(data.companyName, result.name),
        // Ensure critical fields have fallbacks
        name: result.name || 'Unknown',
        type: result.type || 'Unknown',
        country: result.country || 'Unknown',
        riskLevel: result.riskLevel || 'High',
        description: result.description || 'OFAC sanctioned entity'
      });
    });
    matchConfidence = Math.max(matchConfidence, 80);
  }
  
  // Process EU/UK results
  if (data.externalResults.euUk?.length > 0) {
    sources.push('EU/UK OFSI');
    data.externalResults.euUk.forEach((result, index) => {
      sanctions.push({
        id: result.id || `euuk_${index}`,
        name: result.name || 'Unknown',
        type: result.type || 'Unknown',
        country: result.country || 'Unknown',
        source: 'EU/UK OFSI',
        confidence: calculateBasicConfidence(data.companyName, result.name),
        riskLevel: result.riskLevel || 'Medium',
        description: result.description || 'EU/UK sanctioned entity',
        // ✅ Include enhanced fields
        reason: result.reason,
        penalty: result.penalty,
        sanctionType: result.sanctionType,
        date: result.date,
        sanctionDate: result.sanctionDate
      });
    });
    matchConfidence = Math.max(matchConfidence, 75);
  }
  
  // ✅ Add AI explanations for each sanction
  const sanctionsWithExplanations = await addAIExplanations(data.companyName, sanctions);
  
  return {
    matchConfidence,
    sanctions: sanctionsWithExplanations,
    sources
  };
}

/**
 * Add AI-generated explanations for why each entity matched
 */
async function addAIExplanations(searchQuery, sanctions) {
  if (!OPENAI_API_KEY || !sanctions || sanctions.length === 0) {
    return sanctions;
  }
  
  try {
    console.log(`🤖 [EXPLANATION] Generating dual explanations for ${sanctions.length} results...`);
    
    // Prepare detailed data for OpenAI
    const sanctionsData = sanctions.map(s => ({
      name: s.name,
      aliases: s.aliases || [],
      datasets: s.datasets || [],
      topics: s.topics || [],
      programs: s.programs || [],
      riskLevel: s.riskLevel,
      country: s.country,
      reason: s.reason,
      penalty: s.penalty,
      sanctionType: s.sanctionType,
      sanctionDate: s.sanctionDate || s.date,
      endDate: s.endDate,
      address: s.address,
      legalForm: s.legalForm,
      sector: s.sector,
      incorporationDate: s.incorporationDate
    }));
    
    const prompt = `You are a compliance screening expert. User searched for: "${searchQuery}"

For EACH entity, provide TWO types of explanations:

1. MATCH EXPLANATION (Technical, English):
   - Brief technical explanation of HOW the match occurred
   - Format: "Search: '${searchQuery}' matched with [Name/Alias/Related] '[specific match]' in company '[Company Name]'"
   - Include match type and confidence
   - Keep it 1-2 sentences, technical and precise

2. STORY EXPLANATION (Narrative, Arabic):
   - A comprehensive narrative story about the entity and sanctions
   - WHO is this company? (name, aliases, sector, country)
   - WHAT sanctions? (type, datasets like OFAC, EU, UN)
   - WHY sanctioned? (reason, context, background)
   - WHEN? (sanction date, incorporation date, timeline)
   - PENALTIES? (what restrictions, fines, measures)
   - DURATION? (ongoing, end date if temporary)
   - Tell it like a story, engaging and informative
   - 3-5 sentences in Arabic

Entities:
${JSON.stringify(sanctionsData, null, 2)}

Return JSON in this EXACT format:
{
  "explanations": [
    {
      "index": 0,
      "matchExplanation": "Search: 'Arkan' matched with Alias 'Arkan' in company 'Emsteel Building Materials'. This is an alias match with 95% confidence from gem_energy_ownership dataset.",
      "storyExplanation": "شركة Emsteel Building Materials (المعروفة أيضاً باسم أركان) هي شركة مساهمة عامة في الإمارات العربية المتحدة تعمل في قطاع مواد البناء والطاقة. الشركة مدرجة في قاعدة بيانات ملكية الطاقة (gem_energy_ownership) منذ 30 يونيو 2024، مما يشير إلى أنها تخضع للمراقبة والمتابعة في قطاع الطاقة. تصنف الشركة بمستوى مخاطر متوسط نظراً لنشاطها في قطاع حساس، وتحمل رمز LEI دولي ورقم تسجيل رسمي في دبي."
    }
  ]
}`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a compliance screening expert. Provide technical match explanations in English and narrative story explanations in Arabic. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    const aiResponse = JSON.parse(response.data.choices[0].message.content);
    console.log('🤖 [EXPLANATION] Dual explanations generated:', aiResponse.explanations?.length || 0);

    // Add both types of explanations to sanctions
    if (aiResponse.explanations && Array.isArray(aiResponse.explanations)) {
      aiResponse.explanations.forEach(exp => {
        if (sanctions[exp.index]) {
          sanctions[exp.index].matchExplanation = exp.matchExplanation;     // 🔍 Technical (English)
          sanctions[exp.index].storyExplanation = exp.storyExplanation;     // 📖 Narrative (Arabic)
        }
      });
    }

    return sanctions;

  } catch (error) {
    console.error('❌ [EXPLANATION] Failed to generate AI explanations:', error.message);
    // Return original sanctions without explanations
    return sanctions;
  }
}

/**
 * Calculate basic confidence score
 */
function calculateBasicConfidence(searchName, resultName) {
  if (!searchName || !resultName) return 0;
  
  const search = searchName.toLowerCase();
  const result = resultName.toLowerCase();
  
  // Exact match
  if (search === result) return 100;
  
  // Contains match
  if (result.includes(search) || search.includes(result)) return 80;
  
  // Word overlap
  const searchWords = search.split(/\s+/);
  const resultWords = result.split(/\s+/);
  const commonWords = searchWords.filter(word => resultWords.includes(word));
  
  if (commonWords.length > 0) {
    return Math.min(70, (commonWords.length / searchWords.length) * 100);
  }
  
  return 30; // Low confidence for any match
}

/**
 * Calculate overall risk level
 */
function calculateOverallRiskLevel(sanctions) {
  if (!sanctions || sanctions.length === 0) return 'Low';
  
  const riskLevels = sanctions.map(s => s.riskLevel);
  
  if (riskLevels.includes('Critical')) return 'Critical';
  if (riskLevels.includes('High')) return 'High';
  if (riskLevels.includes('Medium')) return 'Medium';
  return 'Low';
}

/**
 * Perform compliance check for a single company
 */
async function performComplianceCheck(company) {
  console.log('🔍 [COMPLIANCE] Checking company:', company.companyName);
  
  // Search external APIs
  const externalResults = await searchExternalAPIs(company);
  
  // Use OpenAI for orchestration
  const orchestratedResults = await orchestrateWithOpenAI({
    companyName: company.companyName,
    searchCriteria: company,
    externalResults
  });
  
  // Calculate overall risk level
  const overallRiskLevel = calculateOverallRiskLevel(orchestratedResults.sanctions);
  
  return {
    companyName: company.companyName,
    matchConfidence: orchestratedResults.matchConfidence,
    overallRiskLevel,
    sanctions: orchestratedResults.sanctions,
    sources: orchestratedResults.sources,
    searchTimestamp: new Date().toISOString(),
    searchCriteria: company
  };
}

// ========================================
// DATABASE SCHEMA FOR COMPLIANCE
// ========================================

// Create compliance_history table if it doesn't exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS compliance_history (
      id TEXT PRIMARY KEY,
      companyName TEXT NOT NULL,
      matchConfidence INTEGER NOT NULL,
      overallRiskLevel TEXT NOT NULL,
      sanctions TEXT NOT NULL,
      sources TEXT NOT NULL,
      searchCriteria TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);
  console.log('✅ [COMPLIANCE] Database schema initialized');
} catch (error) {
  console.error('❌ [COMPLIANCE] Failed to initialize database schema:', error);
}

// Start server
app.listen(PORT, () => {
  console.log(`\nSQLite MDM Server (better-sqlite3) running at http://localhost:${PORT}`);
  console.log(`Database saved at: ${dbPath}`);
  console.log(`🔍 [COMPLIANCE] Compliance Agent ready`);
  console.log(`\nDefault Users:`);
  console.log(`   data_entry / pass123`);
  console.log(`   reviewer / pass123`);
  console.log(`   compliance / pass123`);
  console.log(`   admin / admin123`);
  console.log(`   manager / manager123`);
  console.log(`\n✅ Ready with all fixes and enhancements!`);
  console.log(`\n✅ FIXED: Reject endpoint now properly assigns quarantine records to data_entry`);
  console.log(`\n✨ ADMIN ENDPOINTS AVAILABLE:`);
  console.log(`   GET  /api/requests/admin/data-stats - Get data statistics`);
  console.log(`   DELETE /api/requests/admin/clear-all - Clear all data`);
  console.log(`   DELETE /api/requests/admin/clear-sync - Clear sync data`);
  console.log(`   DELETE /api/requests/admin/clear-duplicates - Clear duplicate records`);
  console.log(`   DELETE /api/requests/admin/clear-quarantine - Clear quarantine records`);
  console.log(`   DELETE /api/requests/admin/clear-golden - Clear golden records`);
  console.log(`   DELETE /api/requests/admin/clear-requests - Clear normal requests`);
  console.log(`   POST /api/requests/admin/generate-quarantine - Generate sample quarantine data`);
  console.log(`   POST /api/requests/admin/generate-duplicates - Generate sample duplicate data`);
  console.log(`\n✨ DUPLICATE ENDPOINTS AVAILABLE:`);
  console.log(`   POST /api/requests/:id/complete-quarantine - Complete quarantine record`);
  console.log(`   GET  /api/duplicates - Get unprocessed duplicate records`);
  console.log(`   GET  /api/duplicates/quarantine - Get quarantine records`);
  console.log(`   GET  /api/duplicates/golden - Get golden records`);
  console.log(`   GET  /api/duplicates/groups - All duplicate groups`);
  console.log(`   GET  /api/duplicates/by-tax/:taxNumber - Group by tax number`);
  console.log(`   GET  /api/duplicates/group/:masterId - Group by master ID`);
  console.log(`   POST /api/duplicates/merge - Merge duplicate records`);
  console.log(`   POST /api/duplicates/build-master - Build master with quarantine logic`);
  console.log(`   POST /api/duplicates/resubmit-master - Resubmit rejected master`);
  console.log(`   POST /api/duplicates/recommend-fields - Get smart field recommendations`);
  console.log(`\n🔔 NOTIFICATION ENDPOINTS AVAILABLE:`);
  console.log(`   GET  /api/notifications - Get user notifications`);
  console.log(`   POST /api/notifications - Create notification`);
  console.log(`   PUT  /api/notifications/:id/read - Mark notification as read`);
  console.log(`   PUT  /api/notifications/read-all - Mark all notifications as read`);
  console.log(`   DELETE /api/notifications/:id - Delete notification`);
  console.log(`   GET  /api/notifications/unread-count - Get unread count`);
});

// ====== NOTIFICATION ENDPOINTS ======

// Get user notifications
app.get('/api/notifications', (req, res) => {
  try {
    const userId = req.query.userId || '1';
    
    console.log(`🔍 [SERVER] Get notifications request:`, {
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE userId = ? 
      ORDER BY timestamp DESC
    `).all(userId);
    
    console.log(`🔍 [SERVER] Found ${notifications.length} notifications for userId ${userId}:`, {
      total: notifications.length,
      read: notifications.filter(n => n.isRead).length,
      unread: notifications.filter(n => !n.isRead).length,
      details: notifications.map(n => ({
        id: n.id,
        companyName: n.companyName,
        isRead: n.isRead,
        type: typeof n.isRead,
        timestamp: n.timestamp
      }))
    });
    
    res.json(notifications);
  } catch (error) {
    console.error('❌ [SERVER] Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Create notification
app.post('/api/notifications', (req, res) => {
  try {
    const { 
      userId, companyName, status, message, taskId, 
      userRole, requestType, fromUser, toUser 
    } = req.body;
    
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = db.prepare(`
      INSERT INTO notifications (
        id, userId, companyName, status, message, taskId,
        userRole, requestType, fromUser, toUser
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userId, companyName, status, message, taskId, 
             userRole, requestType, fromUser, toUser);
    
    res.json({ id, message: 'Notification created successfully' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 [SERVER] Mark notification as read request:`, {
      id: id,
      timestamp: new Date().toISOString()
    });
    
    // First, check current state
    const beforeState = db.prepare('SELECT id, isRead, userId FROM notifications WHERE id = ?').get(id);
    console.log(`🔍 [SERVER] Before update state:`, beforeState);
    
    const stmt = db.prepare(`
      UPDATE notifications 
      SET isRead = 1, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    const result = stmt.run(id);
    
    console.log(`🔍 [SERVER] Update result:`, {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    });
    
    if (result.changes === 0) {
      console.log(`❌ [SERVER] Notification ${id} not found in database`);
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Verify the update
    const afterState = db.prepare('SELECT id, isRead, userId, updatedAt FROM notifications WHERE id = ?').get(id);
    console.log(`🔍 [SERVER] After update state:`, afterState);
    
    console.log(`✅ [SERVER] Successfully marked notification ${id} as read`);
    res.json({ 
      message: 'Notification marked as read',
      id: id,
      updatedAt: afterState.updatedAt
    });
  } catch (error) {
    console.error('❌ [SERVER] Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read-all', (req, res) => {
  try {
    const userId = req.body.userId || '1';
    
    console.log(`🔍 [SERVER] Mark all notifications as read request:`, {
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    // First, check current state
    const beforeState = db.prepare(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN isRead = 1 THEN 1 ELSE 0 END) as readCount,
             SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) as unreadCount
      FROM notifications 
      WHERE userId = ?
    `).get(userId);
    
    console.log(`🔍 [SERVER] Before update state:`, beforeState);
    
    const stmt = db.prepare(`
      UPDATE notifications 
      SET isRead = 1, updatedAt = CURRENT_TIMESTAMP 
      WHERE userId = ? AND isRead = 0
    `);
    
    const result = stmt.run(userId);
    
    console.log(`🔍 [SERVER] Update result:`, {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    });
    
    // Verify the update
    const afterState = db.prepare(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN isRead = 1 THEN 1 ELSE 0 END) as readCount,
             SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) as unreadCount
      FROM notifications 
      WHERE userId = ?
    `).get(userId);
    
    console.log(`🔍 [SERVER] After update state:`, afterState);
    
    console.log(`✅ [SERVER] Successfully marked ${result.changes} notifications as read for userId ${userId}`);
    
    res.json({ 
      message: 'All notifications marked as read',
      updatedCount: result.changes,
      beforeState: beforeState,
      afterState: afterState
    });
  } catch (error) {
    console.error('❌ [SERVER] Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
app.delete('/api/notifications/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM notifications WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get unread count
app.get('/api/notifications/unread-count', (req, res) => {
  try {
    const userId = req.query.userId || '1';
    
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE userId = ? AND isRead = 0
    `).get(userId);
    
    res.json({ unreadCount: result.count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Sync notifications with task list
app.post('/api/notifications/sync', (req, res) => {
  try {
    const { userId, tasks } = req.body;
    
    // Delete existing notifications for this user
    db.prepare('DELETE FROM notifications WHERE userId = ?').run(userId);
    
    // Create new notifications from tasks
    const stmt = db.prepare(`
      INSERT INTO notifications (
        id, userId, companyName, status, message, taskId,
        userRole, requestType, fromUser, toUser
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    tasks.forEach((task, index) => {
      const id = `notification_${Date.now()}_${index}`;
      const taskId = task.id || task.taskId || task.requestId || `task_${index}`;
      const companyName = task.name || task.firstName || task.companyName || 'Unknown Company';
      const status = task.status || 'pending';
      
      // Map status to notification status
      let notificationStatus = 'pending';
      if (status.toLowerCase().includes('rejected')) notificationStatus = 'rejected';
      else if (status.toLowerCase().includes('approved')) notificationStatus = 'approved';
      else if (status.toLowerCase().includes('quarantine')) notificationStatus = 'quarantine';
      
      // Get user role
      let userRole = 'data-entry';
      if (userId === '2') userRole = 'reviewer';
      else if (userId === '3') userRole = 'compliance';
      
      // Get request type
      let requestType = 'new';
      if (status.includes('approved')) requestType = 'compliance';
      else if (status.includes('rejected')) requestType = 'new';
      else requestType = 'review';
      
      // Get message
      let message = `Task for ${companyName} needs your attention`;
      if (userId === '1' && status.includes('rejected')) {
        message = `Your request for ${companyName} has been rejected`;
      } else if (userId === '2') {
        message = `New request for ${companyName} needs your review`;
      } else if (userId === '3') {
        message = `Approved request for ${companyName} needs compliance review`;
      }
      
      stmt.run(id, userId, companyName, notificationStatus, message, taskId,
               userRole, requestType, 'System', 'User');
    });
    
    res.json({ 
      message: 'Notifications synced successfully',
      createdCount: tasks.length 
    });
  } catch (error) {
    console.error('Error syncing notifications:', error);
    res.status(500).json({ error: 'Failed to sync notifications' });
  }
});

// Graceful shutdown
// Memory monitoring
setInterval(() => {
  const used = process.memoryUsage();
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
  
  if (used.heapUsed / 1024 / 1024 > 200) { // If using more than 200MB
    console.warn(`⚠️ High memory usage: Heap ${mb(used.heapUsed)}MB / RSS ${mb(used.rss)}MB`);
    
    // Optional: Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('🧹 Garbage collection triggered');
    }
  }
}, 30000); // Check every 30 seconds

// ==================== USER MANAGEMENT API ENDPOINTS ====================
// Simple base64 image upload (PNG/JPEG). Stores file on disk; returns URL
app.post('/api/users/upload-avatar', (req, res) => {
  try {
    console.log('📸 Avatar upload request received');
    
    const { fileBase64, filename } = req.body;
    
    if (!fileBase64 || !filename) {
      return res.status(400).json({ error: 'Missing file data' });
    }
    
    // استخراج MIME type والـ extension
    const matches = fileBase64.match(/^data:image\/(\w+);base64,/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    
    const mimeType = matches[1]; // png أو jpg أو jpeg
    
    // التحقق من نوع الصورة
    if (!['png', 'jpg', 'jpeg'].includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: 'Only PNG and JPEG images are allowed' });
    }
    
    // إنشاء اسم ملف آمن
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = mimeType === 'jpeg' ? 'jpg' : mimeType; // تحويل jpeg إلى jpg
    const safeName = `profile-${timestamp}-${randomStr}.${ext}`; // ✅ profile-1234567890-abc123.jpg
    
    const filePath = path.join(UPLOADS_DIR, safeName);
    
    console.log('📁 Saving to:', filePath);
    
    // إزالة الـ data URL prefix
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // ✅ إضافة fs محلياً
    const fs = require('fs');
    
    // حفظ الملف
    fs.writeFileSync(filePath, base64Data, 'base64');
    
    const fileUrl = `/uploads/${safeName}`;
    const fullUrl = `${BASE_URL}${fileUrl}`;
    
    console.log('✅ Avatar uploaded successfully:', fileUrl);
    console.log('✅ Full URL:', fullUrl);
    
    res.json({ 
      success: true, 
      url: fileUrl,
      fullUrl: fullUrl
    });
    
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
});

// Get all users
app.get('/api/users', (req, res) => {
  try {
    console.log('[USER-MGMT] GET /api/users - Getting all users');
    const users = db.prepare(`
      SELECT id, username, role, fullName, email, isActive, createdAt,
             COALESCE(avatarUrl, '') as avatarUrl
      FROM users 
      ORDER BY createdAt DESC
    `).all();
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get single user
app.get('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[USER-MGMT] GET /api/users/${id} - Getting user`);
    
    const user = db.prepare(`
      SELECT id, username, role, fullName, email, isActive, createdAt,
             COALESCE(avatarUrl, '') as avatarUrl
      FROM users 
      WHERE id = ?
    `).get(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Create new user
app.post('/api/users', (req, res) => {
  try {
    const { username, password, role, fullName, email, isActive, avatarUrl } = req.body;
    console.log(`[USER-MGMT] POST /api/users - Creating user: ${username}`);
    
    // Validate required fields
    if (!username || !password || !role || !fullName || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Create user
    const stmt = db.prepare(`
      INSERT INTO users (username, password, role, fullName, email, isActive, avatarUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(username, password, role, fullName, email, isActive ? 1 : 0, avatarUrl || null);
    
    res.json({ 
      id: result.lastInsertRowid,
      username,
      role,
      fullName,
      email,
      isActive: isActive ? 1 : 0,
      avatarUrl: avatarUrl || null,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, fullName, email, isActive } = req.body;
    console.log(`[USER-MGMT] PUT /api/users/${id} - Updating user`);
    
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if username already exists (excluding current user)
    if (username) {
      const usernameCheck = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (usernameCheck) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }
    
    // Check if email already exists (excluding current user)
    if (email) {
      const emailCheck = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (emailCheck) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (password !== undefined && password.trim() !== '') {
      updates.push('password = ?');
      values.push(password);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (fullName !== undefined) {
      updates.push('fullName = ?');
      values.push(fullName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(isActive ? 1 : 0);
    }
    if (req.body.avatarUrl !== undefined) {
      updates.push('avatarUrl = ?');
      values.push(req.body.avatarUrl || null);
      console.log('🖼️ Updating avatarUrl:', req.body.avatarUrl);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user password
app.put('/api/users/:id/password', (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    console.log(`[USER-MGMT] PUT /api/users/${id}/password - Updating password`);
    
    // Check if user exists
    const user = db.prepare('SELECT id, password FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password (simple check for demo - in production use proper hashing)
    if (currentPassword !== user.password) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    const updateStmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
    updateStmt.run(newPassword, id);
    
    console.log(`[USER-MGMT] Password updated for user ${id}`);
    res.json({ message: 'Password updated successfully' });
    
  } catch (error) {
    console.error('[USER-MGMT] Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[USER-MGMT] DELETE /api/users/${id} - Deleting user`);
    
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has any requests (optional safety check)
    const userRequests = db.prepare('SELECT COUNT(*) as count FROM requests WHERE createdBy = ? OR assignedTo = ?').get(id, id);
    if (userRequests.count > 0) {
      return res.status(400).json({ error: 'Cannot delete user with existing requests' });
    }
    
    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ==================== END USER MANAGEMENT API ENDPOINTS ====================

process.on('SIGINT', () => {
  console.log('\nClosing database...');
  db.close();
  console.log('Goodbye!');
  process.exit(0);
});