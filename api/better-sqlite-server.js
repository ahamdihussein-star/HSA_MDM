const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

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
      const fileUrl = `http://localhost:3000/uploads/${doc.document_path}`;
      
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
    
    console.log('👥 [GET SESSION] Contacts found:', contacts.length);
    
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
    db.prepare(`DELETE FROM session_staging WHERE session_id = ?`).run(req.params.sessionId);
    db.prepare(`DELETE FROM session_documents WHERE session_id = ?`).run(req.params.sessionId);
    db.prepare(`DELETE FROM session_contacts WHERE session_id = ?`).run(req.params.sessionId);
    
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
      documents: (documents || []).map(d => ({
        ...d,
        id: d.documentId || d.id
      })),
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
        const insertDoc = db.prepare(`
          INSERT INTO documents (
            requestId, documentId, name, type, description, 
            size, mime, contentBase64, source, uploadedBy, uploadedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        body.documents.forEach((doc, index) => {
          // Generate unique timestamp for each document
          const docTimestamp = new Date(Date.now() + index).toISOString();
          
          insertDoc.run(
            id,
            doc.id || doc.documentId || nanoid(8),
            doc.name,
            doc.type,
            doc.description,
            doc.size,
            doc.mime,
            doc.contentBase64,
            doc.source || body.sourceSystem || 'Data Steward',
            doc.uploadedBy || body.createdBy || 'data_entry',
            docTimestamp  // Unique timestamp for each document
          );
          
          console.log(`[CREATE] Added document ${index + 1}: ${doc.name} at ${docTimestamp}`);
        });
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
        
        // Handle documents update - ENHANCED with proper change tracking
        if (data.documents && Array.isArray(data.documents)) {
            // Get existing documents for comparison
            const existingDocuments = db.prepare('SELECT * FROM documents WHERE requestId = ?').all(id);
            
            // Create maps for easier comparison
            const existingDocsMap = new Map();
            existingDocuments.forEach(doc => {
                const key = `${doc.name}_${doc.type}`;
                existingDocsMap.set(key, doc);
            });
            
            const newDocsMap = new Map();
            data.documents.forEach(doc => {
                if (doc.name && doc.contentBase64) {
                    const key = `${doc.name}_${doc.type || 'other'}`;
                    newDocsMap.set(key, doc);
                }
            });
            
            // Track document changes
            const documentChanges = [];
            
            // Check for removed documents
            existingDocsMap.forEach((existingDoc, key) => {
                if (!newDocsMap.has(key)) {
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
            newDocsMap.forEach((newDoc, key) => {
                const existingDoc = existingDocsMap.get(key);
                
                if (!existingDoc) {
                    // New document added - only log if this is actually a new document
                    // Check if this document was already processed in this session
                    const alreadyProcessed = documentChanges.some(change => 
                        change.field === `Document: ${newDoc.name}` && change.changeType === 'Create'
                    );
                    
                    if (!alreadyProcessed) {
                        documentChanges.push({
                            field: `Document: ${newDoc.name}`,
                            oldValue: null,
                            newValue: newDoc.name,
                            changeType: 'Create',
                            documentId: newDoc.id || newDoc.documentId
                        });
                    }
                } else {
                    // Check if document was modified (compare content hash or other properties)
                    const isModified = (
                        existingDoc.description !== (newDoc.description || '') ||
                        (existingDoc.size || 0) !== (newDoc.size || 0) ||
                        existingDoc.mime !== (newDoc.mime || 'application/octet-stream')
                    );
                    
                    if (isModified) {
                        documentChanges.push({
                            field: `Document: ${newDoc.name}`,
                            oldValue: existingDoc.name,
                            newValue: newDoc.name,
                            changeType: 'Update',
                            documentId: existingDoc.documentId,
                            oldDescription: existingDoc.description,
                            newDescription: newDoc.description || '',
                            oldSize: existingDoc.size,
                            newSize: newDoc.size || 0
                        });
                    }
                }
            });
            
            // Only delete and re-insert documents if there are actual changes
            if (documentChanges.length > 0) {
                // Delete only the documents that were actually removed
                documentChanges.forEach(change => {
                    if (change.changeType === 'Delete') {
                        db.prepare('DELETE FROM documents WHERE requestId = ? AND name = ?').run(id, change.field.replace('Document: ', ''));
                    }
                });
                
                // Insert only new documents
                documentChanges.forEach(change => {
                    if (change.changeType === 'Create') {
                        const docName = change.field.replace('Document: ', '');
                        const newDoc = data.documents.find(doc => doc.name === docName);
                        
                        if (newDoc && newDoc.name && newDoc.contentBase64) {
                            const docTimestamp = new Date().toISOString();
                            
                            db.prepare(`
                                INSERT INTO documents (requestId, documentId, name, type, description, size, mime, contentBase64, uploadedAt, uploadedBy, source)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).run(
                                id, 
                                newDoc.id || newDoc.documentId || nanoid(8),
                                newDoc.name, 
                                newDoc.type || 'other', 
                                newDoc.description || '',
                                newDoc.size || 0, 
                                newDoc.mime || 'application/octet-stream', 
                                newDoc.contentBase64, 
                                docTimestamp,
                                data.updatedBy || 'system',
                                newDoc.source || 'Data Steward'
                            );
                        }
                    }
                });
                
                // Update existing documents that were modified
                documentChanges.forEach(change => {
                    if (change.changeType === 'Update') {
                        const docName = change.field.replace('Document: ', '');
                        const updatedDoc = data.documents.find(doc => doc.name === docName);
                        
                        if (updatedDoc) {
                            db.prepare(`
                                UPDATE documents 
                                SET description = ?, size = ?, mime = ?, contentBase64 = ?, uploadedBy = ?
                                WHERE requestId = ? AND name = ?
                            `).run(
                                updatedDoc.description || '',
                                updatedDoc.size || 0,
                                updatedDoc.mime || 'application/octet-stream',
                                updatedDoc.contentBase64,
                                data.updatedBy || 'system',
                                id,
                                docName
                            );
                        }
                    }
                });
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
    
    // 3. Unprocessed Duplicate Records (مع sourceSystem فقط)
    const unprocessedDuplicates = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE requestType = 'duplicate' 
      AND status = 'Duplicate'
      AND assignedTo = 'data_entry'
      AND sourceSystem IS NOT NULL
      AND sourceSystem != ''
      AND sourceSystem != 'Master Builder'
    `).get().count;
    
    // 4. New Requests Created (NOT quarantine AND NOT duplicate)
    const newRequests = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE requestType NOT IN ('quarantine', 'duplicate')
      AND (requestType = 'new' OR requestType IS NULL)
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

    // System Sources Duplicates Calculations
    // Oracle Forms - Unprocessed + Processed
    const oracleFormsUnprocessed = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'Oracle Forms'
      AND requestType = 'duplicate'
      AND status = 'Duplicate'
    `).get().count;

    const oracleFormsProcessed = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'Oracle Forms'
      AND status = 'Linked'
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

    // SAP S/4HANA - Unprocessed + Processed
    const sapS4HanaUnprocessed = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP S/4HANA'
      AND requestType = 'duplicate'
      AND status = 'Duplicate'
    `).get().count;

    const sapS4HanaProcessed = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP S/4HANA'
      AND status = 'Linked'
    `).get().count;

    const sapS4HanaDuplicate = sapS4HanaUnprocessed + sapS4HanaProcessed;

    // Total = Quarantine + Duplicate (processed + unprocessed)
    const sapS4HanaTotal = sapS4HanaQuarantine + sapS4HanaDuplicate;

    const sapByDesignQuarantine = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP ByD'
      AND (status = 'Quarantine' OR originalRequestType = 'quarantine')
    `).get().count;

    // SAP ByD - Unprocessed + Processed
    const sapByDesignUnprocessed = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP ByD'
      AND requestType = 'duplicate'
      AND status = 'Duplicate'
    `).get().count;

    const sapByDesignProcessed = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE sourceSystem = 'SAP ByD'
      AND status = 'Linked'
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
    
    // 9. Processed Duplicates - محسّن
    // عد Master records والـ linked/merged records
    // 9. Processed Duplicates (مع sourceSystem فقط - Linked records)
    const processedDuplicates = db.prepare(`
      SELECT COUNT(*) as count 
      FROM requests 
      WHERE status = 'Linked'
      AND sourceSystem IS NOT NULL
      AND sourceSystem != ''
      AND sourceSystem != 'Master Builder'
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
    const systems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByD'];
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
    const sourceSystems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByD'];
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
      AND companyStatus = 'Active'
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

// Start server
app.listen(PORT, () => {
  console.log(`\nSQLite MDM Server (better-sqlite3) running at http://localhost:${PORT}`);
  console.log(`Database saved at: ${dbPath}`);
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
    const fullUrl = `http://localhost:3000${fileUrl}`;
    
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