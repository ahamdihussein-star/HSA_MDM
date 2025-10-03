import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';

interface User {
  id: number;
  username: string;
  password?: string;
  role: string;
  fullName: string;
  email: string;
  isActive: number;
  createdAt: string;
  avatarUrl?: string | null;
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  loading = false;
  isModalVisible = false;
  editingUser: User | null = null;
  isEditMode = false;

  // Form data
  userForm = {
    username: '',
    password: '',
    role: 'data_entry',
    fullName: '',
    email: '',
    isActive: 1,
    avatarUrl: ''
  };

  // Role options
  roleOptions = [
    { value: 'data_entry', label: 'Data Entry User' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'compliance', label: 'Compliance Officer' },
    { value: 'admin', label: 'System Administrator' }
  ];

  constructor(
    private http: HttpClient,
    private modal: NzModalService,
    private message: NzMessageService
  ) {
    console.log('🔧 UserManagementComponent constructor called');
  }

  ngOnInit(): void {
    console.log('🚀 UserManagementComponent initialized');
    console.log('📋 Initial users array:', this.users);
    console.log('🔧 Loading state:', this.loading);
    console.log('🌐 Making API call to /api/users');
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    console.log('🔍 Loading users...');
    console.log('🌐 HTTP GET request to /api/users');
    this.http.get<User[]>('http://localhost:3001/api/users').subscribe({
      next: (users) => {
        console.log('✅ Users loaded:', users);
        console.log('📊 Users array length:', users.length);
        console.log('🔄 Before assignment - this.users:', this.users);
        this.users = users;
        console.log('🔄 After assignment - this.users:', this.users);
        this.loading = false;
        console.log('🔄 Component users updated:', this.users);
        console.log('🔄 Loading state updated:', this.loading);
      },
      error: (error) => {
        console.error('❌ Error loading users:', error);
        this.message.error('Failed to load users');
        this.loading = false;
      }
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.editingUser = null;
    this.resetForm();
    this.isModalVisible = true;
  }

  openEditModal(user: User): void {
    this.isEditMode = true;
    this.editingUser = user;
    this.userForm = {
      username: user.username,
      password: '',
      role: user.role,
      fullName: user.fullName || '',
      email: user.email || '',
      isActive: user.isActive,
      avatarUrl: user.avatarUrl || ''
    };
    this.isModalVisible = true;
  }

  resetForm(): void {
    this.userForm = {
      username: '',
      password: '',
      role: 'data_entry',
      fullName: '',
      email: '',
      isActive: 1,
      avatarUrl: ''
    };
  }

  handleSave(): void {
    if (!this.validateForm()) {
      return;
    }

    const userData = {
      ...this.userForm,
      isActive: this.userForm.isActive ? 1 : 0
    };

    if (this.isEditMode && this.editingUser) {
      // Update existing user
      this.http.put(`http://localhost:3001/api/users/${this.editingUser.id}`, userData).subscribe({
        next: () => {
          this.message.success('User updated successfully');
          this.isModalVisible = false;
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.message.error('Failed to update user');
        }
      });
    } else {
      // Create new user
      this.http.post('http://localhost:3001/api/users', userData).subscribe({
        next: () => {
          this.message.success('User created successfully');
          this.isModalVisible = false;
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.message.error('Failed to create user');
        }
      });
    }
  }

  // Avatar upload (base64)
  avatarPreview: string | null = null;
  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg)$/.test(file.type)) {
      this.message.error('Only PNG or JPEG images are allowed');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.http.post<{url: string}>('http://localhost:3001/api/users/upload-avatar', {
        fileBase64: base64,
        filename: this.userForm.username || 'avatar'
      }).subscribe({
        next: (res) => {
          this.userForm.avatarUrl = res.url;
          this.avatarPreview = res.url.startsWith('http') ? res.url : `http://localhost:3001${res.url}`;
          this.message.success('Avatar uploaded');
        },
        error: () => this.message.error('Failed to upload avatar')
      });
    };
    reader.readAsDataURL(file);
  }

  validateForm(): boolean {
    if (!this.userForm.username.trim()) {
      this.message.error('Username is required');
      return false;
    }
    if (!this.isEditMode && !this.userForm.password.trim()) {
      this.message.error('Password is required for new users');
      return false;
    }
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

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  deleteUser(user: User): void {
    this.modal.confirm({
      nzTitle: 'Delete User',
      nzContent: `Are you sure you want to delete user "${user.username}"?`,
      nzOkText: 'Delete',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.http.delete(`http://localhost:3001/api/users/${user.id}`).subscribe({
          next: () => {
            this.message.success('User deleted successfully');
            this.loadUsers();
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.message.error('Failed to delete user');
          }
        });
      }
    });
  }

  toggleUserStatus(user: User): void {
    const newStatus = user.isActive ? 0 : 1;
    this.http.put(`http://localhost:3001/api/users/${user.id}`, { isActive: newStatus }).subscribe({
      next: () => {
        this.message.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error updating user status:', error);
        this.message.error('Failed to update user status');
      }
    });
  }

  getRoleLabel(role: string): string {
    const roleOption = this.roleOptions.find(option => option.value === role);
    return roleOption ? roleOption.label : role;
  }

  getRoleColor(role: string): string {
    const colors: { [key: string]: string } = {
      'admin': 'red',
      'reviewer': 'blue',
      'compliance': 'green',
      'data_entry': 'orange'
    };
    return colors[role] || 'default';
  }
}