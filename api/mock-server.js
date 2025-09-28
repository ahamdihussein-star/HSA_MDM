const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===== very simple request logger =====
app.use((req, res, next) => {
  const started = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (['POST','PUT','PATCH'].includes(req.method)) {
    try { console.log('  body =', JSON.stringify(req.body)); } catch {}
  }
  res.on('finish', () => {
    console.log(`  -> ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    ts: new Date().toISOString(),
    server: 'Mock API Server'
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = db.users.find(u => u.username === username && u.password === password);
    
    if (user) {
      res.json({
        success: true,
        user: {
          username: user.username,
          role: user.role
        },
        token: 'mock-token-' + username
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});


// In-memory DB (بتروح مع إعادة التشغيل)
const db = {
  requests: [],
  users: [
    { username: 'data_entry', password: 'pass123', role: 'data_entry' },
    { username: 'reviewer', password: 'pass123', role: 'reviewer' },
    { username: 'compliance', password: 'pass123', role: 'compliance' },
    { username: 'admin', password: 'admin123', role: 'admin' }
  ]
};

// Seed data بسيطة
for (let i = 1; i <= 3; i++) {
  db.requests.push({
    id: String(i),
    requestId: String(i),
    firstName: ['Unilever','Nestla Egypt','P&G'][i-1] || 'Customer ' + i,
    firstNameAr: 'عميل ' + i,
    tax: 'EG' + ('0000000000000' + i).slice(-14),
    buildingNumber: 'B' + i,
    street: 'Street ' + i,
    country: i % 2 ? 'Egypt' : 'Saudi Arabia',
    city: i % 2 ? 'Cairo' : 'Riyadh',
    CustomerType: 'limited_liability',
    CompanyOwner: 'Owner ' + i,
    SalesOrgOption: 'HSA Egypt – Local',
    DistributionChannelOption: 'Retail – بيع تجزئة',
    DivisionOption: 'FMCG – سلع استهلاكية سريعة الدوران',
    ContactName: 'Contact ' + i,
    EmailAddress: `c${i}@mail.com`,
    MobileNumber: '010000000' + i,
    JobTitle: 'Manager',
    Landline: '',
    PrefferedLanguage: 'English',
    contacts: [],
    documents: [],
    origin: 'dataEntry',
    sourceSystem: 'Data Steward',
    status: 'Pending',
    ComplianceStatus: null,
    createdAt: new Date().toISOString()
  });
}

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// List + Create
app.get('/api/requests', (req, res) => {
  res.json(db.requests);
});

app.post('/api/requests', (req, res) => {
  const body = req.body || {};
  const id = nanoid(8);
  const rec = {
    id,
    requestId: id,
    status: 'Pending',
    origin: body.origin || 'dataEntry',
    sourceSystem: body.sourceSystem || body.SourceSystem || 'Data Steward',
    createdAt: new Date().toISOString(),
    ...body
  };
  db.requests.unshift(rec);
  res.status(201).json(rec);
});

// Get one
app.get('/api/requests/:id', (req, res) => {
  const rec = db.requests.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ message: 'Not found' });
  res.json(rec);
});

// Update (put)
app.put('/api/requests/:id', (req, res) => {
  const idx = db.requests.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  db.requests[idx] = { ...db.requests[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json(db.requests[idx]);
});

// Master approve/reject
app.post('/api/requests/:id/approve', (req, res) => {
  const rec = db.requests.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ message: 'Not found' });
  rec.status = 'Approved';
  rec.updatedAt = new Date().toISOString();
  res.json({ ok: true });
});

app.post('/api/requests/:id/reject', (req, res) => {
  const rec = db.requests.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ message: 'Not found' });
  rec.status = 'Rejected';
  rec.rejectReason = (req.body && req.body.reason) || 'Rejected';
  rec.updatedAt = new Date().toISOString();
  res.json({ ok: true });
});

// Compliance approve/block
app.post('/api/requests/:id/compliance/approve', (req, res) => {
  const rec = db.requests.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ message: 'Not found' });
  rec.ComplianceStatus = 'Approved';
  rec.status = 'Approved';
  rec.updatedAt = new Date().toISOString();
  res.json({ ok: true });
});

app.post('/api/requests/:id/compliance/block', (req, res) => {
  const rec = db.requests.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ message: 'Not found' });
  rec.ComplianceStatus = 'Blocked';
  rec.blockReason = (req.body && req.body.reason) || 'Blocked';
  rec.status = 'Quarantined';
  rec.updatedAt = new Date().toISOString();
  res.json({ ok: true });
});

// Get workflow history for a request
app.get('/api/requests/:id/history', (req, res) => {
  const { id } = req.params;
  const request = db.requests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  // Mock workflow history
  const history = [
    {
      id: 1,
      requestId: id,
      action: 'CREATE',
      fromStatus: null,
      toStatus: 'Pending',
      performedBy: request.createdBy || 'system',
      performedByRole: 'data_entry',
      note: 'Request created',
      payload: JSON.stringify({
        operation: 'create',
        changes: null,
        requestType: 'new',
        documentsAdded: request.documents ? request.documents.length : 0,
        contactsAdded: request.contacts ? request.contacts.length : 0
      }),
      performedAt: request.createdAt || new Date().toISOString()
    }
  ];
  
  // Add update history if request was updated
  if (request.updatedAt) {
    const changes = [];
    
    // Check for field changes
    if (request.firstName && request.firstName !== 'Test Company') {
      changes.push({
        field: 'firstName',
        oldValue: 'Test Company',
        newValue: request.firstName
      });
    }
    
    // Check for document changes (only if documents exist and were actually changed)
    if (request.documents && request.documents.length > 0) {
      // For mock purposes, we'll only show document changes if they were actually modified
      // In a real implementation, this would compare old vs new documents
      // For now, we'll skip document changes in updates to avoid duplication
      // Documents are only logged during creation
    }
    
    // Only add update history if there are actual changes
    if (changes.length > 0) {
      history.push({
        id: 2,
        requestId: id,
        action: 'UPDATE',
        fromStatus: 'Pending',
        toStatus: 'Pending',
        performedBy: request.updatedBy || 'system',
        performedByRole: 'data_entry',
        note: 'Request updated',
        payload: JSON.stringify({
          changes: changes,
          updatedBy: request.updatedBy || 'system',
          updateReason: 'User update'
        }),
        performedAt: request.updatedAt
      });
    }
  }
  
  res.json(history);
});

app.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}/api`);
});
