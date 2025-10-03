import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  isActive: number;
  avatarUrl?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  currentUser: User | null = null;
  loading = false;
  isEditMode = false;
  isModalVisible = false;
  isPasswordModalVisible = false;
  
  userForm = {
    username: '',
    fullName: '',
    email: '',
    role: ''
  };
  
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  avatarPreview: string | null = null;
  roleOptions = [
    { value: 'data_entry', label: 'Data Entry User' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'compliance', label: 'Compliance Officer' },
    { value: 'admin', label: 'System Administrator' },
    { value: 'manager', label: 'Business Manager' }
  ];
  private apiBase = 'http://localhost:3001/api';

  constructor(
    private http: HttpClient,
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      this.loading = true;
      const username = sessionStorage.getItem('username');
      
      if (!username) {
        this.message.error('User not found. Please login again.');
        return;
      }

      const user = await firstValueFrom(
        this.http.get<User>(`${this.apiBase}/auth/me`, { params: { username } })
      );
      
      this.currentUser = user;
      console.log('✅ Profile user data loaded:', user);
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.message.error('Failed to load profile data');
    } finally {
      this.loading = false;
    }
  }

  openEditModal(): void {
    if (!this.currentUser) return;
    
    this.isEditMode = true;
    this.userForm = {
      username: this.currentUser.username,
      fullName: this.currentUser.fullName,
      email: this.currentUser.email,
      role: this.currentUser.role
    };
    this.avatarPreview = this.currentUser.avatarUrl || null;
    this.isModalVisible = true;
  }

  openPasswordModal(): void {
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.isPasswordModalVisible = true;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.message.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.message.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        this.uploadAvatar(base64);
      };
      reader.readAsDataURL(file);
    }
  }

  private async uploadAvatar(base64: string): Promise<void> {
    try {
      console.log('🔄 Uploading avatar...', { base64Length: base64.length });
      
      const response = await firstValueFrom(
        this.http.post<{url: string}>(`${this.apiBase}/users/upload-avatar`, { 
          fileBase64: base64,
          filename: 'profile-picture.jpg'
        })
      );
      
      console.log('✅ Avatar upload response:', response);
      this.avatarPreview = response.url;
      
      // Update currentUser avatarUrl immediately for preview
      if (this.currentUser) {
        // Ensure the URL is complete with domain
        const fullUrl = response.url.startsWith('http') ? response.url : `http://localhost:3001${response.url}`;
        this.currentUser.avatarUrl = fullUrl;
        console.log('🖼️ Updated avatar URL:', fullUrl);
        
        // Save to database immediately
        await this.saveAvatarToDatabase(fullUrl);
      }
      
      this.message.success('Profile picture updated successfully');
    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      this.message.error('Failed to update profile picture');
    }
  }

  async handleSave(): Promise<void> {
    if (!this.validateForm()) return;
    
    try {
      this.loading = true;
      
      const updateData: any = {
        fullName: this.userForm.fullName,
        email: this.userForm.email,
        role: this.userForm.role
      };
      
      // Only update avatar if changed
      if (this.avatarPreview && this.avatarPreview !== this.currentUser?.avatarUrl) {
        updateData.avatarUrl = this.avatarPreview;
      }
      
      await firstValueFrom(
        this.http.put(`${this.apiBase}/users/${this.currentUser?.id}`, updateData)
      );
      
      this.message.success('Profile updated successfully');
      this.isModalVisible = false;
      await this.loadCurrentUser(); // Reload user data
      
    } catch (error) {
      console.error('Error updating profile:', error);
      this.message.error('Failed to update profile');
    } finally {
      this.loading = false;
    }
  }

  async handlePasswordSave(): Promise<void> {
    if (!this.validatePasswordForm()) return;
    
    try {
      this.loading = true;
      
      const updateData = {
        currentPassword: this.passwordForm.currentPassword,
        newPassword: this.passwordForm.newPassword
      };
      
      await firstValueFrom(
        this.http.put(`${this.apiBase}/users/${this.currentUser?.id}/password`, updateData)
      );
      
      this.message.success('Password updated successfully');
      this.isPasswordModalVisible = false;
      this.resetPasswordForm();
      
    } catch (error) {
      console.error('Error updating password:', error);
      this.message.error('Failed to update password');
    } finally {
      this.loading = false;
    }
  }

  handleCancel(): void {
    this.isModalVisible = false;
    this.resetForm();
  }

  handlePasswordCancel(): void {
    this.isPasswordModalVisible = false;
    this.resetPasswordForm();
  }

  private resetForm(): void {
    this.userForm = {
      username: '',
      fullName: '',
      email: '',
      role: ''
    };
    this.avatarPreview = null;
  }

  private resetPasswordForm(): void {
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }

  private validateForm(): boolean {
    if (!this.userForm.fullName.trim()) {
      this.message.error('Full name is required');
      return false;
    }
    
    if (!this.userForm.email.trim()) {
      this.message.error('Email is required');
      return false;
    }
    
    if (!this.isValidEmail(this.userForm.email)) {
      this.message.error('Please enter a valid email address');
      return false;
    }
    
    return true;
  }

  private validatePasswordForm(): boolean {
    if (!this.passwordForm.currentPassword.trim()) {
      this.message.error('Current password is required');
      return false;
    }
    
    if (!this.passwordForm.newPassword.trim()) {
      this.message.error('New password is required');
      return false;
    }
    
    if (this.passwordForm.newPassword.length < 6) {
      this.message.error('New password must be at least 6 characters');
      return false;
    }
    
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.message.error('Passwords do not match');
      return false;
    }
    
    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'data_entry': 'Data Entry User',
      'reviewer': 'Reviewer',
      'compliance': 'Compliance Officer',
      'admin': 'System Administrator',
      'manager': 'Business Manager'
    };
    return roleLabels[role] || role;
  }

  getRoleColor(role: string): string {
    const roleColors: { [key: string]: string } = {
      'data_entry': 'blue',
      'reviewer': 'green',
      'compliance': 'orange',
      'admin': 'red',
      'manager': 'purple'
    };
    return roleColors[role] || 'default';
  }

  onImageError(event: any): void {
    console.error('❌ Image failed to load:', event.target.src);
    console.error('❌ Current user avatarUrl:', this.currentUser?.avatarUrl);
  }

  onImageLoad(event: any): void {
    console.log('✅ Image loaded successfully:', event.target.src);
  }

  private async saveAvatarToDatabase(avatarUrl: string): Promise<void> {
    try {
      if (!this.currentUser?.id) {
        console.log('❌ No current user ID available');
        return;
      }
      
      console.log('💾 Saving avatar to database:', { 
        userId: this.currentUser.id, 
        avatarUrl: avatarUrl 
      });
      
      const response = await firstValueFrom(
        this.http.put(`${this.apiBase}/users/${this.currentUser.id}`, { 
          avatarUrl: avatarUrl 
        })
      );
      
      console.log('✅ Avatar saved to database successfully:', response);
    } catch (error) {
      console.error('❌ Error saving avatar to database:', error);
    }
  }
}