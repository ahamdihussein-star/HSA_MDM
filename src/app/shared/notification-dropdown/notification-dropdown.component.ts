import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService, Notification } from '../../services/notification.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  styleUrls: ['./notification-dropdown.component.scss']
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  notifications$: Observable<Notification[]>;
  unreadCount$: Observable<number>;
  private subscriptions: Subscription[] = [];

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.getNotifications();
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  ngOnInit(): void {
    // Subscribe to unread count to trigger change detection
    this.subscriptions.push(
      this.unreadCount$.subscribe()
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  markAsRead(notificationId: string): void {
    console.log(`🔔 [NotificationDropdown] Marking notification ${notificationId} as read`);
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    console.log(`🔔 [NotificationDropdown] Marking ALL notifications as read`);
    this.notificationService.markAllAsRead();
  }

  removeNotification(notificationId: string): void {
    this.notificationService.removeNotification(notificationId);
  }

  getStatusColor(status: string): string {
    return this.notificationService.getStatusColor(status);
  }

  getStatusIcon(status: string): string {
    return this.notificationService.getStatusIcon(status);
  }

  formatTimestamp(timestamp: Date): string {
    // Check if date is valid
    if (!timestamp || isNaN(timestamp.getTime())) {
      return 'Unknown time';
    }
    
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  simulateNewNotification(): void {
    this.notificationService.simulateNewNotification();
  }
}
