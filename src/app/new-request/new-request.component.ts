// src/app/new-request/new-request.component.ts
import { Location, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Component, Inject, PLATFORM_ID, ViewEncapsulation, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray
} from '@angular/forms';

import { TranslateService } from '@ngx-translate/core';
import { NzI18nService, en_US } from 'ng-zorro-antd/i18n';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { Observable, firstValueFrom } from 'rxjs';

// Import unified lookup data
import {
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  DIVISION_OPTIONS,
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  getCitiesByCountry
} from '../shared/lookup-data';

type DocType = 'Commercial Registration' | 'Tax Certificate' | 'License' | 'Other';

interface UploadedDoc {
  id: string;
  name: string;
  type: DocType;
  description: string;
  size: number;
  mime: string;
  uploadedAt: string;
  contentBase64: string;
  source?: 'SAP S/4HANA' | 'SAP ByD' | 'Oracle Forms' | 'Data Steward';
  by?: string;
  when?: string;
}

interface ContactPerson {
  id: string;
  name: string;
  jobTitle?: string;
  email?: string;
  mobile?: string;
  landline?: string;
  preferredLanguage?: string;
  source?: 'SAP S/4HANA' | 'SAP ByD' | 'Oracle Forms' | 'Data Steward';
  by?: string;
  when?: string;
}

interface TaskRecord {
  id: number | string;
  requestId?: string;
  firstName?: string;
  firstNameAr?: string;
  street?: string;
  buildingNumber?: string;
  city?: string;
  country?: string;
  tax?: string;
  ContactName?: string;
  JobTitle?: string;
  EmailAddress?: string;
  MobileNumber?: string;
  Landline?: string;
  PrefferedLanguage?: string;
  SalesOrgOption?: string;
  DistributionChannelOption?: string;
  DivisionOption?: string;
  CustomerType?: string;
  CompanyOwner?: string;
  IssueDescription?: string;
  status?: string;
  ComplianceStatus?: string;
  blockReason?: string;
  rejectReason?: string;
  origin?: 'dataEntry' | 'quarantine' | 'duplicates' | 'compliance' | 'goldenEdit' | 'unknown';
  sourceSystem?: 'SAP S/4HANA' | 'SAP ByD' | 'Oracle Forms' | 'Data Steward';
  contacts?: ContactPerson[];
  documents?: UploadedDoc[];
  issues?: any[];
  createdBy?: string;
  assignedTo?: string;
  sourceGoldenId?: string;
  notes?: string;
  requestType?: string;
  originalRequestType?: string;
}

interface CurrentUser {
  id?: string;
  username: string;
  role?: string;
}

@Component({
  selector: 'app-new-request',
  templateUrl: './new-request.component.html',
  styleUrls: ['./new-request.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class NewRequestComponent implements OnInit {
  requestForm!: FormGroup;
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  
  // Current user info - NO localStorage dependency
  currentUser: CurrentUser | null = null;
  userRole: 'data_entry' | 'reviewer' | 'compliance' | 'admin' | null = null;
  userType: string | null = null; // For template compatibility: '1'=data_entry, '2'=reviewer, '3'=compliance
  private currentUserRole: string | null = null;
  
  // Page modes
  canEdit = false;
  canView = false;
  canApproveReject = false;
  canComplianceAction = false;
  editPressed = false;
  hasRecord = false;
  isNewRequest = false;
  isLoading = false;

  // Golden Edit mode - مُحدث ومُحسن
  isGoldenEditMode = false;
  isEditingGoldenRecord = false;
  sourceGoldenRecordId: string | null = null;

  // Quarantine mode flag
  isFromQuarantine = false;
  isQuarantineRecord = false; // NEW: Track if this is a quarantine record

  status = 'Pending';
  isArabic = false;

  // UI state
  isApprovedVisible = false;
  approvedChecked = true;
  isRejectedVisible = false;
  rejectedChecked = true;
  isRejectedConfirmVisible = false;
  isAssignVisible = false;
  selectedDepartment: any;

  // Compliance popup
  isBlockModalVisible = false;
  blockReason = '';

  stateIssues: any[] = [];
  showSummary = false;

  filteredCityOptions: any[] = [];
  private previousCountry: string | null = null;
  private suppressCityReset = false;

  // Reject modal
  rejectComment = '';

  // Document upload
  isMetaModalOpen = false;
  pendingFile?: File;
  maxSizeMB = 10;
  allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  docTypeOptions = DOCUMENT_TYPE_OPTIONS;

  metaForm = this.fb.group({
    type: ['Other'],
    description: ['']
  });

  // Use unified lookup data from shared constants
  CustomerTypeOptions = CUSTOMER_TYPE_OPTIONS;
  SalesOrgOption = SALES_ORG_OPTIONS;
  DistributionChannelOption = DISTRIBUTION_CHANNEL_OPTIONS;
  DivisionOption = DIVISION_OPTIONS;
  CityOptions = CITY_OPTIONS;
  CountryOptions = COUNTRY_OPTIONS;
  PrefferedLanguage = PREFERRED_LANGUAGE_OPTIONS;

  private originalRecord: TaskRecord | null = null;
  private currentRecordId: string | null = null;

  // Getters
  get documentsFA(): FormArray { return this.requestForm.get('documents') as FormArray; }
  get documentsFGs(): FormGroup[] { return this.documentsFA.controls as FormGroup[]; }
  get contactsFA(): FormArray { return this.requestForm.get('contacts') as FormArray; }
  get contactsFGs(): FormGroup[] { return this.contactsFA.controls as FormGroup[]; }

  get statusClassMap() {
    const s = String(this.status);
    return {
      'is-approved': s === 'Approved',
      'is-pending': s === 'Pending',
      'is-rejected': s === 'Rejected',
      'is-updated': s === 'Updated',
      'is-quarantined': s === 'Quarantined' || s === 'Quarantine'
    };
  }

  constructor(
    private fb: FormBuilder,
    private i18n: NzI18nService,
    private route: ActivatedRoute,
    private notification: NzNotificationService,
    private translate: TranslateService,
    public router: Router,
    private location: Location,
    private msg: NzMessageService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.i18n.setLocale(en_US);
    this.initForm();
    this.setupCountryCityLogic();
    
    // Get current user from API first (no localStorage)
    await this.getCurrentUser();
    
    // Check for golden record editing mode FIRST
    const mode = this.route.snapshot.queryParamMap.get('mode');
    const from = this.route.snapshot.queryParamMap.get('from');
    const fromQuarantine = this.route.snapshot.queryParamMap.get('fromQuarantine');
    
    // Check if coming from Quarantine page
    if (fromQuarantine === 'true') {
      console.log('=== QUARANTINE MODE DETECTED ===');
      this.isFromQuarantine = true;
      // Force data_entry role for quarantine records
      this.userRole = 'data_entry';
      this.userType = '1';
      this.currentUserRole = 'data_entry';
    }
    
    if (mode === 'edit-golden' && from === 'golden-summary') {
      console.log('=== GOLDEN EDIT MODE DETECTED ===');
      this.isGoldenEditMode = true;
      this.isEditingGoldenRecord = true;
      await this.loadGoldenRecordForEditing();
    } else {
      // Then load regular request data
      await this.loadRequestData();
    }

    // Language setting
    if (isPlatformBrowser(this.platformId)) {
      this.isArabic = false; // Default to English
    }

    // Duplicate warning
    this.requestForm.get('firstName')?.valueChanges.subscribe(() => this.checkForDuplicates());
    this.requestForm.get('tax')?.valueChanges.subscribe(() => this.checkForDuplicates());
  }

  // ENHANCED: Load golden record for editing
  private async loadGoldenRecordForEditing(): Promise<void> {
    console.log('Loading golden record for editing...');
    
    // Get data from router state
    const routerState = history.state;
    console.log('Router state:', routerState);
    
    if (routerState && routerState['goldenRecord']) {
      const goldenRecord = routerState.goldenRecord;
      const contacts = routerState.contacts || [];
      const documents = routerState.documents || [];
      const sourceGoldenId = routerState.sourceGoldenId;
      
      // Store source golden record ID for later use
      this.sourceGoldenRecordId = sourceGoldenId || goldenRecord.id;
      
      console.log('Golden record data received:', goldenRecord);
      console.log('Source Golden ID:', this.sourceGoldenRecordId);
      
      // Set form state for editing
      this.isNewRequest = false;
      this.hasRecord = true;
      this.editPressed = true;
      this.canEdit = true;
      this.status = 'Pending'; // New request based on golden record
      
      // Pre-populate the form with golden record data
      this.suppressCityReset = true;
      
      this.requestForm.patchValue({
        firstName: goldenRecord.name || '',
        firstNameAR: goldenRecord.nameAr || '',
        tax: goldenRecord.taxNumber || '',
        buildingNumber: goldenRecord.buildingNumber || '',
        street: goldenRecord.streetName || '',
        country: goldenRecord.country || '',
        city: goldenRecord.city || '',
        ContactName: goldenRecord.contactName || '',
        JobTitle: goldenRecord.jobTitle || '',
        EmailAddress: goldenRecord.email || '',
        MobileNumber: goldenRecord.phone || '',
        Landline: goldenRecord.landline || '',
        PrefferedLanguage: goldenRecord.preferredLanguage || '',
        SalesOrgOption: goldenRecord.salesOrg || '',
        DistributionChannelOption: goldenRecord.distributionChannel || '',
        DivisionOption: goldenRecord.division || '',
        CustomerType: goldenRecord.recordType || 'Corporate',
        CompanyOwnerFullName: goldenRecord.companyOwnerName || ''
      });
      
      // Setup city options based on country
      const selectedCountry = goldenRecord.country;
      if (selectedCountry) {
        // Use helper function from shared constants
        this.filteredCityOptions = getCitiesByCountry(selectedCountry);
      }
      
      // Load contacts with new IDs to avoid conflicts
      this.contactsFA.clear();
      if (contacts && contacts.length > 0) {
        contacts.forEach((c: any) => {
          this.contactsFA.push(this.fb.group({
            id: [this.uid()], // Generate new ID to avoid conflicts
            name: [c.name || '', Validators.required],
            jobTitle: [c.jobTitle || ''],
            email: [c.email || ''],
            mobile: [c.mobile || ''],
            landline: [c.landline || ''],
            preferredLanguage: [c.preferredLanguage || '']
          }));
        });
      }
      
      // Load documents with new IDs to avoid conflicts
      this.documentsFA.clear();
      if (documents && documents.length > 0) {
        documents.forEach((d: any) => {
          this.documentsFA.push(this.fb.group({
            id: [this.uid()], // Generate new ID to avoid conflicts
            name: [d.name || ''],
            type: [d.type || 'Other'],
            description: [d.description || ''],
            size: [d.size || 0],
            mime: [d.mime || ''],
            uploadedAt: [new Date().toISOString()], // New timestamp
            contentBase64: [d.contentBase64 || '']
          }));
        });
      }
      
      // Store reference to source golden record for submission
      this.originalRecord = {
        sourceGoldenId: this.sourceGoldenRecordId,
        origin: 'goldenEdit',
        notes: `Created by editing Golden Record: ${goldenRecord.goldenCode || this.sourceGoldenRecordId}`
      } as TaskRecord;
      
      this.suppressCityReset = false;
      
      // Enable form for editing
      this.requestForm.enable();
      
      // Add contact if none exist
      if (this.contactsFA.length === 0) {
        this.addContact();
      }
      
      console.log('Golden record form populated successfully');
      this.msg.success('Golden record data loaded successfully. You can now edit and resubmit.');
      
    } else {
      console.error('No golden record data found in router state');
      this.msg.error('No golden record data received. Please try again.');
      // Redirect back to golden requests
      setTimeout(() => {
        this.router.navigate(['/dashboard/golden-requests']);
      }, 3000);
    }
  }

  private async getCurrentUser(): Promise<void> {
    try {
      // Check multiple storage locations for username
      const username = sessionStorage.getItem('username') || 
                      localStorage.getItem('username') || 
                      localStorage.getItem('user');
      
      console.log('New Request - Getting user with username:', username);
      
      if (!username) {
        console.error('No username found in storage');
        this.currentUser = { username: 'data_entry', role: 'data_entry' };
        this.mapUserRole('data_entry');
        return;
      }
      
      const url = `${this.apiBase}/auth/me?username=${username}`;
      
      try {
        const user = await firstValueFrom(this.http.get<any>(url));
        
        if (user) {
          this.currentUser = user;
          this.mapUserRole(user.role);
          console.log('Current user loaded:', user);
        }
      } catch (apiError) {
        console.error('API call failed, using fallback user data');
        this.currentUser = {
          username: username,
          role: username === 'data_entry' ? 'data_entry' : 
                username === 'reviewer' ? 'reviewer' : 
                username === 'compliance' ? 'compliance' : 'data_entry'
        };
        this.mapUserRole(this.currentUser.role || 'data_entry');
      }
      
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      this.currentUser = { username: 'data_entry', role: 'data_entry' };
      this.mapUserRole('data_entry');
    }
  }

  private mapUserRole(apiRole: string): void {
    // Fix role mapping - handle the database inconsistency
    let correctedRole = apiRole;
    
    // If username is data_entry but role is wrong, fix it
    const username = this.currentUser?.username;
    if (username === 'data_entry' && apiRole !== 'data_entry' && apiRole !== '1') {
      console.log('Fixing role for data_entry user');
      correctedRole = 'data_entry';
    }
    
    // If username is reviewer but role is wrong, fix it  
    if (username === 'reviewer' && apiRole !== 'reviewer' && apiRole !== '2') {
      console.log('Fixing role for reviewer user');
      correctedRole = 'reviewer';
    }
    
    // If username is compliance but role is wrong, fix it
    if (username === 'compliance' && apiRole !== 'compliance' && apiRole !== '3') {
      console.log('Fixing role for compliance user');
      correctedRole = 'compliance';
    }
    
    // Map corrected roles to component roles
    if (correctedRole === 'reviewer' || correctedRole === 'master' || correctedRole === '2') {
      this.userRole = 'reviewer';
      this.userType = '2';
      this.currentUserRole = 'reviewer';
    } else if (correctedRole === 'data_entry' || correctedRole === '1') {
      this.userRole = 'data_entry';
      this.userType = '1';
      this.currentUserRole = 'data_entry';
    } else if (correctedRole === 'compliance' || correctedRole === '3') {
      this.userRole = 'compliance';
      this.userType = '3';
      this.currentUserRole = 'compliance';
    } else if (correctedRole === 'admin' || correctedRole === 'demo-admin') {
      this.userRole = 'admin';
      this.userType = 'admin';
      this.currentUserRole = 'admin';
    }
    
    console.log('User role mapped:', {
      originalApiRole: apiRole,
      correctedRole: correctedRole,
      userRole: this.userRole,
      userType: this.userType
    });
  }

  private determineRoleFromRoute(): void {
    const queryParams = this.route.snapshot.queryParams;
    
    console.log('Determining role from route:', queryParams);
    
    // Use query params from navigation
    if (queryParams['userRole']) {
      this.mapUserRole(queryParams['userRole']);
    } else if (queryParams['from']) {
      // Determine from where user came
      switch(queryParams['from']) {
        case 'reviewer-tasks':
        case 'my-task-list':
        case 'admin-task-list':
          // If action is review, user is reviewer
          if (queryParams['action'] === 'review') {
            this.userRole = 'reviewer';
            this.userType = '2';
            this.currentUserRole = 'reviewer';
          } else if (queryParams['action'] === 'edit') {
            this.userRole = 'data_entry';
            this.userType = '1';
            this.currentUserRole = 'data_entry';
          }
          break;
        case 'compliance-task-list':
        case 'compliance-tasks':
          this.userRole = 'compliance';
          this.userType = '3';
          this.currentUserRole = 'compliance';
          break;
        case 'data-entry-tasks':
        case 'golden-summary': // Add golden-summary case
          this.userRole = 'data_entry';
          this.userType = '1';
          this.currentUserRole = 'data_entry';
          break;
      }
    } else {
      // Final fallback based on status
      const status = queryParams['status'];
      if (status === 'Approved') {
        this.userRole = 'compliance';
        this.userType = '3';
        this.currentUserRole = 'compliance';
      } else if (status === 'Pending') {
        this.userRole = 'reviewer';
        this.userType = '2';
        this.currentUserRole = 'reviewer';
      } else if (status === 'Rejected') {
        this.userRole = 'data_entry';
        this.userType = '1';
        this.currentUserRole = 'data_entry';
      }
    }
    
    console.log('Role determined from route:', {
      userRole: this.userRole,
      userType: this.userType
    });
  }

  private initForm(): void {
    this.requestForm = this.fb.group({
      firstName: [null, Validators.required],
      firstNameAR: [null, Validators.required],
      street: [null],
      city: [null, Validators.required],
      country: [null, Validators.required],
      tax: [null, Validators.required],
      ContactName: [null],
      EmailAddress: [null],
      MobileNumber: [null],
      JobTitle: [null],
      Landline: [null],
      PrefferedLanguage: [null],
      SalesOrgOption: [null],
      DistributionChannelOption: [null],
      DivisionOption: [null],
      buildingNumber: [null],
      CustomerType: [null],
      CompanyOwnerFullName: [null],
      ComplianceStatus: [null],
      contacts: this.fb.array([]),
      documents: this.fb.array([])
    });
  }

  private setupCountryCityLogic(): void {
    this.previousCountry = this.requestForm.get('country')?.value || null;
    this.requestForm.get('country')?.valueChanges.subscribe(selectedCountry => {
      // Use helper function from shared constants
      this.filteredCityOptions = getCitiesByCountry(selectedCountry || '');

      if (this.suppressCityReset) {
        this.previousCountry = selectedCountry;
        return;
      }
      
      const currentCity = this.requestForm.get('city')?.value;
      const cityStillValid = this.filteredCityOptions.some(o => o.value === currentCity);
      if ((this.editPressed || this.isNewRequest || this.isGoldenEditMode) && !cityStillValid) {
        this.requestForm.get('city')?.setValue(null);
      }
      this.previousCountry = selectedCountry;
    });
  }

  private async loadRequestData(): Promise<void> {
    const routeId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParams;
    
    // Clean up ID if it has REQ- prefix
    const cleanId = routeId?.replace('REQ-', '');
    
    if (cleanId && cleanId !== 'new') {
      // Load existing record from API
      this.isLoading = true;
      try {
        const record = await firstValueFrom(
          this.http.get<TaskRecord>(`${this.apiBase}/requests/${cleanId}`)
        );
        
        if (record) {
          this.currentRecordId = cleanId; // CRITICAL: Store the ID for updates
          this.originalRecord = record;
          this.hasRecord = true;
          this.status = record.status || 'Pending';
          
          // Check if this is a Quarantine record
          if (this.isFromQuarantine || record.status === 'Quarantine' || record.status === 'Quarantined') {
            console.log('Handling Quarantine record with ID:', cleanId);
            this.isQuarantineRecord = true;
            this.canEdit = true;
            this.canView = false;
            this.canApproveReject = false;
            this.canComplianceAction = false;
            this.editPressed = true;
            this.requestForm.enable();
          } else {
            // Set permissions based on API data
            this.setPermissionsFromRecord(record);
            
            // Set form state based on permissions
            if (!this.canEdit && !this.canApproveReject && !this.canComplianceAction) {
              this.requestForm.disable();
            } else if (this.canEdit) {
              this.requestForm.enable();
              this.editPressed = true;
            }
          }
          
          // Patch form with record data
          this.patchFromRecord(record);
          
          console.log('Record loaded with permissions:', {
            id: cleanId,
            currentRecordId: this.currentRecordId,
            status: this.status,
            userRole: this.userRole,
            userType: this.userType,
            canApproveReject: this.canApproveReject,
            canComplianceAction: this.canComplianceAction,
            canEdit: this.canEdit,
            isFromQuarantine: this.isFromQuarantine,
            isQuarantineRecord: this.isQuarantineRecord,
            assignedTo: record.assignedTo,
            requestType: record.requestType,
            originalRequestType: record.originalRequestType
          });
        }
      } catch (error) {
        console.error('Error loading request:', error);
        this.msg.error('Failed to load request data');
      } finally {
        this.isLoading = false;
      }
    } else {
      // New request mode
      this.isNewRequest = true;
      this.editPressed = true;
      this.requestForm.enable();
      // For new requests, default to data entry role if not set
      if (!this.userRole) {
        this.userRole = 'data_entry';
        this.userType = '1';
        this.currentUserRole = 'data_entry';
      }
      if (this.contactsFA.length === 0) {
        this.addContact();
      }
    }
  }

  // FIXED: Handle permissions for quarantine rejected records
  private setPermissionsFromRecord(record: TaskRecord): void {
    // Reset permissions
    this.canEdit = false;
    this.canApproveReject = false;
    this.canComplianceAction = false;
    this.canView = false;

    console.log('Setting permissions from record:', {
      userRole: this.userRole,
      currentUserRole: this.currentUserRole,
      recordStatus: record.status,
      assignedTo: record.assignedTo,
      ComplianceStatus: record.ComplianceStatus,
      requestType: record.requestType,
      originalRequestType: record.originalRequestType
    });

    // Use the role determined from API or route
    const effectiveRole = this.userRole || this.currentUserRole;

    // FIXED: Check if this is a quarantine rejected record
    const isQuarantineRejected = (record.requestType === 'quarantine' || 
                                   record.originalRequestType === 'quarantine') &&
                                  record.status === 'Rejected';

    switch (effectiveRole) {
      case 'data_entry':
        // FIXED: Check for multiple assignedTo values including system_import
        const isAssignedToDataEntry = record.assignedTo === 'data_entry' || 
                                       record.assignedTo === 'system_import' ||
                                       !record.assignedTo;
        
        // Can edit rejected requests (including quarantine rejected)
        this.canEdit = (record.status === 'Rejected' && (isAssignedToDataEntry || isQuarantineRejected)) ||
                      record.status === 'Quarantine' || 
                      record.status === 'Quarantined';
        this.canView = !this.canEdit;
        break;
        
      case 'reviewer':
        // Can approve/reject pending requests assigned to reviewer
        this.canApproveReject = record.status === 'Pending' && 
                               (record.assignedTo === 'reviewer' || !record.assignedTo);
        this.canView = !this.canApproveReject;
        // Ensure userType is set for template
        if (!this.userType) {
          this.userType = '2';
        }
        break;
        
      case 'compliance':
        // Can approve/block approved requests assigned to compliance
        this.canComplianceAction = record.status === 'Approved' && 
                                  record.assignedTo === 'compliance' && 
                                  (!record.ComplianceStatus || record.ComplianceStatus === '');
        this.canView = !this.canComplianceAction;
        // Ensure userType is set for template
        if (!this.userType) {
          this.userType = '3';
        }
        break;
        
      case 'admin':
        // Admin can do everything based on status
        this.canEdit = ['Rejected', 'Pending', 'Quarantine', 'Quarantined'].includes(record.status || '');
        this.canApproveReject = record.status === 'Pending';
        this.canComplianceAction = record.status === 'Approved' && 
                                  (!record.ComplianceStatus || record.ComplianceStatus === '');
        this.canView = true;
        if (!this.userType) {
          this.userType = 'admin';
        }
        break;
        
      default:
        // Default to view only
        this.canView = true;
        break;
    }

    console.log('Permissions set:', {
      canEdit: this.canEdit,
      canApproveReject: this.canApproveReject,
      canComplianceAction: this.canComplianceAction,
      canView: this.canView,
      effectiveRole: effectiveRole,
      isQuarantineRejected: isQuarantineRejected
    });
  }

  // Compliance actions
  async submitBlock(): Promise<void> {
    const id = this.currentRecordId;
    const reason = (this.blockReason || '').trim();

    if (!id || !reason) {
      this.msg.warning('Please enter a block reason.');
      return;
    }

    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${id}/compliance/block`, { reason })
      );
      
      this.isBlockModalVisible = false;
      this.blockReason = '';

      const message = await firstValueFrom(
        this.translate.get('Request blocked successfully')
      );
      this.notification.success(message, '');
      this.router.navigate(['/dashboard/compliance-task-list']);
    } catch (error) {
      console.error('Error blocking request:', error);
      this.msg.error('Failed to block request');
    }
  }

  async onComplianceApprove(): Promise<void> {
    const id = this.currentRecordId;
    if (!id) return;

    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${id}/compliance/approve`, { 
          note: 'Approved as Golden Record' 
        })
      );

      const message = await firstValueFrom(
        this.translate.get('Request approved successfully')
      );
      this.notification.success(message, '');
      this.router.navigate(['/dashboard/compliance-task-list']);
    } catch (error) {
      console.error('Error approving request:', error);
      this.msg.error('Failed to approve request');
    }
  }

  // FIXED: Submit form - handle quarantine records properly with UPDATE
  async onSubmit(): Promise<void> {
    console.log('=== FORM SUBMISSION START ===');
    console.log('Form valid:', this.requestForm.valid);
    console.log('Current Record ID:', this.currentRecordId);
    console.log('Golden Edit Mode:', this.isGoldenEditMode);
    console.log('From Quarantine:', this.isFromQuarantine);
    console.log('Is Quarantine Record:', this.isQuarantineRecord);
    console.log('Status:', this.status);
    console.log('Source Golden ID:', this.sourceGoldenRecordId);
    console.log('Current User:', this.currentUser);
    
    if (!this.requestForm.valid) {
      console.log('Form validation failed');
      Object.values(this.requestForm.controls).forEach(ctrl => {
        (ctrl as any).markAsDirty?.();
        (ctrl as any).updateValueAndValidity?.({ onlySelf: true });
      });
      this.msg.warning('Please fill all required fields');
      return;
    }

    const payload = this.buildPayloadFromForm();
    console.log('Payload built:', payload);
    
    this.isLoading = true;

    try {
      // CRITICAL: Check if we have an existing record ID for UPDATE
      if (this.currentRecordId && !this.isGoldenEditMode) {
        // UPDATE existing record - includes Quarantine, Rejected, etc.
        console.log('UPDATING existing request with ID:', this.currentRecordId);
        
        await firstValueFrom(
          this.http.put(`${this.apiBase}/requests/${this.currentRecordId}`, payload)
        );
        
        // If this is a Quarantine record, call complete-quarantine endpoint
        if (this.isQuarantineRecord || this.status === 'Quarantine' || this.status === 'Quarantined' || this.isFromQuarantine) {
          console.log('Completing quarantine record...');
          try {
            await firstValueFrom(
              this.http.post(`${this.apiBase}/requests/${this.currentRecordId}/complete-quarantine`, {})
            );
            console.log('Quarantine record marked as complete');
          } catch (error) {
            console.error('Error completing quarantine:', error);
            // Continue even if this fails - the update was successful
          }
        }
        
        const message = this.isQuarantineRecord || this.status === 'Quarantine' || this.status === 'Quarantined'
          ? await firstValueFrom(this.translate.get('Quarantine record completed and submitted for review'))
          : this.status === 'Rejected'
          ? await firstValueFrom(this.translate.get('Rejected request updated and resubmitted for review'))
          : await firstValueFrom(this.translate.get('Request updated successfully'));
        
        this.notification.success(message, '');
        
      } else if (this.isGoldenEditMode) {
        // GOLDEN EDIT MODE: Create new request with Golden Edit logic
        console.log('=== SUBMITTING GOLDEN EDIT REQUEST ===');
        console.log('Creating new request for golden edit');
        
        const response = await firstValueFrom(
          this.http.post<any>(`${this.apiBase}/requests`, payload)
        );
        
        console.log('Golden Edit API Response:', response);
        this.currentRecordId = response.id;
        
        const message = await firstValueFrom(
          this.translate.get('Golden record changes submitted successfully! The original Golden Record has been temporarily suspended while your changes are being reviewed.')
        );
        this.notification.success(message, '');
        
      } else {
        // CREATE new request only if no currentRecordId
        console.log('Creating NEW request');
        const response = await firstValueFrom(
          this.http.post<any>(`${this.apiBase}/requests`, payload)
        );
        
        console.log('New request created:', response);
        this.currentRecordId = response.id;
        
        const message = await firstValueFrom(
          this.translate.get('New request created successfully')
        );
        this.notification.success(message, '');
      }
      
      // Navigate based on context
      console.log('Navigating to task list...');
      
      // If from Quarantine, go back to Quarantine page
      if (this.isFromQuarantine) {
        this.router.navigate(['/dashboard/quarantine']);
      } else {
        this.navigateToTaskList();
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      this.msg.error('Failed to submit request');
    } finally {
      this.isLoading = false;
    }
  }

  private navigateToTaskList(): void {
    // Navigate based on current user role
    switch (this.userRole || this.currentUserRole) {
      case 'data_entry':
        this.router.navigate(['/dashboard/my-task']);
        break;
      case 'reviewer':
        this.router.navigate(['/dashboard/admin-task-list']);
        break;
      case 'compliance':
        this.router.navigate(['/dashboard/compliance-task-list']);
        break;
      case 'admin':
        this.router.navigate(['/dashboard/admin-task-list']);
        break;
      default:
        this.router.navigate(['/dashboard']);
    }
  }

  // ENHANCED: Build payload with golden edit support
  private buildPayloadFromForm() {
    const v = this.requestForm.getRawValue() as any;
    const payload: any = {
      firstName: v.firstName,
      firstNameAr: v.firstNameAR,
      tax: v.tax,
      buildingNumber: v.buildingNumber,
      street: v.street,
      country: v.country,
      city: v.city,
      CustomerType: v.CustomerType,
      CompanyOwner: v.CompanyOwnerFullName,
      SalesOrgOption: v.SalesOrgOption,
      DistributionChannelOption: v.DistributionChannelOption,
      DivisionOption: v.DivisionOption,
      ContactName: v.ContactName,
      EmailAddress: v.EmailAddress,
      MobileNumber: v.MobileNumber,
      JobTitle: v.JobTitle,
      Landline: v.Landline,
      PrefferedLanguage: v.PrefferedLanguage,
      contacts: (this.contactsFGs || []).map(g => g.value as ContactPerson),
      documents: (this.documentsFGs || []).map((g: any) => g.value as UploadedDoc),
      origin: this.originalRecord?.origin || 'dataEntry',
      sourceSystem: this.originalRecord?.sourceSystem || 'Data Steward',
      createdBy: this.currentUser?.username || 'data_entry',
      status: 'Pending',
      assignedTo: 'reviewer'
    };

    // Add golden edit specific fields
    if (this.isGoldenEditMode && this.sourceGoldenRecordId) {
      payload.origin = 'goldenEdit';
      payload.sourceGoldenId = this.sourceGoldenRecordId;
      payload.notes = this.originalRecord?.notes || `Created by editing Golden Record: ${this.sourceGoldenRecordId}`;
      
      console.log('Golden Edit payload enhanced:', {
        origin: payload.origin,
        sourceGoldenId: payload.sourceGoldenId,
        notes: payload.notes
      });
    }

    // Handle Quarantine records - but don't override if updating
    if ((this.status === 'Quarantine' || this.status === 'Quarantined' || this.isFromQuarantine) && !this.currentRecordId) {
      payload.origin = 'quarantine';
      payload.notes = 'Completed from Quarantine';
    }

    return payload;
  }

  private patchFromRecord(rec: TaskRecord): void {
    if (!rec) return;
    
    this.suppressCityReset = true;
    this.status = rec.status || 'Pending';

    this.requestForm.patchValue({
      firstName: rec.firstName,
      firstNameAR: rec.firstNameAr,
      street: rec.street,
      buildingNumber: rec.buildingNumber,
      city: rec.city,
      country: rec.country,
      tax: rec.tax,
      ContactName: rec.ContactName,
      JobTitle: rec.JobTitle,
      EmailAddress: rec.EmailAddress,
      MobileNumber: rec.MobileNumber,
      Landline: rec.Landline,
      PrefferedLanguage: rec.PrefferedLanguage,
      SalesOrgOption: rec.SalesOrgOption,
      DistributionChannelOption: rec.DistributionChannelOption,
      DivisionOption: rec.DivisionOption,
      CustomerType: rec.CustomerType,
      CompanyOwnerFullName: rec.CompanyOwner,
      ComplianceStatus: rec.ComplianceStatus
    });

    // Setup city options based on country using helper function
    const selectedCountry = rec.country;
    if (selectedCountry) {
      this.filteredCityOptions = getCitiesByCountry(selectedCountry);
    }

    // Load contacts
    this.contactsFA.clear();
    if (Array.isArray(rec.contacts)) {
      rec.contacts.forEach((c: any) => {
        this.contactsFA.push(this.fb.group({
          id: [c.id || this.uid()],
          name: [c.name, Validators.required],
          jobTitle: [c.jobTitle],
          email: [c.email],
          mobile: [c.mobile],
          landline: [c.landline],
          preferredLanguage: [c.preferredLanguage]
        }));
      });
    }

    // Load documents
    this.documentsFA.clear();
    if (Array.isArray(rec.documents)) {
      rec.documents.forEach((d: any) => {
        this.documentsFA.push(this.fb.group(d));
      });
    }

    // Show summary for rejected/quarantined
    if (rec.rejectReason || rec.issues?.length) {
      this.stateIssues = rec.issues || [{ 
        description: rec.rejectReason || rec.blockReason || 'Issue found' 
      }];
      this.showSummary = true;
    }

    this.suppressCityReset = false;
  }

  // ENHANCED: Page title and submit button text with golden edit support
  getPageTitle(): string {
    if (this.isGoldenEditMode) {
      return 'Edit Golden Record';
    } else if (this.status === 'Quarantine' || this.status === 'Quarantined') {
      return 'Complete Quarantine Record';
    } else if (this.hasRecord && !this.isNewRequest) {
      return 'Edit Request';
    }
    return 'New Request';
  }

  getSubmitButtonText(): string {
    if (this.isGoldenEditMode) {
      return 'Update & Resubmit Golden Record';
    } else if (this.status === 'Quarantine' || this.status === 'Quarantined') {
      return 'Complete & Submit for Review';
    } else if (this.hasRecord && !this.isNewRequest) {
      return 'Update Request';
    }
    return 'Submit Request';
  }

  // Reviewer actions
  async submitApprove(): Promise<void> {
    const id = this.currentRecordId;
    if (!id) {
      this.msg.warning('No request ID found');
      this.closeAllModals();
      return;
    }

    this.isLoading = true;
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${id}/approve`, { 
          note: 'Approved by reviewer' 
        })
      );

      const message = await firstValueFrom(
        this.translate.get('Request approved successfully')
      );
      this.notification.success(message, '');
      this.navigateToTaskList();
    } catch (error) {
      console.error('Error approving request:', error);
      this.msg.error('Failed to approve request');
    } finally {
      this.isLoading = false;
      this.closeAllModals();
    }
  }

  async submitReject(): Promise<void> {
    const id = this.currentRecordId;
    if (!id) {
      this.msg.warning('No request ID found');
      this.closeAllModals();
      return;
    }

    const reason = this.rejectComment?.trim() || 'Rejected by reviewer';

    this.isLoading = true;
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${id}/reject`, { reason })
      );

      const message = await firstValueFrom(
        this.translate.get('Request rejected successfully')
      );
      this.notification.success(message, '');
      this.navigateToTaskList();
    } catch (error) {
      console.error('Error rejecting request:', error);
      this.msg.error('Failed to reject request');
    } finally {
      this.isLoading = false;
      this.closeAllModals();
    }
  }

  // Helper methods
  private uid(): string {
    return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  addContact(): void {
    this.contactsFA.push(this.fb.group({
      id: [this.uid()],
      name: [null, Validators.required],
      jobTitle: [null],
      email: [null],
      mobile: [null],
      landline: [null],
      preferredLanguage: [null]
    }));
  }

  removeContact(i: number): void {
    this.contactsFA.removeAt(i);
  }

  // ENHANCED: Go back method with golden edit support
  goBack(): void {
    if (this.isGoldenEditMode) {
      // Go back to golden requests if editing golden record
      this.router.navigate(['/dashboard/golden-requests']);
    } else if (this.isFromQuarantine) {
      // Go back to quarantine if from quarantine
      this.router.navigate(['/dashboard/quarantine']);
    } else {
      this.location.back();
    }
  }

  // FIXED: Edit button now handles quarantine rejected records
  editRequest(): void {
    // Check if this is a quarantine rejected record
    const isQuarantineRejected = (this.originalRecord?.requestType === 'quarantine' || 
                                  this.originalRecord?.originalRequestType === 'quarantine') &&
                                 this.status === 'Rejected';
    
    // Check if user can edit based on role and record status
    if (this.canEdit || this.userRole === 'admin' || 
        this.status === 'Quarantine' || this.status === 'Quarantined' ||
        isQuarantineRejected) {
      this.editPressed = true;
      this.requestForm.enable();
      this.canEdit = true;
      console.log('Edit enabled for record:', {
        recordId: this.currentRecordId,
        status: this.status,
        isQuarantineRejected: isQuarantineRejected,
        userRole: this.userRole
      });
    } else {
      this.msg.warning('You do not have permission to edit this request');
    }
  }

  // Document handling
  private toBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  beforeUpload = (file: File): boolean => {
    if (!this.allowedTypes.includes(file.type)) {
      this.msg.error('Unsupported file type');
      return false;
    }
    if (file.size > this.maxSizeMB * 1024 * 1024) {
      this.msg.error(`Max size ${this.maxSizeMB}MB`);
      return false;
    }
    this.pendingFile = file;
    this.metaForm.reset({ type: 'Other', description: '' });
    this.isMetaModalOpen = true;
    return false;
  };

  beforeUploadNz = (file: NzUploadFile): boolean => {
    const real = (file as any)?.originFileObj || file;
    return this.beforeUpload(real as File);
  };

  async confirmMeta(): Promise<void> {
    if (!this.pendingFile) return;
    
    const base64 = await this.toBase64(this.pendingFile);
    const doc: UploadedDoc = {
      id: this.uid(),
      name: this.pendingFile.name,
      type: (this.metaForm.value.type as DocType) || 'Other',
      description: this.metaForm.value.description || '',
      size: this.pendingFile.size,
      mime: this.pendingFile.type,
      uploadedAt: new Date().toISOString(),
      contentBase64: base64
    };
    
    this.documentsFA.push(this.fb.group(doc));
    this.isMetaModalOpen = false;
    this.pendingFile = undefined;
    this.msg.success('Document added');
  }

  removeDoc(index: number): void {
    this.documentsFA.removeAt(index);
  }

  getDocIcon(mime?: string): string {
    const m = (mime || '').toLowerCase();
    if (m.includes('pdf')) return 'file-pdf';
    if (m.includes('image')) return 'file-image';
    if (m.includes('word')) return 'file-text';
    if (m.includes('excel')) return 'file-text';
    return 'file';
  }

  getTypeColor(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'commercial registration': return 'gold';
      case 'tax certificate': return 'geekblue';
      case 'license': return 'green';
      default: return 'default';
    }
  }

  downloadDoc(doc: UploadedDoc): void {
    const a = document.createElement('a');
    a.href = doc.contentBase64;
    a.download = doc.name;
    a.click();
  }

  // Duplicate checking
  duplicateCheckList = [
    { firstName: 'Unilever', tax: 'EG123' },
    { firstName: 'Nestle Egypt', tax: 'EG23456789012345' }
  ];
  showDuplicateWarning = false;
  duplicateName = '';
  duplicateTax = '';

  checkForDuplicates(): void {
    const normalize = (val: string) => (val || '').trim().toLowerCase();
    const firstName = normalize(this.requestForm.get('firstName')?.value);
    const tax = normalize(this.requestForm.get('tax')?.value);
    
    const isDuplicate = this.duplicateCheckList.some(
      r => normalize(r.firstName) === firstName && normalize(r.tax) === tax
    );
    
    this.showDuplicateWarning = isDuplicate;
    this.duplicateName = isDuplicate ? (this.requestForm.get('firstName')?.value || '') : '';
    this.duplicateTax = isDuplicate ? (this.requestForm.get('tax')?.value || '') : '';
  }

  // Modal controls
  closeAllModals(): void {
    this.isApprovedVisible = false;
    this.isRejectedVisible = false;
    this.isRejectedConfirmVisible = false;
    this.isAssignVisible = false;
    this.isBlockModalVisible = false;
  }

  showApproveModal(): void { 
    if (this.canApproveReject || this.userRole === 'admin') {
      this.isApprovedVisible = true;
    } else {
      this.msg.warning('You do not have permission to approve this request');
    }
  }
  
  showRejectedModal(): void { 
    if (this.canApproveReject || this.userRole === 'admin') {
      this.isRejectedVisible = true;
    } else {
      this.msg.warning('You do not have permission to reject this request');
    }
  }

  showBlockModal(): void {
    if (this.canComplianceAction || this.userRole === 'admin') {
      this.isBlockModalVisible = true;
    } else {
      this.msg.warning('You do not have permission to block this request');
    }
  }
  
  showAssignModal(): void { 
    this.isAssignVisible = true; 
  }

  assignToBtn(): void {
    this.closeAllModals();
    this.msg.success('Assigned successfully');
    this.location.back();
  }
}