# Master Data Management System - Complete Technical Documentation

## 📋 Table of Contents
1. [Database Schema Analysis](#database-schema-analysis)
2. [User Management System](#user-management-system)
3. [Complete Pages Documentation](#complete-pages-documentation)
4. [Function Documentation](#function-documentation)
5. [Business Logic Analysis](#business-logic-analysis)

---

## 🗄️ Database Schema Analysis

### Users Table - Complete Analysis
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('data_entry', 'reviewer', 'compliance', 'admin')),
  fullName TEXT,
  email TEXT,
  isActive INTEGER DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Current Users Data:**
```
1|admin|admin123|admin|System Administrator|admin@mdm.com|1|2025-08-30 12:56:15
2|data_entry|pass123|data_entry|Data Entry User|entry@mdm.com|1|2025-08-30 12:56:15
3|reviewer|pass123|reviewer|Data Reviewer|reviewer@mdm.com|1|2025-08-30 12:56:15
4|compliance|pass123|compliance|Compliance Officer|compliance@mdm.com|1|2025-08-30 12:56:15
5|manager|manager123|admin|Business Manager|manager@mdm.com|1|2025-09-19 09:48:43
```

**Attribute Analysis:**
- **id**: Primary key, auto-increment
- **username**: Unique identifier for login
- **password**: Hashed password for authentication
- **role**: User role with 4 possible values (data_entry, reviewer, compliance, admin)
- **fullName**: Display name for user interface
- **email**: Contact email for notifications
- **isActive**: Account status (1=active, 0=inactive)
- **createdAt**: Account creation timestamp

### Requests Table - Core Business Data
```sql
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  requestId TEXT,
  
  -- Company Information
  firstName TEXT,           -- Company name in English
  firstNameAr TEXT,         -- Company name in Arabic
  tax TEXT,                -- Tax identification number
  CustomerType TEXT,        -- Type of customer (LLC, JSC, etc.)
  CompanyOwner TEXT,        -- Company owner name
  
  -- Address Information
  buildingNumber TEXT,      -- Building number
  street TEXT,             -- Street address
  country TEXT,            -- Country name
  city TEXT,               -- City name
  
  -- Contact Information
  ContactName TEXT,         -- Primary contact person
  EmailAddress TEXT,        -- Contact email
  MobileNumber TEXT,        -- Mobile phone
  JobTitle TEXT,           -- Job title
  Landline TEXT,           -- Landline phone
  PrefferedLanguage TEXT,   -- Preferred language
  
  -- Sales Information
  SalesOrgOption TEXT,      -- Sales organization
  DistributionChannelOption TEXT, -- Distribution channel
  DivisionOption TEXT,      -- Business division
  
  -- Status & Workflow
  status TEXT DEFAULT 'Pending',     -- Request status
  ComplianceStatus TEXT,             -- Compliance status
  companyStatus TEXT,                -- Company status
  assignedTo TEXT DEFAULT 'reviewer', -- Assigned reviewer
  
  -- Rejection/Block Information
  rejectReason TEXT,        -- Reason for rejection
  blockReason TEXT,         -- Reason for blocking
  IssueDescription TEXT,    -- Issue description
  
  -- System Fields
  origin TEXT DEFAULT 'dataEntry',   -- Request origin
  sourceSystem TEXT DEFAULT 'Data Steward', -- Source system
  isGolden INTEGER DEFAULT 0,        -- Is golden record
  goldenRecordCode TEXT,             -- Golden record code
  
  -- User Tracking
  createdBy TEXT,           -- User who created
  reviewedBy TEXT,          -- User who reviewed
  complianceBy TEXT,        -- User who approved compliance
  
  -- Timestamps
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  
  -- Duplicate Management
  masterId TEXT,            -- Master record ID
  isMaster INTEGER DEFAULT 0, -- Is master record
  confidence REAL,          -- Duplicate confidence score
  sourceGoldenId TEXT,      -- Source golden record ID
  notes TEXT,               -- Additional notes
  
  -- Master Record Builder
  builtFromRecords TEXT,    -- Records used to build master
  selectedFieldSources TEXT, -- Field sources
  buildStrategy TEXT,       -- Build strategy
  
  -- Merge Support
  isMerged INTEGER DEFAULT 0, -- Is merged record
  mergedIntoId TEXT,        -- ID of record merged into
  
  -- Request Type
  requestType TEXT,         -- Type of request
  originalRequestType TEXT, -- Original request type
  
  -- Sync Information
  lastSyncedAt DATETIME,    -- Last sync timestamp
  syncStatus TEXT DEFAULT 'not_synced' -- Sync status
);
```

---

## 👥 User Management System

### User Roles & Business Logic

#### 1. **Data Entry User** (`data_entry`)
- **Purpose**: Create and manage customer data requests
- **Permissions**: 
  - Create new requests
  - Edit own requests (before review)
  - Upload documents
  - View own task list
- **Business Logic**: Entry point for all customer data
- **Workflow**: Create → Submit → Wait for Review

#### 2. **Reviewer** (`reviewer`)
- **Purpose**: Review and validate customer requests
- **Permissions**:
  - Review all pending requests
  - Approve or reject requests
  - Request additional information
  - Edit request details
- **Business Logic**: Quality control and validation
- **Workflow**: Review → Approve/Reject → Forward to Compliance

#### 3. **Compliance** (`compliance`)
- **Purpose**: Final compliance and regulatory checks
- **Permissions**:
  - Final approval authority
  - Block/Unblock records
  - Compliance status management
  - Regulatory checks
- **Business Logic**: Final authority for data approval
- **Workflow**: Compliance Check → Final Approval → Golden Record Creation

#### 4. **Admin** (`admin`)
- **Purpose**: System administration and management
- **Permissions**:
  - Full system access
  - User management
  - System configuration
  - Data management
- **Business Logic**: System oversight and administration
- **Workflow**: System Administration → Configuration → Monitoring

#### 5. **Manager** (`manager`)
- **Purpose**: Business management and reporting
- **Permissions**:
  - Business dashboard access
  - KPI monitoring
  - Executive reporting
  - Business analytics
- **Business Logic**: Business oversight and decision support
- **Workflow**: Business Monitoring → Analytics → Decision Support

---

## 📱 Complete Pages Documentation

### 1. **Login Page** (`/login`)

#### Component: `LoginComponent`
**File**: `src/app/login/login.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize login form and clear session
- **Business Logic**: 
  - Creates reactive form with username/password validation
  - Clears any existing session data
- **Usage**: Called when component initializes

##### `clearSession(): void`
- **Purpose**: Clear all session and local storage
- **Business Logic**: Ensures clean login state
- **Usage**: Called during initialization

##### `isDemoAdmin(username: string): boolean`
- **Purpose**: Check if user is demo admin
- **Business Logic**: 
  - Checks against demo admin usernames
  - Enables offline admin access
- **Usage**: Authentication bypass for demo

##### `onSubmit(): Promise<void>`
- **Purpose**: Handle login form submission
- **Business Logic**:
  - Validates form data
  - Checks for demo admin first
  - Performs API authentication
  - Sets user session data
  - Redirects based on user role
- **Usage**: Main login processing function

**Role-based Redirection Logic:**
- `data_entry` → `/dashboard/my-task`
- `reviewer` → `/dashboard/admin-task-list`
- `compliance` → `/dashboard/compliance-task-list`
- `admin` → `/dashboard/data-management`
- `manager` → `/dashboard/business`

### 2. **Dashboard Page** (`/dashboard`)

#### Component: `DashboardComponent`
**File**: `src/app/dashboard/dashboard.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize dashboard and load user data
- **Business Logic**: 
  - Loads current user information
  - Sets up role-based navigation
  - Initializes dashboard state
- **Usage**: Dashboard initialization

##### `loadCurrentUser(): void`
- **Purpose**: Load current user from session
- **Business Logic**: 
  - Retrieves user data from sessionStorage
  - Sets user role and permissions
  - Configures navigation menu
- **Usage**: User data management

##### `navigateToPage(page: string): void`
- **Purpose**: Navigate to specific dashboard page
- **Business Logic**: 
  - Validates user permissions
  - Navigates to requested page
  - Updates navigation state
- **Usage**: Page navigation

### 3. **New Request Page** (`/dashboard/new-request`)

#### Component: `NewRequestComponent`
**File**: `src/app/new-request/new-request.component.ts`

#### Functions Documentation:

##### `ngOnInit(): Promise<void>`
- **Purpose**: Initialize new request form
- **Business Logic**:
  - Creates reactive form with all required fields
  - Sets up form validation
  - Loads dropdown options
  - Initializes duplicate detection
- **Usage**: Form initialization

##### `createForm(): void`
- **Purpose**: Create reactive form with validation
- **Business Logic**:
  - Defines form controls with validators
  - Sets up conditional validation
  - Configures form state management
- **Usage**: Form structure creation

##### `loadDropdownOptions(): void`
- **Purpose**: Load dropdown options from API
- **Business Logic**:
  - Fetches country, city, customer type options
  - Caches options for performance
  - Handles API errors gracefully
- **Usage**: Form options loading

##### `onSubmit(): Promise<void>`
- **Purpose**: Handle form submission
- **Business Logic**:
  - Validates form data
  - Checks for duplicates
  - Submits request to API
  - Handles success/error responses
- **Usage**: Main form submission

##### `checkForDuplicate(): Promise<boolean>`
- **Purpose**: Check for duplicate records
- **Business Logic**:
  - Compares tax number and customer type
  - Calls duplicate detection API
  - Sets duplicate warning if found
  - Updates form validation state
- **Usage**: Duplicate detection

##### `uploadDocument(file: File): Promise<void>`
- **Purpose**: Upload document to server
- **Business Logic**:
  - Validates file type and size
  - Converts to base64
  - Uploads to API
  - Updates document list
- **Usage**: Document management

##### `validateForm(): boolean`
- **Purpose**: Validate form data
- **Business Logic**:
  - Checks required fields
  - Validates field formats
  - Ensures business rules compliance
- **Usage**: Form validation

##### `resetForm(): void`
- **Purpose**: Reset form to initial state
- **Business Logic**:
  - Clears all form fields
  - Resets validation state
  - Clears uploaded documents
- **Usage**: Form reset

##### `loadRequestForEdit(requestId: string): Promise<void>`
- **Purpose**: Load existing request for editing
- **Business Logic**:
  - Fetches request data from API
  - Populates form fields
  - Loads associated documents
  - Sets edit mode
- **Usage**: Request editing

##### `saveDraft(): void`
- **Purpose**: Save form as draft
- **Business Logic**:
  - Saves current form state
  - Stores in localStorage
  - Provides recovery mechanism
- **Usage**: Draft management

##### `loadDraft(): void`
- **Purpose**: Load saved draft
- **Business Logic**:
  - Retrieves draft from localStorage
  - Populates form fields
  - Restores form state
- **Usage**: Draft recovery

### 4. **Golden Requests Page** (`/dashboard/golden-requests`)

#### Component: `GoldenRequestsComponent`
**File**: `src/app/golden-requests/golden-requests.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize golden requests list
- **Business Logic**:
  - Loads golden records from API
  - Sets up filtering and pagination
  - Configures table display
- **Usage**: Page initialization

##### `loadGoldenRecords(): Promise<void>`
- **Purpose**: Load golden records from API
- **Business Logic**:
  - Fetches records with pagination
  - Applies current filters
  - Updates table data
- **Usage**: Data loading

##### `filterRecords(): void`
- **Purpose**: Filter records based on criteria
- **Business Logic**:
  - Applies search filters
  - Updates table display
  - Maintains pagination
- **Usage**: Data filtering

##### `viewRecord(record: any): void`
- **Purpose**: View record details
- **Business Logic**:
  - Opens record detail modal
  - Loads full record data
  - Displays record information
- **Usage**: Record viewing

##### `editRecord(record: any): void`
- **Purpose**: Edit golden record
- **Business Logic**:
  - Opens edit form
  - Loads record data
  - Enables editing mode
- **Usage**: Record editing

##### `deleteRecord(record: any): Promise<void>`
- **Purpose**: Delete golden record
- **Business Logic**:
  - Confirms deletion
  - Calls delete API
  - Updates record list
- **Usage**: Record deletion

### 5. **My Task List Page** (`/dashboard/my-task`)

#### Component: `MyTaskListComponent`
**File**: `src/app/my-task-list/my-task-list.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize task list
- **Business Logic**:
  - Loads user's assigned tasks
  - Sets up task filtering
  - Configures task display
- **Usage**: Page initialization

##### `loadTasks(): Promise<void>`
- **Purpose**: Load user tasks from API
- **Business Logic**:
  - Fetches tasks assigned to current user
  - Applies status filters
  - Updates task list
- **Usage**: Task data loading

##### `updateTaskStatus(task: any, status: string): Promise<void>`
- **Purpose**: Update task status
- **Business Logic**:
  - Updates task status in API
  - Refreshes task list
  - Logs status change
- **Usage**: Task status management

##### `filterTasks(): void`
- **Purpose**: Filter tasks based on criteria
- **Business Logic**:
  - Applies status and priority filters
  - Updates task display
  - Maintains pagination
- **Usage**: Task filtering

##### `viewTaskDetails(task: any): void`
- **Purpose**: View task details
- **Business Logic**:
  - Opens task detail modal
  - Loads full task data
  - Displays task information
- **Usage**: Task viewing

### 6. **Admin Task List Page** (`/dashboard/admin-task-list`)

#### Component: `AdminTaskListComponent`
**File**: `src/app/admin-task-list/admin-task-list.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize admin task list
- **Business Logic**:
  - Loads all system tasks
  - Sets up admin controls
  - Configures task management
- **Usage**: Admin page initialization

##### `loadAllTasks(): Promise<void>`
- **Purpose**: Load all system tasks
- **Business Logic**:
  - Fetches all tasks from API
  - Applies admin filters
  - Updates task list
- **Usage**: System task loading

##### `assignTask(task: any, user: string): Promise<void>`
- **Purpose**: Assign task to user
- **Business Logic**:
  - Updates task assignment
  - Notifies assigned user
  - Logs assignment change
- **Usage**: Task assignment

##### `reassignTask(task: any, newUser: string): Promise<void>`
- **Purpose**: Reassign task to different user
- **Business Logic**:
  - Updates task assignment
  - Notifies both users
  - Logs reassignment
- **Usage**: Task reassignment

##### `bulkUpdateTasks(tasks: any[], action: string): Promise<void>`
- **Purpose**: Perform bulk task operations
- **Business Logic**:
  - Processes multiple tasks
  - Updates task statuses
  - Logs bulk operations
- **Usage**: Bulk task management

### 7. **Duplicate Records Page** (`/dashboard/duplicate-records`)

#### Component: `DuplicateRecordsComponent`
**File**: `src/app/duplicate-records/duplicate-records.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize duplicate records list
- **Business Logic**:
  - Loads duplicate records
  - Sets up duplicate management
  - Configures resolution tools
- **Usage**: Page initialization

##### `loadDuplicateRecords(): Promise<void>`
- **Purpose**: Load duplicate records from API
- **Business Logic**:
  - Fetches duplicate records
  - Applies confidence filters
  - Updates record list
- **Usage**: Duplicate data loading

##### `resolveDuplicate(record: any, action: string): Promise<void>`
- **Purpose**: Resolve duplicate record
- **Business Logic**:
  - Merges or separates records
  - Updates record status
  - Logs resolution action
- **Usage**: Duplicate resolution

##### `mergeRecords(records: any[]): Promise<void>`
- **Purpose**: Merge duplicate records
- **Business Logic**:
  - Combines record data
  - Creates master record
  - Updates record statuses
- **Usage**: Record merging

##### `separateRecords(records: any[]): Promise<void>`
- **Purpose**: Separate duplicate records
- **Business Logic**:
  - Marks records as separate
  - Updates confidence scores
  - Logs separation action
- **Usage**: Record separation

### 8. **Duplicate Customer Page** (`/dashboard/duplicate-customer`)

#### Component: `DuplicateCustomerComponent`
**File**: `src/app/duplicate-customer/duplicate-customer.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize duplicate customer management
- **Business Logic**:
  - Loads customer duplicates
  - Sets up master record builder
  - Configures resolution workflow
- **Usage**: Page initialization

##### `loadDuplicateCustomers(): Promise<void>`
- **Purpose**: Load duplicate customer records
- **Business Logic**:
  - Fetches customer duplicates
  - Groups by tax number
  - Sets up resolution workflow
- **Usage**: Customer duplicate loading

##### `buildMasterRecord(): Promise<void>`
- **Purpose**: Build master record from duplicates
- **Business Logic**:
  - Combines best data from duplicates
  - Resolves field conflicts
  - Creates golden record
- **Usage**: Master record creation

##### `resolveFieldConflict(field: string, value: string): void`
- **Purpose**: Resolve field conflict
- **Business Logic**:
  - Selects best value for field
  - Updates master record
  - Logs conflict resolution
- **Usage**: Field conflict resolution

##### `linkRecords(records: any[]): Promise<void>`
- **Purpose**: Link duplicate records
- **Business Logic**:
  - Creates record relationships
  - Updates record statuses
  - Logs linking action
- **Usage**: Record linking

### 9. **Quarantine Page** (`/dashboard/quarantine`)

#### Component: `QuarantineComponent`
**File**: `src/app/quarantine/quarantine.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize quarantine management
- **Business Logic**:
  - Loads quarantined records
  - Sets up resolution tools
  - Configures quality checks
- **Usage**: Page initialization

##### `loadQuarantinedRecords(): Promise<void>`
- **Purpose**: Load quarantined records
- **Business Logic**:
  - Fetches quarantine records
  - Applies quality filters
  - Updates record list
- **Usage**: Quarantine data loading

##### `resolveQuarantine(record: any, action: string): Promise<void>`
- **Purpose**: Resolve quarantined record
- **Business Logic**:
  - Performs quality checks
  - Updates record status
  - Logs resolution action
- **Usage**: Quarantine resolution

##### `releaseFromQuarantine(record: any): Promise<void>`
- **Purpose**: Release record from quarantine
- **Business Logic**:
  - Validates record quality
  - Updates record status
  - Logs release action
- **Usage**: Quarantine release

### 10. **Rejected Records Page** (`/dashboard/rejected`)

#### Component: `RejectedComponent`
**File**: `src/app/rejected/rejected.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize rejected records management
- **Business Logic**:
  - Loads rejected records
  - Sets up resubmission workflow
  - Configures quality improvement
- **Usage**: Page initialization

##### `loadRejectedRecords(): Promise<void>`
- **Purpose**: Load rejected records
- **Business Logic**:
  - Fetches rejected records
  - Applies rejection filters
  - Updates record list
- **Usage**: Rejected data loading

##### `resubmitRecord(record: any): Promise<void>`
- **Purpose**: Resubmit rejected record
- **Business Logic**:
  - Updates record status
  - Sends for re-review
  - Logs resubmission
- **Usage**: Record resubmission

##### `improveRecord(record: any): void`
- **Purpose**: Improve rejected record
- **Business Logic**:
  - Opens edit form
  - Allows data correction
  - Enables resubmission
- **Usage**: Record improvement

### 11. **Compliance Page** (`/dashboard/compliance`)

#### Component: `ComplianceComponent`
**File**: `src/app/compliance/compliance.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize compliance management
- **Business Logic**:
  - Loads compliance tasks
  - Sets up regulatory checks
  - Configures approval workflow
- **Usage**: Page initialization

##### `loadComplianceTasks(): Promise<void>`
- **Purpose**: Load compliance tasks
- **Business Logic**:
  - Fetches compliance tasks
  - Applies regulatory filters
  - Updates task list
- **Usage**: Compliance data loading

##### `approveCompliance(task: any): Promise<void>`
- **Purpose**: Approve compliance task
- **Business Logic**:
  - Performs regulatory checks
  - Updates compliance status
  - Logs approval action
- **Usage**: Compliance approval

##### `rejectCompliance(task: any, reason: string): Promise<void>`
- **Purpose**: Reject compliance task
- **Business Logic**:
  - Records rejection reason
  - Updates compliance status
  - Logs rejection action
- **Usage**: Compliance rejection

### 12. **Data Lineage Page** (`/dashboard/data-lineage`)

#### Component: `DataLineageComponent`
**File**: `src/app/data-lineage/data-lineage.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize data lineage tracking
- **Business Logic**:
  - Loads lineage data
  - Sets up visualization
  - Configures tracking tools
- **Usage**: Page initialization

##### `loadLineageData(): Promise<void>`
- **Purpose**: Load data lineage information
- **Business Logic**:
  - Fetches lineage data
  - Builds relationship graph
  - Updates visualization
- **Usage**: Lineage data loading

##### `trackDataFlow(recordId: string): void`
- **Purpose**: Track data flow for record
- **Business Logic**:
  - Traces record transformations
  - Shows data journey
  - Displays impact analysis
- **Usage**: Data flow tracking

##### `analyzeImpact(recordId: string): void`
- **Purpose**: Analyze impact of changes
- **Business Logic**:
  - Calculates change impact
  - Shows affected records
  - Displays risk assessment
- **Usage**: Impact analysis

### 13. **Business Dashboard Page** (`/dashboard/business`)

#### Component: `BusinessDashboardComponent`
**File**: `src/app/business-dashboard/business-dashboard.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize business dashboard
- **Business Logic**:
  - Loads business metrics
  - Sets up KPI tracking
  - Configures reporting
- **Usage**: Dashboard initialization

##### `loadBusinessMetrics(): Promise<void>`
- **Purpose**: Load business metrics
- **Business Logic**:
  - Fetches KPI data
  - Calculates business metrics
  - Updates dashboard
- **Usage**: Metrics loading

##### `generateReport(reportType: string): Promise<void>`
- **Purpose**: Generate business report
- **Business Logic**:
  - Collects report data
  - Formats report output
  - Downloads report file
- **Usage**: Report generation

### 14. **Executive Dashboard Page** (`/dashboard/executive`)

#### Component: `ExecutiveDashboardComponent`
**File**: `src/app/executive-dashboard/executive-dashboard.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize executive dashboard
- **Business Logic**:
  - Loads executive metrics
  - Sets up strategic KPIs
  - Configures executive reporting
- **Usage**: Executive dashboard initialization

##### `loadExecutiveMetrics(): Promise<void>`
- **Purpose**: Load executive metrics
- **Business Logic**:
  - Fetches strategic data
  - Calculates executive KPIs
  - Updates dashboard
- **Usage**: Executive metrics loading

### 15. **Technical Dashboard Page** (`/dashboard/technical`)

#### Component: `TechnicalDashboardComponent`
**File**: `src/app/technical-dashboard/technical-dashboard.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize technical dashboard
- **Business Logic**:
  - Loads technical metrics
  - Sets up system monitoring
  - Configures technical reporting
- **Usage**: Technical dashboard initialization

##### `loadTechnicalMetrics(): Promise<void>`
- **Purpose**: Load technical metrics
- **Business Logic**:
  - Fetches system data
  - Calculates technical KPIs
  - Updates dashboard
- **Usage**: Technical metrics loading

### 16. **AI Assistant Page** (`/dashboard/ai-assistant`)

#### Component: `AiAssistantComponent`
**File**: `src/app/ai-assistant/ai-assistant.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize AI assistant
- **Business Logic**:
  - Sets up chat interface
  - Configures AI responses
  - Initializes conversation
- **Usage**: AI assistant initialization

##### `sendMessage(message: string): Promise<void>`
- **Purpose**: Send message to AI assistant
- **Business Logic**:
  - Processes user message
  - Generates AI response
  - Updates chat history
- **Usage**: AI conversation

### 17. **Sync Golden Records Page** (`/dashboard/sync-golden-records`)

#### Component: `SyncGoldenRecordsComponent`
**File**: `src/app/sync-golden-records/sync-golden-records.component.ts`

#### Functions Documentation:

##### `ngOnInit(): void`
- **Purpose**: Initialize sync management
- **Business Logic**:
  - Loads sync rules
  - Sets up sync operations
  - Configures external systems
- **Usage**: Sync page initialization

##### `loadSyncRules(): Promise<void>`
- **Purpose**: Load sync rules
- **Business Logic**:
  - Fetches sync rules
  - Configures sync operations
  - Updates rule list
- **Usage**: Sync rules loading

##### `executeSync(ruleId: string): Promise<void>`
- **Purpose**: Execute sync operation
- **Business Logic**:
  - Runs sync operation
  - Monitors sync progress
  - Updates sync status
- **Usage**: Sync execution

##### `monitorSync(operationId: string): void`
- **Purpose**: Monitor sync operation
- **Business Logic**:
  - Tracks sync progress
  - Updates status display
  - Handles sync errors
- **Usage**: Sync monitoring

---

## 🔄 Business Logic Analysis

### Data Flow Process
```
1. Data Entry → 2. Validation → 3. Review → 4. Compliance → 5. Golden Record
     ↓              ↓              ↓           ↓              ↓
  Create Request  Duplicate     Reviewer    Compliance    Active Record
                  Detection     Approval    Approval      in System
```

### Duplicate Detection Logic
1. **Real-time Validation**: Check for duplicates during data entry
2. **Confidence Scoring**: Calculate similarity scores
3. **Manual Review**: Flag potential duplicates for review
4. **Resolution**: Merge or separate duplicate records

### Golden Record Management
1. **Creation**: From approved requests
2. **Maintenance**: Ongoing updates and corrections
3. **Synchronization**: Sync with external systems
4. **Lineage**: Track all changes and sources

### Workflow States
- **Pending**: Initial state
- **Under Review**: Being reviewed
- **Approved**: Approved by reviewer
- **Compliance**: Under compliance check
- **Active**: Live in system
- **Rejected**: Rejected with reason
- **Blocked**: Blocked by compliance
- **Quarantine**: Under quality check

---

## 📊 Database Relationships

### Primary Relationships
- **users** → **requests** (createdBy, reviewedBy, complianceBy)
- **requests** → **contacts** (one-to-many)
- **requests** → **documents** (one-to-many)
- **requests** → **workflow_history** (one-to-many)
- **requests** → **issues** (one-to-many)
- **sync_rules** → **sync_operations** (one-to-many)
- **sync_operations** → **sync_records** (one-to-many)

### Foreign Key Constraints
- All foreign keys have CASCADE DELETE
- Ensures data integrity
- Maintains referential integrity

---

## 🎯 System Architecture

### Frontend Architecture
- **Angular 17** with TypeScript
- **ng-zorro-antd** for UI components
- **Reactive Forms** for data management
- **RxJS** for asynchronous operations
- **Lazy Loading** for performance

### Backend Architecture
- **Node.js** with Express.js
- **SQLite** with better-sqlite3
- **RESTful APIs** for data access
- **Session-based** authentication
- **File-based** document storage

### Database Architecture
- **SQLite** with WAL mode
- **ACID** compliance
- **Indexed** queries for performance
- **Transaction** support
- **Backup** and recovery

---

## 🤖 AI Agent Configuration

### OpenAI Integration Setup

The Master Data Management system integrates with OpenAI's GPT-4o model to provide intelligent data analysis, query processing, and automated responses through multiple AI services.

#### 1. **Environment Configuration** (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3001/api',
  // OpenAI API Configuration
  openaiApiKey: 'YOUR_OPENAI_API_KEY_HERE',
  openaiApiUrl: 'https://api.openai.com/v1/chat/completions',
  openaiModel: 'gpt-4o' // Using GPT-4o for better intelligence and reasoning
};
```

#### 2. **OpenAI API Key Setup**

To configure the OpenAI integration:

1. **Get OpenAI API Key:**
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Sign in to your account or create a new one
   - Navigate to API Keys section
   - Generate a new API key

2. **Configure API Key:**
   ```typescript
   // In src/environments/environment.ts
   openaiApiKey: 'sk-your-actual-openai-api-key-here',
   ```

3. **Account Information:**
   - **Platform**: OpenAI Platform (https://platform.openai.com/)
   - **Model Used**: GPT-4o (latest and most capable model)
   - **API Endpoint**: https://api.openai.com/v1/chat/completions
   - **Billing**: Pay-per-use based on token consumption

#### 3. **AI Services Implementation**

The system includes three main AI services:

##### **Simple AI Service** (`src/app/services/simple-ai.service.ts`)
- **Purpose**: Basic AI interactions and responses
- **Usage**: Simple query processing and response generation
- **Configuration**: Uses environment OpenAI settings

##### **Analytical Bot Service** (`src/app/services/analytical-bot.service.ts`)
- **Purpose**: Advanced data analysis and analytical queries
- **Features**:
  - Query analysis and API parameter determination
  - Intelligent data interpretation
  - Complex analytical responses
- **Configuration**: 
  ```typescript
  private openaiApiKey = environment.openaiApiKey;
  private openaiApiUrl = environment.openaiApiUrl;
  private openaiModel = environment.openaiModel;
  ```

##### **AI Service** (`src/app/services/ai.service.ts`)
- **Purpose**: Comprehensive AI functionality
- **Features**:
  - Multi-model AI interactions
  - Claude API integration (fallback)
  - Advanced conversation handling
- **Configuration**:
  ```typescript
  private openaiApiKey = environment.openaiApiKey || 'your-openai-api-key';
  private openaiApiUrl = environment.openaiApiUrl || 'https://api.openai.com/v1/chat/completions';
  private openaiModel = environment.openaiModel || 'gpt-3.5-turbo';
  ```

#### 4. **API Usage and Monitoring**

##### **Request Headers**
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${environment.openaiApiKey}`
};
```

##### **Request Body Structure**
```typescript
const requestBody = {
  model: environment.openaiModel, // 'gpt-4o'
  messages: [
    {
      role: 'system',
      content: 'You are an intelligent data analysis assistant...'
    },
    {
      role: 'user',
      content: 'User query here...'
    }
  ],
  max_tokens: 1000,
  temperature: 0.7
};
```

##### **Response Handling**
```typescript
const response = await this.http.post<any>(environment.openaiApiUrl, requestBody, { headers });
const aiResponse = response.choices[0].message.content;
```

#### 5. **Cost Management**

##### **Token Usage**
- **Input Tokens**: Text sent to OpenAI API
- **Output Tokens**: Text generated by OpenAI API
- **Pricing**: Based on GPT-4o pricing model
- **Monitoring**: Available through OpenAI dashboard

##### **Optimization Tips**
- Use specific prompts to reduce token usage
- Implement caching for repeated queries
- Monitor usage through OpenAI platform dashboard

#### 6. **Security Considerations**

##### **API Key Security**
- Store API key in environment variables only
- Never commit API keys to version control
- Use different keys for development and production
- Regularly rotate API keys

##### **Production Configuration**
```typescript
// For production, use environment variables
export const environment = {
  production: true,
  apiBaseUrl: process.env.API_BASE_URL,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiApiUrl: 'https://api.openai.com/v1/chat/completions',
  openaiModel: 'gpt-4o'
};
```

#### 7. **Error Handling**

The AI services include comprehensive error handling:

```typescript
try {
  const response = await this.http.post<any>(environment.openaiApiUrl, requestBody, { headers });
  return response.choices[0].message.content;
} catch (error) {
  console.error('❌ OpenAI API Error:', error);
  // Fallback to cached responses or default messages
  return 'I apologize, but I encountered an error processing your request.';
}
```

#### 8. **Testing and Debugging**

##### **Debug Logging**
All AI services include extensive logging:
```typescript
console.log('🤖 Calling OpenAI to analyze query...');
console.log('🔑 API Key:', environment.openaiApiKey ? 'Present' : 'Missing');
console.log('🌐 API URL:', environment.openaiApiUrl);
console.log('✅ OpenAI API Response:', response);
```

##### **Testing Configuration**
```typescript
// Test API key validity
const testResponse = await this.http.post(environment.openaiApiUrl, {
  model: environment.openaiModel,
  messages: [{ role: 'user', content: 'Test message' }],
  max_tokens: 10
}, { headers });
```

---

*This documentation provides complete technical details for every component, function, and business logic in the Master Data Management System.*
