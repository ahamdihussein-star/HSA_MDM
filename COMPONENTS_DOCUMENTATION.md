# Master Data Management System - Components Documentation

## 🏗️ All Components - Complete Analysis

### New: User Profile Module

Files:
- `src/app/user-profile/user-profile.module.ts`
- `src/app/user-profile/user-profile.component.ts`
- `src/app/user-profile/user-profile.component.html`
- `src/app/user-profile/user-profile.component.scss`

Routing:
- Added lazy route `dashboard/profile` in `src/app/dashboard/dashboard-routing.module.ts`.

Header Integration:
- `src/app/header/header.component.html` adds a Profile link in the avatar dropdown to navigate to `/dashboard/profile`.

Features:
- View personal info (username, fullName, email, role, status, createdAt) and avatar preview.
- Edit modal for fullName, email, role and avatar.
- Separate Change Password modal for current/new/confirm password.

Key Methods:
- `openEditModal()`: prepares `userForm` and shows modal.
- `onAvatarSelected(event)`: validates image and reads as Base64.
- `uploadAvatar(base64)`: POSTs to `/api/users/upload-avatar`, sets preview, builds absolute URL, updates `currentUser.avatarUrl`, then calls `saveAvatarToDatabase`.
- `saveAvatarToDatabase(url)`: PUT `/api/users/:id` with `{ avatarUrl: url }`.
- `handleSave()`: persists profile changes `{ fullName, email, role, avatarUrl? }`.
- `openPasswordModal()` and `handlePasswordSave()`: PUT `/api/users/:id/password`.

Backend Endpoints (api/better-sqlite-server.js):
- `POST /api/users/upload-avatar` – `{ fileBase64, filename }` → writes file in `api/uploads` and returns `{ url }`.
- `PUT /api/users/:id` – dynamic updates, includes `avatarUrl` column.
- `PUT /api/users/:id/password` – demo-only password update.

Notes:
- Static files served at `/uploads`; the client ensures the `<img>` gets a full `http://localhost:3001/uploads/...` URL.

### 1. **Login Component** (`LoginComponent`)
**File**: `src/app/login/login.component.ts`
**Lines**: 1-195

#### Properties:
- `loginForm!: FormGroup` - Reactive form for login
- `loading = false` - Loading state
- `private apiBase` - API base URL

#### Functions:
- `ngOnInit(): void` - Initialize login form
- `clearSession(): void` - Clear session data
- `isDemoAdmin(username: string): boolean` - Check demo admin
- `onSubmit(): Promise<void>` - Handle login submission

### 2. **Dashboard Component** (`DashboardComponent`)
**File**: `src/app/dashboard/dashboard.component.ts`
**Lines**: 1-409

#### Properties:
- `currentUser: any` - Current user data
- `userRole: string` - User role
- `isLoading: boolean` - Loading state
- `navigationItems: any[]` - Navigation menu items

#### Functions:
- `ngOnInit(): void` - Initialize dashboard
- `loadCurrentUser(): void` - Load current user
- `navigateToPage(page: string): void` - Navigate to page
- `logout(): void` - Handle logout

### 3. **Golden Summary Component** (`GoldenSummaryComponent`)
**File**: `src/app/dashboard/golden-summary/golden-summary.component.ts`
**Lines**: 1-1293

#### Properties:
- `record: any` - Golden record data
- `loading: boolean` - Loading state
- `isEmbedded: boolean` - Embedded mode
- `documents: any[]` - Associated documents
- `contacts: any[]` - Associated contacts
- `history: any[]` - Record history

#### Functions:
- `ngOnInit(): Promise<void>` - Initialize component
- `loadRecord(id: string): Promise<void>` - Load record data
- `loadDocuments(): Promise<void>` - Load documents
- `loadContacts(): Promise<void>` - Load contacts
- `loadHistory(): Promise<void>` - Load history
- `downloadDocument(doc: any): void` - Download document
- `previewDocument(doc: any): void` - Preview document
- `editRecord(): void` - Edit record
- `deleteRecord(): Promise<void>` - Delete record
- `approveRecord(): Promise<void>` - Approve record
- `rejectRecord(): Promise<void>` - Reject record
- `blockRecord(): Promise<void>` - Block record
- `unblockRecord(): Promise<void>` - Unblock record

### 4. **Golden Requests Component** (`GoldenRequestsComponent`)
**File**: `src/app/golden-requests/golden-requests.component.ts`
**Lines**: 1-675

#### Properties:
- `records: any[]` - Golden records list
- `loading: boolean` - Loading state
- `totalRecords: number` - Total records count
- `currentPage: number` - Current page
- `pageSize: number` - Page size
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadRecords(): Promise<void>` - Load records
- `onPageChange(page: number): void` - Handle page change
- `onFilterChange(filters: any): void` - Handle filter change
- `viewRecord(record: any): void` - View record
- `editRecord(record: any): void` - Edit record
- `deleteRecord(record: any): Promise<void>` - Delete record
- `exportRecords(): void` - Export records

### 5. **My Task List Component** (`MyTaskListComponent`)
**File**: `src/app/my-task-list/my-task-list.component.ts`
**Lines**: 1-770

#### Properties:
- `tasks: any[]` - Task list
- `loading: boolean` - Loading state
- `userRole: string` - User role
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadTasks(): Promise<void>` - Load tasks
- `updateTaskStatus(task: any, status: string): Promise<void>` - Update task status
- `viewTask(task: any): void` - View task
- `editTask(task: any): void` - Edit task
- `completeTask(task: any): Promise<void>` - Complete task

### 6. **Admin Task List Component** (`AdminTaskListComponent`)
**File**: `src/app/admin-task-list/admin-task-list.component.ts`
**Lines**: 1-500

#### Properties:
- `allTasks: any[]` - All system tasks
- `loading: boolean` - Loading state
- `userRole: string` - User role
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadAllTasks(): Promise<void>` - Load all tasks
- `assignTask(task: any, user: string): Promise<void>` - Assign task
- `reassignTask(task: any, newUser: string): Promise<void>` - Reassign task
- `bulkUpdateTasks(tasks: any[], action: string): Promise<void>` - Bulk update tasks

### 7. **Duplicate Records Component** (`DuplicateRecordsComponent`)
**File**: `src/app/duplicate-records/duplicate-records.component.ts`
**Lines**: 1-400

#### Properties:
- `duplicates: any[]` - Duplicate records
- `loading: boolean` - Loading state
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadDuplicateRecords(): Promise<void>` - Load duplicates
- `resolveDuplicate(record: any, action: string): Promise<void>` - Resolve duplicate
- `mergeRecords(records: any[]): Promise<void>` - Merge records
- `separateRecords(records: any[]): Promise<void>` - Separate records

### 8. **Duplicate Customer Component** (`DuplicateCustomerComponent`)
**File**: `src/app/duplicate-customer/duplicate-customer.component.ts`
**Lines**: 1-2039

#### Properties:
- `records: any[]` - Customer records
- `linkedRecords: any[]` - Linked records
- `quarantineRecords: any[]` - Quarantine records
- `masterRecordData: any` - Master record data
- `currentStep: number` - Current step
- `showEditModal: boolean` - Edit modal state
- `editingRecord: any` - Currently editing record
- `loading: boolean` - Loading state
- `activeTab: string` - Active tab
- `expandedFields: string[]` - Expanded fields
- `showHelp: boolean` - Help visibility
- `showDocumentPreviewModal: boolean` - Document preview modal
- `selectedDocument: any` - Selected document
- `showSuccessModal: boolean` - Success modal
- `successMessage: string` - Success message
- `focusedField: string | null` - Focused field
- `showRejectModal: boolean` - Reject modal
- `rejectionReason: string` - Rejection reason
- `processing: boolean` - Processing state
- `currentRecordId: string` - Current record ID
- `showComplianceActions: boolean` - Compliance actions
- `showActiveModal: boolean` - Active modal
- `showBlockModal: boolean` - Block modal
- `blockReason: string` - Block reason
- `approvalNote: string` - Approval note
- `progressSteps` - Progress steps
- `selectedMasterRecordId: string | null` - Selected master record
- `selectedFields: { [key: string]: string }` - Selected fields
- `manualFields: { [key: string]: string }` - Manual fields

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadDuplicateCustomers(): Promise<void>` - Load duplicate customers
- `buildMasterRecord(): Promise<void>` - Build master record
- `resolveFieldConflict(field: string, value: string): void` - Resolve field conflict
- `linkRecords(records: any[]): Promise<void>` - Link records
- `editRecord(record: any): void` - Edit record
- `saveRecord(): Promise<void>` - Save record
- `deleteRecord(record: any): Promise<void>` - Delete record
- `previewDocument(doc: any): void` - Preview document
- `downloadDocument(doc: any): void` - Download document
- `approveRecord(): Promise<void>` - Approve record
- `rejectRecord(): Promise<void>` - Reject record
- `blockRecord(): Promise<void>` - Block record
- `unblockRecord(): Promise<void>` - Unblock record

### 9. **Quarantine Component** (`QuarantineComponent`)
**File**: `src/app/quarantine/quarantine.component.ts`
**Lines**: 1-300

#### Properties:
- `quarantineRecords: any[]` - Quarantine records
- `loading: boolean` - Loading state
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadQuarantinedRecords(): Promise<void>` - Load quarantined records
- `resolveQuarantine(record: any, action: string): Promise<void>` - Resolve quarantine
- `releaseFromQuarantine(record: any): Promise<void>` - Release from quarantine

### 10. **Rejected Component** (`RejectedComponent`)
**File**: `src/app/rejected/rejected.component.ts`
**Lines**: 1-400

#### Properties:
- `rejectedRecords: any[]` - Rejected records
- `loading: boolean` - Loading state
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadRejectedRecords(): Promise<void>` - Load rejected records
- `resubmitRecord(record: any): Promise<void>` - Resubmit record
- `improveRecord(record: any): void` - Improve record

### 11. **Compliance Component** (`ComplianceComponent`)
**File**: `src/app/compliance/compliance.component.ts`
**Lines**: 1-500

#### Properties:
- `complianceTasks: any[]` - Compliance tasks
- `loading: boolean` - Loading state
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadComplianceTasks(): Promise<void>` - Load compliance tasks
- `approveCompliance(task: any): Promise<void>` - Approve compliance
- `rejectCompliance(task: any, reason: string): Promise<void>` - Reject compliance

### 12. **Data Lineage Component** (`DataLineageComponent`)
**File**: `src/app/data-lineage/data-lineage.component.ts`
**Lines**: 1-2233

#### Properties:
- `lineageData: any` - Lineage data
- `loading: boolean` - Loading state
- `selectedRecord: any` - Selected record
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadLineageData(): Promise<void>` - Load lineage data
- `trackDataFlow(recordId: string): void` - Track data flow
- `analyzeImpact(recordId: string): void` - Analyze impact

### 13. **Business Dashboard Component** (`BusinessDashboardComponent`)
**File**: `src/app/business-dashboard/business-dashboard.component.ts`
**Lines**: 1-833

#### Properties:
- `businessMetrics: any` - Business metrics
- `loading: boolean` - Loading state
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadBusinessMetrics(): Promise<void>` - Load business metrics
- `generateReport(reportType: string): Promise<void>` - Generate report

### 14. **Executive Dashboard Component** (`ExecutiveDashboardComponent`)
**File**: `src/app/executive-dashboard/executive-dashboard.component.ts`
**Lines**: 1-500

#### Properties:
- `executiveMetrics: any` - Executive metrics
- `loading: boolean` - Loading state
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadExecutiveMetrics(): Promise<void>` - Load executive metrics

### 15. **Technical Dashboard Component** (`TechnicalDashboardComponent`)
**File**: `src/app/technical-dashboard/technical-dashboard.component.ts`
**Lines**: 1-400

#### Properties:
- `technicalMetrics: any` - Technical metrics
- `loading: boolean` - Loading state
- `filters: any` - Filter criteria

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadTechnicalMetrics(): Promise<void>` - Load technical metrics

### 16. **AI Assistant Component** (`AiAssistantComponent`)
**File**: `src/app/ai-assistant/ai-assistant.component.ts`
**Lines**: 1-437

#### Properties:
- `chatHistory: any[]` - Chat history
- `currentMessage: string` - Current message
- `loading: boolean` - Loading state
- `isTyping: boolean` - Typing state

#### Functions:
- `ngOnInit(): void` - Initialize component
- `sendMessage(message: string): Promise<void>` - Send message
- `clearChat(): void` - Clear chat
- `exportChat(): void` - Export chat

### 17. **Sync Golden Records Component** (`SyncGoldenRecordsComponent`)
**File**: `src/app/sync-golden-records/sync-golden-records.component.ts`
**Lines**: 1-1277

#### Properties:
- `totalGoldenRecords: number` - Total golden records
- `totalSynced: number` - Total synced
- `pendingSync: number` - Pending sync
- `connectedSystems: number` - Connected systems
- `activeSystems: string[]` - Active systems
- `syncPercentage: number` - Sync percentage
- `stats: any` - Statistics
- `targetSystems: TargetSystem[]` - Target systems
- `selectedSystem: TargetSystem | null` - Selected system
- `selectedSystems: string[]` - Selected systems
- `systemTargets: TargetSystem[]` - System targets
- `sourceSystemOptions` - Source system options
- `countryOptions` - Country options
- `customerTypeOptions` - Customer type options

#### Functions:
- `ngOnInit(): void` - Initialize component
- `loadSyncRules(): Promise<void>` - Load sync rules
- `executeSync(ruleId: string): Promise<void>` - Execute sync
- `monitorSync(operationId: string): void` - Monitor sync
- `createSyncRule(): void` - Create sync rule
- `editSyncRule(rule: any): void` - Edit sync rule
- `deleteSyncRule(ruleId: string): Promise<void>` - Delete sync rule
- `viewSyncHistory(): void` - View sync history
- `clearSyncData(): Promise<void>` - Clear sync data

---

## 🔄 Business Logic - Complete Analysis

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

### User Roles & Permissions
- **Data Entry**: Create and edit requests
- **Reviewer**: Review and approve/reject requests
- **Compliance**: Final compliance checks
- **Admin**: Full system access
- **Manager**: Business management and reporting

---

*This documentation covers all components, functions, properties, and business logic in the Master Data Management System with complete details.*
