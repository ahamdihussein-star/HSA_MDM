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

*This documentation is maintained and updated regularly. For questions or contributions, please contact the development team.*
