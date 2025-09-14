const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Users table ready');

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
  `);
  console.log('Indexes created for optimal performance');

  // Insert default users
  insertDefaultUsers();
  
  // Insert sample data
  insertSampleData();
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
      ['compliance', 'pass123', 'compliance', 'Compliance Officer', 'compliance@mdm.com']
    ];
    
    users.forEach(user => insertUser.run(user));
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

// Get current user info endpoint
app.get('/api/auth/me', (req, res) => {
  const userRole = req.headers['x-user-role'] || req.query.role;
  const userId = req.headers['x-user-id'] || req.query.userId;
  const username = req.headers['x-username'] || req.query.username;
  
  if (!userRole && !userId && !username) {
    if (req.query.username) {
      const user = db.prepare(
        "SELECT id, username, role, fullName, email FROM users WHERE username = ? AND isActive = 1"
      ).get(req.query.username);
      
      if (user) {
        return res.json({
          ...user,
          permissions: getPermissionsForRole(user.role)
        });
      }
    }
    
    return res.status(401).json({ 
      error: 'User not authenticated',
      message: 'Please login first'
    });
  }
  
  res.json({
    id: userId || 'user_' + Date.now(),
    username: username || 'current_user',
    role: userRole || 'reviewer',
    email: username ? `${username}@company.com` : 'user@company.com',
    permissions: getPermissionsForRole(userRole)
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = db.prepare(
      "SELECT id, username, role, fullName, email FROM users WHERE username = ? AND password = ? AND isActive = 1"
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

// Get all requests
app.get('/api/requests', (req, res) => {
  try {
    const { status, origin, isGolden, assignedTo } = req.query;
    
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
    
    const result = {
      ...request,
      contacts: contacts || [],
      documents: (documents || []).map(d => ({
        ...d,
        id: d.documentId || d.id
      })),
      issues: issues || []
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
        
        // Handle documents update
        if (data.documents && Array.isArray(data.documents)) {
            // Delete existing documents
            db.prepare('DELETE FROM documents WHERE requestId = ?').run(id);
            
            // Insert new documents
            data.documents.forEach(doc => {
                if (doc.name && doc.contentBase64) {
                    db.prepare(`
                        INSERT INTO documents (requestId, name, type, description, size, mime, contentBase64, uploadedAt, uploadedBy)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                    `).run(
                        id, doc.name, doc.type || 'other', doc.description || '',
                        doc.size || 0, doc.mime || 'application/octet-stream', 
                        doc.contentBase64, data.updatedBy || 'system'
                    );
                    
                    changes.push({
                        field: `Document: ${doc.name}`,
                        oldValue: null,
                        newValue: doc.name
                    });
                }
            });
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
    data.updatedBy || 'system', data.updatedByRole || 'system',
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

// Get workflow history for a request (for frontend compatibility)
app.get('/api/requests/:id/history', (req, res) => {
    try {
        const { id } = req.params;
        
        // Get workflow history
        const history = db.prepare(`
            SELECT * FROM workflow_history 
            WHERE requestId = ? 
            ORDER BY performedAt ASC
        `).all(id);
        
        // Parse payload for each entry
        const processedHistory = history.map(entry => {
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
        
        // Return as array directly (what frontend expects)
        res.json(processedHistory);
        
    } catch (error) {
        console.error('Error getting workflow history:', error);
        res.status(500).json({ error: 'Failed to get workflow history', details: error.message });
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
      WHERE r.status IN ('Duplicate', 'New', 'Draft')
        AND r.isMaster != 1
        AND r.masterId IS NULL
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

// Clear all data except users
app.delete('/api/requests/admin/clear-all', (req, res) => {
  try {
    console.log('[ADMIN] DELETE /api/requests/admin/clear-all - CLEARING ALL DATA');
    
    const transaction = db.transaction(() => {
      // حذف كل البيانات بالترتيب الصحيح
      db.prepare('DELETE FROM workflow_history').run();
      db.prepare('DELETE FROM issues').run();
      db.prepare('DELETE FROM documents').run();
      db.prepare('DELETE FROM contacts').run();
      db.prepare('DELETE FROM requests').run();
      
      console.log('[ADMIN] All data tables cleared');
    });
    
    transaction();
    
    res.json({ 
      success: true, 
      message: 'All data cleared successfully (users retained)'
    });
    
  } catch (error) {
    console.error('[ADMIN] Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
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
// Generate sample quarantine data - شركات مختلفة تماماً مع القيم الصحيحة
// Generate sample quarantine data - حوالي سطر 2325
app.post('/api/requests/admin/generate-quarantine', (req, res) => {
  try {
    console.log('[ADMIN] POST /api/requests/admin/generate-quarantine');
    
    // شركات مختلفة تماماً عن الـ duplicates
    const companies = [
      { 
        name: 'National Food Industries', 
        nameAr: 'الصناعات الغذائية الوطنية', 
        tax: 'SA1010445678',
        country: 'Saudi Arabia',
        city: 'Buraidah',
        owner: 'Mohammed Al-Suhaimi',
        customerType: 'Limited Liability Company'
      },
      { 
        name: 'Hayel Saeed Anam Group', 
        nameAr: 'مجموعة هائل سعيد أنعم', 
        tax: 'YE2001547892',
        country: 'Yemen',
        city: 'Taiz',
        owner: null,
        customerType: 'Partnership'
      },
      { 
        name: 'Emirates Refreshments Company', 
        nameAr: 'شركة الإمارات للمرطبات', 
        tax: 'AE7004521789',
        country: 'United Arab Emirates',
        city: null,
        owner: 'Dubai Investments PJSC',
        customerType: 'Joint Stock Company'
      },
      { 
        name: 'Mezzan Holding', 
        nameAr: 'شركة مزان القابضة', 
        tax: 'KW5478932156',
        country: 'Kuwait',
        city: 'Ahmadi',
        owner: null,
        customerType: null
      },
      { 
        name: 'Herfy Food Services', 
        nameAr: 'شركة هرفي للخدمات الغذائية', 
        tax: 'SA1010012673',
        country: 'Saudi Arabia',
        city: null,
        owner: 'Ahmed Al-Sayed',
        customerType: 'Joint Stock Company'
      },
      { 
        name: 'Tanmiah Food Company', 
        nameAr: 'شركة تنمية الغذائية', 
        tax: 'SA2050098765',
        country: 'Saudi Arabia',
        city: 'Khobar',
        owner: null,
        customerType: 'Limited Liability Company'
      },
      { 
        name: 'Oman Refreshment Company', 
        nameAr: 'شركة المرطبات العمانية', 
        tax: 'OM1010556677',
        country: 'Oman',
        city: null,
        owner: 'Khimji Ramdas Group',
        customerType: null
      },
      { 
        name: 'IFFCO Group', 
        nameAr: 'مجموعة إيفكو', 
        tax: 'AE9874563210',
        country: 'United Arab Emirates',
        city: 'Sharjah',
        owner: null,
        customerType: 'Cooperative'
      }
    ];
    
    const sourceSystems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByD'];
    const preferredLanguages = ['Arabic', 'English', 'Both'];
    
    const salesOrgMapping = {
      'Saudi Arabia': 'HSA Saudi Arabia 2000',
      'United Arab Emirates': 'HSA UAE 3000',
      'Yemen': 'HSA Yemen 4000',
      'Kuwait': 'HSA Kuwait 5000',
      'Oman': 'HSA Oman 6000'
    };
    
    const distributionChannels = ['Modern Trade', 'Traditional Trade', 'HoReCa', 'B2B', 'Key Accounts'];
    const divisions = ['Food Products', 'Beverages', 'Dairy and Cheese', 'Frozen Products', 'Snacks and Confectionery'];
    
    const transaction = db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO requests (
          id, firstName, firstNameAr, tax, 
          CustomerType, CompanyOwner, country, city,
          ContactName, EmailAddress, MobileNumber,
          JobTitle, Landline,
          buildingNumber, street,
          SalesOrgOption, DistributionChannelOption, DivisionOption,
          PrefferedLanguage,
          status, assignedTo, origin, sourceSystem,
          requestType, originalRequestType, 
          notes, createdBy, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const createdIds = [];
      const jobTitles = ['Sales Manager', 'Operations Manager', 'Finance Manager', 'Procurement Manager'];
      
      companies.forEach((company, index) => {
        const id = nanoid(8);
        
        // استخدم نفس التوقيت للـ record creation والـ workflow
        const recordTimestamp = new Date().toISOString();
        
        const salesOrg = company.country && Math.random() > 0.4 ? salesOrgMapping[company.country] : null;
        const hasContact = Math.random() > 0.4;
        const hasAddress = Math.random() > 0.3;
        const hasSalesInfo = Math.random() > 0.5;
        
        insertStmt.run(
          id,
          company.name,
          company.nameAr,
          company.tax,
          company.customerType,
          company.owner,
          company.country,
          company.city,
          hasContact ? `${company.name.split(' ')[0]} Contact` : null,
          hasContact ? `info@${company.name.toLowerCase().replace(/\s+/g, '').substring(0, 10)}.com` : null,
          hasContact ? `+966${Math.floor(500000000 + Math.random() * 100000000)}` : null,
          hasContact ? jobTitles[index % jobTitles.length] : null,
          hasContact && Math.random() > 0.5 ? `+9661${Math.floor(1000000 + Math.random() * 9000000)}` : null,
          hasAddress ? Math.floor(100 + Math.random() * 900).toString() : null,
          hasAddress ? 'Industrial Area' : null,
          hasSalesInfo ? salesOrg : null,
          hasSalesInfo && Math.random() > 0.3 ? distributionChannels[index % distributionChannels.length] : null,
          hasSalesInfo && Math.random() > 0.3 ? divisions[index % divisions.length] : null,
          hasContact ? preferredLanguages[index % 3] : null,
          'Quarantine',
          'data_entry',
          'quarantine',
          sourceSystems[index % 3],
          'quarantine',
          'quarantine',
          `Incomplete record from ${sourceSystems[index % 3]} - Missing: ${
            [
              !company.owner && 'Company Owner',
              !company.city && 'City',
              !company.customerType && 'Customer Type',
              !hasContact && 'Contact Details',
              !hasAddress && 'Address Information',
              !hasSalesInfo && 'Sales Organization Data'
            ].filter(Boolean).join(', ')
          }`,
          'system_import',
          recordTimestamp // استخدم نفس التوقيت
        );
        
        createdIds.push(id);
        
        // أضف التوقيت كـ parameter أخير
        logWorkflow(id, 'IMPORTED_TO_QUARANTINE', null, 'Quarantine', 
                   'system', 'system', 
                   `Incomplete food company record imported from ${sourceSystems[index % 3]}`,
                   { 
                     operation: 'import_quarantine',
                     sourceSystem: sourceSystems[index % 3],
                     country: company.country,
                     missingFields: [
                       !company.owner && 'CompanyOwner',
                       !company.city && 'City',
                       !company.customerType && 'CustomerType',
                       !hasContact && 'ContactDetails',
                       !hasAddress && 'AddressInfo',
                       !hasSalesInfo && 'SalesOrganization'
                     ].filter(Boolean)
                   },
                   recordTimestamp // نفس التوقيت للـ workflow
        );
      });
      
      return createdIds;
    });
    
    const createdIds = transaction();
    
    console.log(`[ADMIN] Generated ${createdIds.length} quarantine records for food companies`);
    
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
    console.log('[ADMIN] POST /api/requests/admin/generate-duplicates');
    
    const sourceSystems = ['Oracle Forms', 'SAP S/4HANA', 'SAP ByD'];
    const customerTypes = ['Limited Liability Company', 'Joint Stock Company', 'Partnership', 'Wholesale Distributor'];
    const salesOrgs = ['HSA Saudi Arabia 2000', 'HSA UAE 3000', 'HSA Yemen 4000'];
    const distributionChannels = ['Modern Trade', 'Traditional Trade', 'HoReCa', 'Key Accounts', 'B2B'];
    const divisions = ['Food Products', 'Beverages', 'Dairy and Cheese', 'Frozen Products', 'Snacks and Confectionery'];
    const preferredLanguages = ['Arabic', 'English', 'Both'];
    
    const duplicateGroups = [
      {
        baseName: 'Saudia Dairy & Foodstuff Company',
        baseNameAr: 'شركة سدافكو',
        tax: 'SA1010011533',
        country: 'Saudi Arabia',
        variations: [
          { 
            name: 'Saudia Dairy & Foodstuff Company (SADAFCO)',
            nameAr: 'الشركة السعودية لمنتجات الألبان والأغذية سدافكو',
            city: 'Jeddah',
            owner: 'Hamza Mohammed Khashoggi',
            contact: 'Ahmed Al-Zahrani',
            email: 'info@sadafco.com',
            mobile: '+966501234567',
            street: 'Industrial City Phase 4',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'Modern Trade',
            division: 'Dairy and Cheese'
          },
          { 
            name: 'SADAFCO',
            nameAr: 'سدافكو',
            city: 'Riyadh',
            owner: 'H. Khashoggi',
            contact: 'Mohammed Al-Ghamdi',
            email: 'sales@sadafco.sa',
            mobile: '+966507654321',
            street: 'Second Industrial Area',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'Traditional Trade',
            division: 'Dairy and Cheese'
          },
          { 
            name: 'Saudia Dairy Foods',
            nameAr: 'منتجات الألبان السعودية',
            city: 'Jeddah',
            owner: 'Hamza Khashoggi',
            contact: null,
            email: 'contact@saudiadairy.com',
            mobile: '+966509876543',
            street: 'Industrial Zone',
            salesOrg: null,
            distChannel: 'HoReCa',
            division: 'Dairy and Cheese'
          },
          { 
            name: 'Saudi Dairy & Food Co',
            nameAr: 'شركة الألبان السعودية',
            city: 'Dammam',
            owner: null,
            contact: 'Khalid Al-Otaibi',
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
        baseName: 'Mondelez Arabia',
        baseNameAr: 'مونديليز العربية',
        tax: 'SA2050556677',
        country: 'Saudi Arabia',
        variations: [
          { 
            name: 'Mondelez Arabia for Food Industries',
            nameAr: 'مونديليز العربية للصناعات الغذائية',
            city: 'Dammam',
            owner: 'Mondelez International',
            contact: 'Faisal Al-Harbi',
            email: 'info@mdlz-arabia.com',
            mobile: '+966551234567',
            street: 'Second Industrial City',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'Key Accounts',
            division: 'Snacks and Confectionery'
          },
          { 
            name: 'Mondelez Saudi Arabia',
            nameAr: 'مونديليز السعودية',
            city: 'Riyadh',
            owner: 'Mondelez Int.',
            contact: 'Abdullah Al-Rasheed',
            email: 'sales@mondelez.sa',
            mobile: '+966557654321',
            street: 'King Fahd Road',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'Modern Trade',
            division: 'Snacks and Confectionery'
          },
          { 
            name: 'Mondelez Arabia Ltd',
            nameAr: 'شركة مونديليز العربية المحدودة',
            city: 'Jeddah',
            owner: null,
            contact: 'Omar Hassan',
            email: null,
            mobile: '+966559876543',
            street: 'Industrial Area 3',
            salesOrg: null,
            distChannel: 'Traditional Trade',
            division: null
          }
        ]
      },
      {
        baseName: 'Binzagr Company',
        baseNameAr: 'شركة بن زقر',
        tax: 'SA1010015474',
        country: 'Saudi Arabia',
        variations: [
          { 
            name: 'Binzagr Company for Distribution',
            nameAr: 'شركة بن زقر للتوزيع',
            city: 'Jeddah',
            owner: 'Abdullah Binzagr',
            contact: 'Saeed Al-Maliki',
            email: 'info@binzagr.com',
            mobile: '+966561234567',
            street: 'Al-Hamra District',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'B2B',
            division: 'Food Products'
          },
          { 
            name: 'Binzagr Co.',
            nameAr: 'بن زقر',
            city: 'Riyadh',
            owner: 'A. Binzagr',
            contact: null,
            email: 'contact@binzagr.sa',
            mobile: '+966567654321',
            street: null,
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: null,
            division: 'Food Products'
          },
          { 
            name: 'Abdullah Binzagr Trading',
            nameAr: 'عبدالله بن زقر للتجارة',
            city: 'Mecca',
            owner: 'Binzagr Family',
            contact: 'Majed Al-Shahrani',
            email: null,
            mobile: '+966569876543',
            street: 'Commercial District',
            salesOrg: null,
            distChannel: 'Traditional Trade',
            division: 'Beverages'
          }
        ]
      },
      {
        baseName: 'Al Rabie Saudi Foods',
        baseNameAr: 'الربيع السعودية للأغذية',
        tax: 'SA1010087142',
        country: 'Saudi Arabia',
        variations: [
          { 
            name: 'Al Rabie Saudi Foods Co. Ltd.',
            nameAr: 'شركة الربيع السعودية للأغذية المحدودة',
            city: 'Riyadh',
            owner: 'Savola Group',
            contact: 'Hassan Al-Qahtani',
            email: 'info@alrabie.com',
            mobile: '+966571234567',
            street: 'Exit 5, Eastern Ring Road',
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'Modern Trade',
            division: 'Beverages'
          },
          { 
            name: 'Al Rabie Foods',
            nameAr: 'أغذية الربيع',
            city: 'Jeddah',
            owner: 'Savola',
            contact: 'Ali Al-Dosari',
            email: 'sales@alrabie.sa',
            mobile: '+966577654321',
            street: null,
            salesOrg: 'HSA Saudi Arabia 2000',
            distChannel: 'HoReCa',
            division: null
          },
          { 
            name: 'Rabie Saudi Foods Company',
            nameAr: 'شركة ربيع الأغذية السعودية',
            city: 'Dammam',
            owner: null,
            contact: null,
            email: 'contact@rabiefoods.com',
            mobile: '+966579876543',
            street: 'Industrial City',
            salesOrg: null,
            distChannel: null,
            division: 'Beverages'
          }
        ]
      }
    ];
    
    const transaction = db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO requests (
          id, firstName, firstNameAr, tax,
          CustomerType, CompanyOwner, 
          buildingNumber, street, country, city,
          ContactName, EmailAddress, MobileNumber,
          JobTitle, Landline, PrefferedLanguage,
          SalesOrgOption, DistributionChannelOption, DivisionOption,
          status, assignedTo, origin, sourceSystem,
          requestType, originalRequestType,
          confidence, notes, createdBy, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const createdIds = [];
      
      duplicateGroups.forEach((group, groupIndex) => {
        group.variations.forEach((variation, index) => {
          const id = nanoid(8);
          
          // استخدم نفس التوقيت للـ record creation والـ workflow
          const recordTimestamp = new Date().toISOString();
          
          let confidence = 0.95;
          if (!variation.owner) confidence -= 0.15;
          if (!variation.contact) confidence -= 0.10;
          if (!variation.email) confidence -= 0.10;
          if (!variation.street) confidence -= 0.05;
          if (!variation.salesOrg) confidence -= 0.10;
          if (!variation.distChannel) confidence -= 0.05;
          
          const jobTitles = ['Sales Manager', 'General Manager', 'Operations Manager', 'Marketing Manager', 'Finance Manager'];
          
          insertStmt.run(
            id,
            variation.name,
            variation.nameAr,
            group.tax,
            customerTypes[index % customerTypes.length],
            variation.owner,
            variation.street ? Math.floor(100 + Math.random() * 900).toString() : null,
            variation.street,
            group.country,
            variation.city,
            variation.contact,
            variation.email,
            variation.mobile,
            variation.contact ? jobTitles[index % jobTitles.length] : null,
            variation.contact ? `+9661${Math.floor(1000000 + Math.random() * 9000000)}` : null,
            variation.email ? preferredLanguages[index % 3] : null,
            variation.salesOrg,
            variation.distChannel,
            variation.division,
            'Duplicate',
            'data_entry',
            'duplicate',
            sourceSystems[index % 3],
            'duplicate',
            'duplicate',
            confidence,
            `Potential duplicate - Same tax number ${group.tax}, confidence: ${(confidence * 100).toFixed(0)}%`,
            'system_import',
            recordTimestamp // استخدم نفس التوقيت
          );
          
          createdIds.push(id);
          
          // أضف التوقيت كـ parameter أخير
          logWorkflow(id, 'DUPLICATE_DETECTED', null, 'Duplicate', 
                     'system', 'system', 
                     `Duplicate detected from ${sourceSystems[index % 3]} - Tax: ${group.tax}`,
                     { 
                       operation: 'duplicate_detection',
                       taxNumber: group.tax,
                       sourceSystem: sourceSystems[index % 3],
                       confidence: confidence,
                       groupSize: group.variations.length,
                       missingFields: [
                         !variation.owner && 'Owner',
                         !variation.contact && 'Contact',
                         !variation.email && 'Email',
                         !variation.street && 'Street',
                         !variation.salesOrg && 'SalesOrganization',
                         !variation.distChannel && 'DistributionChannel',
                         !variation.division && 'Division'
                       ].filter(Boolean)
                     },
                     recordTimestamp // نفس التوقيت للـ workflow
          );
        });
      });
      
      return createdIds;
    });
    
    const createdIds = transaction();
    
    console.log(`[ADMIN] Generated ${createdIds.length} duplicate records in ${duplicateGroups.length} groups`);
    
    res.json({
      success: true,
      message: `Generated ${createdIds.length} duplicate records in ${duplicateGroups.length} groups`,
      recordIds: createdIds,
      groups: duplicateGroups.length
    });
    
  } catch (error) {
    console.error('[ADMIN] Error generating duplicate data:', error);
    res.status(500).json({ error: 'Failed to generate duplicate data' });
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
  console.log(`\n✅ Ready with all fixes and enhancements!`);
  console.log(`\n✅ FIXED: Reject endpoint now properly assigns quarantine records to data_entry`);
  console.log(`\n✨ ADMIN ENDPOINTS AVAILABLE:`);
  console.log(`   GET  /api/requests/admin/data-stats - Get data statistics`);
  console.log(`   DELETE /api/requests/admin/clear-all - Clear all data`);
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
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nClosing database...');
  db.close();
  console.log('Goodbye!');
  process.exit(0);
});