# Database Schema & Complete API Reference
## Last Updated: October 2025

---

## 📊 Database Schema

### Database Information
- **Database Type**: SQLite 3
- **Mode**: WAL (Write-Ahead Logging)
- **Location**: `api/mdm_database.db`
- **Total Tables**: 9 core tables + 3 sync tables = **12 tables**
- **Indexes**: 15+ optimized indexes for performance

---

## 🗄️ Core Tables

### 1. **users** - User Management
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('data_entry', 'reviewer', 'compliance', 'admin', 'manager')),
  fullName TEXT,
  email TEXT,
  isActive INTEGER DEFAULT 1,
  profilePicture TEXT,                    -- NEW: Profile picture path
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Manage system users with role-based access control

**Key Features**:
- ✅ Role-based access (5 roles)
- ✅ Profile picture support
- ✅ Active/Inactive status
- ✅ Timestamp tracking

**Default Users**:
```
Username: data_entry | Password: pass123 | Role: data_entry
Username: reviewer    | Password: pass123 | Role: reviewer
Username: compliance  | Password: pass123 | Role: compliance
Username: admin       | Password: admin123 | Role: admin
Username: manager     | Password: manager123 | Role: manager
```

---

### 2. **requests** - Main Customer Data
```sql
CREATE TABLE requests (
  id TEXT PRIMARY KEY,                    -- Unique request ID (nanoid)
  requestId TEXT,                         -- Display request number
  
  -- Company Information
  firstName TEXT,                         -- Company name (English)
  firstNameAr TEXT,                       -- Company name (Arabic)
  tax TEXT,                               -- Tax registration number
  CustomerType TEXT,                      -- Customer type
  CompanyOwner TEXT,                      -- Company owner name
  
  -- Address Information
  buildingNumber TEXT,
  street TEXT,
  country TEXT,
  city TEXT,
  
  -- Contact Information (Legacy - now in contacts table)
  ContactName TEXT,
  EmailAddress TEXT,
  MobileNumber TEXT,
  JobTitle TEXT,
  Landline TEXT,
  PrefferedLanguage TEXT,
  
  -- Sales Information
  SalesOrgOption TEXT,                    -- Sales organization
  DistributionChannelOption TEXT,         -- Distribution channel
  DivisionOption TEXT,                    -- Division
  
  -- Status & Workflow
  status TEXT DEFAULT 'Pending',          -- Request status
  ComplianceStatus TEXT,                  -- Compliance status
  companyStatus TEXT,                     -- Company status
  assignedTo TEXT DEFAULT 'reviewer',     -- Assigned user role
  
  -- Rejection/Block Information
  rejectReason TEXT,
  blockReason TEXT,
  IssueDescription TEXT,
  
  -- System Fields
  origin TEXT DEFAULT 'dataEntry',        -- Origin system
  sourceSystem TEXT DEFAULT 'Data Steward',
  isGolden INTEGER DEFAULT 0,             -- Golden record flag
  goldenRecordCode TEXT,                  -- Golden record code
  
  -- User Tracking
  createdBy TEXT,                         -- Created by username
  reviewedBy TEXT,                        -- Reviewed by username
  complianceBy TEXT,                      -- Compliance by username
  
  -- Timestamps
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  
  -- Duplicate Linking & Golden Edit Support
  masterId TEXT,                          -- Master record ID
  isMaster INTEGER DEFAULT 0,             -- Is master record flag
  confidence REAL,                        -- Confidence score
  sourceGoldenId TEXT,                    -- Source golden record ID
  notes TEXT,                             -- Additional notes
  
  -- Master Record Builder Support
  builtFromRecords TEXT,                  -- JSON: Source record IDs
  selectedFieldSources TEXT,              -- JSON: Field source mapping
  buildStrategy TEXT,                     -- Build strategy
  
  -- Merge Support
  isMerged INTEGER DEFAULT 0,             -- Merged flag
  mergedIntoId TEXT,                      -- Merged into record ID
  
  -- Request Type
  requestType TEXT,                       -- Request type
  originalRequestType TEXT,               -- Original request type
  
  -- Sync Support
  syncStatus TEXT,                        -- Sync status
  lastSyncedAt DATETIME                   -- Last sync timestamp
);
```

**Indexes**:
```sql
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_tax ON requests(tax);
CREATE INDEX idx_requests_assigned ON requests(assignedTo);
CREATE INDEX idx_requests_golden ON requests(isGolden);
CREATE INDEX idx_requests_created ON requests(createdAt);
CREATE INDEX idx_requests_master ON requests(masterId);
```

**Key Features**:
- ✅ Comprehensive customer data
- ✅ Multi-stage workflow support
- ✅ Duplicate detection and linking
- ✅ Master record building
- ✅ Golden record management
- ✅ External system sync tracking

---

### 3. **contacts** - Contact Information
```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requestId TEXT NOT NULL,                -- Foreign key to requests
  name TEXT,                              -- Contact person name
  nameAr TEXT,                            -- Contact person name (Arabic)
  jobTitle TEXT,                          -- Job title
  jobTitleAr TEXT,                        -- Job title (Arabic)
  email TEXT,                             -- Email address
  mobile TEXT,                            -- Mobile number
  landline TEXT,                          -- Landline number
  preferredLanguage TEXT,                 -- Preferred language
  isPrimary INTEGER DEFAULT 0,            -- Primary contact flag
  addedBy TEXT,                           -- Added by username
  addedWhen DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
);
```

**Indexes**:
```sql
CREATE INDEX idx_contacts_request ON contacts(requestId);
CREATE INDEX idx_contacts_primary ON contacts(isPrimary);
```

**Key Features**:
- ✅ Multiple contacts per request
- ✅ Primary contact designation
- ✅ Multi-language support
- ✅ Audit trail (added by/when)

---

### 4. **documents** - Document Management
```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requestId TEXT NOT NULL,                -- Foreign key to requests
  fileName TEXT NOT NULL,                 -- Stored file name
  originalName TEXT,                      -- Original file name
  filePath TEXT NOT NULL,                 -- File path on server
  fileSize INTEGER,                       -- File size in bytes
  mimeType TEXT,                          -- MIME type
  documentType TEXT,                      -- Document type/category
  description TEXT,                       -- Document description
  uploadedBy TEXT,                        -- Uploaded by username
  uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
);
```

**Indexes**:
```sql
CREATE INDEX idx_documents_request ON documents(requestId);
CREATE INDEX idx_documents_uploaded ON documents(uploadedAt);
```

**Key Features**:
- ✅ Multiple documents per request
- ✅ Document metadata tracking
- ✅ File type categorization
- ✅ Audit trail

---

### 5. **workflow_history** - Workflow Tracking
```sql
CREATE TABLE workflow_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requestId TEXT NOT NULL,                -- Foreign key to requests
  action TEXT NOT NULL,                   -- Action performed
  fromStatus TEXT,                        -- Previous status
  toStatus TEXT,                          -- New status
  performedBy TEXT,                       -- Performed by username
  comments TEXT,                          -- Action comments
  payload TEXT,                           -- Additional data (JSON)
  performedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
);
```

**Indexes**:
```sql
CREATE INDEX idx_workflow_request ON workflow_history(requestId);
CREATE INDEX idx_workflow_performed ON workflow_history(performedAt);
```

**Key Features**:
- ✅ Complete audit trail
- ✅ Status change tracking
- ✅ User action history
- ✅ Detailed payload storage

---

### 6. **issues** - Issue Tracking
```sql
CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requestId TEXT NOT NULL,                -- Foreign key to requests
  issueType TEXT NOT NULL,                -- Issue type/category
  description TEXT,                       -- Issue description
  severity TEXT DEFAULT 'medium',         -- Severity level
  status TEXT DEFAULT 'open',             -- Issue status
  assignedTo TEXT,                        -- Assigned to username
  createdBy TEXT,                         -- Created by username
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolvedAt DATETIME,                    -- Resolution timestamp
  resolved INTEGER DEFAULT 0,             -- Resolved flag
  FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
);
```

**Indexes**:
```sql
CREATE INDEX idx_issues_request ON issues(requestId);
CREATE INDEX idx_issues_status ON issues(status);
```

**Key Features**:
- ✅ Issue tracking per request
- ✅ Severity levels
- ✅ Assignment and resolution tracking
- ✅ Status management

---

### 7. **⭐ notifications** - Notification System (NEW)
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,                    -- Unique notification ID
  userId TEXT NOT NULL,                   -- Target user ID
  companyName TEXT NOT NULL,              -- Company name for context
  status TEXT NOT NULL CHECK(status IN ('rejected', 'approved', 'pending', 'quarantine')),
  message TEXT NOT NULL,                  -- Notification message
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  isRead INTEGER DEFAULT 0,               -- Read status
  taskId TEXT NOT NULL,                   -- Related task ID
  userRole TEXT NOT NULL CHECK(userRole IN ('data-entry', 'reviewer', 'compliance')),
  requestType TEXT NOT NULL CHECK(requestType IN ('new', 'review', 'compliance')),
  fromUser TEXT,                          -- From user
  toUser TEXT,                            -- To user (display name)
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE INDEX idx_notifications_user ON notifications(userId);
CREATE INDEX idx_notifications_read ON notifications(isRead);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);
CREATE INDEX idx_notifications_task ON notifications(taskId);
```

**Key Features**:
- ✅ User-specific notifications
- ✅ Read/unread tracking
- ✅ Task-based notifications
- ✅ Role-based routing
- ✅ Company name for context

**Notification Flow**:
```
Data Entry submits request → Notify Reviewer (userId=2)
Reviewer approves → Notify Compliance (userId=3)
Reviewer rejects → Notify Data Entry (userId=1)
```

---

## 🔄 Sync Tables

### 8. **sync_rules** - Synchronization Rules
```sql
CREATE TABLE sync_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                     -- Rule name
  description TEXT,                       -- Rule description
  targetSystem TEXT NOT NULL,             -- Target system (e.g., SAP)
  syncDirection TEXT DEFAULT 'outbound',  -- Sync direction
  filterCriteria TEXT,                    -- Filter criteria (JSON)
  fieldMapping TEXT,                      -- Field mapping (JSON)
  isActive INTEGER DEFAULT 1,             -- Active status
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdBy TEXT,                         -- Created by username
  updatedAt DATETIME,
  updatedBy TEXT                          -- Updated by username
);
```

---

### 9. **sync_operations** - Sync Operations
```sql
CREATE TABLE sync_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ruleId INTEGER,                         -- Foreign key to sync_rules
  targetSystem TEXT NOT NULL,             -- Target system
  syncType TEXT,                          -- Sync type
  status TEXT,                            -- Operation status
  totalRecords INTEGER DEFAULT 0,         -- Total records
  syncedRecords INTEGER DEFAULT 0,        -- Synced records count
  failedRecords INTEGER DEFAULT 0,        -- Failed records count
  startedAt DATETIME,                     -- Start timestamp
  completedAt DATETIME,                   -- Completion timestamp
  executedBy TEXT,                        -- Executed by username
  errorDetails TEXT,                      -- Error details (JSON)
  FOREIGN KEY (ruleId) REFERENCES sync_rules(id)
);
```

**Indexes**:
```sql
CREATE INDEX idx_sync_operations_rule ON sync_operations(ruleId);
CREATE INDEX idx_sync_operations_status ON sync_operations(status);
CREATE INDEX idx_sync_operations_started ON sync_operations(startedAt);
```

---

### 10. **sync_records** - Individual Sync Records
```sql
CREATE TABLE sync_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operationId INTEGER NOT NULL,           -- Foreign key to sync_operations
  requestId TEXT NOT NULL,                -- Foreign key to requests
  targetSystem TEXT NOT NULL,             -- Target system
  syncStatus TEXT,                        -- Sync status
  targetRecordId TEXT,                    -- Target system record ID
  syncedAt DATETIME,                      -- Sync timestamp
  errorMessage TEXT,                      -- Error message
  responseData TEXT,                      -- Response data (JSON)
  FOREIGN KEY (operationId) REFERENCES sync_operations(id),
  FOREIGN KEY (requestId) REFERENCES requests(id)
);
```

**Indexes**:
```sql
CREATE INDEX idx_sync_records_operation ON sync_records(operationId);
CREATE INDEX idx_sync_records_request ON sync_records(requestId);
```

---

## 📡 Complete API Reference (80+ Endpoints)

### Base URL
```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

---

## 🔐 Authentication APIs

### 1. Login
```http
POST /api/login
```
**Request Body**:
```json
{
  "username": "data_entry",
  "password": "pass123"
}
```
**Response**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "data_entry",
    "role": "data_entry",
    "fullName": "Data Entry User"
  }
}
```

### 2. Get Current User
```http
GET /api/auth/me
```
**Response**:
```json
{
  "id": 1,
  "username": "data_entry",
  "role": "data_entry",
  "fullName": "Data Entry User",
  "email": "data@company.com",
  "profilePicture": "/uploads/profile-123.png"
}
```

---

## 📋 Request Management APIs

### 3. Get All Requests
```http
GET /api/requests
```
**Query Parameters**:
- `status` - Filter by status
- `assignedTo` - Filter by assigned role
- `isGolden` - Filter golden records (0/1)
- `limit` - Limit results
- `offset` - Pagination offset

**Response**:
```json
{
  "requests": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### 4. Get Single Request
```http
GET /api/requests/:id
```
**Response**:
```json
{
  "id": "req_123",
  "firstName": "ABC Company",
  "tax": "123456789",
  "status": "Pending",
  "contacts": [...],
  "documents": [...],
  "workflowHistory": [...]
}
```

### 5. Create New Request
```http
POST /api/requests
```
**Request Body**:
```json
{
  "firstName": "ABC Company",
  "firstNameAr": "شركة ABC",
  "tax": "123456789",
  "CustomerType": "Corporate",
  "CompanyOwner": "John Doe",
  "buildingNumber": "123",
  "street": "Main Street",
  "country": "Egypt",
  "city": "Cairo",
  "SalesOrgOption": "egypt_cairo_office",
  "DistributionChannelOption": "direct_sales",
  "DivisionOption": "food_products",
  "contacts": [
    {
      "name": "Ahmed Mohamed",
      "email": "ahmed@abc.com",
      "mobile": "+201234567890",
      "jobTitle": "Sales Manager",
      "preferredLanguage": "Arabic"
    }
  ],
  "documents": [
    {
      "name": "commercial-registration.pdf",
      "type": "egypt_commercial_register",
      "description": "Commercial Registration Certificate",
      "contentBase64": "base64_encoded_content",
      "size": 102400,
      "mime": "application/pdf"
    }
  ],
  "createdBy": "data_entry",
  "status": "Pending",
  "assignedTo": "reviewer"
}
```
**Response**:
```json
{
  "success": true,
  "id": "req_new_123",
  "message": "Request created successfully"
}
```

### 6. Update Request
```http
PUT /api/requests/:id
```
**Request Body**: Same as Create Request
**Response**:
```json
{
  "success": true,
  "message": "Request updated successfully"
}
```

### 7. Delete Request
```http
DELETE /api/requests/:id
```
**Response**:
```json
{
  "success": true,
  "message": "Request deleted successfully"
}
```

---

## ✅ Workflow APIs

### 8. Approve Request (Reviewer)
```http
POST /api/requests/:id/approve
```
**Request Body**:
```json
{
  "reviewedBy": "reviewer",
  "comments": "Approved for compliance review"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Request approved and forwarded to compliance"
}
```

### 9. Reject Request (Reviewer)
```http
POST /api/requests/:id/reject
```
**Request Body**:
```json
{
  "rejectReason": "Incomplete information",
  "reviewedBy": "reviewer"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Request rejected and returned to data entry"
}
```

### 10. Compliance Approve
```http
POST /api/requests/:id/compliance/approve
```
**Request Body**:
```json
{
  "complianceBy": "compliance",
  "comments": "Final approval granted"
}
```
**Response**:
```json
{
  "success": true,
  "goldenRecordCode": "GOLD_2025_001",
  "message": "Request approved and golden record created"
}
```

### 11. Compliance Block
```http
POST /api/requests/:id/compliance/block
```
**Request Body**:
```json
{
  "blockReason": "Regulatory compliance issue",
  "complianceBy": "compliance"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Request blocked by compliance"
}
```

---

## 🔍 Duplicate Detection APIs

### 12. Check Duplicate
```http
POST /api/requests/check-duplicate
```
**Request Body**:
```json
{
  "tax": "123456789",
  "CustomerType": "Corporate"
}
```
**Response (Duplicate Found)**:
```json
{
  "isDuplicate": true,
  "message": "A customer with this tax number and type already exists in golden records.",
  "existingRecord": {
    "id": "req_123",
    "firstName": "ABC Company",
    "tax": "123456789",
    "CustomerType": "Corporate",
    "country": "Egypt",
    "city": "Cairo",
    "status": "Active"
  }
}
```
**Response (No Duplicate)**:
```json
{
  "isDuplicate": false,
  "message": "No duplicate found"
}
```

### 13. Get Duplicate Records
```http
GET /api/duplicates
```
**Response**:
```json
{
  "duplicates": [
    {
      "masterId": "master_123",
      "records": [
        {"id": "req_001", "firstName": "ABC Company", "confidence": 0.95},
        {"id": "req_002", "firstName": "ABC Co", "confidence": 0.85}
      ]
    }
  ]
}
```

### 14. Get Quarantine Records
```http
GET /api/duplicates/quarantine
```
**Response**:
```json
{
  "quarantineRecords": [
    {
      "id": "req_quar_123",
      "firstName": "XYZ Company",
      "status": "Quarantine",
      "reason": "Potential duplicate"
    }
  ]
}
```

### 15. Complete Quarantine Record
```http
POST /api/requests/:id/complete-quarantine
```
**Request Body**:
```json
{
  "action": "approve",
  "updatedBy": "reviewer"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Quarantine record processed successfully"
}
```

### 16. Merge Duplicates
```http
POST /api/duplicates/merge
```
**Request Body**:
```json
{
  "masterId": "req_master_123",
  "duplicateIds": ["req_001", "req_002"],
  "mergeStrategy": "keep_master",
  "performedBy": "admin"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Duplicates merged successfully",
  "mergedRecordId": "req_master_123"
}
```

### 17. Build Master Record
```http
POST /api/duplicates/build-master
```
**Request Body**:
```json
{
  "sourceRecordIds": ["req_001", "req_002"],
  "selectedFields": {
    "firstName": "req_001",
    "tax": "req_001",
    "country": "req_002",
    "city": "req_002"
  },
  "buildStrategy": "manual_selection",
  "performedBy": "reviewer"
}
```
**Response**:
```json
{
  "success": true,
  "masterId": "req_master_new_123",
  "message": "Master record built successfully"
}
```

---

## 📊 Dashboard & Analytics APIs

### 18. Get Statistics
```http
GET /api/stats
```
**Response**:
```json
{
  "totalRequests": 500,
  "pendingRequests": 45,
  "approvedRequests": 320,
  "rejectedRequests": 35,
  "goldenRecords": 280,
  "quarantineRecords": 20
}
```

### 19. Executive Dashboard Stats
```http
GET /api/dashboard/executive-stats
```
**Response**:
```json
{
  "overview": {
    "totalRequests": 500,
    "goldenRecords": 280,
    "activeRecords": 250,
    "blockedRecords": 15
  },
  "trends": {
    "requestsThisMonth": 45,
    "requestsLastMonth": 38,
    "growthRate": 18.4
  },
  "qualityMetrics": {
    "dataCompleteness": 92.5,
    "approvalRate": 85.2,
    "averageProcessingTime": "2.3 days"
  }
}
```

### 20. Technical Dashboard Stats
```http
GET /api/dashboard/technical-stats
```
**Response**:
```json
{
  "systemHealth": {
    "dbSize": "45 MB",
    "totalRecords": 500,
    "activeConnections": 3
  },
  "performance": {
    "avgResponseTime": "45ms",
    "slowQueries": 2,
    "errorRate": 0.1
  }
}
```

### 21. Analytics - Count
```http
GET /api/analytics/count
```
**Query Parameters**:
- `groupBy` - Group by field (status, country, etc.)
**Response**:
```json
{
  "counts": [
    {"label": "Egypt", "count": 180},
    {"label": "Saudi Arabia", "count": 150},
    {"label": "UAE", "count": 100}
  ]
}
```

### 22. Analytics - Trend
```http
GET /api/analytics/trend
```
**Response**:
```json
{
  "trend": [
    {"date": "2025-10-01", "count": 15},
    {"date": "2025-10-02", "count": 18},
    {"date": "2025-10-03", "count": 12}
  ]
}
```

---

## ⭐ Notification APIs (NEW)

### 23. Get Notifications
```http
GET /api/notifications
```
**Query Parameters**:
- `userId` - Filter by user ID
- `isRead` - Filter by read status (0/1)
**Response**:
```json
{
  "notifications": [
    {
      "id": "notif_123",
      "companyName": "ABC Company",
      "message": "New request awaits your review",
      "timestamp": "2025-10-08T10:30:00Z",
      "isRead": 0,
      "taskId": "req_123",
      "userRole": "reviewer"
    }
  ],
  "unreadCount": 5
}
```

### 24. Create Notification
```http
POST /api/notifications
```
**Request Body**:
```json
{
  "userId": "2",
  "companyName": "ABC Company",
  "status": "pending",
  "message": "New request awaits your review",
  "taskId": "req_123",
  "userRole": "reviewer",
  "requestType": "review",
  "fromUser": "Data Entry",
  "toUser": "Reviewer"
}
```
**Response**:
```json
{
  "success": true,
  "id": "notif_new_123",
  "message": "Notification created successfully"
}
```

### 25. Mark Notification as Read
```http
PUT /api/notifications/:id/read
```
**Response**:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 26. Mark All as Read
```http
PUT /api/notifications/read-all
```
**Query Parameters**:
- `userId` - User ID
**Response**:
```json
{
  "success": true,
  "updatedCount": 5,
  "message": "All notifications marked as read"
}
```

### 27. Delete Notification
```http
DELETE /api/notifications/:id
```
**Response**:
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### 28. Get Unread Count
```http
GET /api/notifications/unread-count
```
**Query Parameters**:
- `userId` - User ID
**Response**:
```json
{
  "unreadCount": 5
}
```

---

## 👤 User Management APIs

### 29. Get All Users
```http
GET /api/users
```
**Response**:
```json
{
  "users": [
    {
      "id": 1,
      "username": "data_entry",
      "role": "data_entry",
      "fullName": "Data Entry User",
      "email": "data@company.com",
      "isActive": 1
    }
  ]
}
```

### 30. Get User by ID
```http
GET /api/users/:id
```
**Response**:
```json
{
  "id": 1,
  "username": "data_entry",
  "role": "data_entry",
  "fullName": "Data Entry User",
  "email": "data@company.com",
  "profilePicture": "/uploads/profile-123.png",
  "isActive": 1
}
```

### 31. Create User
```http
POST /api/users
```
**Request Body**:
```json
{
  "username": "new_user",
  "password": "pass123",
  "role": "data_entry",
  "fullName": "New User",
  "email": "new@company.com"
}
```
**Response**:
```json
{
  "success": true,
  "id": 6,
  "message": "User created successfully"
}
```

### 32. Update User
```http
PUT /api/users/:id
```
**Request Body**:
```json
{
  "fullName": "Updated Name",
  "email": "updated@company.com",
  "isActive": 1
}
```
**Response**:
```json
{
  "success": true,
  "message": "User updated successfully"
}
```

### 33. Update Password
```http
PUT /api/users/:id/password
```
**Request Body**:
```json
{
  "currentPassword": "old_pass",
  "newPassword": "new_pass"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### 34. Delete User
```http
DELETE /api/users/:id
```
**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 35. Upload Profile Picture
```http
POST /api/users/upload-avatar
```
**Content-Type**: `multipart/form-data`
**Form Data**:
- `avatar` - Image file
- `userId` - User ID

**Response**:
```json
{
  "success": true,
  "profilePicture": "/uploads/profile-123456.png",
  "message": "Profile picture uploaded successfully"
}
```

---

## 🔄 Sync APIs

### 36. Get Sync Rules
```http
GET /api/sync/rules
```
**Response**:
```json
{
  "rules": [
    {
      "id": 1,
      "name": "SAP Sync Rule",
      "targetSystem": "SAP",
      "syncDirection": "outbound",
      "isActive": 1
    }
  ]
}
```

### 37. Create Sync Rule
```http
POST /api/sync/rules
```
**Request Body**:
```json
{
  "name": "SAP Sync Rule",
  "description": "Sync golden records to SAP",
  "targetSystem": "SAP",
  "syncDirection": "outbound",
  "filterCriteria": {"isGolden": 1},
  "fieldMapping": {
    "firstName": "CUSTOMER_NAME",
    "tax": "TAX_NUMBER"
  },
  "createdBy": "admin"
}
```
**Response**:
```json
{
  "success": true,
  "id": 1,
  "message": "Sync rule created successfully"
}
```

### 38. Execute Sync Operation
```http
POST /api/sync/execute
```
**Request Body**:
```json
{
  "ruleId": 1,
  "executedBy": "admin"
}
```
**Response**:
```json
{
  "success": true,
  "operationId": 10,
  "message": "Sync operation started",
  "totalRecords": 50
}
```

### 39. Get Sync Operations
```http
GET /api/sync/operations
```
**Response**:
```json
{
  "operations": [
    {
      "id": 10,
      "ruleId": 1,
      "status": "completed",
      "totalRecords": 50,
      "syncedRecords": 48,
      "failedRecords": 2,
      "startedAt": "2025-10-08T10:00:00Z",
      "completedAt": "2025-10-08T10:15:00Z"
    }
  ]
}
```

### 40. Get Eligible Records for Sync
```http
GET /api/sync/eligible-records
```
**Query Parameters**:
- `ruleId` - Sync rule ID
**Response**:
```json
{
  "eligibleRecords": [
    {
      "id": "req_123",
      "firstName": "ABC Company",
      "isGolden": 1,
      "syncStatus": null
    }
  ],
  "count": 25
}
```

---

## 🛠️ Admin Management APIs (NEW)

### 41. Get Data Statistics
```http
GET /api/requests/admin/data-stats
```
**Response**:
```json
{
  "totalRequests": 500,
  "goldenRecords": 280,
  "duplicateRecords": 45,
  "quarantineRecords": 20,
  "syncRecords": 180,
  "normalRequests": 155,
  "expectedTotal": 680
}
```

### 42. Clear All Data
```http
DELETE /api/requests/admin/clear-all
```
**Response**:
```json
{
  "success": true,
  "message": "All data cleared successfully (users and sync rules retained)"
}
```
**Note**: This endpoint clears:
- ✅ sync_records
- ✅ sync_operations
- ✅ notifications
- ✅ workflow_history
- ✅ issues
- ✅ documents
- ✅ contacts
- ✅ requests

### 43. Clear Sync Data
```http
DELETE /api/requests/admin/clear-sync
```
**Response**:
```json
{
  "success": true,
  "message": "Sync data cleared successfully"
}
```

### 44. Clear Specific Data Type
```http
DELETE /api/requests/admin/clear-:dataType
```
**Path Parameters**:
- `dataType` - One of: `duplicates`, `quarantine`, `golden`, `requests`

**Response**:
```json
{
  "success": true,
  "message": "Duplicate data cleared successfully",
  "clearedCount": 45
}
```

### 45. Generate Quarantine Data (Testing)
```http
POST /api/requests/admin/generate-quarantine
```
**Response**:
```json
{
  "success": true,
  "message": "Generated 40 quarantine records successfully",
  "generated": 40
}
```

### 46. Generate Duplicate Data (Testing)
```http
POST /api/requests/admin/generate-duplicates
```
**Response**:
```json
{
  "success": true,
  "message": "Generated 60 duplicate records successfully",
  "generated": 60
}
```

---

## 🔍 Debug & Monitoring APIs

### 47. Get Source Systems
```http
GET /api/debug/source-systems
```
**Response**:
```json
{
  "sourceSystems": [
    {"sourceSystem": "Data Steward", "count": 450},
    {"sourceSystem": "Import", "count": 30},
    {"sourceSystem": "API", "count": 20}
  ]
}
```

### 48. Get Duplicate Counts
```http
GET /api/debug/duplicate-counts
```
**Response**:
```json
{
  "duplicateCount": 45,
  "linkedCount": 12,
  "masterCount": 8
}
```

### 49. Get Workflow Distribution
```http
GET /api/dashboard/workflow-distribution
```
**Response**:
```json
{
  "distribution": [
    {"status": "Pending", "count": 45},
    {"status": "Approved", "count": 320},
    {"status": "Rejected", "count": 35}
  ]
}
```

### 50. Get Activity Feed
```http
GET /api/dashboard/activity-feed
```
**Response**:
```json
{
  "activities": [
    {
      "id": 1,
      "action": "Request Created",
      "user": "data_entry",
      "timestamp": "2025-10-08T10:30:00Z",
      "details": "Created request for ABC Company"
    }
  ]
}
```

---

## 📊 Data Lineage APIs

### 51. Get Request Lineage
```http
GET /api/requests/:id/lineage
```
**Response**:
```json
{
  "lineage": [
    {
      "id": "req_original_123",
      "action": "Created",
      "timestamp": "2025-10-01T10:00:00Z",
      "user": "data_entry"
    },
    {
      "id": "req_original_123",
      "action": "Approved",
      "timestamp": "2025-10-02T14:00:00Z",
      "user": "reviewer"
    },
    {
      "id": "req_original_123",
      "action": "Golden Record Created",
      "timestamp": "2025-10-03T09:00:00Z",
      "user": "compliance"
    }
  ]
}
```

### 52. Get Workflow History
```http
GET /api/requests/:id/history
```
**Response**:
```json
{
  "history": [
    {
      "id": 1,
      "action": "status_change",
      "fromStatus": "Pending",
      "toStatus": "Approved",
      "performedBy": "reviewer",
      "comments": "Looks good",
      "performedAt": "2025-10-02T14:00:00Z"
    }
  ]
}
```

---

## 🏥 Health Check API

### 53. Health Check
```http
GET /api/health
```
**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": "5 days",
  "version": "1.0.0"
}
```

---

## 📝 Summary

### Total APIs: **80+ endpoints**

**By Category**:
- Authentication: 2 APIs
- Request Management: 7 APIs
- Workflow: 4 APIs
- Duplicate Detection: 6 APIs
- Dashboard & Analytics: 12 APIs
- Notifications: 6 APIs (NEW)
- User Management: 7 APIs
- Sync Operations: 5 APIs
- Admin Management: 6 APIs (NEW)
- Debug & Monitoring: 4 APIs
- Data Lineage: 2 APIs
- Health Check: 1 API

### Key Features:
- ✅ RESTful design principles
- ✅ Comprehensive error handling
- ✅ Pagination support
- ✅ Filter and search capabilities
- ✅ Audit trail tracking
- ✅ Role-based access control
- ✅ Transaction support
- ✅ Real-time notifications


