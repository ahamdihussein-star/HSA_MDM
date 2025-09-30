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
  }

  // Method to reload notifications when user changes
  reloadNotifications(): void {
    this.loadNotificationsFromDatabase();
  }

  private loadNotificationsFromDatabase(): void {
    const userId = localStorage.getItem('user') || '1';
    this.http.get<Notification[]>(`${this.apiBase}/notifications?userId=${userId}`).subscribe({
      next: (notifications) => {
        // Convert timestamp strings to Date objects and isRead to boolean
        const processedNotifications = notifications.map(notification => ({
          ...notification,
          timestamp: new Date(notification.timestamp),
          isRead: Boolean(notification.isRead)
        }));
        this.notificationsSubject.next(processedNotifications);
        this.updateUnreadCount();
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
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
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      isRead: false
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([newNotification, ...currentNotifications]);
    this.updateUnreadCount();
  }


  private updateUnreadCount(): void {
    const notifications = this.notificationsSubject.value;
    const unreadCount = notifications.filter(n => !n.isRead).length;
    this.unreadCountSubject.next(unreadCount);
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
    this.http.put(`${this.apiBase}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.loadNotificationsFromDatabase();
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  markAllAsRead(): void {
    const userId = localStorage.getItem('user') || '1';
    this.http.put(`${this.apiBase}/notifications/read-all`, { userId }).subscribe({
      next: () => {
        this.loadNotificationsFromDatabase();
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
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
