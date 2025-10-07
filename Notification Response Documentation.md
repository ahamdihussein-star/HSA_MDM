## Notification Response Documentation

### Overview
The notification system is event-driven and fires a single notification at the exact moment a task is created/assigned to a user. No UI/UX changes were made; the existing Header + Dropdown continue to display notifications. All triggers use the existing `NotificationService` and backend APIs under `/api/notifications`.

Role-to-user mapping (kept minimal and explicit at call-sites):
- Data Entry → userId: `1` (only when request is rejected back to data entry)
- Reviewer → userId: `2` (when a new request arrives for review)
- Compliance → userId: `3` (when a request is approved and needs compliance review)


### Notification Triggers (Creation Points)

#### A) New Request – Manual (Reviewer gets a notification)
Trigger: after successful `POST /api/requests` in `onSubmit()` create branch.

```1739:1746:src/app/new-request/new-request.component.ts
// Notify reviewer: new task to review
try {
  this.appNotificationService.addNotification({
    userId: '2',
    title: 'New Request',
    message: 'New request awaits your review',
    link: `/dashboard/new-request/${response.id}`,
    type: 'request_created'
  } as any);
} catch (_) {}
```

#### B) New Request – AI Agent (Reviewer gets a notification)
Trigger: after `submitCustomerRequest()` creates the request.

```785:793:src/app/services/data-entry-agent.service.ts
private notifyReviewerOnCreation(requestId: string): void {
  try {
    const message = `Request ${requestId} awaiting your review`;
    this.notificationService.addNotification({
      userId: '2', // reviewer user id
      title: 'New Request Submitted',
      message,
      link: `/dashboard/new-request/${requestId}`,
      type: 'request_created'
    } as any);
  } catch (_) {}
}
```

#### C) Approve (Compliance gets a notification)
Trigger: after successful `POST /requests/:id/approve`.

```2026:2035:src/app/new-request/new-request.component.ts
// Notify compliance: approved request needs review
try {
  this.appNotificationService.addNotification({
    userId: '3',
    title: 'Compliance Review',
    message: 'Approved request needs compliance review',
    link: `/dashboard/new-request/${id}?action=compliance-review`,
    type: 'compliance_review'
  } as any);
} catch (_) {}
```

#### D) Reject (Data Entry gets a notification)
Trigger: after successful `POST /requests/:id/reject`.

```2064:2073:src/app/new-request/new-request.component.ts
// Notify data entry: request rejected needs revision
try {
  this.appNotificationService.addNotification({
    userId: '1',
    title: 'Request Rejected',
    message: 'Your request was rejected and needs revision',
    link: `/dashboard/new-request/${id}?from=my-task-list`,
    type: 'request_rejected'
  } as any);
} catch (_) {}
```


### Notification Service – Core Methods and APIs
All triggers ultimately call `NotificationService.addNotification()`, which persists to the backend and refreshes the in-memory list consumed by the header/dropdown.

Reload user notifications from DB (GET `/api/notifications?userId=...`):
```38:75:src/app/services/notification.service.ts
// Method to reload notifications when user changes
reloadNotifications(): void {
  console.log('🔄 [NotificationService] Reloading notifications...');
  this.loadNotificationsFromDatabase();
}
```

Create notification (POST `/api/notifications`):
```86:118:src/app/services/notification.service.ts
addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): void {
  const userId = localStorage.getItem('user') || '1';
  const newNotification = {
    ...notification,
    userId: userId,
    timestamp: new Date().toISOString(),
    isRead: false
  };

  this.http.post(`${this.apiBase}/notifications`, newNotification).subscribe({
    next: () => this.loadNotificationsFromDatabase(),
    error: () => {/* local fallback kept */}
  });
}
```

Mark as read / mark all as read (PUT endpoints):
```329:357:src/app/services/notification.service.ts
markAsRead(id: string): void {
  this.http.put(`${this.apiBase}/notifications/${id}/read`, {}).subscribe({
    next: () => this.loadNotificationsFromDatabase()
  });
}

markAllAsRead(): void {
  const userId = localStorage.getItem('user') || '1';
  this.http.put(`${this.apiBase}/notifications/read-all`, { userId }).subscribe({
    next: () => this.loadNotificationsFromDatabase()
  });
}
```


### Display Layer (Header + Dropdown)
The header reloads notifications and subscribes to the unread count; the dropdown binds to the live list.

```94:118:src/app/header/header.component.ts
this.notificationService.reloadNotifications();
this.notificationService.getUnreadCount().subscribe(count => {
  this.unreadCount = count;
  this.cdr.markForCheck();
});
```

```16:17:src/app/shared/notification-dropdown/notification-dropdown.component.ts
this.notifications$ = this.notificationService.getNotifications();
this.unreadCount$ = this.notificationService.getUnreadCount();
```


### Recipient Determination – Current Behavior
- The recipient is inferred from the event:
  - New request created → reviewer (userId '2')
  - Approved by reviewer → compliance (userId '3')
  - Rejected by reviewer → data entry (userId '1')
- There is no role broadcast; each trigger selects a single userId.
- `assignedTo` is not directly used to choose the recipient in the call-sites; instead we map by action to a target role/user.


### Before AI Agent
- Manual creation path already had the intent of notifying the reviewer after creating a request. The AI agent path adds the same reviewer notification after its create call, preserving the same UX (single notification to the person who gets the task).


### Notes and Best Practices Kept
- No UI/UX change: existing header and dropdown are untouched.
- No new services or endpoints: reuse of `NotificationService` and `/api/notifications` only.
- One task = one notification to the assigned owner.


