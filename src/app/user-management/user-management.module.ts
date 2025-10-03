import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Ant Design Modules
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';

// Translation
import { TranslateModule } from '@ngx-translate/core';

// Routing
import { UserManagementRoutingModule } from './user-management-routing.module';

// Component
import { UserManagementComponent } from './user-management.component';

@NgModule({
  declarations: [
    UserManagementComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    
    // Routing
    UserManagementRoutingModule,
    
    // Ant Design
    NzTableModule,
    NzButtonModule,
    NzModalModule,
    NzMessageModule,
    NzTagModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzIconModule,
    NzSpinModule,
    NzDropDownModule,
    NzMenuModule,
    
    // Translation
    TranslateModule
  ]
})
export class UserManagementModule { }
