# Master Data Management System - Complete Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Pages & Components](#pages--components)
4. [Business Logic](#business-logic)
5. [Database Schema](#database-schema)
6. [APIs](#apis)
7. [Dependencies](#dependencies)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Workflow](#workflow)
10. [Setup & Installation](#setup--installation)

---

## 🎯 Project Overview

**Master Data Management System** هو نظام إدارة البيانات الرئيسية (MDM) مصمم لإدارة بيانات العملاء والشركات في بيئة المؤسسات. النظام يدعم إدارة دورة حياة البيانات من الإنشاء إلى الموافقة النهائية.

### Key Features:
- **Data Entry & Validation** - إدخال وتحقق من البيانات
- **Review & Approval Workflow** - سير عمل المراجعة والموافقة
- **Duplicate Detection** - كشف السجلات المكررة
- **Golden Record Management** - إدارة السجلات الذهبية
- **Compliance Management** - إدارة الامتثال
- **Data Synchronization** - مزامنة البيانات مع الأنظمة الخارجية

---

## 🏗️ Architecture

### Frontend (Angular 17)
- **Framework**: Angular 17 with TypeScript
- **UI Library**: ng-zorro-antd (Ant Design for Angular)
- **State Management**: Component-based with services
- **Routing**: Lazy-loaded modules
- **Styling**: SCSS with component encapsulation

### Backend (Node.js + SQLite)
- **Runtime**: Node.js with Express.js
- **Database**: SQLite with better-sqlite3
- **API**: RESTful APIs
- **Authentication**: Session-based
- **File Storage**: Local file system

### Database
- **Primary**: SQLite (better-sqlite3)
- **Location**: `api/mdm_database.db`
- **Backup**: WAL mode enabled
- **Transactions**: ACID compliant

---

## 📱 Pages & Components

### 1. **Login Module** (`/login`)
**Purpose**: User authentication and role-based access
**Components**:
- `LoginComponent` - User login form
- Role-based redirection after login

**Business Logic**:
- Validates user credentials
- Sets user session and role
- Redirects to appropriate dashboard

### 2. **Dashboard Module** (`/dashboard`)
**Purpose**: Main application shell and navigation
**Components**:
- `DashboardComponent` - Main layout with sidebar
- `HeaderComponent` - Top navigation bar
- `GoldenSummaryComponent` - Golden record details view

**Features**:
- Role-based navigation menu
- User profile management
- System status indicators

### 3. **New Request Module** (`/dashboard/new-request`)
**Purpose**: Create new customer data requests
**Components**:
- `NewRequestComponent` - Main form for data entry

**Business Logic**:
- Form validation and data entry
- Duplicate detection and warnings
- Document upload and management
- Real-time validation
- Golden record editing support

**Key Features**:
- **Duplicate Detection**: Real-time checking for existing customers
- **Document Management**: Upload and preview documents
- **Multi-language Support**: Arabic and English fields
- **Validation**: Comprehensive form validation
- **Golden Edit Mode**: Edit existing golden records

### 4. **Golden Requests Module** (`/dashboard/golden-requests`)
**Purpose**: Manage golden records and requests
**Components**:
- `GoldenRequestsComponent` - List and manage golden records

**Business Logic**:
- View all golden records
- Filter and search functionality
- Record status management
- Bulk operations

### 5. **My Task List Module** (`/dashboard/my-task`)
**Purpose**: Personal task management for users
**Components**:
- `MyTaskListComponent` - User's assigned tasks

**Business Logic**:
- Role-based task filtering
- Task status updates
- Priority management
- Due date tracking

### 6. **Admin Task List Module** (`/dashboard/admin-task-list`)
**Purpose**: Administrative task management
**Components**:
- `AdminTaskListComponent` - Admin task overview

**Business Logic**:
- System-wide task monitoring
- User assignment
- Performance metrics
- Workflow management

### 7. **Duplicate Records Module** (`/dashboard/duplicate-records`)
**Purpose**: Handle duplicate record detection and resolution
**Components**:
- `DuplicateRecordsComponent` - Duplicate management

**Business Logic**:
- Automatic duplicate detection
- Manual duplicate resolution
- Merge operations
- Confidence scoring

### 8. **Duplicate Customer Module** (`/dashboard/duplicate-customer`)
**Purpose**: Advanced duplicate customer management
**Components**:
- `DuplicateCustomerComponent` - Customer duplicate resolution

**Business Logic**:
- Master record building
- Field-level conflict resolution
- Record linking
- Golden record creation

### 9. **Quarantine Module** (`/dashboard/quarantine`)
**Purpose**: Manage records in quarantine status
**Components**:
- `QuarantineComponent` - Quarantine record management

**Business Logic**:
- Quarantine record listing
- Resolution workflow
- Quality checks
- Release procedures

### 10. **Rejected Records Module** (`/dashboard/rejected`)
**Purpose**: Handle rejected records
**Components**:
- `RejectedComponent` - Rejected record management

**Business Logic**:
- Rejection reason tracking
- Re-submission workflow
- Quality improvement
- Feedback management

### 11. **Compliance Module** (`/dashboard/compliance`)
**Purpose**: Compliance and regulatory management
**Components**:
- `ComplianceComponent` - Compliance task management
- `ComplianceTaskListComponent` - Compliance task list

**Business Logic**:
- Regulatory compliance checks
- Audit trail management
- Risk assessment
- Policy enforcement

### 12. **Data Lineage Module** (`/dashboard/data-lineage`)
**Purpose**: Track data lineage and transformations
**Components**:
- `DataLineageComponent` - Data lineage visualization

**Business Logic**:
- Data flow tracking
- Transformation history
- Impact analysis
- Quality metrics

### 13. **Business Dashboard Module** (`/dashboard/business-dashboard`)
**Purpose**: Business intelligence and reporting
**Components**:
- `BusinessDashboardComponent` - Business metrics

**Business Logic**:
- KPI tracking
- Performance metrics
- Trend analysis
- Executive reporting

### 14. **Executive Dashboard Module** (`/dashboard/executive-dashboard`)
**Purpose**: Executive-level reporting
**Components**:
- `ExecutiveDashboardComponent` - Executive metrics

**Business Logic**:
- High-level KPIs
- Strategic metrics
- Executive summaries
- Decision support

### 15. **Technical Dashboard Module** (`/dashboard/technical-dashboard`)
**Purpose**: Technical system monitoring
**Components**:
- `TechnicalDashboardComponent` - Technical metrics

**Business Logic**:
- System performance
- Error tracking
- Resource utilization
- Technical health

### 16. **AI Assistant Module** (`/dashboard/ai-assistant`)
**Purpose**: AI-powered assistance
**Components**:
- `AiAssistantComponent` - AI chat interface

**Business Logic**:
- Natural language processing
- Intelligent suggestions
- Automated workflows
- Smart recommendations

### 17. **Sync Golden Records Module** (`/dashboard/sync-golden-records`)
**Purpose**: Synchronize golden records with external systems
**Components**:
- `SyncGoldenRecordsComponent` - Sync management

**Business Logic**:
- External system integration
- Data mapping
- Sync scheduling
- Error handling

---

## 🔄 Business Logic

### User Roles & Workflow

#### 1. **Data Entry User** (`data_entry`)
- **Responsibilities**: Create new customer requests
- **Permissions**: 
  - Create new requests
  - Edit own requests (before review)
  - Upload documents
  - View own task list
- **Workflow**: Create → Submit → Wait for Review

#### 2. **Reviewer** (`reviewer`)
- **Responsibilities**: Review and approve/reject requests
- **Permissions**:
  - Review all pending requests
  - Approve or reject requests
  - Request additional information
  - Edit request details
- **Workflow**: Review → Approve/Reject → Forward to Compliance

#### 3. **Compliance** (`compliance`)
- **Responsibilities**: Final compliance checks
- **Permissions**:
  - Final approval authority
  - Block/Unblock records
  - Compliance status management
  - Regulatory checks
- **Workflow**: Compliance Check → Final Approval → Golden Record Creation

#### 4. **Admin** (`admin`)
- **Responsibilities**: System administration
- **Permissions**:
  - Full system access
  - User management
  - System configuration
  - Data management
- **Workflow**: System Administration → Configuration → Monitoring

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

---

## 🗄️ Database Schema

### Core Tables

#### 1. **users** - User Management
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

#### 2. **requests** - Main Request Data
```sql
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  requestId TEXT,
  
  -- Company Information
  firstName TEXT,
  firstNameAr TEXT,
  tax TEXT,
  CustomerType TEXT,
  CompanyOwner TEXT,
  
  -- Address Information
  buildingNumber TEXT,
  street TEXT,
  country TEXT,
  city TEXT,
  
  -- Contact Information
  ContactName TEXT,
  EmailAddress TEXT,
  MobileNumber TEXT,
  JobTitle TEXT,
  Landline TEXT,
  PrefferedLanguage TEXT,
  
  -- Sales Information
  SalesOrgOption TEXT,
  DistributionChannelOption TEXT,
  DivisionOption TEXT,
  
  -- Status & Workflow
  status TEXT DEFAULT 'Pending',
  ComplianceStatus TEXT,
  companyStatus TEXT,
  assignedTo TEXT DEFAULT 'reviewer',
  
  -- Rejection/Block Information
  rejectReason TEXT,
  blockReason TEXT,
  IssueDescription TEXT,
  
  -- System Fields
  origin TEXT DEFAULT 'dataEntry',
  sourceSystem TEXT DEFAULT 'Data Steward',
  isGolden INTEGER DEFAULT 0,
  goldenRecordCode TEXT,
  
  -- User Tracking
  createdBy TEXT,
  reviewedBy TEXT,
  complianceBy TEXT,
  
  -- Timestamps
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  
  -- Duplicate Linking & Golden Edit Support
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
  
  -- Request Type
  requestType TEXT,
  originalRequestType TEXT
);
```

#### 3. **contacts** - Contact Information
```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requestId TEXT NOT NULL,
  name TEXT,
  nameAr TEXT,
  jobTitle TEXT,
  jobTitleAr TEXT,
  email TEXT,
  mobile TEXT,
  landline TEXT,
  preferredLanguage TEXT,
  isPrimary INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requestId) REFERENCES requests(id)
);
```

#### 4. **documents** - Document Management
```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requestId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  originalName TEXT,
  filePath TEXT NOT NULL,
  fileSize INTEGER,
  mimeType TEXT,
  uploadedBy TEXT,
  uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requestId) REFERENCES requests(id)
);
```

#### 5. **issues** - Issue Tracking
```sql
CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requestId TEXT NOT NULL,
  issueType TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assignedTo TEXT,
  createdBy TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolvedAt DATETIME,
  FOREIGN KEY (requestId) REFERENCES requests(id)
);
```

### Sync Tables

#### 6. **sync_rules** - Synchronization Rules
```sql
CREATE TABLE sync_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  targetSystem TEXT NOT NULL,
  syncDirection TEXT DEFAULT 'outbound',
  filterCriteria TEXT,
  fieldMapping TEXT,
  isActive INTEGER DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdBy TEXT,
  updatedAt DATETIME,
  updatedBy TEXT
);
```

#### 7. **sync_operations** - Sync Operations
```sql
CREATE TABLE sync_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ruleId INTEGER,
  targetSystem TEXT NOT NULL,
  syncType TEXT,
  status TEXT,
  totalRecords INTEGER DEFAULT 0,
  syncedRecords INTEGER DEFAULT 0,
  failedRecords INTEGER DEFAULT 0,
  startedAt DATETIME,
  completedAt DATETIME,
  executedBy TEXT,
  errorDetails TEXT,
  FOREIGN KEY (ruleId) REFERENCES sync_rules(id)
);
```

#### 8. **sync_records** - Individual Sync Records
```sql
CREATE TABLE sync_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operationId INTEGER NOT NULL,
  requestId TEXT NOT NULL,
  targetSystem TEXT NOT NULL,
  syncStatus TEXT,
  targetRecordId TEXT,
  syncedAt DATETIME,
  errorMessage TEXT,
  responseData TEXT,
  FOREIGN KEY (operationId) REFERENCES sync_operations(id),
  FOREIGN KEY (requestId) REFERENCES requests(id)
);
```

---

## 🔌 APIs

### Authentication APIs
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/current-user` - Get current user info

### Request Management APIs
- `GET /api/requests` - List all requests
- `POST /api/requests` - Create new request
- `GET /api/requests/:id` - Get specific request
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request

### Duplicate Detection APIs
- `POST /api/requests/check-duplicate` - Check for duplicates
- `GET /api/golden-records` - Get golden records
- `POST /api/requests/:id/merge` - Merge duplicate records

### Document Management APIs
- `POST /api/requests/:id/documents` - Upload document
- `GET /api/requests/:id/documents` - List documents
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download document

### Task Management APIs
- `GET /api/tasks` - Get user tasks
- `PUT /api/tasks/:id` - Update task status
- `GET /api/tasks/assigned` - Get assigned tasks

### Compliance APIs
- `POST /api/requests/:id/approve` - Approve request
- `POST /api/requests/:id/reject` - Reject request
- `POST /api/requests/:id/block` - Block request
- `POST /api/requests/:id/unblock` - Unblock request

### Sync APIs
- `GET /api/sync/rules` - Get sync rules
- `POST /api/sync/execute` - Execute sync operation
- `GET /api/sync/status/:id` - Get sync status
- `POST /api/sync/records/:id/sync` - Sync specific record

### Dashboard APIs
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/kpis` - Get KPI data
- `GET /api/dashboard/trends` - Get trend data

---

## 📦 Dependencies

### Frontend Dependencies
```json
{
  "@angular/core": "^17.3.0",
  "@angular/common": "^17.3.0",
  "@angular/forms": "^17.3.0",
  "@angular/router": "^17.3.0",
  "@ant-design/icons-angular": "^17.0.0",
  "@ngx-translate/core": "^16.0.4",
  "@ngx-translate/http-loader": "^16.0.1",
  "ng-zorro-antd": "^17.4.1",
  "apexcharts": "^3.54.1",
  "ng-apexcharts": "1.7.4",
  "chart.js": "^4.5.0",
  "rxjs": "~7.8.0"
}
```

### Backend Dependencies
```json
{
  "express": "^5.1.0",
  "better-sqlite3": "^12.2.0",
  "cors": "^2.8.5",
  "nanoid": "^5.1.5"
}
```

### Development Dependencies
```json
{
  "@angular/cli": "^17.3.17",
  "@angular-devkit/build-angular": "17",
  "typescript": "~5.4.2",
  "karma": "~6.4.0",
  "jasmine-core": "~5.1.0"
}
```

---

## 👥 User Roles & Permissions

### Data Entry User
- **Create** new customer requests
- **Edit** own requests (before review)
- **Upload** documents
- **View** own task list
- **Cannot** approve or reject requests

### Reviewer
- **Review** all pending requests
- **Approve** or **reject** requests
- **Request** additional information
- **Edit** request details
- **Assign** tasks to compliance

### Compliance
- **Final approval** authority
- **Block/Unblock** records
- **Manage** compliance status
- **Perform** regulatory checks
- **Create** golden records

### Admin
- **Full system** access
- **User management**
- **System configuration**
- **Data management**
- **Sync rule management**

---

## 🔄 Workflow

### 1. Request Creation Workflow
```
Data Entry → Validation → Duplicate Check → Submit → Pending Review
```

### 2. Review Workflow
```
Reviewer → Review Request → Approve/Reject → Forward to Compliance
```

### 3. Compliance Workflow
```
Compliance → Final Check → Approve/Block → Create Golden Record
```

### 4. Golden Record Workflow
```
Golden Record → Sync Rules → External Systems → Active in Production
```

### 5. Duplicate Resolution Workflow
```
Duplicate Detection → Manual Review → Merge/Separate → Update Records
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 20.19.4+
- npm or pnpm
- Git

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd master-data-mangment-local
```

2. **Install Dependencies**
```bash
npm install
# or
pnpm install
```

3. **Start Backend API**
```bash
npm run api
# or
node api/better-sqlite-server.js
```

4. **Start Frontend**
```bash
npm start
# or
ng serve
```

5. **Access Application**
- Frontend: http://localhost:4200
- API: http://localhost:3001

### Default Users
- **Data Entry**: `data_entry` / `pass123`
- **Reviewer**: `reviewer` / `pass123`
- **Compliance**: `compliance` / `pass123`
- **Admin**: `admin` / `admin123`

### Environment Configuration
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3001/api'
};
```

---

## 📊 System Features

### Data Management
- ✅ **Multi-language Support** (Arabic/English)
- ✅ **Document Management** with preview
- ✅ **Real-time Validation**
- ✅ **Duplicate Detection**
- ✅ **Data Lineage Tracking**

### Workflow Management
- ✅ **Role-based Access Control**
- ✅ **Approval Workflows**
- ✅ **Task Management**
- ✅ **Status Tracking**
- ✅ **Audit Trail**

### Integration
- ✅ **External System Sync**
- ✅ **RESTful APIs**
- ✅ **File Upload/Download**
- ✅ **Real-time Updates**
- ✅ **Error Handling**

### Reporting & Analytics
- ✅ **Dashboard Analytics**
- ✅ **KPI Tracking**
- ✅ **Trend Analysis**
- ✅ **Executive Reporting**
- ✅ **Technical Monitoring**

---

## 🔧 Technical Specifications

### Performance
- **Database**: SQLite with WAL mode
- **Caching**: In-memory caching for frequent queries
- **File Storage**: Local file system with organized structure
- **API Response**: Optimized JSON responses

### Security
- **Authentication**: Session-based with role validation
- **Authorization**: Role-based access control
- **Data Validation**: Server-side validation for all inputs
- **File Security**: Secure file upload and storage

### Scalability
- **Modular Architecture**: Lazy-loaded Angular modules
- **Database Optimization**: Indexed queries and transactions
- **API Design**: RESTful and stateless
- **Error Handling**: Comprehensive error management

---

## 📝 Notes

### Development
- **Code Style**: TypeScript with strict mode
- **Testing**: Jasmine/Karma for unit tests
- **Linting**: ESLint configuration
- **Formatting**: Prettier integration

### Deployment
- **Build**: Angular production build
- **Database**: SQLite file-based database
- **Server**: Node.js Express server
- **Static Files**: Angular dist folder

### Maintenance
- **Logging**: Comprehensive request/response logging
- **Monitoring**: System health endpoints
- **Backup**: Database WAL files for recovery
- **Updates**: Modular update system

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

## 🤖 Important for Data Entry Customer Creation AI Agent

This section provides comprehensive documentation for AI agents to understand and interact with the customer creation system. This is critical for automated data entry, validation, and workflow automation.

### ✅ Updated (Oct 2025) — Data Entry Agent Behavior & Implementation

This subsection supersedes older notes below and captures the latest implemented behavior, UX, API usage, and performance safeguards for the Data Entry AI Agent.

- Floating Chat Widget (Data Entry only): Appears in `src/app/dashboard/dashboard.component.html` and is shown only for Data Entry users. Personalized greeting uses user `fullName` and time-of-day.
- Document Upload UX parity: Upload flow mirrors `new-request` page. A modal collects per-file metadata: `country`, `type`, `description`. Files can be selected from multiple folders then accumulated before processing.
- Smart document detection: Guesses `country` and `document type` from filename (Arabic/English keywords) to pre-fill modal fields.
- Progress indicator: Shows a progress message while processing documents (OCR/extraction) with live updates; removed on completion or error.
- OpenAI Vision limits: Vision accepts images only. PDFs are blocked with a clear error including filename, MIME, size, HTTP status, and OpenAI error message; user is guided to convert PDFs to images (JPG/PNG/WebP).
- Extraction confirmation step: After extraction, the agent displays extracted fields with the same labels as `new-request` and explicitly asks the user to confirm before asking for missing fields.
- Sequential missing fields: Prompts one field at a time. The agent detects field type:
  - Dropdowns are rendered interactively inside the chat (e.g., `CustomerType`, `country`, `city`, `salesOrganization`, `distributionChannel`, `division`).
  - Contacts are handled via a contact-form modal matching `new-request` fields and supports adding multiple contacts before continuing.
  - Free text fields request simple text input. Natural-language corrections are understood and applied.
- Duplicate detection (pre-submit): Before final submission, the agent calls `POST /api/requests/check-duplicate` with `tax` and `CustomerType` and follows the same UX as the main app (warning and blocking submission when duplicate found).
- Performance safeguards:
  - UI messages limited (keep last 30 of max 50) to avoid memory leaks.
  - Conversation history sent to LLM limited to the last 20 messages.
  - Timeouts: 30s for chat completions; 60s for document processing.
  - Memory cleanup after each operation (clear accumulated files, reset forms, remove progress messages).
- OpenAI request tuning: Removed `response_format` (not supported with Vision), uses `detail: 'auto'` for images, `max_tokens: 4000`, resilient JSON parsing (handles markdown-wrapped JSON), and granular error mapping (400/401/429/500/503) with precise user-facing messages.
- Demo mode removed: The agent runs against the real OpenAI API key. If GitHub Push Protection blocks pushes due to the key in `environment.ts`, allow the secret in the repo’s Secret Scanning or disable push protection.

#### Updated API Usage
- `GET /api/users/:username`: Used on service init to load profile and personalize greeting.
- `POST /api/requests/check-duplicate`: Called after data confirmation and once required fields exist; blocks submission on duplicates.
- `POST /api/requests`: Final submission (planned/next) after resolving missing fields and duplicate validation.
- Optional future: `GET /api/lookup-data` for dynamic dropdowns (currently backed by `shared/lookup-data.ts`).

#### Updated UX Flow (High-level)
1) Upload and annotate documents (accumulate from multiple folders) → 2) Extract with progress → 3) Display labeled summary and ask for confirmation → 4) Ask missing fields one by one with appropriate UI (dropdown/contact form/free text) → 5) Duplicate check → 6) Submit.

#### Error Reporting (examples shown to users)
- Shows the exact failing file(s), MIME, size, status code, and OpenAI message (e.g., “Invalid MIME type. Only image types are supported”).
- Distinguishes between: unsupported type, oversize, network issues, rate limiting, and parsing errors.

### 📋 Overview

The customer creation process in the Master Data Management system is a multi-step workflow that includes:
1. **Data Entry**: Creating new customer requests with comprehensive information
2. **Validation**: Real-time duplicate detection and field validation
3. **Document Upload**: Attaching required documents
4. **Contact Management**: Managing multiple contact persons
5. **Submission**: Submitting requests for review

---

### 🔧 New Customer Request Form Fields

The customer request form (`/dashboard/new-request`) contains the following field structure:

#### **1. General Data Section (معلومات عامة)**

| Field Name | Type | Required | Description | API Field Name |
|------------|------|----------|-------------|----------------|
| Company Name (English) | Text Input | ✅ Yes | Company name in English | `firstName` |
| Company Name (Arabic) | Text Input | ✅ Yes | Company name in Arabic - Has auto-translate button | `firstNameAR` |
| Customer Type | Dropdown List | ✅ Yes | Type of customer/company | `CustomerType` |
| Company Owner Full Name | Text Input | ✅ Yes | Full name of company owner | `CompanyOwnerFullName` |
| Tax Number | Text Input | ✅ Yes | Company tax registration number | `tax` |
| Building Number | Text Input | ❌ No | Building number in address | `buildingNumber` |
| Street | Text Input | ❌ No | Street name | `street` |
| Country | Dropdown List | ✅ Yes | Country selection | `country` |
| City | Dropdown List | ✅ Yes | City selection (filtered by country) | `city` |

**Field Details:**

- **firstName** (Text): 
  - Primary company name in English
  - Placeholder: "Enter Company Name"
  - Validation: Required

- **firstNameAR** (Text):
  - Company name in Arabic
  - Placeholder: "Enter Company Name AR"
  - Has auto-translate button (using AutoTranslateService)
  - Validation: Required

- **CustomerType** (Dropdown):
  - **Options**:
    - `Corporate` - Corporate
    - `SME` - SME (Small and Medium Enterprise)
    - `sole_proprietorship` - Sole Proprietorship
    - `limited_liability` - Limited Liability
    - `joint_stock` - Joint Stock
    - `Retail Chain` - Retail Chain
  - Source: `CUSTOMER_TYPE_OPTIONS` from `shared/lookup-data.ts`
  - Validation: Required
  - **Important**: Used in duplicate detection logic

- **CompanyOwnerFullName** (Text):
  - Full name of the company owner
  - Placeholder: "Enter Company Owner"
  - Validation: Required

- **tax** (Text):
  - Tax registration number
  - Placeholder: "Tax Number"
  - Validation: Required
  - **Important**: Used in duplicate detection logic (primary key)

- **buildingNumber** (Text):
  - Building number in address
  - Placeholder: "Enter Building Number"
  - Optional field

- **street** (Text):
  - Street name
  - Placeholder: "Enter Street Name"
  - Optional field

- **country** (Dropdown):
  - **Options**:
    - `Egypt` - Egypt
    - `Saudi Arabia` - Saudi Arabia
    - `United Arab Emirates` - United Arab Emirates
    - `Yemen` - Yemen
  - Source: `COUNTRY_OPTIONS` from `shared/lookup-data.ts`
  - Validation: Required
  - **Important**: Controls which cities are available in City dropdown

- **city** (Dropdown):
  - **Options**: Dynamically populated based on selected country
  - **Egypt Cities**: Cairo, Alexandria, Giza, Luxor
  - **Saudi Arabia Cities**: Riyadh, Jeddah, Mecca, Dammam
  - **United Arab Emirates Cities**: Dubai, Abu Dhabi, Sharjah, Ajman
  - **Yemen Cities**: Sanaa, Aden, Taiz
  - Source: `CITY_OPTIONS` from `shared/lookup-data.ts`
  - Validation: Required
  - **Important**: Auto-filtered when country changes via `getCitiesByCountry()` function

---

#### **2. Contacts Section (جهات الاتصال)**

The contacts section is a **dynamic array** that allows adding multiple contact persons. Each contact has the following fields:

| Field Name | Type | Required | Description | API Field Name |
|------------|------|----------|-------------|----------------|
| Name | Text Input | ❌ No | Full name of contact person | `name` |
| Job Title | Text Input | ❌ No | Job title/position | `jobTitle` |
| Email Address | Text Input | ❌ No | Email address | `email` |
| Mobile Number | Text Input | ❌ No | Mobile phone number | `mobile` |
| Landline | Text Input | ❌ No | Landline phone number | `landline` |
| Preferred Language | Dropdown List | ❌ No | Communication language preference | `preferredLanguage` |

**Contact Management:**
- Users can add multiple contacts using "Add +" button
- Each contact has a delete button (trash icon)
- Contacts are stored in a FormArray in the form
- When no contacts exist, empty state is shown
- API Field: `contacts` (array of contact objects)

**Preferred Language Options:**
- `EN` - English
- `AR` - Arabic
- `Both` - Both English and Arabic
- Source: `PREFERRED_LANGUAGE_OPTIONS` from `shared/lookup-data.ts`

**Contact Object Structure:**
```typescript
interface ContactPerson {
  id: string;              // Auto-generated unique ID
  name: string;
  jobTitle?: string;
  email?: string;
  mobile?: string;
  landline?: string;
  preferredLanguage?: string;
  source?: string;         // System source (e.g., 'Data Steward')
  by?: string;            // Created by username
  when?: string;          // Timestamp
}
```

---

#### **3. Documents Section (المستندات)**

The documents section allows uploading multiple documents with metadata.

**Document Upload Process:**
1. Click "Upload Document" button
2. Select file from computer
3. Fill document metadata:
   - File Name (editable)
   - Document Type (dropdown)
   - Description (optional)
4. Click "Upload Document" to save

**Document Types (docTypeOptions):**

**Yemen Documents:**
- `yemen_commercial_register` - Yemen - Commercial Registration Certificate
- `yemen_tax_card` - Yemen - Tax Registration Card
- `yemen_chamber_commerce` - Yemen - Chamber of Commerce Certificate
- `yemen_import_export_license` - Yemen - Import Export License
- `yemen_industrial_license` - Yemen - Industrial License
- `yemen_municipality_license` - Yemen - Municipality License

**Egypt Documents:**
- `egypt_commercial_register` - Egypt - Commercial Registration
- `egypt_tax_card` - Egypt - Tax Registration Card
- `egypt_vat_certificate` - Egypt - VAT Registration Certificate
- `egypt_import_register` - Egypt - Importers Register
- `egypt_export_register` - Egypt - Exporters Register
- `egypt_industrial_register` - Egypt - Industrial Register
- `egypt_chamber_commerce` - Egypt - Chamber of Commerce Certificate
- `egypt_gafi_license` - Egypt - GAFI Investment License

**Saudi Arabia Documents:**
- `ksa_commercial_register` - KSA - Commercial Registration (Sijil Tijari)
- `ksa_vat_certificate` - KSA - VAT Registration Certificate
- `ksa_zakat_certificate` - KSA - Zakat and Tax Certificate
- `ksa_chamber_commerce` - KSA - Chamber of Commerce Certificate
- `ksa_municipality_license` - KSA - Municipality License (Baladia)
- `ksa_industrial_license` - KSA - Industrial License
- `ksa_saso_certificate` - KSA - SASO Quality Certificate
- `ksa_nitaqat_certificate` - KSA - Nitaqat Certificate

**UAE Documents:**
- `uae_trade_license` - UAE - Trade License
- `uae_establishment_card` - UAE - Establishment Card
- `uae_chamber_commerce` - UAE - Chamber of Commerce Certificate
- `uae_vat_registration` - UAE - VAT Registration Certificate
- `uae_customs_code` - UAE - Customs Code Certificate
- `uae_economic_license` - UAE - Economic Department License
- `uae_municipality_permit` - UAE - Municipality Permit

**General Documents (All Countries):**
- `bank_account_letter` - Bank Account Verification Letter
- `authorized_signature_list` - Authorized Signatures List
- `power_of_attorney` - Power of Attorney
- `articles_of_association` - Articles of Association
- `board_resolution` - Board Resolution
- `financial_statements` - Audited Financial Statements
- `iso_certificate` - ISO Certification
- `halal_certificate` - Halal Certificate

**Document Object Structure:**
```typescript
interface UploadedDoc {
  id: string;              // Auto-generated unique ID
  name: string;            // File name
  type: string;            // Document type from dropdown
  description: string;     // Optional description
  size: number;           // File size in bytes
  mime: string;           // MIME type (e.g., 'application/pdf')
  uploadedAt: string;     // ISO timestamp
  contentBase64: string;  // Base64 encoded file content
  source?: string;        // System source
  by?: string;           // Uploaded by username
  when?: string;         // Upload timestamp
}
```

**Allowed File Types:**
- PDF: `application/pdf`
- Images: `image/jpeg`, `image/png`, `image/webp`
- Word: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Text: `text/plain`

**Maximum File Size:** 10 MB per file

**Document Actions:**
- **Preview**: View document (for PDF and images)
- **Download**: Download document file
- **Delete**: Remove document (for data entry users only)

---

#### **4. Sales Area Section (منطقة المبيعات)**

| Field Name | Type | Required | Description | API Field Name |
|------------|------|----------|-------------|----------------|
| Sales Organization | Dropdown List | ❌ No | Sales organization | `SalesOrgOption` |
| Distribution Channel | Dropdown List | ❌ No | Distribution channel | `DistributionChannelOption` |
| Division | Dropdown List | ❌ No | Division | `DivisionOption` |

**Sales Organization Options (SalesOrgOption):**

**Yemen Operations:**
- `yemen_main_office` - Yemen - Main Office Sanaa
- `yemen_aden_branch` - Yemen - Aden Branch
- `yemen_taiz_branch` - Yemen - Taiz Branch
- `yemen_hodeidah_branch` - Yemen - Hodeidah Branch
- `yemen_hadramout_branch` - Yemen - Hadramout Branch

**Egypt Operations:**
- `egypt_cairo_office` - Egypt - Cairo Head Office
- `egypt_alexandria_branch` - Egypt - Alexandria Branch
- `egypt_giza_branch` - Egypt - Giza Branch
- `egypt_upper_egypt_branch` - Egypt - Upper Egypt Branch
- `egypt_delta_region_branch` - Egypt - Delta Region Branch

**Saudi Arabia Operations:**
- `ksa_riyadh_office` - Saudi Arabia - Riyadh Office
- `ksa_jeddah_branch` - Saudi Arabia - Jeddah Branch
- `ksa_dammam_branch` - Saudi Arabia - Dammam Branch
- `ksa_makkah_branch` - Saudi Arabia - Makkah Branch
- `ksa_madinah_branch` - Saudi Arabia - Madinah Branch

**UAE Operations:**
- `uae_dubai_office` - UAE - Dubai Office
- `uae_abu_dhabi_branch` - UAE - Abu Dhabi Branch
- `uae_sharjah_branch` - UAE - Sharjah Branch
- `uae_ajman_branch` - UAE - Ajman Branch

**Distribution Channel Options (DistributionChannelOption):**
- `direct_sales` - Direct Sales
- `authorized_distributors` - Authorized Distributors
- `retail_chains` - Retail Chains
- `wholesale_partners` - Wholesale Partners
- `ecommerce_platform` - E-commerce Platform
- `business_to_business` - Business to Business
- `hospitality_sector` - Hotels Restaurants Cafes
- `export_partners` - Export Partners
- `government_contracts` - Government Contracts
- `institutional_sales` - Institutional Sales

**Division Options (DivisionOption):**
- `food_products` - Food Products Division
- `beverages` - Beverages Division
- `dairy_products` - Dairy Products Division
- `biscuits_confectionery` - Biscuits and Confectionery Division
- `pasta_wheat_products` - Pasta and Wheat Products Division
- `cooking_oils_fats` - Cooking Oils and Fats Division
- `detergents_cleaning` - Detergents and Cleaning Products Division
- `personal_care` - Personal Care Products Division
- `industrial_supplies` - Industrial Supplies Division
- `packaging_materials` - Packaging Materials Division

---

### 🔗 Country-City Relationship (ربط الدولة بالمدينة)

The Country and City dropdown lists are **dynamically linked**:

**How it works:**

1. **Initial Load**: City dropdown is empty
2. **Country Selection**: When user selects a country, the `setupCountryCityLogic()` function is triggered
3. **City Filtering**: Cities are filtered using `getCitiesByCountry(selectedCountry)` function from `shared/lookup-data.ts`
4. **City Reset**: If country changes and current city is invalid, city is reset to null
5. **Validation**: City options are automatically filtered based on country

**Technical Implementation:**
```typescript
// Country change listener
this.requestForm.get('country')?.valueChanges.subscribe(selectedCountry => {
  // Filter cities by country
  this.filteredCityOptions = getCitiesByCountry(selectedCountry || '');
  
  // Reset city if not valid for new country
  const currentCity = this.requestForm.get('city')?.value;
  const cityStillValid = this.filteredCityOptions.some(o => o.value === currentCity);
  if (!cityStillValid) {
    this.requestForm.get('city')?.setValue(null);
  }
});
```

**Country-City Mapping:**
```typescript
CITY_OPTIONS = {
  'Egypt': [
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Alexandria', label: 'Alexandria' },
    { value: 'Giza', label: 'Giza' },
    { value: 'Luxor', label: 'Luxor' }
  ],
  'Saudi Arabia': [
    { value: 'Riyadh', label: 'Riyadh' },
    { value: 'Jeddah', label: 'Jeddah' },
    { value: 'Mecca', label: 'Mecca' },
    { value: 'Dammam', label: 'Dammam' }
  ],
  'United Arab Emirates': [
    { value: 'Dubai', label: 'Dubai' },
    { value: 'Abu Dhabi', label: 'Abu Dhabi' },
    { value: 'Sharjah', label: 'Sharjah' },
    { value: 'Ajman', label: 'Ajman' }
  ],
  'Yemen': [
    { value: 'Sanaa', label: 'Sanaa' },
    { value: 'Aden', label: 'Aden' },
    { value: 'Taiz', label: 'Taiz' }
  ]
};
```

---

### 🔍 Duplicate Detection Rules (قواعد كشف التكرار)

The system has **real-time duplicate detection** to prevent duplicate customer records:

#### **Detection Logic:**

**Primary Keys for Duplicate Check:**
1. **Tax Number** (`tax` field)
2. **Customer Type** (`CustomerType` field)

**When Duplicate Check is Triggered:**
- When user enters/changes tax number
- When user selects/changes customer type
- Automatically after both fields have values

**Detection Process:**
1. Form monitors `tax` and `CustomerType` fields via `valueChanges`
2. When both have values, `validateForDuplicateImmediate()` is called
3. API call to `POST /api/requests/check-duplicate` with payload:
   ```json
   {
     "tax": "123456789",
     "CustomerType": "Corporate"
   }
   ```
4. API queries golden records (`isGolden = 1`) for matching records
5. If match found, duplicate warning is displayed

**Customer Type Mapping:**
The API performs mapping for legacy values:
```javascript
const customerTypeMapping = {
  'limited_liability': 'Limited Liability Company',
  'joint_stock': 'Joint Stock Company',
  'sole_proprietorship': 'Sole Proprietorship',
  'Corporate': 'Corporate',
  'SME': 'SME',
  'Retail Chain': 'Retail Chain'
};
```

#### **Duplicate Warning Messages:**

**When Duplicate is Found:**
```html
⚠️ DUPLICATE FOUND:
Existing Customer: [Company Name]
Tax Number: [Tax Number]
Type: [Customer Type]

[View Duplicate Details Button]
```

**Duplicate Warning Display:**
- Background: Light red (`#fff2f0`)
- Border: Left border red (`#ff4d4f`)
- Icon: Warning emoji (⚠️)
- Action Button: "View Duplicate Details" (blue)

**Submit Button Behavior:**
- **Enabled**: When no duplicate found or fields incomplete
- **Disabled**: When duplicate is found (`hasDuplicate = true`)
- Disable Logic: `isSubmitDisabled() { return this.hasDuplicate || this.isLoading; }`

---

### 📡 APIs Used for New Customer Request

#### **1. Check Duplicate API**

**Endpoint:** `POST /api/requests/check-duplicate`

**Purpose:** Check if a customer with the same tax number and customer type already exists in golden records

**Request Body:**
```json
{
  "tax": "string",
  "CustomerType": "string"
}
```

**Response (Duplicate Found):**
```json
{
  "isDuplicate": true,
  "message": "A customer with this tax number and type already exists in golden records.",
  "existingRecord": {
    "id": "string",
    "firstName": "string",
    "tax": "string",
    "CustomerType": "string",
    "country": "string",
    "city": "string"
  }
}
```

**Response (No Duplicate):**
```json
{
  "isDuplicate": false,
  "message": "No duplicate found"
}
```

**Error Response:**
```json
{
  "error": "Tax number and Customer Type are required"
}
```

---

#### **2. Create Request API**

**Endpoint:** `POST /api/requests`

**Purpose:** Create a new customer request

**Request Body:**
```json
{
  "firstName": "string",
  "firstNameAR": "string",
  "tax": "string",
  "CustomerType": "string",
  "CompanyOwnerFullName": "string",
  "buildingNumber": "string",
  "street": "string",
  "country": "string",
  "city": "string",
  "SalesOrgOption": "string",
  "DistributionChannelOption": "string",
  "DivisionOption": "string",
  "contacts": [
    {
      "id": "string",
      "name": "string",
      "jobTitle": "string",
      "email": "string",
      "mobile": "string",
      "landline": "string",
      "preferredLanguage": "string"
    }
  ],
  "documents": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "description": "string",
      "size": number,
      "mime": "string",
      "uploadedAt": "string",
      "contentBase64": "string"
    }
  ],
  "origin": "dataEntry",
  "sourceSystem": "Data Steward",
  "createdBy": "string",
  "status": "Pending",
  "assignedTo": "reviewer"
}
```

**Response (Success):**
```json
{
  "id": "unique-request-id",
  "message": "Request created successfully"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

#### **3. Get Request API**

**Endpoint:** `GET /api/requests/:id`

**Purpose:** Retrieve a specific customer request

**Response:**
```json
{
  "id": "string",
  "requestId": "string",
  "firstName": "string",
  "firstNameAr": "string",
  "tax": "string",
  "CustomerType": "string",
  "CompanyOwner": "string",
  "buildingNumber": "string",
  "street": "string",
  "country": "string",
  "city": "string",
  "status": "string",
  "contacts": [...],
  "documents": [...],
  "createdAt": "ISO timestamp",
  "createdBy": "string"
}
```

---

#### **4. Update Request API**

**Endpoint:** `POST /api/requests/:id/resubmit`

**Purpose:** Update and resubmit an existing request (for rejected/quarantined records)

**Request Body:** Same as Create Request API

**Response:**
```json
{
  "message": "Request updated and resubmitted successfully"
}
```

---

#### **5. Auto-Translate API**

**Endpoint:** Internal service - `AutoTranslateService`

**Purpose:** Translate company name from English to Arabic

**Method:** `translateToArabic()`

**Implementation:**
```typescript
async translateToArabic(): Promise<void> {
  const englishName = this.requestForm.get('firstName')?.value;
  if (englishName) {
    try {
      const arabicName = await this.autoTranslate.translateToArabic(englishName);
      this.requestForm.get('firstNameAR')?.setValue(arabicName);
      this.msg.success('Translation completed');
    } catch (error) {
      this.msg.error('Translation failed');
    }
  }
}
```

---

### 🎲 Demo Data Generation

The system includes a **Demo Data Generator Service** for testing and demonstration purposes.

#### **How Demo Data Works:**

1. **Service**: `DemoDataGeneratorService` (located in `services/demo-data-generator.service.ts`)
2. **Keyboard Shortcut**: Press `Ctrl + Shift + D` to auto-fill the form with demo data
3. **Data Pool**: Service contains a predefined list of demo companies
4. **Random Selection**: Each time demo data is triggered, a random company is selected
5. **Sequential Loading**: Companies are loaded sequentially to avoid repetition

#### **Demo Data Structure:**

```typescript
interface DemoCompany {
  name: string;              // Company name (English)
  nameAr: string;           // Company name (Arabic)
  tax: string;              // Tax number (format: XXX-XXX-XXX)
  customerType: string;     // Customer type
  companyOwner: string;     // Owner name
  buildingNumber: string;   // Building number
  street: string;           // Street name
  country: string;          // Country
  city: string;             // City
  salesOrg: string;         // Sales organization
  distributionChannel: string; // Distribution channel
  division: string;         // Division
  contacts: Array<{         // Contact persons
    name: string;
    jobTitle: string;
    email: string;
    mobile: string;
    landline: string;
    preferredLanguage: string;
  }>;
  documents: Array<{        // Documents metadata
    name: string;
    type: string;
    description: string;
  }>;
}
```

#### **Demo Companies List:**

The system includes demo companies from various countries:

**Egypt Companies:**
1. Al Ahram Beverages Company
2. Egyptian Steel
3. Cairo Pharmaceutical Industries
4. Delta Sugar Company
5. Alexandria Containers

**Saudi Arabia Companies:**
1. Saudi Dairy & Foodstuff Company (SADAFCO)
2. National Gas & Industrialization Company (GASAN)
3. Saudi Industrial Investment Group
4. Riyadh Cables Group Company
5. Jeddah Pharmaceutical Company

**UAE Companies:**
1. Emirates Steel Industries
2. Al Ain Water Company
3. Dubai Refreshments Company
4. Sharjah Cement Factory
5. Abu Dhabi Food Industries

**Yemen Companies:**
1. Yemen Soft Drinks Industries
2. Yemen Company for Industry and Commerce
3. Yemen Tobacco and Matches Company
4. National Company for Grain Industry
5. Yemen Company for Cement Industry

#### **Demo Data Features:**

- **Complete Form Fill**: Fills all required and optional fields
- **Multiple Contacts**: Each company has 2-3 pre-defined contacts
- **Document Templates**: Provides document names and types
- **Country-City Sync**: Automatically sets correct city for selected country
- **Realistic Data**: Uses real-looking company names and information
- **No Duplicates**: Sequential loading ensures no repetition within a session
- **Reset Capability**: Can reset and reload the demo data pool

#### **Keyboard Shortcut Implementation:**

```typescript
private setupKeyboardAutoFill(): void {
  if (isPlatformBrowser(this.platformId)) {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl + Shift + D
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.fillDemoData();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
  }
}
```

#### **Demo Data API Integration:**

Demo data does NOT require special APIs. It simply:
1. Fills the form fields with demo values
2. Creates contact FormGroups with demo contacts
3. User can then submit the form normally
4. Follows the same validation and submission flow

---

### ✅ Validation Rules Summary

| Field | Required | Validation Type | Special Rules |
|-------|----------|----------------|---------------|
| firstName | Yes | Non-empty | - |
| firstNameAR | Yes | Non-empty | - |
| tax | Yes | Non-empty | Used in duplicate check |
| CustomerType | Yes | Dropdown selection | Used in duplicate check |
| CompanyOwnerFullName | Yes | Non-empty | - |
| country | Yes | Dropdown selection | Controls city options |
| city | Yes | Dropdown selection | Filtered by country |
| buildingNumber | No | - | - |
| street | No | - | - |
| SalesOrgOption | No | - | - |
| DistributionChannelOption | No | - | - |
| DivisionOption | No | - | - |
| contacts | No | Array | Optional, can be empty |
| documents | No | Array | Optional, can be empty |

---

### 🔄 Form Submission Flow

1. **User fills form** with required fields
2. **Duplicate check** runs automatically when tax + CustomerType are entered
3. **Validation** checks all required fields
4. **Submit button** is enabled only when:
   - All required fields are filled
   - No duplicate found (`hasDuplicate = false`)
   - Not currently loading (`isLoading = false`)
5. **Submit request** calls `POST /api/requests`
6. **Response handling**:
   - Success: Show success message and redirect
   - Error: Show error message and keep form open
7. **Status change** to "Pending" and assigned to "reviewer"

---

### 📝 Important Notes for AI Agents

1. **Duplicate Detection is Critical**: Always check for duplicates before submission
2. **Country-City Relationship**: City must be valid for selected country
3. **Dynamic Arrays**: Contacts and documents are arrays that can have 0 to many items
4. **Document Upload**: Files must be base64 encoded in the request
5. **Demo Data**: Use demo data for testing but ensure it doesn't create real records
6. **Validation**: Respect required fields and dropdown options
7. **API Endpoints**: Use correct API endpoints with proper HTTP methods
8. **Error Handling**: Handle API errors gracefully
9. **User Role**: Only data entry users can create new requests
10. **Form State**: Track form state (new, edit, view) for proper UI behavior

---

*This documentation is maintained and updated regularly. For questions or contributions, please contact the development team.*
