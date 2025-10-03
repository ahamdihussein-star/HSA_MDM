import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

// Ant Design Modules
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzSelectModule } from 'ng-zorro-antd/select';

// ✅ استيراد الأيقونات المطلوبة
import { 
  UserOutline, 
  MailOutline, 
  LockOutline,      // ✅ بدلاً من lock-o
  CameraOutline,    // ✅ بدلاً من camera-o
  EditOutline,
  SaveOutline 
} from '@ant-design/icons-angular/icons';

// Translation
import { TranslateModule } from '@ngx-translate/core';

// Component
import { UserProfileComponent } from './user-profile.component';

// ✅ تسجيل الأيقونات
const icons = [
  UserOutline, 
  MailOutline, 
  LockOutline, 
  CameraOutline, 
  EditOutline, 
  SaveOutline
];

const routes: Routes = [
  {
    path: '',
    component: UserProfileComponent
  }
];

@NgModule({
  declarations: [
    UserProfileComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forChild(routes),
    
    // Ant Design
    NzButtonModule,
    NzCardModule,
    NzModalModule,
    NzMessageModule,
    NzTagModule,
    NzInputModule,
    NzIconModule.forChild(icons), // ✅ تسجيل الأيقونات
    NzSpinModule,
    NzUploadModule,
    NzSelectModule,
    
    // Translation
    TranslateModule
  ]
})
export class UserProfileModule { }
