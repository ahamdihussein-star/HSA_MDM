import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface Notification {
  id: string;
  companyName: string;
  status: 'rejected' | 'approved' | 'pending' | 'quarantine';
  message: string;
  timestamp: Date;
  isRead: boolean;
  taskId: string;
  userRole: 'data-entry' | 'reviewer' | 'compliance';
  requestType: 'new' | 'review' | 'compliance';
  fromUser?: string;
  toUser?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiBase = 'http://localhost:3001/api';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load notifications from database
    this.loadNotificationsFromDatabase();
    
    // 🔍 Add debugging to window object for browser console inspection
    (window as any).notificationDebug = this;
  }

  // Method to reload notifications when user changes
  reloadNotifications(): void {
    console.log('🔄 [NotificationService] Reloading notifications...');
    this.loadNotificationsFromDatabase();
  }

  private loadNotificationsFromDatabase(): void {
    const userId = localStorage.getItem('user') || '1';
    console.log(`📡 [NotificationService] Loading notifications for userId: ${userId}`);
    
    this.http.get<Notification[]>(`${this.apiBase}/notifications?userId=${userId}`).subscribe({
      next: (notifications) => {
        console.log(`📥 [NotificationService] Raw notifications from API:`, notifications);
        
        // Convert timestamp strings to Date objects and isRead to boolean
        const processedNotifications = notifications.map(notification => ({
          ...notification,
          timestamp: new Date(notification.timestamp),
          isRead: Boolean(notification.isRead)
        }));
        
        console.log(`✅ [NotificationService] Processed notifications:`, processedNotifications);
        console.log(`📊 [NotificationService] Read/Unread count:`, {
          total: processedNotifications.length,
          read: processedNotifications.filter(n => n.isRead).length,
          unread: processedNotifications.filter(n => !n.isRead).length
        });
        
        this.notificationsSubject.next(processedNotifications);
        this.updateUnreadCount();
      },
      error: (error) => {
        console.error('❌ [NotificationService] Error loading notifications:', error);
        this.notificationsSubject.next([]);
        this.updateUnreadCount();
      }
    });
  }

  getNotifications(): Observable<Notification[]> {
    return this.notifications$;
  }

  getUnreadCount(): Observable<number> {
    return this.unreadCount$;
  }


  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): void {
    // Use provided recipient first; fallback to current user if not provided
    const userId = (notification as any).userId || localStorage.getItem('user') || '1';
    // Map caller-friendly fields (title/link/type) to backend schema (companyName/status/...)
    const n: any = notification as any;
    const link: string = n.link || '';
    const type: string = n.type || (n.status || 'pending');
    const taskId: string = n.taskId || this.extractTaskIdFromLink(link) || `task_${Date.now()}`;
    const status: string = n.status || this.mapTypeToStatus(type);
    const userRole: 'data-entry' | 'reviewer' | 'compliance' = n.userRole || this.mapUserIdToRole(userId);
    const requestType: 'new' | 'review' | 'compliance' = n.requestType || this.mapTypeToRequestType(type, status);
    const companyName: string = n.companyName || 'Request';
    const fromUser: string = n.fromUser || 'System';
    const toUser: string = n.toUser || this.prettyRole(userRole);

    const newNotification = {
      userId,
      companyName,
      status,
      message: n.message || 'You have a new task',
      taskId,
      userRole,
      requestType,
      fromUser,
      toUser,
      timestamp: new Date().toISOString(),
      isRead: false
    } as any;

    console.log(`➕ [NotificationService] Adding new notification for userId: ${userId}`, newNotification);

    // Save to database
    this.http.post(`${this.apiBase}/notifications`, newNotification).subscribe({
      next: (response) => {
        console.log(`✅ [NotificationService] Successfully added notification:`, response);
        // Reload notifications from database
        this.loadNotificationsFromDatabase();
      },
      error: (error) => {
        console.error(`❌ [NotificationService] Error adding notification:`, error);
        // Fallback to local storage for immediate UI update
        const localNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date(),
          isRead: false
        };
        const currentNotifications = this.notificationsSubject.value;
        this.notificationsSubject.next([localNotification, ...currentNotifications]);
        this.updateUnreadCount();
      }
    });
  }

  // Thin shared wrapper to standardize task notifications across app
  sendTaskNotification(opts: {
    userId: string;
    companyName: string;
    type: 'request_created' | 'compliance_review' | 'request_rejected' | 'quarantine' | string;
    link: string;
    message?: string;
  }): void {
    const status = this.mapTypeToStatus(opts.type);
    const userRole = this.mapUserIdToRole(opts.userId);
    const requestType = this.mapTypeToRequestType(opts.type, status);
    const taskId = this.extractTaskIdFromLink(opts.link) || `task_${Date.now()}`;

    const payload: any = {
      userId: opts.userId,
      companyName: opts.companyName || 'Request',
      status,
      message: opts.message || this.getMessageForTask({ status, firstName: opts.companyName }, opts.userId),
      taskId,
      userRole,
      requestType,
      fromUser: 'System',
      toUser: this.prettyRole(userRole)
    };

    this.addNotification(payload);
  }


  private updateUnreadCount(): void {
    const notifications = this.notificationsSubject.value;
    const unreadCount = notifications.filter(n => !n.isRead).length;
    this.unreadCountSubject.next(unreadCount);
  }

  private extractTaskIdFromLink(link: string): string | null {
    if (!link) return null;
    const m = link.match(/new-request\/(\w+)/);
    return m ? m[1] : null;
  }

  private mapTypeToStatus(type: string): 'rejected' | 'approved' | 'pending' | 'quarantine' {
    switch ((type || '').toLowerCase()) {
      case 'request_rejected': return 'rejected';
      case 'compliance_review': return 'approved';
      case 'quarantine': return 'quarantine';
      default: return 'pending';
    }
  }

  private mapUserIdToRole(userId: string): 'data-entry' | 'reviewer' | 'compliance' {
    switch (userId) {
      case '1': return 'data-entry';
      case '2': return 'reviewer';
      case '3': return 'compliance';
      default: return 'data-entry';
    }
  }

  private mapTypeToRequestType(type: string, status: string): 'new' | 'review' | 'compliance' {
    const t = (type || '').toLowerCase();
    if (t === 'request_rejected' || status === 'rejected') return 'new';
    if (t === 'compliance_review' || status === 'approved') return 'compliance';
    return 'review';
  }

  private prettyRole(role: string): string {
    switch (role) {
      case 'data-entry': return 'Data Entry';
      case 'reviewer': return 'Reviewer';
      case 'compliance': return 'Compliance';
      default: return 'User';
    }
  }


  // Method to create notifications from task list
  createNotificationsFromTaskList(taskList: any[]): void {
    const currentUser = localStorage.getItem('user') || '1';

    // Use the sync endpoint to update notifications in database
    this.http.post(`${this.apiBase}/notifications/sync`, {
      userId: currentUser,
      tasks: taskList
    }).subscribe({
      next: (response: any) => {
        // Reload notifications from database
        this.loadNotificationsFromDatabase();
      },
      error: (error) => {
        console.error('Error syncing notifications:', error);
        // Fallback to local storage
        this.createLocalNotifications(taskList);
      }
    });
  }

  private createLocalNotifications(taskList: any[]): void {
    const currentUser = localStorage.getItem('user') || '1';
    const notifications: Notification[] = [];

    taskList.forEach((task, index) => {
      const taskId = task.id || task.taskId || task.requestId || `task_${index}`;
      const companyName = task.name || task.firstName || task.companyName || 'Unknown Company';
      const status = task.status || 'pending';
      
      const notification: Notification = {
        id: `notification_${taskId}`,
        companyName: companyName,
        status: this.mapTaskStatusToNotificationStatus(status),
        message: this.getMessageForTask(task, currentUser),
        timestamp: new Date(task.createdAt || task.date || Date.now() - (index * 60 * 60 * 1000)),
        isRead: false,
        taskId: taskId,
        userRole: this.getUserRole(currentUser),
        requestType: this.getRequestType(task),
        fromUser: this.getFromUser(task, currentUser),
        toUser: this.getToUser(currentUser)
      };

      notifications.push(notification);
    });

    this.notificationsSubject.next(notifications);
    this.updateUnreadCount();
  }

  private mapTaskStatusToNotificationStatus(taskStatus: string): 'rejected' | 'approved' | 'pending' | 'quarantine' {
    switch (taskStatus.toLowerCase()) {
      case 'rejected':
      case 'rejected_new_request':
      case 'rejected_duplicate':
      case 'rejected_quarantine':
        return 'rejected';
      case 'approved':
      case 'approved_new_request':
        return 'approved';
      case 'quarantine':
        return 'quarantine';
      default:
        return 'pending';
    }
  }

  private getMessageForTask(task: any, currentUser: string): string {
    const status = task.status || 'pending';
    const companyName = task.name || task.firstName || 'this request';

    switch (currentUser) {
      case '1': // Data Entry
        if (status.includes('rejected')) {
          return `Your request for ${companyName} has been rejected`;
        }
        return `Task for ${companyName} needs your attention`;
      
      case '2': // Reviewer
        return `New request for ${companyName} needs your review`;
      
      case '3': // Compliance
        return `Approved request for ${companyName} needs compliance review`;
      
      default:
        return `Task for ${companyName} needs your attention`;
    }
  }

  private getUserRole(currentUser: string): 'data-entry' | 'reviewer' | 'compliance' {
    switch (currentUser) {
      case '1': return 'data-entry';
      case '2': return 'reviewer';
      case '3': return 'compliance';
      default: return 'data-entry';
    }
  }

  private getRequestType(task: any): 'new' | 'review' | 'compliance' {
    const status = task.status || 'pending';
    if (status.includes('rejected')) return 'new';
    if (status.includes('approved')) return 'compliance';
    return 'review';
  }

  private getFromUser(task: any, currentUser: string): string {
    switch (currentUser) {
      case '1': return 'System';
      case '2': return 'Data Entry';
      case '3': return 'Reviewer';
      default: return 'System';
    }
  }

  private getToUser(currentUser: string): string {
    switch (currentUser) {
      case '1': return 'Data Entry';
      case '2': return 'Reviewer';
      case '3': return 'Compliance';
      default: return 'User';
    }
  }

  // Method to add notification when task status changes
  addTaskStatusNotification(task: any, newStatus: string, fromUser: string, toUser: string): void {
    const currentUser = localStorage.getItem('user') || '1';
    
    let notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>;

    switch (newStatus) {
      case 'rejected':
        if (currentUser === '1') { // Only notify Data Entry for rejections
          notification = {
            companyName: task.name || task.firstName || 'Unknown Company',
            status: 'rejected',
            message: 'Your request has been rejected by reviewer',
            taskId: task.id || task.taskId || task.requestId,
            userRole: 'data-entry',
            requestType: 'new',
            fromUser: fromUser,
            toUser: toUser
          };
          this.addNotification(notification);
        }
        break;

      case 'pending':
        if (currentUser === '2') { // Only notify Reviewer for new requests
          notification = {
            companyName: task.name || task.firstName || 'Unknown Company',
            status: 'pending',
            message: 'New request needs your review',
            taskId: task.id || task.taskId || task.requestId,
            userRole: 'reviewer',
            requestType: 'review',
            fromUser: fromUser,
            toUser: toUser
          };
          this.addNotification(notification);
        }
        break;

      case 'approved':
        if (currentUser === '3') { // Only notify Compliance for approved requests
          notification = {
            companyName: task.name || task.firstName || 'Unknown Company',
            status: 'approved',
            message: 'Approved request needs compliance review',
            taskId: task.id || task.taskId || task.requestId,
            userRole: 'compliance',
            requestType: 'compliance',
            fromUser: fromUser,
            toUser: toUser
          };
          this.addNotification(notification);
        }
        break;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'rejected': return '#ff4d4f';
      case 'approved': return '#52c41a';
      case 'pending': return '#faad14';
      case 'quarantine': return '#fa8c16';
      default: return '#d9d9d9';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'rejected': return 'close-circle';
      case 'approved': return 'check-circle';
      case 'pending': return 'clock-circle';
      case 'quarantine': return 'exclamation-circle';
      default: return 'info-circle';
    }
  }

  // Database-based methods
  markAsRead(id: string): void {
    console.log(`👁️ [NotificationService] Marking notification ${id} as read`);
    
    this.http.put(`${this.apiBase}/notifications/${id}/read`, {}).subscribe({
      next: (response) => {
        console.log(`✅ [NotificationService] Successfully marked ${id} as read:`, response);
        this.loadNotificationsFromDatabase();
      },
      error: (error) => {
        console.error(`❌ [NotificationService] Error marking notification ${id} as read:`, error);
      }
    });
  }

  markAllAsRead(): void {
    const userId = localStorage.getItem('user') || '1';
    console.log(`👁️ [NotificationService] Marking ALL notifications as read for userId: ${userId}`);
    
    this.http.put(`${this.apiBase}/notifications/read-all`, { userId }).subscribe({
      next: (response) => {
        console.log(`✅ [NotificationService] Successfully marked ALL notifications as read:`, response);
        this.loadNotificationsFromDatabase();
      },
      error: (error) => {
        console.error(`❌ [NotificationService] Error marking all notifications as read:`, error);
      }
    });
  }

  removeNotification(id: string): void {
    this.http.delete(`${this.apiBase}/notifications/${id}`).subscribe({
      next: () => {
        this.loadNotificationsFromDatabase();
      },
      error: (error) => {
        console.error('Error deleting notification:', error);
      }
    });
  }

  // 🔍 DEBUGGING METHODS - Available in browser console as window.notificationDebug
  debugGetCurrentNotifications(): Notification[] {
    const notifications = this.notificationsSubject.value;
    console.log('🔍 Current notifications in memory:', notifications);
    return notifications;
  }

  debugGetUnreadCount(): number {
    const count = this.unreadCountSubject.value;
    console.log('🔍 Current unread count:', count);
    return count;
  }

  debugGetCurrentUser(): string {
    const userId = localStorage.getItem('user') || '1';
    console.log('🔍 Current user ID:', userId);
    return userId;
  }

  debugGetNotificationsFromAPI(): void {
    const userId = localStorage.getItem('user') || '1';
    console.log(`🔍 Fetching notifications from API for userId: ${userId}`);
    
    this.http.get<Notification[]>(`${this.apiBase}/notifications?userId=${userId}`).subscribe({
      next: (notifications) => {
        console.log('🔍 Raw API response:', notifications);
        console.log('🔍 API Response Analysis:', {
          total: notifications.length,
          read: notifications.filter(n => n.isRead).length,
          unread: notifications.filter(n => !n.isRead).length,
          isReadValues: notifications.map(n => ({ id: n.id, isRead: n.isRead, type: typeof n.isRead }))
        });
      },
      error: (error) => {
        console.error('🔍 API Error:', error);
      }
    });
  }

  debugMarkAsRead(id: string): void {
    console.log(`🔍 Debug: Manually marking notification ${id} as read`);
    this.markAsRead(id);
  }

  debugMarkAllAsRead(): void {
    console.log('🔍 Debug: Manually marking ALL notifications as read');
    this.markAllAsRead();
  }

  debugReloadNotifications(): void {
    console.log('🔍 Debug: Manually reloading notifications');
    this.reloadNotifications();
  }

  // 🔍 DATABASE VERIFICATION METHODS
  debugVerifyDatabaseState(): void {
    const userId = localStorage.getItem('user') || '1';
    console.log(`🔍 [Database Verification] Checking database state for userId: ${userId}`);
    
    // Get current state from database
    this.http.get<Notification[]>(`${this.apiBase}/notifications?userId=${userId}`).subscribe({
      next: (dbNotifications) => {
        console.log('🔍 [Database Verification] Current database state:', dbNotifications);
        console.log('🔍 [Database Verification] Database Analysis:', {
          total: dbNotifications.length,
          read: dbNotifications.filter(n => n.isRead).length,
          unread: dbNotifications.filter(n => !n.isRead).length,
          details: dbNotifications.map(n => ({
            id: n.id,
            companyName: n.companyName,
            isRead: n.isRead,
            type: typeof n.isRead,
            timestamp: n.timestamp
          }))
        });
        
        // Compare with memory state
        const memoryNotifications = this.notificationsSubject.value;
        console.log('🔍 [Database Verification] Memory vs Database comparison:', {
          memoryTotal: memoryNotifications.length,
          dbTotal: dbNotifications.length,
          memoryRead: memoryNotifications.filter(n => n.isRead).length,
          dbRead: dbNotifications.filter(n => n.isRead).length,
          syncStatus: memoryNotifications.length === dbNotifications.length ? 'SYNCED' : 'OUT OF SYNC'
        });
      },
      error: (error) => {
        console.error('🔍 [Database Verification] Error fetching database state:', error);
      }
    });
  }

  debugMarkAsReadAndVerify(id: string): void {
    console.log(`🔍 [Database Verification] Marking notification ${id} as read and verifying...`);
    
    // First, get current state
    this.debugVerifyDatabaseState();
    
    // Mark as read
    this.markAsRead(id);
    
    // Wait a bit then verify again
    setTimeout(() => {
      console.log(`🔍 [Database Verification] Verifying after mark as read...`);
      this.debugVerifyDatabaseState();
    }, 1000);
  }

  debugMarkAllAsReadAndVerify(): void {
    console.log(`🔍 [Database Verification] Marking ALL notifications as read and verifying...`);
    
    // First, get current state
    this.debugVerifyDatabaseState();
    
    // Mark all as read
    this.markAllAsRead();
    
    // Wait a bit then verify again
    setTimeout(() => {
      console.log(`🔍 [Database Verification] Verifying after mark all as read...`);
      this.debugVerifyDatabaseState();
    }, 1000);
  }

  debugTestNotificationFlow(): void {
    const userId = localStorage.getItem('user') || '1';
    console.log(`🔍 [Database Verification] Testing complete notification flow for userId: ${userId}`);
    
    // Step 1: Check initial state
    console.log('🔍 [Step 1] Initial database state:');
    this.debugVerifyDatabaseState();
    
    // Step 2: Add a test notification
    setTimeout(() => {
      console.log('🔍 [Step 2] Adding test notification...');
      this.addNotification({
        companyName: 'Test Company',
        status: 'pending',
        message: 'Test notification for debugging',
        taskId: 'test-task-' + Date.now(),
        userRole: 'reviewer',
        requestType: 'new'
      });
    }, 2000);
    
    // Step 3: Verify notification was added
    setTimeout(() => {
      console.log('🔍 [Step 3] Verifying notification was added:');
      this.debugVerifyDatabaseState();
    }, 3000);
    
    // Step 4: Mark as read
    setTimeout(() => {
      console.log('🔍 [Step 4] Marking test notification as read...');
      const notifications = this.notificationsSubject.value;
      const testNotification = notifications.find(n => n.companyName === 'Test Company');
      if (testNotification) {
        this.debugMarkAsReadAndVerify(testNotification.id);
      }
    }, 4000);
  }

  simulateNewNotification(): void {
    const currentUser = localStorage.getItem('user') || '1';
    const companies = [
      'Al-Rajhi Bank', 'SABIC', 'Aramco', 'STC', 'Almarai',
      'Saudi Electricity Company', 'Riyadh Bank', 'National Commercial Bank'
    ];

    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    const taskId = `task_${Date.now()}`;

    let notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>;

    switch (currentUser) {
      case '1': // Data Entry - Only rejected requests
        notification = {
          companyName: randomCompany,
          status: 'rejected',
          message: 'Your request has been rejected by reviewer',
          taskId: taskId,
          userRole: 'data-entry',
          requestType: 'new',
          fromUser: 'Reviewer',
          toUser: 'Data Entry'
        };
        break;

      case '2': // Reviewer - New requests to review
        notification = {
          companyName: randomCompany,
          status: 'pending',
          message: 'New request needs your review',
          taskId: taskId,
          userRole: 'reviewer',
          requestType: 'review',
          fromUser: 'Data Entry',
          toUser: 'Reviewer'
        };
        break;

      case '3': // Compliance - Approved requests
        notification = {
          companyName: randomCompany,
          status: 'approved',
          message: 'Approved request needs compliance review',
          taskId: taskId,
          userRole: 'compliance',
          requestType: 'compliance',
          fromUser: 'Reviewer',
          toUser: 'Compliance'
        };
        break;

      default:
        return;
    }

    this.addNotification(notification);
  }
}
