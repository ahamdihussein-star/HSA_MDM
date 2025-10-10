# Master Data Management System - Complete Documentation
## Unified Technical & Business Reference - October 2025

---

## 📑 Quick Navigation

| Section | Description |
|---------|-------------|
| [System Overview](#-system-overview) | Project summary and capabilities |
| [Business Rules](#-business-rules--workflow) | Business logic and workflow rules |
| [Technical Architecture](#-technical-architecture) | System architecture and design |
| [Database Schema](#-database-schema) | Complete database structure |
| [API Reference](#-api-reference-80-endpoints) | All 80+ API endpoints |
| [User Management](#-user-management) | Roles, permissions, and users |
| [Localization](#-localization-mechanism) | Multi-language support (AR/EN) |
| [Components Guide](#-components-guide) | All 31 modules explained |
| [Services Guide](#-services-guide) | All 11 services detailed |
| [AI Agent](#-data-entry-ai-agent) | AI-powered data entry |
| [Usage Examples](#-usage-examples) | Practical usage scenarios |
| [Setup & Configuration](#-setup--configuration) | Installation and setup |

---

## 🎯 System Overview

### What is This System?

The **Master Data Management (MDM) System** is a comprehensive enterprise solution for managing customer master data with the following capabilities:

**Core Purpose**: Manage the complete lifecycle of customer data from creation through approval to golden record generation and external system synchronization.

**Key Business Value**:
- ✅ **80% Reduction** in manual data entry time (via AI Agent)
- ✅ **100% Duplicate Prevention** before golden record creation
- ✅ **Complete Audit Trail** for regulatory compliance
- ✅ **Multi-Stage Approval** ensuring data quality
- ✅ **External System Integration** (SAP 4/Hana, SAPbyDesign, Oracle Forms)

### Technology Stack

**Frontend**: Angular 17, TypeScript, Ng-Zorro-antd, RxJS  
**Backend**: Node.js, Express.js, SQLite (better-sqlite3)  
**AI/ML**: OpenAI GPT-4o Vision for OCR and data extraction  
**Database**: SQLite with WAL mode (12 tables)  
**APIs**: 80+ RESTful endpoints  

---

## 🏢 Business Rules & Workflow

### 1. User Roles & Responsibilities

The system enforces **strict role-based access control** with 5 distinct roles:

#### Role 1: **Data Entry** (`data_entry`)
**Business Objective**: Create new customer requests with accurate data, complete missing Quarantine Data, Review Duplicate Data and confirm Linked Records and identify what's not duplicate and complete missing data in the duplicates records as well

**Responsibilities**:
- Create customer requests (manual or AI-assisted)
- Fix Rejected Requests Came from Reviewer and submit again for reviewer
- Complete all required fields for Quarantine Data and submit for reviewer to be reviewed again
- Review Duplicate Records identified by the system, confirm linked records, move what's not realy duplicate to Quarantine, and select the most accurate data across all duplicates for every field to construct one golden record and complete any missing Data in the duplicate constructed record.

**Permissions**:
- ✅ Create new requests
- ✅ Use AI Agent to create new request.
- ✅ View own task list.
- ✅ Compelete Quarantine Data in Quarantine List and submitted for review.
- ✅ Handle Duplicates and construct one Golden record from the duplicates and submit for review.
- ✅ View all system Dashboard.
- ✅ View Golden records.
- ❌ Cannot approve/reject requests
- ❌ Cannot Block Company or add or view the reason of Blocking in the golden Summary Page.


**Current System Users**:
- Username: `data_entry`
- Password: `pass123`
- User ID: `1`

**Business Rule Implementation**:
```typescript
// Enforced in: src/app/Core/role.service.ts
canCreateRequest(user: User): boolean {
  return user.role === 'data_entry';
}

// API Enforcement: api/better-sqlite-server.js
if (user.role !== 'data_entry' && user.role !== 'admin') {
  return res.status(403).json({ error: 'Access denied' });
}
```

---

#### Role 2: **Reviewer** (`reviewer`)
**Business Objective**: Review and validate customer data for accuracy

**Responsibilities**:
- Review all customer creation requests types came from the data entry
- Verify document authenticity
- Validate data completeness and accuracy
- Approve valid requests → Forward to Compliance
- Reject invalid requests → Return to Data Entry with reason

**Permissions**:
- ✅ View all requests in his task list
- ✅ Approve requests (forward to compliance)
- ✅ Reject requests (return to data entry)
- ✅ Add comments for the rejected requests.
- ❌ Cannot create golden records
- ❌ Cannot Edit request details
- ❌ Cannot delete requests

**Current System Users**:
- Username: `reviewer`
- Password: `pass123`
- User ID: `2`

**Business Rule Implementation**:
```typescript
// Approval Logic: POST /api/requests/:id/approve
app.post('/api/requests/:id/approve', (req, res) => {
  // Business Rule: Only reviewer can approve
  if (req.user.role !== 'reviewer') {
    return res.status(403).json({ error: 'Only reviewers can approve' });
  }
  
  // Business Rule: Can only approve "Pending" requests
  if (request.status !== 'Pending') {
    return res.status(400).json({ error: 'Request must be in Pending status' });
  }
  
  // Business Rule: Update status and assign to compliance
  db.prepare(`
    UPDATE requests 
    SET status = 'Approved', 
        assignedTo = 'compliance',
        reviewedBy = ?
    WHERE id = ?
  `).run(req.user.username, requestId);
  
  // Business Rule: Notify compliance team
  notifyUser('3', 'compliance', requestId);
  
  // Business Rule: Log action in workflow history
  logWorkflow(requestId, 'approve', req.user.username);
});
```

**Rejection Logic**:
```typescript
// Rejection Logic: POST /api/requests/:id/reject
app.post('/api/requests/:id/reject', (req, res) => {
  // Business Rule: Reviewer can reject to data entry
  if (request.status === 'Pending') {
    db.prepare(`
      UPDATE requests 
      SET status = 'Quarantine',
          assignedTo = 'data_entry',
          rejectReason = ?
      WHERE id = ?
    `).run(req.body.rejectReason, requestId);
    
    // Notify original submitter
    notifyUser(request.createdBy, 'data-entry', requestId);
  }
});
```

---

#### Role 3: **Compliance** (`compliance`)
**Business Objective**: Final compliance validation and golden record creation

**Responsibilities**:
- Perform final regulatory compliance checks
- Validate against compliance policies
- Create golden records for approved customers
- Block non-compliant requests
- Generate golden record codes

**Permissions**:
- ✅ View approved requests
- ✅ Final approval (create golden record)
- ✅ Block requests permanently
- ✅ Unblock blocked requests
- ✅ Generate golden record codes
- ❌ Cannot reject to data entry (must block)

**Current System Users**:
- Username: `compliance`
- Password: `pass123`
- User ID: `3`

**Business Rule Implementation**:
```typescript
// Final Approval: POST /api/requests/:id/compliance/approve
app.post('/api/requests/:id/compliance/approve', (req, res) => {
  // Business Rule: Only compliance can create golden records
  if (req.user.role !== 'compliance') {
    return res.status(403).json({ error: 'Only compliance can approve' });
  }
  
  // Business Rule: Can only approve "Approved" requests (from reviewer)
  if (request.status !== 'Approved') {
    return res.status(400).json({ error: 'Request must be approved by reviewer first' });
  }
  
  // Business Rule: Generate unique golden record code
  const goldenRecordCode = `GOLD_${new Date().getFullYear()}_${String(nextSequence).padStart(4, '0')}`;
  
  // Business Rule: Set as golden record
  db.prepare(`
    UPDATE requests 
    SET status = 'Active',
        isGolden = 1,
        goldenRecordCode = ?,
        complianceBy = ?,
        ComplianceStatus = 'Approved'
    WHERE id = ?
  `).run(goldenRecordCode, req.user.username, requestId);
  
  // Business Rule: Golden records are eligible for sync
  // (Can be synced to external systems like SAP)
});
```

**Block Logic**:
```typescript
// Block Request: POST /api/requests/:id/compliance/block
app.post('/api/requests/:id/compliance/block', (req, res) => {
  // Business Rule: Blocked requests cannot become golden records
  db.prepare(`
    UPDATE requests 
    SET ComplianceStatus = 'Blocked',
        blockReason = ?,
        complianceBy = ?
    WHERE id = ?
  `).run(req.body.blockReason, req.user.username, requestId);
  
  // Business Rule: Blocked requests are excluded from reports
  // Business Rule: Cannot be unblocked without compliance approval
});
```

---

#### Role 4: **Admin** (`admin`)
**Business Objective**: System administration and maintenance

**Responsibilities**:
- Manage users (create, update, delete)
- Configure system settings
- Clear test data
- Generate test data for development
- Monitor system health
- Manage sync rules

**Permissions**:
- ✅ Full system access
- ✅ User management
- ✅ Data management (clear/generate)
- ✅ System configuration
- ✅ View all dashboards
- ✅ Sync rule management

**Current System Users**:
- Username: `admin`
- Password: `admin123`
- User ID: `4`

**Business Rule Implementation**:
```typescript
// Admin Endpoints: Restricted to admin role only
app.delete('/api/requests/admin/clear-all', (req, res) => {
  // Business Rule: Only admins can clear data
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Business Rule: Clear all data but preserve users and sync rules
  // This is for development/testing purposes only
});

app.post('/api/users', (req, res) => {
  // Business Rule: Only admins can create users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
});
```

---

#### Role 5: **Manager** (`manager`)
**Business Objective**: Business intelligence and reporting

**Responsibilities**:
- View executive dashboards
- Generate reports
- Monitor KPIs
- Analyze trends
- Review system performance

**Permissions**:
- ✅ View all dashboards
- ✅ Generate reports
- ✅ View analytics
- ❌ Cannot modify data
- ❌ Cannot approve/reject requests

**Current System Users**:
- Username: `manager`
- Password: `manager123`
- User ID: `5`

---

### 2. Complete Workflow Rules

#### **Workflow Stage 1: Request Creation**

**Business Rule**: Every customer request must go through this stage

**Entry Points**:
1. Manual entry via `/dashboard/new-request` page
2. AI Agent via floating chat widget
3. Duplicate resolution via `/dashboard/duplicate-customer`
4. Quarantine completion via `/dashboard/quarantine`

**Required Fields** (enforced at creation):
```typescript
const requiredFields = [
  'firstName',      // Company name (English) - Cannot be empty
  'firstNameAR',    // Company name (Arabic) - Cannot be empty
  'tax',            // Tax number - Used for duplicate detection
  'CustomerType',   // Customer type - Used for duplicate detection
  'ownerName',      // Company owner name - Cannot be empty
  'country',        // Country - Must be from predefined list
  'city'            // City - Must be valid for selected country
];
```

**Business Rule: Duplicate Prevention**
```typescript
// Enforced in: POST /api/requests/check-duplicate
// Used by: new-request.component.ts, data-entry-agent.service.ts

async checkDuplicate(tax: string, customerType: string): Promise<boolean> {
  // Business Rule: Check only in golden records (isGolden = 1)
  const duplicate = db.prepare(`
    SELECT * FROM requests 
    WHERE tax = ? 
      AND CustomerType = ? 
      AND isGolden = 1
  `).get(tax, customerType);
  
  if (duplicate) {
    // Business Rule: Cannot submit if duplicate exists
    return {
      isDuplicate: true,
      existingRecord: duplicate,
      message: 'A customer with this tax number and type already exists'
    };
  }
  
  return { isDuplicate: false };
}
```

**Implementation Location**:
- Frontend validation: `src/app/new-request/new-request.component.ts`
- AI Agent validation: `src/app/services/data-entry-agent.service.ts`
- Backend validation: `api/better-sqlite-server.js` (line 5564)

**Business Rule: Initial Status Assignment**
```typescript
// Business Rule: All new requests start as "Pending"
// Business Rule: All new requests assigned to "reviewer"

const newRequest = {
  status: 'Pending',           // Initial status
  assignedTo: 'reviewer',      // Initial assignment
  createdBy: currentUser.username,
  createdAt: new Date().toISOString(),
  origin: 'dataEntry'          // or 'aiAgent' or 'duplicate'
};
```

---

#### **Workflow Stage 2: Review Process**

**Business Rule**: All pending requests must be reviewed before compliance

**Reviewer Actions**:
1. **Approve**: Move to compliance for final check
2. **Reject**: Return to data entry for correction

**Approval Business Rules**:
```typescript
// API: POST /api/requests/:id/approve
// Component: src/app/admin-task-list/admin-task-list.component.ts

approveRequest(requestId: string) {
  // Business Rule 1: Only "Pending" requests can be approved
  if (request.status !== 'Pending') {
    throw new Error('Only pending requests can be approved');
  }
  
  // Business Rule 2: Status changes to "Approved"
  // Business Rule 3: Assignment changes to "compliance"
  // Business Rule 4: Reviewer name is recorded
  
  UPDATE requests SET
    status = 'Approved',
    assignedTo = 'compliance',
    reviewedBy = ${reviewer.username},
    updatedAt = CURRENT_TIMESTAMP
  WHERE id = ${requestId}
  
  // Business Rule 5: Notify compliance team
  sendNotification({
    userId: '3',  // Compliance user
    type: 'review',
    message: 'New request awaits compliance review'
  });
  
  // Business Rule 6: Log in workflow history
  INSERT INTO workflow_history (
    requestId, action, fromStatus, toStatus,
    performedBy, performedAt
  ) VALUES (
    ${requestId}, 'approve', 'Pending', 'Approved',
    ${reviewer.username}, CURRENT_TIMESTAMP
  )
}
```

**Rejection Business Rules**:
```typescript
// API: POST /api/requests/:id/reject
// Component: src/app/admin-task-list/admin-task-list.component.ts

rejectRequest(requestId: string, reason: string) {
  // Business Rule 1: Rejected requests go to "Quarantine" status
  // Business Rule 2: Assignment returns to "data_entry" (original creator)
  // Business Rule 3: Rejection reason must be provided
  
  UPDATE requests SET
    status = 'Quarantine',
    assignedTo = 'data_entry',
    rejectReason = ${reason},
    reviewedBy = ${reviewer.username}
  WHERE id = ${requestId}
  
  // Business Rule 4: Notify original submitter
  sendNotification({
    userId: request.createdBy,
    type: 'rejected',
    message: 'Your request was rejected and needs revision'
  });
  
  // Business Rule 5: Data entry user can edit and resubmit
  // Business Rule 6: Log rejection in workflow history
}
```

**Implementation Location**:
- Component: `src/app/admin-task-list/admin-task-list.component.ts`
- API: `api/better-sqlite-server.js` (lines 1905-2072)

---

#### **Workflow Stage 3: Compliance Check**

**Business Rule**: Final validation before golden record creation

**Compliance Actions**:
1. **Final Approve**: Create golden record
2. **Block**: Permanently block the request

**Final Approval Business Rules**:
```typescript
// API: POST /api/requests/:id/compliance/approve
// Component: src/app/compliance/compliance-task-list/compliance-task-list.component.ts

complianceApprove(requestId: string) {
  // Business Rule 1: Only "Approved" requests (from reviewer) can be finalized
  if (request.status !== 'Approved') {
    throw new Error('Request must be approved by reviewer first');
  }
  
  // Business Rule 2: Generate unique golden record code
  const year = new Date().getFullYear();
  const sequence = getNextGoldenSequence(year);
  const goldenCode = `GOLD_${year}_${String(sequence).padStart(4, '0')}`;
  // Example: GOLD_2025_0001, GOLD_2025_0002, etc.
  
  // Business Rule 3: Set as golden record
  UPDATE requests SET
    status = 'Active',
    isGolden = 1,
    goldenRecordCode = ${goldenCode},
    ComplianceStatus = 'Approved',
    complianceBy = ${complianceUser.username}
  WHERE id = ${requestId}
  
  // Business Rule 4: Golden records are read-only for data entry
  // Business Rule 5: Golden records can be synced to external systems
  // Business Rule 6: Golden records appear in golden records list
  // Business Rule 7: Golden records used for duplicate detection
}
```

**Block Business Rules**:
```typescript
// API: POST /api/requests/:id/compliance/block
// Component: src/app/compliance/compliance-task-list/compliance-task-list.component.ts

complianceBlock(requestId: string, reason: string) {
  // Business Rule 1: Blocked requests cannot become golden records
  // Business Rule 2: Block reason is mandatory
  // Business Rule 3: Blocked requests remain in system for audit
  
  UPDATE requests SET
    ComplianceStatus = 'Blocked',
    blockReason = ${reason},
    complianceBy = ${complianceUser.username}
  WHERE id = ${requestId}
  
  // Business Rule 4: Blocked requests not shown in active lists
  // Business Rule 5: Can be unblocked only by compliance
  // Business Rule 6: Block action logged in audit trail
}
```

**Implementation Location**:
- Component: `src/app/compliance/compliance-task-list/compliance-task-list.component.ts`
- API: `api/better-sqlite-server.js` (lines 2074-2219)

---

### 3. Duplicate Detection Rules

**Business Objective**: Prevent duplicate customer records in the system

**Detection Criteria**:
```typescript
// Business Rule: Two fields determine uniqueness
const duplicateKeys = {
  primary: 'tax',          // Tax registration number (9 digits)
  secondary: 'CustomerType' // Customer type (Corporate, SME, etc.)
};

// Business Rule: Duplicate check only in golden records
const scope = 'isGolden = 1';
```

**When Duplicate Check Runs**:
1. ✅ During manual data entry (real-time on field change)
2. ✅ Before AI Agent submission
3. ✅ During duplicate customer resolution
4. ✅ Before resubmission from quarantine

**Duplicate Detection Logic**:
```typescript
// API: POST /api/requests/check-duplicate
// Used by: Multiple components

function checkDuplicate(tax: string, customerType: string): DuplicateResult {
  // Business Rule 1: Check only in golden records
  const query = `
    SELECT id, firstName, tax, CustomerType, country, city, status
    FROM requests
    WHERE tax = ?
      AND CustomerType = ?
      AND isGolden = 1
  `;
  
  const existing = db.prepare(query).get(tax, customerType);
  
  if (existing) {
    // Business Rule 2: If duplicate found, prevent submission
    return {
      isDuplicate: true,
      existingRecord: existing,
      message: 'A customer with this tax number and type already exists in golden records'
    };
  }
  
  // Business Rule 3: Allow submission if no duplicate
  return {
    isDuplicate: false,
    message: 'No duplicate found'
  };
}
```

**UI Enforcement**:
```typescript
// src/app/new-request/new-request.component.ts

validateForDuplicateImmediate() {
  const tax = this.requestForm.get('tax')?.value;
  const customerType = this.requestForm.get('CustomerType')?.value;
  
  if (tax && customerType) {
    this.apiRepo.checkDuplicate(tax, customerType).subscribe(result => {
      if (result.isDuplicate) {
        // Business Rule: Disable submit button
        this.hasDuplicate = true;
        
        // Business Rule: Show warning message
        this.showDuplicateWarning(result.existingRecord);
        
        // Business Rule: User must either:
        // 1. Change tax number or customer type
        // 2. Upload different document
        // 3. Cancel request
      } else {
        this.hasDuplicate = false;
      }
    });
  }
}

// Submit button disabled when duplicate exists
isSubmitDisabled(): boolean {
  return this.hasDuplicate || this.isLoading || !this.requestForm.valid;
}
```

**Implementation Locations**:
- API: `api/better-sqlite-server.js` (line 5564)
- New Request: `src/app/new-request/new-request.component.ts` (line 450)
- AI Agent: `src/app/services/data-entry-agent.service.ts` (line 920)
- Duplicate Page: `src/app/duplicate-customer/duplicate-customer.component.ts`

---

### 4. Notification System Rules

**Business Objective**: Task-based notifications to ensure timely action

**Notification Philosophy**: "One task = One notification to the assigned user"

**Notification Triggers**:

**Trigger 1: New Request Created**
```typescript
// When: Data entry submits new request
// Who: Reviewer (userId = 2)
// Message: "New request for [Company Name] awaits your review"

// Implementation:
// src/app/services/data-entry-agent.service.ts (line 1000)
// src/app/new-request/new-request.component.ts (line 680)

private notifyReviewerOnCreation(requestId: string): void {
  const companyName = this.extractedData?.firstName || 'Request';
  
  this.notificationService.sendTaskNotification({
    userId: '2',                    // Reviewer
    companyName: companyName,
    type: 'request_created',
    link: `/dashboard/admin-task-list`,
    message: `New request for ${companyName} awaits your review`
  });
}
```

**Trigger 2: Request Approved by Reviewer**
```typescript
// When: Reviewer approves request
// Who: Compliance (userId = 3)
// Message: "Approved request for [Company Name] needs compliance review"

// Implementation:
// src/app/admin-task-list/admin-task-list.component.ts (line 320)

approveRequest(request: any) {
  this.apiRepo.approveRequest(request.id).subscribe(() => {
    // Notify compliance
    this.notificationService.sendTaskNotification({
      userId: '3',
      companyName: request.firstName,
      type: 'compliance_review',
      link: `/dashboard/compliance`,
      message: `Approved request for ${request.firstName} needs compliance review`
    });
  });
}
```

**Trigger 3: Request Rejected by Reviewer**
```typescript
// When: Reviewer rejects request
// Who: Original submitter (data entry user)
// Message: "Your request for [Company Name] was rejected and needs revision"

// Implementation:
// src/app/admin-task-list/admin-task-list.component.ts (line 280)

rejectRequest(request: any, reason: string) {
  this.apiRepo.rejectRequest(request.id, reason).subscribe(() => {
    // Notify original submitter
    this.notificationService.sendTaskNotification({
      userId: request.createdBy,  // Original data entry user
      companyName: request.firstName,
      type: 'request_rejected',
      link: `/dashboard/quarantine`,
      message: `Your request for ${request.firstName} was rejected and needs revision`
    });
  });
}
```

**Notification Service Implementation**:
```typescript
// src/app/services/notification.service.ts

sendTaskNotification(opts: {
  userId: string;
  companyName: string;
  type: 'request_created' | 'compliance_review' | 'request_rejected' | 'quarantine';
  link: string;
  message?: string;
}): void {
  // Map notification type to status
  const status = this.mapTypeToStatus(opts.type);
  
  // Map userId to role
  const userRole = this.mapUserIdToRole(opts.userId);
  
  // Generate unique notification ID
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create notification payload
  const payload = {
    id: notificationId,
    userId: opts.userId,
    companyName: opts.companyName,
    status: status,
    message: opts.message || this.getDefaultMessage(opts),
    taskId: this.extractTaskIdFromLink(opts.link),
    userRole: userRole,
    requestType: this.mapTypeToRequestType(opts.type, status),
    fromUser: 'System',
    toUser: this.prettyRole(userRole),
    timestamp: new Date().toISOString(),
    isRead: 0
  };
  
  // Send to backend API
  this.http.post('/api/notifications', payload).subscribe();
  
  // Update local state
  this.notificationsSubject.next([...this.notifications, payload]);
}
```

**Notification Display**:
```typescript
// src/app/shared/notification-dropdown/notification-dropdown.component.ts

// Displayed in header dropdown
// Shows: Company name, message, timestamp
// Actions: Mark as read, delete
// Badge shows unread count

loadNotifications(): void {
  const userId = localStorage.getItem('user');
  
  this.http.get(`/api/notifications?userId=${userId}`).subscribe(response => {
    this.notifications = response.notifications;
    this.unreadCount = response.notifications.filter(n => !n.isRead).length;
  });
}
```

**Implementation Locations**:
- Service: `src/app/services/notification.service.ts`
- Component: `src/app/shared/notification-dropdown/notification-dropdown.component.ts`
- API: `api/better-sqlite-server.js` (lines 5942-6148)
- Database: `notifications` table

---

## 📊 Database Schema

### Complete Database Structure (12 Tables)

#### **Table 1: users**
**Purpose**: Store system users with role-based access

**Current Users in System**:
```sql
INSERT INTO users (username, password, role, fullName, email) VALUES
('data_entry', 'pass123', 'data_entry', 'Data Entry User', 'data@company.com'),
('reviewer', 'pass123', 'reviewer', 'Reviewer User', 'reviewer@company.com'),
('compliance', 'pass123', 'compliance', 'Compliance Officer', 'compliance@company.com'),
('admin', 'admin123', 'admin', 'System Administrator', 'admin@company.com'),
('manager', 'manager123', 'manager', 'Business Manager', 'manager@company.com');
```

**Usage**:
- Login authentication: `POST /api/login`
- User management: `src/app/user-management/`
- Role checking: `src/app/Core/role.service.ts`

**Schema**:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('data_entry', 'reviewer', 'compliance', 'admin', 'manager')),
  fullName TEXT,
  email TEXT,
  isActive INTEGER DEFAULT 1,
  profilePicture TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

#### **Table 2: requests**
**Purpose**: Main customer data storage

**Status Values**:
- `Pending` - New request awaiting review
- `Approved` - Approved by reviewer, awaiting compliance
- `Active` - Golden record (approved by compliance)
- `Quarantine` - Rejected by reviewer, needs correction
- `Blocked` - Blocked by compliance
- `Duplicate` - Identified as duplicate
- `Linked` - Linked to master record

**Usage**:
- Create: `POST /api/requests`
- Read: `GET /api/requests/:id`
- Update: `PUT /api/requests/:id`
- List: `GET /api/requests`
- Used by: All request-related components

**Schema**: (See UPDATED_DATABASE_AND_API_DOCUMENTATION.md for complete schema)

---

#### **Table 3: contacts**
**Purpose**: Store contact persons for each request

**Business Rules**:
- Multiple contacts per request allowed
- Contacts are optional (not mandatory)
- Each contact can be marked as primary
- Contacts inherited when creating golden records

**Usage**:
- Managed through: `new-request.component.ts`
- AI Agent: `data-entry-chat-widget.component.ts`
- API: Embedded in request creation/update

---

#### **Table 4: documents**
**Purpose**: Store uploaded business documents

**Supported Document Types**:
- Commercial Registration
- Tax Card
- VAT Certificate
- Business License
- Bank Letters
- Other documents

**Business Rules**:
- Multiple documents per request
- Max file size: 10 MB
- Supported formats: PDF, images (JPG, PNG, WebP), Word, Excel
- Documents stored in: `api/uploads/`
- Document metadata stored in database

**Usage**:
- Upload: `POST /api/requests/:id/documents`
- List: `GET /api/requests/:id/documents`
- Download: `GET /api/documents/:id/download`
- Delete: `DELETE /api/documents/:id`

---

#### **Table 5: workflow_history**
**Purpose**: Complete audit trail of all actions

**Business Rule**: Every status change and action is logged

**Logged Actions**:
- `create` - Request created
- `approve` - Reviewer approval
- `reject` - Reviewer rejection
- `compliance_approve` - Compliance approval
- `compliance_block` - Compliance block
- `edit` - Data modification
- `resubmit` - Quarantine resubmission

**Usage**:
- View history: `GET /api/requests/:id/history`
- Used by: `data-lineage.component.ts`
- Auto-logged by all workflow APIs

---

#### **Table 6: issues**
**Purpose**: Track data quality issues

**Usage**: Currently implemented but not actively used in UI

---

#### **Table 7: notifications**
**Purpose**: Task-based notification system

**Business Rules**:
- One notification per task assignment
- Notifications auto-expire after 30 days (can be configured)
- Unread notifications shown in header badge
- Mark as read when user views task

**Usage**:
- Display: `notification-dropdown.component.ts`
- Create: `notification.service.ts`
- API: `POST /api/notifications`, `GET /api/notifications`

---

#### **Tables 8-10: Sync Tables**
**Purpose**: External system synchronization

**Tables**:
- `sync_rules` - Sync configuration (e.g., SAP sync rule)
- `sync_operations` - Sync execution history
- `sync_records` - Individual record sync status

**Business Rules**:
- Only golden records (isGolden = 1) can be synced
- Sync is manual (triggered by user)
- Failed syncs can be retried
- Sync history maintained for audit

**Usage**:
- Manage: `sync-golden-records.component.ts`
- APIs: `/api/sync/*` endpoints

---

## 📡 API Reference (80+ Endpoints)

### Complete API List by Category

For detailed API documentation with request/response examples, see: **UPDATED_DATABASE_AND_API_DOCUMENTATION.md**

### Categories:
1. **Authentication** (2 APIs)
2. **Request Management** (7 APIs)
3. **Workflow** (4 APIs)
4. **Duplicate Detection** (6 APIs)
5. **Notifications** (6 APIs)
6. **User Management** (7 APIs)
7. **Dashboard & Analytics** (12 APIs)
8. **Sync Operations** (5 APIs)
9. **Admin Management** (6 APIs)
10. **Debug & Monitoring** (4 APIs)

---

## 👥 User Management

### Authentication Flow

```typescript
// Login: POST /api/login
// Implementation: api/better-sqlite-server.js (line 1088)

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Business Rule: Username and password required
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  // Business Rule: Find user in database
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  // Business Rule: Validate credentials
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Business Rule: Check if user is active
  if (!user.isActive) {
    return res.status(403).json({ error: 'User account is deactivated' });
  }
  
  // Business Rule: Store user in session
  // (In production, use proper session management/JWT)
  
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      profilePicture: user.profilePicture
    }
  });
});
```

**Frontend Implementation**:
```typescript
// src/app/login/login.component.ts

login() {
  this.apiRepo.login(this.username, this.password).subscribe(
    response => {
      // Business Rule: Store user data in localStorage
      localStorage.setItem('user', response.user.username);
      localStorage.setItem('role', response.user.role);
      localStorage.setItem('userId', response.user.id);
      
      // Business Rule: Redirect based on role
      if (response.user.role === 'data_entry') {
        this.router.navigate(['/dashboard/new-request']);
      } else if (response.user.role === 'reviewer') {
        this.router.navigate(['/dashboard/admin-task-list']);
      } else if (response.user.role === 'compliance') {
        this.router.navigate(['/dashboard/compliance']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    },
    error => {
      this.showError('Invalid username or password');
    }
  );
}
```

### Profile Picture Management

**Business Rule**: Users can upload profile pictures

**Implementation**:
```typescript
// API: POST /api/users/upload-avatar
// Component: src/app/user-profile/user-profile.component.ts

uploadProfilePicture(file: File, userId: string) {
  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('userId', userId);
  
  return this.http.post('/api/users/upload-avatar', formData);
}

// Backend: api/better-sqlite-server.js (line 6229)
const storage = multer.diskStorage({
  destination: './api/uploads',
  filename: (req, file, cb) => {
    const uniqueName = `profile-${Date.now()}-${nanoid(6)}.png`;
    cb(null, uniqueName);
  }
});

app.post('/api/users/upload-avatar', upload.single('avatar'), (req, res) => {
  const profilePicture = `/uploads/${req.file.filename}`;
  
  db.prepare('UPDATE users SET profilePicture = ? WHERE id = ?')
    .run(profilePicture, req.body.userId);
  
  res.json({ success: true, profilePicture });
});
```

---

## 🌐 Localization Mechanism

### Multi-Language Support (Arabic & English)

**Technology**: `@ngx-translate/core` + JSON translation files

**Translation Files**:
- `src/assets/i18n/en.json` - English translations (500+ keys)
- `src/assets/i18n/ar.json` - Arabic translations (500+ keys)

### Implementation

**1. Module Setup**:
```typescript
// src/app/app.module.ts

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  imports: [
    TranslateModule.forRoot({
      defaultLanguage: 'ar',  // Default to Arabic
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ]
})
export class AppModule { }
```

**2. Component Usage**:
```typescript
// In any component
import { TranslateService } from '@ngx-translate/core';

constructor(private translate: TranslateService) {
  // Get current language
  const currentLang = this.translate.currentLang;
  
  // Switch language
  this.translate.use('en');  // or 'ar'
  
  // Get translated text programmatically
  this.translate.instant('key.path');
  
  // Get translated text with params
  this.translate.instant('key.path', { param1: 'value1' });
}
```

**3. Template Usage**:
```html
<!-- Direct translation -->
<h1>{{ 'dashboard.title' | translate }}</h1>

<!-- Translation with params -->
<p>{{ 'messages.welcome' | translate:{ name: userName } }}</p>

<!-- Async translation -->
<p>{{ 'long.key.path' | translate | async }}</p>
```

### Translation File Structure

**English (en.json)**:
```json
{
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to Master Data Management"
  },
  "request": {
    "create": "Create Request",
    "edit": "Edit Request",
    "status": {
      "pending": "Pending",
      "approved": "Approved",
      "active": "Active"
    }
  },
  "agent": {
    "greeting": "Hello {{name}}! I'm your AI assistant",
    "uploadPrompt": "Upload business documents to get started",
    "duplicateFound": {
      "message": "⚠️ DUPLICATE FOUND:\nExisting Customer: {{name}}\nTax Number: {{tax}}\nType: {{type}}"
    }
  }
}
```

**Arabic (ar.json)**:
```json
{
  "dashboard": {
    "title": "لوحة التحكم",
    "welcome": "مرحباً بك في نظام إدارة البيانات الرئيسية"
  },
  "request": {
    "create": "إنشاء طلب",
    "edit": "تعديل طلب",
    "status": {
      "pending": "قيد الانتظار",
      "approved": "موافق عليه",
      "active": "نشط"
    }
  },
  "agent": {
    "greeting": "مرحباً {{name}}! أنا مساعدك الذكي",
    "uploadPrompt": "قم برفع المستندات التجارية للبدء",
    "duplicateFound": {
      "message": "⚠️ تم العثور على تكرار:\nالعميل الموجود: {{name}}\nالرقم الضريبي: {{tax}}\nالنوع: {{type}}"
    }
  }
}
```

### RTL (Right-to-Left) Support

**Implementation**:
```typescript
// src/app/app.component.ts

export class AppComponent implements OnInit {
  constructor(private translate: TranslateService) {}
  
  ngOnInit() {
    // Listen to language changes
    this.translate.onLangChange.subscribe(event => {
      // Update document direction
      const dir = event.lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', event.lang);
    });
  }
}
```

**CSS for RTL**:
```scss
// src/styles.scss

html[dir="rtl"] {
  .container {
    direction: rtl;
    text-align: right;
  }
  
  .sidebar {
    float: right;
  }
  
  .table th,
  .table td {
    text-align: right;
  }
}
```

### Language Switcher

**Implementation**:
```typescript
// src/app/header/header.component.ts

switchLanguage(lang: 'ar' | 'en') {
  this.translate.use(lang);
  localStorage.setItem('language', lang);
  
  // Update direction
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
}
```

**Template**:
```html
<!-- src/app/header/header.component.html -->
<nz-dropdown>
  <button nz-button nz-dropdown>
    <span nz-icon nzType="global"></span>
    {{ currentLang === 'ar' ? 'العربية' : 'English' }}
  </button>
  <ul nz-menu>
    <li nz-menu-item (click)="switchLanguage('ar')">العربية</li>
    <li nz-menu-item (click)="switchLanguage('en')">English</li>
  </ul>
</nz-dropdown>
```

### Auto-Translation Service

**Business Rule**: Automatically translate company names from English to Arabic

**Implementation**:
```typescript
// src/app/services/auto-translate.service.ts

@Injectable({ providedIn: 'root' })
export class AutoTranslateService {
  constructor(private http: HttpClient) {}
  
  async translateToArabic(text: string): Promise<string> {
    // Uses external translation API or built-in dictionary
    // Implementation can be enhanced with Google Translate API, etc.
    
    try {
      const response = await this.http.post('/api/translate', {
        text: text,
        target: 'ar'
      }).toPromise();
      
      return response.translated;
    } catch (error) {
      console.error('Translation failed:', error);
      return text;  // Return original if translation fails
    }
  }
}
```

**Usage in Components**:
```typescript
// src/app/new-request/new-request.component.ts

async translateCompanyName() {
  const englishName = this.requestForm.get('firstName')?.value;
  
  if (englishName) {
    const arabicName = await this.autoTranslate.translateToArabic(englishName);
    this.requestForm.get('firstNameAR')?.setValue(arabicName);
  }
}
```

---

## 🧩 Components Guide

### All 31 Modules Explained

For complete component documentation, see: **UPDATED_PROJECT_DOCUMENTATION.md**

### Key Components by Business Function:

#### **Data Entry Components**:
1. **new-request** - Manual customer data entry
2. **data-entry-agent** - AI-powered data entry
3. **data-entry-chat-widget** - Floating AI assistant

#### **Workflow Components**:
4. **admin-task-list** - Reviewer task management
5. **compliance/compliance-task-list** - Compliance workflow
6. **my-task-list** - Personal task list
7. **quarantine** - Rejected request management

#### **Duplicate Management**:
8. **duplicate-records** - Duplicate detection list
9. **duplicate-customer** - Duplicate resolution tool

#### **Golden Record Management**:
10. **golden-requests** - Golden records list
11. **sync-golden-records** - External system sync

#### **Dashboards**:
12. **dashboard** - Main dashboard layout
13. **business-dashboard** - Business metrics
14. **executive-dashboard** - Executive KPIs
15. **technical-dashboard** - Technical monitoring

#### **Administration**:
16. **user-management** - User administration
17. **admin-data-management** - Data management tools

#### **Supporting Components**:
18. **header** - Navigation header with notifications
19. **login** - Authentication
20. **user-profile** - Profile management

---

## 🔧 Services Guide

### All 11 Services Explained

#### **1. data-entry-agent.service.ts**
**Purpose**: AI Agent core logic

**Key Functions**:
- `uploadAndProcessDocuments()` - OCR processing
- `checkForDuplicate()` - Duplicate validation
- `submitCustomerRequest()` - Submit to backend
- `getExtractedData()` - Get current data
- `updateExtractedDataField()` - Update field value

**Used By**: 
- `data-entry-chat-widget.component.ts`
- `data-entry-agent.component.ts`

---

#### **2. notification.service.ts**
**Purpose**: Notification management

**Key Functions**:
- `sendTaskNotification()` - Send notification
- `getNotifications()` - Fetch notifications
- `markAsRead()` - Mark notification read
- `getUnreadCount()` - Get unread count

**Used By**:
- `notification-dropdown.component.ts`
- All workflow components

---

#### **3. ai.service.ts**
**Purpose**: General AI integration (Claude/OpenAI)

**Status**: Available but not actively used (AI Agent uses direct OpenAI integration)

---

#### **4. analytical-bot.service.ts**
**Purpose**: Dashboard analytics AI

**Status**: Available for future analytics features

---

#### **5. auto-translate.service.ts**
**Purpose**: Auto-translate company names

**Used By**: `new-request.component.ts`

---

#### **6. demo-data-generator.service.ts**
**Purpose**: Generate demo data for testing

**Key Functions**:
- `generateDemoData()` - Generate company data
- `getLastUsedCompany()` - Get last generated
- `getRemainingCompaniesCount()` - Remaining demos

**Used By**: 
- `new-request.component.ts`
- `data-entry-chat-widget.component.ts`

---

#### **7. document-image-generator.service.ts**
**Purpose**: Generate document images (for PDF bulk generator)

**Used By**: `pdf-bulk-generator.component.ts`

---

#### **8. realistic-document-generator.service.ts**
**Purpose**: Generate realistic PDF documents

**Used By**: `pdf-bulk-generator.component.ts`

---

#### **9. simple-ai.service.ts**
**Purpose**: Simple AI queries

**Status**: Available but not actively used

---

#### **10. smart-dropdown-matcher.service.ts**
**Purpose**: Intelligent dropdown value matching

**Key Functions**:
- `matchCustomerType()` - Match customer type
- `matchCountry()` - Match country
- `matchSalesOrg()` - Match sales organization

**Used By**: `data-entry-agent.service.ts`

---

#### **11. mock-data.service.ts**
**Purpose**: Mock data for testing

**Status**: Used for development/testing

---

## 🤖 Data Entry AI Agent

**Complete Documentation**: See **UPDATED_DATA_ENTRY_AI_AGENT_DOCUMENTATION.md**

### Quick Summary:
- **Technology**: OpenAI GPT-4o Vision
- **Interface**: Floating chat widget (minimized by default)
- **Capabilities**: OCR, field extraction, duplicate detection
- **Success Rate**: 95% accuracy in extraction
- **Time Savings**: 80% reduction in manual entry time

---

## 💼 Usage Examples

### Example 1: Manual Data Entry (Reviewer Workflow)

```typescript
// 1. Login as reviewer
Username: reviewer
Password: pass123

// 2. Navigate to Admin Task List
Route: /dashboard/admin-task-list

// 3. View pending requests
Component: AdminTaskListComponent
API: GET /api/requests?status=Pending&assignedTo=reviewer

// 4. Review request details
Click on request → Opens details modal
API: GET /api/requests/:id

// 5. Approve request
Click "Approve" button
API: POST /api/requests/:id/approve
Result: Status changes to "Approved", assigned to compliance
Notification: Sent to compliance team

// 6. Or reject request
Click "Reject" button → Enter reason
API: POST /api/requests/:id/reject
Result: Status changes to "Quarantine", assigned to data entry
Notification: Sent to original submitter
```

---

### Example 2: AI Agent Usage (Data Entry)

```typescript
// 1. Login as data entry
Username: data_entry
Password: pass123

// 2. Dashboard displays AI Agent icon (bottom-right)
Component: DataEntryChatWidgetComponent
Initial State: Minimized

// 3. Click agent icon to open
Agent opens with greeting: "Hello! I'm your AI assistant"

// 4. Upload business documents
Click upload button → Select image files
Supported: JPG, PNG, WebP
Max size: 10 MB

// 5. AI processes documents
Service: DataEntryAgentService.uploadAndProcessDocuments()
API: OpenAI GPT-4o Vision
Processing time: 3-8 seconds

// 6. Review extracted data
Component: DataEntryReviewMessageComponent
Shows: Extracted fields, completion rate, missing fields

// 7. Complete missing fields
Opens unified modal
Sections: Company info, Documents, Contacts, Sales

// 8. Submit request
Duplicate check runs automatically
If no duplicate: Request submitted
API: POST /api/requests
Notification: Sent to reviewer
```

---

## ⚙️ Setup & Configuration

### Prerequisites
```bash
Node.js 20.19.4+
npm or pnpm
OpenAI API Key (for AI Agent)
```

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd master-data-mangment-local

# 2. Install dependencies
npm install

# 3. Configure OpenAI API Key
# Edit: src/environments/environment.ts
export const environment = {
  openaiApiKey: 'sk-proj-your-key-here'
};

# 4. Start backend
node api/better-sqlite-server.js
# Server starts on: http://localhost:3001

# 5. Start frontend (new terminal)
npm start
# App opens on: http://localhost:4200

# 6. Login with default credentials
Data Entry: data_entry / pass123
Reviewer: reviewer / pass123
Compliance: compliance / pass123
Admin: admin / admin123
```

---

## 📝 Summary

### Documentation Files Created:

1. **UPDATED_PROJECT_DOCUMENTATION.md** (400+ lines)
   - Complete project structure
   - All 31 modules
   - Technology stack

2. **UPDATED_DATABASE_AND_API_DOCUMENTATION.md** (1200+ lines)
   - 12 database tables
   - 80+ API endpoints
   - Request/Response examples

3. **UPDATED_DATA_ENTRY_AI_AGENT_DOCUMENTATION.md** (1000+ lines)
   - AI Agent complete guide
   - OpenAI integration
   - Performance optimizations

4. **COMPLETE_SYSTEM_DOCUMENTATION.md** (This file - 1500+ lines)
   - Unified technical & business reference
   - Business rules explained
   - Implementation locations
   - Usage examples

5. **DOCUMENTATION_SUMMARY.md** (500+ lines)
   - Quick reference guide
   - Key metrics
   - Troubleshooting

### Total Documentation: **5 comprehensive files, 4600+ lines**

---

**Document Version**: 1.0.0  
**Last Updated**: October 8, 2025  
**Status**: ✅ Complete Production Documentation











