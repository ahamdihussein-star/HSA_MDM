import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NotificationDropdownComponent } from './notification-dropdown/notification-dropdown.component';

@NgModule({
  declarations: [
    NotificationDropdownComponent
  ],
  imports: [
    CommonModule,
    NzIconModule,
    NzButtonModule,
    NzTagModule,
    NzEmptyModule
  ],
  exports: [
    NotificationDropdownComponent
  ]
})
export class SharedModule { }
