# Notification System & Task Lists - Complete Guide
## Master Data Management - October 2025

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Notification System Architecture](#notification-system-architecture)
3. [When Each User Gets Notified](#when-each-user-gets-notified)
4. [Task Lists Explained](#task-lists-explained)
5. [Notification Service](#notification-service)
6. [Notification Display Component](#notification-display-component)
7. [Backend APIs](#backend-apis)
8. [Complete Flow Diagrams](#complete-flow-diagrams)

---

## 🎯 Overview

### System Philosophy
**"One Task = One Notification to the Assigned User"**

### Business Objective
Ensure every user knows immediately when they have work to do, without overwhelming them with unnecessary notifications.

### Key Principle
```
Users are notified ONLY when:
1. A new task is assigned to them
2. The task requires their action
3. The task is in their responsibility area
```

---

## 🏗️ Notification System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │  Components      │  │  Notification Service       │  │
│  │  - new-request   │──│  - sendTaskNotification()   │  │
│  │  - admin-task    │  │  - addNotification()        │  │
│  │  - compliance    │  │  - markAsRead()             │  │
│  │  - duplicate     │  │  - getNotifications()       │  │
│  │  - AI agent      │  └─────────────────────────────┘  │
│  └──────────────────┘            │                       │
│                                  ↓                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Notification Dropdown Component                │    │
│  │  - Display notifications in header              │    │
│  │  - Show unread count badge                      │    │
│  │  - Mark as read on click                        │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│                    Backend Layer                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │  Notification APIs (6 endpoints)                │    │
│  │  - GET /api/notifications                       │    │
│  │  - POST /api/notifications                      │    │
│  │  - PUT /api/notifications/:id/read              │    │
│  │  - PUT /api/notifications/read-all              │    │
│  │  - DELETE /api/notifications/:id                │    │
│  │  - GET /api/notifications/unread-count          │    │
│  └─────────────────────────────────────────────────┘    │
│                            ↓                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │  notifications Table (Database)                 │    │
│  │  - id, userId, companyName, status, message     │    │
│  │  - isRead, taskId, timestamp                    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔔 When Each User Gets Notified

### User 1: Data Entry (userId = '1')

**Role**: Create customer requests  
**Username**: `data_entry`  
**Task List Page**: `/dashboard/my-task-list` (My Task List)

#### When Notified:
**✅ Only ONE scenario**: When their request is rejected by reviewer

**Notification Trigger**:
```typescript
// When: Reviewer rejects a request
// Component: admin-task-list.component.ts (Reviewer)
// Method: rejectRequest()

rejectRequest(request: any, reason: string) {
  // Reject API call
  this.http.post(`/api/requests/${request.id}/reject`, { 
    rejectReason: reason 
  }).subscribe(() => {
    
    // ⭐ NOTIFICATION SENT HERE ⭐
    this.notificationService.sendTaskNotification({
      userId: '1',                    // Data Entry user
      companyName: request.firstName,
      type: 'request_rejected',
      link: `/dashboard/quarantine`,
      message: `Your request for ${request.firstName} was rejected and needs revision`
    });
  });
}
```

**Notification Message**:
```
"Your request for [Company Name] was rejected and needs revision"
```

**What Data Entry Sees**:
1. Notification appears in header dropdown (🔔 badge with count)
2. Task appears in "My Task List" page
3. Status: "Quarantine"
4. Action: Click to edit and resubmit

**Business Rule**: Data entry ONLY notified for rejections (their work to fix)

---

### User 2: Reviewer (userId = '2')

**Role**: Review and approve/reject requests  
**Username**: `reviewer`  
**Task List Page**: `/dashboard/admin-task-list` ⭐ **Important: This is the REVIEWER'S task list**

#### When Notified:
**✅ Only ONE scenario**: When a new request arrives for review

**Notification Trigger Points** (3 sources):

**Source 1: Manual Entry (New Request Page)**
```typescript
// Component: new-request.component.ts
// Method: submitRequest() (after successful submission)

submitRequest() {
  this.http.post('/api/requests', requestData).subscribe(response => {
    
    // ⭐ NOTIFICATION SENT HERE ⭐
    this.notificationService.sendTaskNotification({
      userId: '2',                    // Reviewer
      companyName: this.requestForm.get('firstName')?.value,
      type: 'request_created',
      link: `/dashboard/admin-task-list`,
      message: `New request for ${companyName} awaits your review`
    });
  });
}
```

**Source 2: AI Agent**
```typescript
// Service: data-entry-agent.service.ts
// Method: submitCustomerRequest() → notifyReviewerOnCreation()

private notifyReviewerOnCreation(requestId: string): void {
  const companyName = this.extractedData?.firstName || 'Request';
  
  // ⭐ NOTIFICATION SENT HERE ⭐
  this.notificationService.sendTaskNotification({
    userId: '2',                    // Reviewer
    companyName,
    type: 'request_created',
    link: `/dashboard/new-request/${requestId}`,
    message: `New request for ${companyName} awaits your review`
  });
}
```

**Source 3: Duplicate/Quarantine Resubmission**
```typescript
// Component: duplicate-customer.component.ts
// Method: submitMasterRecord() (after duplicate resolution)

submitMasterRecord(masterData: any) {
  this.http.post('/api/duplicates/resubmit-master', masterData).subscribe(response => {
    
    // ⭐ NOTIFICATION SENT HERE ⭐
    this.notificationService.sendTaskNotification({
      userId: '2',                    // Reviewer
      companyName: masterData.firstName,
      type: 'request_created',
      link: `/dashboard/new-request/${response.id}`,
      message: `New request for ${companyName} needs your review`
    });
  });
}
```

**Notification Message**:
```
"New request for [Company Name] awaits your review"
or
"New request for [Company Name] needs your review"
```

**What Reviewer Sees**:
1. Notification in header dropdown
2. Task appears in "Admin Task List" page ⭐
3. Status: "Pending"
4. Action: Review → Approve or Reject

**Business Rule**: Reviewer notified for ALL new submissions (their work to review)

---

### User 3: Compliance (userId = '3')

**Role**: Final approval and golden record creation  
**Username**: `compliance`  
**Task List Page**: `/dashboard/compliance` (Compliance Task List)

#### When Notified:
**✅ Only ONE scenario**: When reviewer approves a request

**Notification Trigger Points** (2 sources):

**Source 1: Regular Request Approval**
```typescript
// Component: admin-task-list.component.ts (Reviewer)
// Method: approveRequest()

approveRequest(request: any) {
  this.http.post(`/api/requests/${request.id}/approve`, {
    reviewedBy: this.currentUser.username
  }).subscribe(() => {
    
    // ⭐ NOTIFICATION SENT HERE ⭐
    this.notificationService.sendTaskNotification({
      userId: '3',                    // Compliance
      companyName: request.firstName,
      type: 'compliance_review',
      link: `/dashboard/compliance`,
      message: `Approved request for ${request.firstName} needs compliance review`
    });
  });
}
```

**Source 2: Duplicate Master Record Approval**
```typescript
// Component: duplicate-customer.component.ts
// Method: approveMasterAsActiveGoldenRecord()

approveMasterAsActiveGoldenRecord() {
  this.http.post(`/api/requests/${this.currentRecordId}/approve`, {}).subscribe(() => {
    
    // ⭐ NOTIFICATION SENT HERE ⭐
    this.notificationService.sendTaskNotification({
      userId: '3',                    // Compliance
      companyName: this.masterRecordData?.firstName,
      type: 'compliance_review',
      link: `/dashboard/new-request/${this.currentRecordId}?action=compliance-review`,
      message: `Approved request for ${companyName} needs compliance review`
    });
  });
}
```

**Notification Message**:
```
"Approved request for [Company Name] needs compliance review"
```

**What Compliance Sees**:
1. Notification in header dropdown
2. Task appears in "Compliance Task List" page
3. Status: "Approved"
4. Action: Final approve (create golden record) or Block

**Business Rule**: Compliance notified ONLY for approved requests (their work to finalize)

---

## 📊 Task Lists Explained

### ⚠️ **Important Clarification**:

**Admin Task List** = **Reviewer Task List**  
**Route**: `/dashboard/admin-task-list`  
**Used By**: Reviewer (userId = 2)  
**NOT for**: Admin role

---

### Task List 1: My Task List (Data Entry)

**Component**: `src/app/my-task-list/my-task-list.component.ts`  
**Route**: `/dashboard/my-task-list`  
**User**: Data Entry (userId = 1)  
**Username**: `data_entry`

#### Display Criteria (SQL-like)
```sql
SELECT * FROM requests
WHERE (
  -- Regular rejected requests
  (status = 'Rejected' 
   AND assignedTo = 'data_entry'
   AND requestType NOT IN ('duplicate', 'quarantine'))
  
  OR
  
  -- Duplicate records that were rejected
  (requestType = 'duplicate' 
   AND status = 'Rejected'
   AND assignedTo = 'data_entry')
  
  OR
  
  -- Quarantine records (rejected by reviewer)
  ((requestType = 'quarantine' OR originalRequestType = 'quarantine')
   AND status = 'Rejected'
   AND assignedTo = 'data_entry')
)
ORDER BY createdAt DESC
```

**Implementation Code**:
```typescript
// src/app/my-task-list/my-task-list.component.ts (line 120)

async loadMyRequests(): Promise<void> {
  this.apiRepo.list().subscribe((data: any[]) => {
    
    // Filter rejected requests assigned to data_entry
    const rejectedRequests = (data || []).filter(r => {
      
      // Check if assigned to data entry
      const isAssignedToDataEntry = r.assignedTo === 'data_entry' || 
                                    r.assignedTo === 'system_import' || 
                                    !r.assignedTo;
      
      // Regular rejected requests
      const isRegularRejected = r.status === 'Rejected' && 
                               isAssignedToDataEntry && 
                               r.requestType !== 'duplicate' &&
                               r.requestType !== 'quarantine';
      
      // Duplicate records that were rejected
      const isDuplicateRejected = r.requestType === 'duplicate' && 
                                  r.status === 'Rejected' &&
                                  isAssignedToDataEntry;
      
      // Quarantine records
      const isQuarantineRejected = (r.requestType === 'quarantine' || 
                                    r.originalRequestType === 'quarantine') && 
                                   r.status === 'Rejected' &&
                                   isAssignedToDataEntry;
      
      return isRegularRejected || isDuplicateRejected || isQuarantineRejected;
    });
    
    this.rows = rejectedRequests;
    this.loading = false;
  });
}
```

**What Data Entry Sees**:
- All their rejected requests that need correction
- Categorized by type:
  - Rejected New Request
  - Rejected Duplicate
  - Rejected Quarantine

**Actions Available**:
- ✅ Edit request
- ✅ Resubmit for review
- ✅ View details

**Business Rule**: Data entry sees ONLY their own rejected requests

---

### Task List 2: Admin Task List ⭐ (Actually REVIEWER Task List)

**Component**: `src/app/admin-task-list/admin-task-list.component.ts`  
**Route**: `/dashboard/admin-task-list`  
**User**: Reviewer (userId = 2) ⭐⭐⭐  
**Username**: `reviewer`

⚠️ **Important**: Despite the name "Admin Task List", this is the **REVIEWER'S** task list!

#### Display Criteria (SQL-like)
```sql
SELECT * FROM requests
WHERE assignedTo = 'reviewer'
  AND (
    -- Pending requests (new submissions)
    (status = 'Pending' AND masterId IS NULL)
    
    OR
    
    -- Quarantined requests (need re-review after correction)
    (status = 'Quarantined' AND masterId IS NULL)
    
    OR
    
    -- Master records (from duplicate resolution)
    (isMaster = 1)
  )
ORDER BY createdAt DESC
```

**Implementation Code**:
```typescript
// src/app/admin-task-list/admin-task-list.component.ts (line 152)

async load(): Promise<void> {
  const list = await firstValueFrom(this.repo.list());
  const rows = Array.isArray(list) ? list : [];
  
  // Filter for tasks that should appear in reviewer task list
  this.taskList = rows.filter(r => {
    const status = (r.status ?? '').toLowerCase();
    const assignedTo = r.assignedTo ?? '';
    
    // Business Rule 1: Must be assigned to reviewer
    if (assignedTo !== 'reviewer') {
      return false;
    }
    
    // Business Rule 2: Show master records (regardless of status)
    if (r.isMaster === 1) {
      return true;
    }
    
    // Business Rule 3: Show pending OR quarantined requests that are NOT duplicates
    if ((status === 'pending' || status === 'quarantined') && !r.masterId) {
      return true;
    }
    
    return false;
  });
  
  console.log(`[AdminTaskList] Loaded ${this.taskList.length} tasks for reviewer`);
}
```

**What Reviewer Sees**:
- All pending requests (new submissions)
- All quarantined requests (resubmissions after rejection)
- All master records (from duplicate resolution)

**Actions Available**:
- ✅ Approve → Forward to compliance
- ✅ Reject → Return to data entry (quarantine)
- ✅ View details
- ✅ Edit request data

**Business Rule**: Reviewer sees ALL requests assigned to them, regardless of source

---

### Task List 3: Compliance Task List

**Component**: `src/app/compliance/compliance-task-list/compliance-task-list.component.ts`  
**Route**: `/dashboard/compliance`  
**User**: Compliance (userId = 3)  
**Username**: `compliance`

#### Display Criteria (SQL-like)
```sql
SELECT * FROM requests
WHERE status = 'Approved'
  AND assignedTo = 'compliance'
  AND ComplianceStatus IS NULL
  AND isGolden = 0
ORDER BY createdAt DESC
```

**Implementation Code**:
```typescript
// src/app/compliance/compliance-task-list/compliance-task-list.component.ts (line 155)

async load(): Promise<void> {
  const list = await firstValueFrom(this.repo.list());
  const rows = Array.isArray(list) ? list : [];
  
  // Filter for Approved requests assigned to compliance
  const complianceTasks = rows.filter(r => {
    const status = (r.status ?? '').toLowerCase();
    const assignedTo = (r as any).assignedTo ?? '';
    const complianceStatus = (r as any).ComplianceStatus ?? '';
    const isGolden = (r as any).isGolden ?? 0;
    
    // Business Rule: Show only approved requests not yet processed
    return status === 'approved' && 
           assignedTo === 'compliance' && 
           !complianceStatus &&        // Not yet processed by compliance
           !isGolden;                  // Not yet golden record
  });
  
  this.taskList = complianceTasks;
  console.log(`[ComplianceTaskList] Loaded ${this.taskList.length} tasks for compliance`);
}
```

**What Compliance Sees**:
- All approved requests (approved by reviewer)
- Not yet processed by compliance
- Not yet golden records

**Actions Available**:
- ✅ Final Approve → Create golden record
- ✅ Block → Permanently block request
- ✅ View details

**Business Rule**: Compliance sees ONLY approved requests pending final approval

---

## 🔧 Notification Service

### Service Overview
**File**: `src/app/services/notification.service.ts`  
**Type**: Injectable (singleton, providedIn: 'root')  
**Purpose**: Centralized notification management

### Key Methods

#### 1. `sendTaskNotification()` - Main Wrapper
**Purpose**: Standardized way to send notifications across the app

```typescript
// Line 141-166

sendTaskNotification(opts: {
  userId: string;                    // Target user ID ('1', '2', or '3')
  companyName: string;               // Company name for context
  type: 'request_created' | 'compliance_review' | 'request_rejected' | 'quarantine';
  link: string;                      // Link to task
  message?: string;                  // Optional custom message
}): void {
  
  // Map type to status
  const status = this.mapTypeToStatus(opts.type);
  // 'request_rejected' → 'rejected'
  // 'compliance_review' → 'approved'
  // 'request_created' → 'pending'
  
  // Map userId to role
  const userRole = this.mapUserIdToRole(opts.userId);
  // '1' → 'data-entry'
  // '2' → 'reviewer'
  // '3' → 'compliance'
  
  // Map type to request type
  const requestType = this.mapTypeToRequestType(opts.type, status);
  // 'request_rejected' → 'new'
  // 'compliance_review' → 'compliance'
  // 'request_created' → 'review'
  
  // Extract task ID from link
  const taskId = this.extractTaskIdFromLink(opts.link) || `task_${Date.now()}`;
  
  // Build notification payload
  const payload = {
    userId: opts.userId,
    companyName: opts.companyName,
    status,
    message: opts.message || this.getMessageForTask({...}, opts.userId),
    taskId,
    userRole,
    requestType,
    fromUser: 'System',
    toUser: this.prettyRole(userRole)
  };
  
  // Send notification
  this.addNotification(payload);
}
```

**Used By**:
- `new-request.component.ts` (line ~680)
- `data-entry-agent.service.ts` (line 1009)
- `duplicate-customer.component.ts` (lines 409, 883, 1927)
- `admin-task-list.component.ts` (for rejections)

---

#### 2. `addNotification()` - Add to Database
**Purpose**: Save notification to database and update UI

```typescript
// Line 86-138

addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): void {
  
  // Extract userId (prioritize provided userId)
  const userId = (notification as any).userId || localStorage.getItem('user') || '1';
  
  // Build complete notification object
  const newNotification = {
    userId,
    companyName: notification.companyName || 'Request',
    status: notification.status,
    message: notification.message || 'You have a new task',
    taskId: notification.taskId,
    userRole: notification.userRole,
    requestType: notification.requestType,
    fromUser: notification.fromUser || 'System',
    toUser: notification.toUser,
    timestamp: new Date().toISOString(),
    isRead: false
  };
  
  console.log(`➕ Adding notification for userId: ${userId}`, newNotification);
  
  // ⭐ SAVE TO DATABASE ⭐
  this.http.post(`${this.apiBase}/notifications`, newNotification).subscribe({
    next: (response) => {
      console.log(`✅ Notification saved to database:`, response);
      
      // Reload notifications from database
      this.loadNotificationsFromDatabase();
    },
    error: (error) => {
      console.error(`❌ Error saving notification:`, error);
      
      // Fallback: Update local state only
      const localNotification = {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date(),
        isRead: false
      };
      
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([localNotification, ...current]);
      this.updateUnreadCount();
    }
  });
}
```

---

#### 3. `loadNotificationsFromDatabase()` - Fetch from DB
**Purpose**: Load user's notifications from database

```typescript
// Line 44-75

private loadNotificationsFromDatabase(): void {
  // Get current user ID
  const userId = localStorage.getItem('user') || '1';
  
  console.log(`📡 Loading notifications for userId: ${userId}`);
  
  // ⭐ FETCH FROM DATABASE ⭐
  this.http.get<Notification[]>(`${this.apiBase}/notifications?userId=${userId}`)
    .subscribe({
      next: (notifications) => {
        console.log(`📥 Received ${notifications.length} notifications from API`);
        
        // Convert timestamp strings to Date objects
        const processed = notifications.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp),
          isRead: Boolean(n.isRead)
        }));
        
        // Update observable
        this.notificationsSubject.next(processed);
        
        // Update unread count
        this.updateUnreadCount();
      },
      error: (error) => {
        console.error('❌ Error loading notifications:', error);
        this.notificationsSubject.next([]);
      }
    });
}
```

**Called When**:
- Service initialization (constructor)
- After adding notification
- After marking as read
- After deleting notification
- When user logs in
- Manual reload (reloadNotifications())

---

#### 4. `markAsRead()` - Mark Notification Read
**Purpose**: Update notification read status in database

```typescript
// Line 418-430

markAsRead(id: string): void {
  console.log(`👁️ Marking notification ${id} as read`);
  
  // ⭐ UPDATE IN DATABASE ⭐
  this.http.put(`${this.apiBase}/notifications/${id}/read`, {}).subscribe({
    next: (response) => {
      console.log(`✅ Marked as read:`, response);
      
      // Reload from database to sync
      this.loadNotificationsFromDatabase();
    },
    error: (error) => {
      console.error(`❌ Error marking as read:`, error);
    }
  });
}
```

**Triggered When**: User clicks on notification in dropdown

---

#### 5. `markAllAsRead()` - Mark All Read
**Purpose**: Mark all user's notifications as read

```typescript
// Line 432-445

markAllAsRead(): void {
  const userId = localStorage.getItem('user') || '1';
  
  console.log(`👁️ Marking ALL notifications as read for userId: ${userId}`);
  
  // ⭐ UPDATE ALL IN DATABASE ⭐
  this.http.put(`${this.apiBase}/notifications/read-all`, { userId }).subscribe({
    next: (response) => {
      console.log(`✅ All notifications marked as read`);
      
      // Reload from database
      this.loadNotificationsFromDatabase();
    },
    error: (error) => {
      console.error(`❌ Error marking all as read:`, error);
    }
  });
}
```

**Triggered When**: User clicks "Mark all as read" button

---

### Helper Methods

```typescript
// Map notification type to status
private mapTypeToStatus(type: string): 'rejected' | 'approved' | 'pending' | 'quarantine' {
  switch (type.toLowerCase()) {
    case 'request_rejected': return 'rejected';
    case 'compliance_review': return 'approved';
    case 'quarantine': return 'quarantine';
    default: return 'pending';
  }
}

// Map userId to role
private mapUserIdToRole(userId: string): 'data-entry' | 'reviewer' | 'compliance' {
  switch (userId) {
    case '1': return 'data-entry';
    case '2': return 'reviewer';
    case '3': return 'compliance';
    default: return 'data-entry';
  }
}

// Map type to request type
private mapTypeToRequestType(type: string, status: string): 'new' | 'review' | 'compliance' {
  if (type === 'request_rejected' || status === 'rejected') return 'new';
  if (type === 'compliance_review' || status === 'approved') return 'compliance';
  return 'review';
}

// Pretty role name
private prettyRole(role: string): string {
  switch (role) {
    case 'data-entry': return 'Data Entry';
    case 'reviewer': return 'Reviewer';
    case 'compliance': return 'Compliance';
    default: return 'User';
  }
}
```

---

## 📱 Notification Display Component

### Component Overview
**File**: `src/app/shared/notification-dropdown/notification-dropdown.component.ts`  
**Location**: Header (top-right, next to user profile)  
**Purpose**: Display notifications in dropdown

### Template Structure
```html
<!-- src/app/shared/notification-dropdown/notification-dropdown.component.html -->

<!-- Notification Bell Icon with Badge -->
<nz-badge [nzCount]="unreadCount$ | async" nzDot>
  <button nz-button nzType="text" nz-dropdown [nzDropdownMenu]="menu">
    <span nz-icon nzType="bell" nzTheme="outline"></span>
  </button>
</nz-badge>

<!-- Dropdown Menu -->
<nz-dropdown-menu #menu="nzDropdownMenu">
  <div class="notification-dropdown">
    
    <!-- Header -->
    <div class="notification-header">
      <span>Notifications</span>
      <button nz-button nzType="link" (click)="markAllAsRead()">
        Mark all as read
      </button>
    </div>
    
    <!-- Notification List -->
    <div class="notification-list">
      <div *ngFor="let notification of notifications$ | async"
           class="notification-item"
           [class.unread]="!notification.isRead"
           (click)="handleNotificationClick(notification)">
        
        <!-- Status Icon -->
        <span nz-icon 
              [nzType]="getStatusIcon(notification.status)"
              [ngStyle]="{'color': getStatusColor(notification.status)}">
        </span>
        
        <!-- Content -->
        <div class="notification-content">
          <div class="notification-company">{{ notification.companyName }}</div>
          <div class="notification-message">{{ notification.message }}</div>
          <div class="notification-time">{{ notification.timestamp | date:'short' }}</div>
        </div>
        
        <!-- Delete Button -->
        <button nz-button nzType="text" nzDanger
                (click)="deleteNotification(notification.id, $event)">
          <span nz-icon nzType="delete"></span>
        </button>
      </div>
    </div>
    
    <!-- Empty State -->
    <div *ngIf="(notifications$ | async)?.length === 0" 
         class="notification-empty">
      <span nz-icon nzType="inbox" nzTheme="outline"></span>
      <p>No notifications</p>
    </div>
  </div>
</nz-dropdown-menu>
```

### Component Logic
```typescript
export class NotificationDropdownComponent implements OnInit {
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;
  
  constructor(private notificationService: NotificationService, private router: Router) {
    // Subscribe to notification observables
    this.notifications$ = this.notificationService.getNotifications();
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }
  
  ngOnInit(): void {
    // Load notifications for current user
    this.notificationService.reloadNotifications();
  }
  
  // Handle notification click
  handleNotificationClick(notification: Notification): void {
    // Mark as read
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    
    // Navigate to task
    const link = this.getTaskLink(notification);
    this.router.navigate([link]);
  }
  
  // Get task link based on user role
  private getTaskLink(notification: Notification): string {
    switch (notification.userRole) {
      case 'data-entry':
        return '/dashboard/my-task-list';
      case 'reviewer':
        return '/dashboard/admin-task-list';
      case 'compliance':
        return '/dashboard/compliance';
      default:
        return '/dashboard';
    }
  }
  
  // Mark all as read
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
  
  // Delete notification
  deleteNotification(id: string, event: Event): void {
    event.stopPropagation();  // Prevent navigation
    this.notificationService.removeNotification(id);
  }
  
  // Get status color
  getStatusColor(status: string): string {
    return this.notificationService.getStatusColor(status);
  }
  
  // Get status icon
  getStatusIcon(status: string): string {
    return this.notificationService.getStatusIcon(status);
  }
}
```

---

## 🌐 Backend APIs

### API 1: Get Notifications
```http
GET /api/notifications?userId={userId}
```

**Implementation**: `api/better-sqlite-server.js` (line 5942)

```javascript
app.get('/api/notifications', (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Fetch notifications for user
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE userId = ?
      ORDER BY timestamp DESC
      LIMIT 50
    `).all(userId);
    
    console.log(`[NOTIFICATIONS] Found ${notifications.length} notifications for user ${userId}`);
    
    res.json({
      notifications: notifications,
      unreadCount: notifications.filter(n => n.isRead === 0).length
    });
    
  } catch (error) {
    console.error('[NOTIFICATIONS] Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});
```

---

### API 2: Create Notification
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
  "fromUser": "System",
  "toUser": "Reviewer"
}
```

**Implementation**: `api/better-sqlite-server.js` (line 5978)

```javascript
app.post('/api/notifications', (req, res) => {
  try {
    const { userId, companyName, status, message, taskId, userRole, requestType, fromUser, toUser } = req.body;
    
    // Validation
    if (!userId || !companyName || !status || !message || !taskId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, companyName, status, message, taskId' 
      });
    }
    
    // Generate unique ID
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO notifications (
        id, userId, companyName, status, message, 
        taskId, userRole, requestType, fromUser, toUser,
        timestamp, isRead
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      userId,
      companyName,
      status,
      message,
      taskId,
      userRole || 'data-entry',
      requestType || 'new',
      fromUser || 'System',
      toUser || 'User',
      new Date().toISOString(),
      0  // isRead = false
    );
    
    console.log(`[NOTIFICATIONS] Created notification ${id} for user ${userId}`);
    
    res.json({
      success: true,
      id: id,
      message: 'Notification created successfully'
    });
    
  } catch (error) {
    console.error('[NOTIFICATIONS] Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});
```

---

### API 3: Mark as Read
```http
PUT /api/notifications/:id/read
```

**Implementation**: `api/better-sqlite-server.js` (line 6005)

```javascript
app.put('/api/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    
    // Update isRead to true
    const result = db.prepare(`
      UPDATE notifications 
      SET isRead = 1, 
          updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    console.log(`[NOTIFICATIONS] Marked notification ${id} as read`);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('[NOTIFICATIONS] Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});
```

---

### API 4: Mark All as Read
```http
PUT /api/notifications/read-all
```

**Request Body**:
```json
{
  "userId": "2"
}
```

**Implementation**: `api/better-sqlite-server.js` (line 6053)

```javascript
app.put('/api/notifications/read-all', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Update all notifications for user
    const result = db.prepare(`
      UPDATE notifications 
      SET isRead = 1, 
          updatedAt = CURRENT_TIMESTAMP 
      WHERE userId = ? AND isRead = 0
    `).run(userId);
    
    console.log(`[NOTIFICATIONS] Marked ${result.changes} notifications as read for user ${userId}`);
    
    res.json({
      success: true,
      updatedCount: result.changes,
      message: 'All notifications marked as read'
    });
    
  } catch (error) {
    console.error('[NOTIFICATIONS] Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});
```

---

### API 5: Delete Notification
```http
DELETE /api/notifications/:id
```

**Implementation**: `api/better-sqlite-server.js` (line 6112)

```javascript
app.delete('/api/notifications/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete from database
    const result = db.prepare(`
      DELETE FROM notifications 
      WHERE id = ?
    `).run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    console.log(`[NOTIFICATIONS] Deleted notification ${id}`);
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
    
  } catch (error) {
    console.error('[NOTIFICATIONS] Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});
```

---

### API 6: Get Unread Count
```http
GET /api/notifications/unread-count?userId={userId}
```

**Implementation**: `api/better-sqlite-server.js` (line 6131)

```javascript
app.get('/api/notifications/unread-count', (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Count unread notifications
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE userId = ? AND isRead = 0
    `).get(userId);
    
    res.json({
      unreadCount: result.count || 0
    });
    
  } catch (error) {
    console.error('[NOTIFICATIONS] Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});
```

---

## 🔄 Complete Flow Diagrams

### Flow 1: Data Entry Submits Request

```
Data Entry creates request (new-request or AI Agent)
  ↓
Fills all required fields
  ↓
Clicks Submit
  ↓
POST /api/requests
  ↓
Request created with:
  - status = 'Pending'
  - assignedTo = 'reviewer'
  - createdBy = 'data_entry'
  ↓
⭐ Notification Sent ⭐
NotificationService.sendTaskNotification({
  userId: '2',              // Reviewer
  companyName: 'ABC Company',
  type: 'request_created',
  message: 'New request awaits your review'
})
  ↓
POST /api/notifications
  ↓
Database: INSERT INTO notifications
  ↓
Reviewer sees:
  1. 🔔 Badge count increases (e.g., 🔔 5)
  2. Notification in dropdown
  3. Task in Admin Task List
```

---

### Flow 2: Reviewer Approves Request

```
Reviewer opens Admin Task List
  ↓
Sees pending requests (status='Pending', assignedTo='reviewer')
  ↓
Reviews request details
  ↓
Clicks "Approve" button
  ↓
POST /api/requests/:id/approve
  ↓
Request updated:
  - status = 'Approved'
  - assignedTo = 'compliance'
  - reviewedBy = 'reviewer'
  ↓
⭐ Notification Sent ⭐
NotificationService.sendTaskNotification({
  userId: '3',              // Compliance
  companyName: 'ABC Company',
  type: 'compliance_review',
  message: 'Approved request needs compliance review'
})
  ↓
POST /api/notifications
  ↓
Database: INSERT INTO notifications
  ↓
Compliance sees:
  1. 🔔 Badge count increases
  2. Notification in dropdown
  3. Task in Compliance Task List
```

---

### Flow 3: Reviewer Rejects Request

```
Reviewer opens Admin Task List
  ↓
Sees pending request
  ↓
Clicks "Reject" button
  ↓
Enters rejection reason
  ↓
POST /api/requests/:id/reject
  ↓
Request updated:
  - status = 'Quarantine'
  - assignedTo = 'data_entry'
  - rejectReason = 'Missing information'
  ↓
⭐ Notification Sent ⭐
NotificationService.sendTaskNotification({
  userId: '1',              // Data Entry (original submitter)
  companyName: 'ABC Company',
  type: 'request_rejected',
  message: 'Your request was rejected and needs revision'
})
  ↓
POST /api/notifications
  ↓
Database: INSERT INTO notifications
  ↓
Data Entry sees:
  1. 🔔 Badge count increases
  2. Notification in dropdown
  3. Task in My Task List (Quarantine section)
```

---

### Flow 4: Compliance Final Approval

```
Compliance opens Compliance Task List
  ↓
Sees approved requests (status='Approved', assignedTo='compliance')
  ↓
Reviews request
  ↓
Clicks "Approve" button
  ↓
POST /api/requests/:id/compliance/approve
  ↓
Request updated:
  - status = 'Active'
  - isGolden = 1
  - goldenRecordCode = 'GOLD_2025_0001'
  - ComplianceStatus = 'Approved'
  ↓
⭐ NO NOTIFICATION SENT ⭐
(Business Rule: End of workflow - no more actions needed)
  ↓
Golden record created
  ↓
Available for:
  - External system sync
  - Duplicate detection
  - Reports and analytics
```

---

## 📊 Summary Tables

### Notification Triggers by User

| User | When Notified | Notification Type | Sent By | Message |
|------|--------------|-------------------|---------|---------|
| **Data Entry (1)** | Request rejected | `request_rejected` | Reviewer | "Your request for [Company] was rejected and needs revision" |
| **Reviewer (2)** | New request created | `request_created` | Data Entry / AI Agent | "New request for [Company] awaits your review" |
| **Reviewer (2)** | Quarantine resubmitted | `request_created` | Data Entry | "New request for [Company] needs your review" |
| **Reviewer (2)** | Duplicate submitted | `request_created` | Duplicate Module | "New request for [Company] needs your review" |
| **Compliance (3)** | Request approved | `compliance_review` | Reviewer | "Approved request for [Company] needs compliance review" |

---

### Task Lists by User

| User | Task List Name | Route | Display Criteria | Actions |
|------|---------------|-------|------------------|---------|
| **Data Entry** | My Task List | `/dashboard/my-task-list` | status='Rejected' + assignedTo='data_entry' | Edit, Resubmit |
| **Reviewer** | Admin Task List ⭐ | `/dashboard/admin-task-list` | status='Pending' + assignedTo='reviewer' | Approve, Reject |
| **Compliance** | Compliance Task List | `/dashboard/compliance` | status='Approved' + assignedTo='compliance' | Final Approve, Block |

---

### APIs Used by Component

| Component | APIs Used | Purpose |
|-----------|-----------|---------|
| **NotificationService** | GET /api/notifications | Load user notifications |
| **NotificationService** | POST /api/notifications | Create notification |
| **NotificationService** | PUT /api/notifications/:id/read | Mark as read |
| **NotificationService** | PUT /api/notifications/read-all | Mark all read |
| **NotificationService** | DELETE /api/notifications/:id | Delete notification |
| **NotificationDropdown** | (uses NotificationService) | Display in UI |
| **MyTaskList** | GET /api/requests | Load rejected tasks |
| **AdminTaskList** | GET /api/requests | Load reviewer tasks |
| **ComplianceTaskList** | GET /api/requests | Load compliance tasks |

---

## 🎯 Business Rules

### Rule 1: Task-Based Notifications
**Principle**: Users receive notifications ONLY for tasks assigned to them

**Implementation**:
```typescript
// Only send if userId matches task assignment
if (request.assignedTo === 'reviewer') {
  sendNotification(userId: '2');  // Notify reviewer
}
```

---

### Rule 2: No Duplicate Notifications
**Principle**: One task = One notification

**Implementation**:
```typescript
// Don't send notification if:
// 1. Task already exists in user's task list
// 2. Notification already sent for this taskId

// Check before sending
const existingNotification = db.prepare(`
  SELECT * FROM notifications 
  WHERE userId = ? AND taskId = ? AND isRead = 0
`).get(userId, taskId);

if (!existingNotification) {
  // Send new notification
}
```

---

### Rule 3: Role-Based Routing
**Principle**: Each role sees only their tasks

**Implementation**:
```typescript
// Data Entry: Only sees rejected requests
WHERE status = 'Rejected' AND assignedTo = 'data_entry'

// Reviewer: Only sees pending/quarantine requests
WHERE status IN ('Pending', 'Quarantine') AND assignedTo = 'reviewer'

// Compliance: Only sees approved requests
WHERE status = 'Approved' AND assignedTo = 'compliance'
```

---

### Rule 4: Context in Notifications
**Principle**: Notifications include company name for context

**Implementation**:
```typescript
// Always include companyName
message: `New request for ${companyName} awaits your review`

// Not just: "New request awaits your review"
```

---

## 📍 Code Locations

### Notification Service
```
File: src/app/services/notification.service.ts
Lines: 1-679
Key Methods:
  - sendTaskNotification() - Line 141
  - addNotification() - Line 86
  - loadNotificationsFromDatabase() - Line 44
  - markAsRead() - Line 418
  - markAllAsRead() - Line 432
```

### Notification Dropdown Component
```
Files:
  - src/app/shared/notification-dropdown/notification-dropdown.component.ts
  - src/app/shared/notification-dropdown/notification-dropdown.component.html
  - src/app/shared/notification-dropdown/notification-dropdown.component.scss
Location: Header (top-right)
```

### Task Lists
```
Data Entry Task List:
  - src/app/my-task-list/my-task-list.component.ts
  - Route: /dashboard/my-task-list
  - Load method: loadMyRequests() (line 120)

Reviewer Task List (Admin Task List):
  - src/app/admin-task-list/admin-task-list.component.ts
  - Route: /dashboard/admin-task-list
  - Load method: load() (line 147)
  - Filter: assignedTo='reviewer' (line 162)

Compliance Task List:
  - src/app/compliance/compliance-task-list/compliance-task-list.component.ts
  - Route: /dashboard/compliance
  - Load method: load() (line 147)
  - Filter: status='Approved' + assignedTo='compliance' (line 161-162)
```

### Backend APIs
```
File: api/better-sqlite-server.js
APIs:
  - GET /api/notifications (line 5942)
  - POST /api/notifications (line 5978)
  - PUT /api/notifications/:id/read (line 6005)
  - PUT /api/notifications/read-all (line 6053)
  - DELETE /api/notifications/:id (line 6112)
  - GET /api/notifications/unread-count (line 6131)
```

---

## ✅ Summary

### Notification System Features
- ✅ **Task-Based**: One notification per task assignment
- ✅ **Role-Based**: Each user sees only their notifications
- ✅ **Context-Rich**: Includes company name and action needed
- ✅ **Real-Time**: Updates immediately when notifications added
- ✅ **Persistent**: Stored in database (not just memory)
- ✅ **User-Friendly**: Badge count, dropdown display, mark as read

### Task Lists Features
- ✅ **Role-Specific**: Each role has dedicated task list
- ✅ **Filtered**: Shows only relevant tasks
- ✅ **Action-Oriented**: Clear next steps for user
- ✅ **Synchronized**: Links with notification system

### APIs
- ✅ **6 Notification APIs**: Complete CRUD operations
- ✅ **Database-Backed**: All notifications persisted
- ✅ **Error Handling**: Fallback to local storage if needed

**Total Coverage**: 
- 3 user roles
- 3 task lists
- 3 notification triggers
- 6 backend APIs
- 1 notification service
- 1 dropdown component


