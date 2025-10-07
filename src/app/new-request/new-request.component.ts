import { Location, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Component, Inject, PLATFORM_ID, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
import { DemoDataGeneratorService, DemoCompany } from '../services/demo-data-generator.service';
import { AutoTranslateService } from '../services/auto-translate.service';

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
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewRequestComponent implements OnInit, OnDestroy {
  // Anti-loop protection
  private initCount = 0;
  private maxInitCalls = 1;
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
  hasDuplicate = false;
  duplicateRecord: any = null;
  showDuplicateModal = false;
  loadingDuplicateDetails = false;
  showGoldenSummaryInModal = false;
  goldenSummaryUrl: SafeResourceUrl | null = null;
  private validationTimer: any = null;

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

  docTypeOptions = DOCUMENT_TYPE_OPTIONS.map(option => ({
    ...option,
    label: option.value === 'Other' ? this.translate.instant('Other') : option.label
  }));

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
  currentRecordId: string | null = null;

  // ====== Upload Document Modal ======
  showUploadModal = false;
  newDocument: any = {
    name: '',
    type: '',
    description: '',
    file: null
  };

  // ====== Document Preview & Download ======
  showDocumentPreviewModal = false;
  selectedDocument: any = null;

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
    private http: HttpClient,
    private demoDataGenerator: DemoDataGeneratorService,
    private autoTranslate: AutoTranslateService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    // Protection against multiple calls
    this.initCount++;
    if (this.initCount > this.maxInitCalls) {
      console.error('BLOCKED: Too many init calls!');
      return;
    }
    
    console.log('🚀 === INIT START === 🚀');
    
    // Add showDuplicateDetails to window for onclick access
    (window as any).showDuplicateDetails = () => this.showDuplicateDetails();
    
    // Initialize form first
    this.i18n.setLocale(en_US);
    this.initForm();
    
    // Initialize city options
    this.filteredCityOptions = [];
    
    // Get ID from route
    const routeId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParams;
    
    // Set role from query params
    if (queryParams['userRole'] === 'reviewer') {
      this.userRole = 'reviewer';
      this.userType = '2';
      this.canView = true;
      this.canEdit = false;
      this.canApproveReject = true;
    }

    // Enhanced compliance detection from query params
    if (queryParams['userRole'] === 'compliance' || 
        queryParams['action'] === 'compliance-review' ||
        queryParams['from'] === 'compliance-task-list') {
      
      console.log('=== COMPLIANCE MODE ACTIVATED ===');
      this.userRole = 'compliance';
      this.userType = '3';
      this.currentUserRole = 'compliance';
      
      // Set permissions for compliance
      if (routeId && routeId !== 'new') {
        // Will be set properly after loading record
        this.canView = true;
        this.canEdit = false;
      }
    }

    // Force compliance permissions if ID exists and compliance role
    if (routeId && routeId !== 'new' && this.userRole === 'compliance') {
      console.log('Pre-setting compliance permissions for ID:', routeId);
      this.canView = true;
      this.canEdit = false;
      this.userType = '3';
      // canComplianceAction will be set after loading record
    }
    
    // Enhanced check for data entry permissions
    if ((queryParams['from'] === 'my-task-list' || 
         queryParams['from'] === 'quarantine' || 
         queryParams['fromQuarantine'] === 'true') && 
        (queryParams['edit'] === 'true' || queryParams['edit'] === true || 
         queryParams['mode'] === 'edit')) {
      
      console.log('🔧 Force setting data_entry role from navigation');
      this.userRole = 'data_entry';
      this.userType = '1';
      this.currentUserRole = 'data_entry';
      this.canEdit = true;
      this.editPressed = true;
    }
    
    // Load data if ID exists with timeout protection
    if (routeId && routeId !== 'new') {
      this.isLoading = true;
      
      // Set a timeout to prevent infinite loading
      const loadTimeout = setTimeout(() => {
        console.error('Load timeout - stopping');
        this.isLoading = false;
        this.msg.error('Loading timeout');
      }, 10000); // 10 seconds timeout
      
      try {
        await this.loadSimpleData(routeId);
      } catch (error) {
        console.error('Load error:', error);
      } finally {
        clearTimeout(loadTimeout);
        this.isLoading = false;
      }
    } else {
      this.isNewRequest = true;
      this.isLoading = false;
    }
    
    // Setup keyboard auto-fill for data entry users
    // Force setup regardless of userType for debugging
    console.log('Setting up auto-fill:', { userType: this.userType, isNewRequest: this.isNewRequest });
    this.setupKeyboardAutoFill();
    
    // Ensure userType is properly set for new requests
    if (this.isNewRequest && (!this.userType || this.userType === null)) {
      console.log('🔧 Setting default userType for new request');
      this.userType = '1';
      this.userRole = 'data_entry';
    }

    console.log('=== INIT COMPLETE ===', {
      userType: this.userType,
      isNewRequest: this.isNewRequest,
      userRole: this.userRole,
      editPressed: this.editPressed,
      hasRecord: this.hasRecord,
      canUploadOld: this.userType === '1' && (this.editPressed || !this.hasRecord),
      canUploadNew: this.userType === '1'
    });
  }

  private async loadSimpleData(id: string): Promise<void> {
    console.log('🔍 === LOADING SIMPLE DATA === 🔍');
    console.log('🆔 Record ID:', id);
    console.log('👤 Current User State:', {
      userRole: this.userRole,
      userType: this.userType,
      currentUserRole: this.currentUserRole
    });
    
    // CRITICAL DEBUG - User Role Values
    console.log('🔍 USER ROLE DEBUG:');
    console.log('userRole value:', this.userRole);
    console.log('userRole type:', typeof this.userRole);
    console.log('userType value:', this.userType);
    console.log('userType type:', typeof this.userType);
    console.log('userRole === "data_entry":', this.userRole === 'data_entry');
    console.log('userType === "1":', this.userType === '1');
    this.isLoading = true;
    
    // Force data_entry mode for quarantine and my-task-list navigation
    const queryParams = this.route.snapshot.queryParams;
    if ((queryParams['fromQuarantine'] === 'true' || 
         queryParams['from'] === 'quarantine' ||
         queryParams['from'] === 'my-task-list') && 
        (queryParams['mode'] === 'edit' || queryParams['edit'] === 'true' || queryParams['edit'] === true)) {
      
      console.log('🔧 Forcing data_entry permissions for quarantine/rejected records');
      this.userRole = 'data_entry';
      this.userType = '1';
      this.currentUserRole = 'data_entry';
      this.canEdit = true;
      this.editPressed = true;
      
      // Enable the form
      setTimeout(() => {
        this.requestForm.enable();
        console.log('✅ Form enabled for data_entry editing');
      }, 100);
    }
    
    try {
      // Use HttpClient instead of fetch for consistency
      const url = `${this.apiBase}/requests/${id}`;
      const record = await firstValueFrom(
        this.http.get<any>(url)
      );
      
      if (record) {
          console.log('🔍 Record loaded:', record);
          console.log('👥 Contacts in record:', record.contacts);
          console.log('📄 Documents in record:', record.documents);
          console.log('🎯 CRITICAL - Record Status Info:', {
            id: record.id,
            status: record.status,
            assignedTo: record.assignedTo,
            userRole: this.userRole,
            userType: this.userType,
            currentUserRole: this.currentUserRole
          });
        
        this.currentRecordId = id;
        this.originalRecord = record;
        this.hasRecord = true;
        this.status = record.status || 'Pending';
        
        // Use patchFromRecord to load everything including contacts/documents
        this.patchFromRecord(record);
        
        // REMOVED loadContactsAndDocuments - it's causing the loop!
        // The contacts and documents should already be in the record
        
        // Setup permissions for reviewer
        if (this.userRole === 'reviewer') {
          this.canApproveReject = record.status === 'Pending' && 
                                 record.assignedTo === 'reviewer';
          this.canView = true;
          this.canEdit = false;
          this.requestForm.disable();
        }

        // Setup permissions for compliance
        if (this.userRole === 'compliance') {
          this.canComplianceAction = record.status === 'Approved';
          this.canView = true;
          this.canEdit = false;
          this.userType = '3';
          this.requestForm.disable();
          
          console.log('Compliance setup in loadSimpleData:', {
            canComplianceAction: this.canComplianceAction,
            status: record.status
          });
        }

        // 🚨 CRITICAL FIX: Setup permissions for data entry users
        console.log('🔍 CHECKING DATA ENTRY CONDITIONS:');
        console.log('userRole === "data_entry":', this.userRole === 'data_entry');
        console.log('userType === "1":', this.userType === '1');
        console.log('Combined condition:', this.userRole === 'data_entry' || this.userType === '1');
        
        if (this.userRole === 'data_entry' || this.userType === '1') {
          console.log('🔧 === DATA ENTRY PERMISSIONS SETUP === 🔧');
          console.log('📋 Record info for data entry:', {
            id: record.id,
            status: record.status,
            assignedTo: record.assignedTo,
            userRole: this.userRole,
            userType: this.userType
          });
          
          // Check if data entry can edit this rejected or quarantine record
          const isRejectedRecord = record.status === 'Rejected';
          const isQuarantineRecord = record.status === 'Quarantine' || record.status === 'Quarantined';
          const isAssignedToDataEntry = record.assignedTo === 'data_entry' || 
                                       record.assignedTo === 'system_import' || 
                                       !record.assignedTo;
          
          console.log('🔍 Data Entry Conditions:', {
            isRejectedRecord,
            isQuarantineRecord,
            isAssignedToDataEntry,
            shouldBeEditable: (isRejectedRecord || isQuarantineRecord) && isAssignedToDataEntry
          });
          
          if ((isRejectedRecord || isQuarantineRecord) && isAssignedToDataEntry) {
            // Data entry can edit rejected or quarantine records
            this.canEdit = true;
            this.canView = true;
            this.editPressed = true;
            this.requestForm.enable();
            
            console.log('🚨 ENABLING FORM - Data entry can edit rejected/quarantine record');
            console.log('🎯 FINAL DATA ENTRY STATE:', {
              canEdit: this.canEdit,
              editPressed: this.editPressed,
              formEnabled: this.requestForm.enabled
            });
          } else {
            // Data entry view mode
            this.canEdit = false;
            this.canView = true;
            this.editPressed = false;
            this.requestForm.disable();
            
            console.log('🔒 READ-ONLY MODE - Data entry cannot edit this record (not rejected/quarantine or not assigned)');
          }
        }

        // Debug compliance state if compliance user
        if (this.userRole === 'compliance') {
          this.debugComplianceState();
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.msg.error('Failed to load data');
      
      // Set fallback permissions
      if (this.userRole === 'reviewer') {
        this.canView = true;
        this.canApproveReject = false;
        this.requestForm.disable();
      }
    } finally {
      this.isLoading = false;
    }
  }

  /*
  // COMMENTED OUT - Causing infinite loop
  private async loadContactsAndDocuments(requestId: string): Promise<void> {
    // This method is not needed if contacts/documents come with the main record
    // It was causing infinite loops due to pending API requests
  }
  */

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
      console.log('=== GET CURRENT USER START ===');
      
      // Check multiple storage locations for username
      const username = sessionStorage.getItem('username') || 
                      localStorage.getItem('username') || 
                      localStorage.getItem('user');
      
      console.log('New Request - Getting user with username:', username);
      
      if (!username) {
        console.error('No username found in storage');
        this.currentUser = { username: 'data_entry', role: 'data_entry' };
        this.mapUserRole('data_entry');
        console.log('=== GET CURRENT USER END (no username) ===');
        return;
      }
      
      const url = `${this.apiBase}/auth/me?username=${username}`;
      
      try {
        console.log('Making API call to:', url);
        const userResponse = await Promise.race([
          firstValueFrom(this.http.get<any>(url)),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
          )
        ]);
        const user = userResponse as any;
        
        console.log('User API response:', user);
        if (user && (user.username || user.id)) {
          this.currentUser = {
            username: user.username || username,
            role: user.role || 'data_entry',
            id: user.id
          };
          this.mapUserRole(user.role || 'data_entry');
          console.log('Current user loaded:', this.currentUser);
        } else {
          console.warn('Invalid user response, using fallback');
          this.currentUser = { username: username, role: 'data_entry' };
          this.mapUserRole('data_entry');
        }
        console.log('=== GET CURRENT USER SUCCESS ===');
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
    
    console.log('=== GET CURRENT USER END ===');
    console.log('🔥 FINAL USER STATE FOR UPLOAD BUTTON:', {
      currentUser: this.currentUser,
      userRole: this.userRole,
      userType: this.userType,
      shouldShowUploadButton: this.userType === '1',
      uploadCondition: `userType === '1' ? ${this.userType === '1'}`
    });
  }

  private mapUserRole(apiRole: string): void {
    // Fix role mapping - handle the database inconsistency
    let correctedRole = apiRole;
    
    // Get username for verification
    const username = this.currentUser?.username;
    
    // Check query params first (from navigation)
    const queryRole = this.route.snapshot.queryParams['userRole'];
    if (queryRole) {
      correctedRole = queryRole;
      console.log('Using role from query params:', queryRole);
    } else {
      // Fix based on username
    if (username === 'data_entry' && apiRole !== 'data_entry' && apiRole !== '1') {
      console.log('Fixing role for data_entry user');
      correctedRole = 'data_entry';
    }
    
    if (username === 'reviewer' && apiRole !== 'reviewer' && apiRole !== '2') {
      console.log('Fixing role for reviewer user');
      correctedRole = 'reviewer';
    }
    
    if (username === 'compliance' && apiRole !== 'compliance' && apiRole !== '3') {
      console.log('Fixing role for compliance user');
      correctedRole = 'compliance';
      }
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
      userType: this.userType,
      queryRole: queryRole
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

    // Setup country/city logic after form creation
    setTimeout(() => {
      this.setupCountryCityLogic();
      this.setupDuplicateValidation();
    }, 100);
  }

  private setupCountryCityLogic(): void {
    console.log('Setting up Country-City logic');
    this.previousCountry = this.requestForm.get('country')?.value || null;
    
    // Add protection flags
    let isUpdatingCity = false;
    let isProcessing = false;
    
    this.requestForm.get('country')?.valueChanges.subscribe(selectedCountry => {
      // CRITICAL: Prevent loops
      if (isUpdatingCity || isProcessing || this.showUploadModal) return;
      
      isProcessing = true;
      
      console.log('Country changed to:', selectedCountry);
      
      // Use helper function from shared constants
      this.filteredCityOptions = getCitiesByCountry(selectedCountry || '');
      console.log('Filtered cities:', this.filteredCityOptions);

      if (this.suppressCityReset) {
        this.previousCountry = selectedCountry;
        isProcessing = false;
        return;
      }
      
      const currentCity = this.requestForm.get('city')?.value;
      const cityStillValid = this.filteredCityOptions.some(o => o.value === currentCity);
      if ((this.editPressed || this.isNewRequest || this.isGoldenEditMode) && !cityStillValid) {
        isUpdatingCity = true;
        this.requestForm.get('city')?.setValue(null, { emitEvent: false });
        setTimeout(() => { 
          isUpdatingCity = false; 
          isProcessing = false;
        }, 100);
      } else {
        isProcessing = false;
      }
      
      this.previousCountry = selectedCountry;
    });
    
    // Just set initial city options without subscriptions
    const currentCountry = this.requestForm.get('country')?.value;
    if (currentCountry) {
      this.filteredCityOptions = getCitiesByCountry(currentCountry);
    }
  }

  private setupDuplicateValidation(): void {
    console.log('Setting up duplicate validation');
    
    // Watch for changes in tax and CustomerType
    this.requestForm.get('tax')?.valueChanges.subscribe(taxValue => {
      // Add a small delay to ensure the form value is updated
      setTimeout(() => {
        const customerType = this.requestForm.get('CustomerType')?.value;
        if (taxValue && customerType) {
          console.log('Tax changed, validating:', { tax: taxValue, customerType });
          this.validateForDuplicateImmediate();
        }
      }, 100);
    });
    
    this.requestForm.get('CustomerType')?.valueChanges.subscribe(customerTypeValue => {
      // Add a small delay to ensure the form value is updated
      setTimeout(() => {
        const tax = this.requestForm.get('tax')?.value;
        if (tax && customerTypeValue) {
          console.log('CustomerType changed, validating:', { tax, customerType: customerTypeValue });
          this.validateForDuplicateImmediate();
        }
      }, 100);
    });
    
    // Initial validation after a delay
    setTimeout(() => {
      const tax = this.requestForm.get('tax')?.value;
      const customerType = this.requestForm.get('CustomerType')?.value;
      
      if (tax && customerType && !this.currentRecordId && !this.isGoldenEditMode) {
        console.log('Initial duplicate validation for:', tax, customerType);
        this.validateForDuplicateImmediate();
      }
    }, 500); // Increased delay for initial check
  }
  
  // Immediate validation without any delay
  private async validateForDuplicateImmediate(): Promise<void> {
    const tax = this.requestForm.get('tax')?.value;
    const customerType = this.requestForm.get('CustomerType')?.value;
    
    if (tax && customerType) {
      console.log('Immediate duplicate validation for:', tax, customerType);
      await this.checkForDuplicate();
      this.cdr.detectChanges(); // Force change detection
    } else {
      // Clear duplicate state if fields are empty
      this.hasDuplicate = false;
      this.duplicateRecord = null;
      this.cdr.markForCheck(); // Force change detection
    }
  }

  private validateForDuplicate(): void {
    // Clear previous timer if exists
    if (this.validationTimer) {
      clearTimeout(this.validationTimer);
    }
    
    // Set new timer to validate after 100ms of no changes (immediate response)
    this.validationTimer = setTimeout(async () => {
      const tax = this.requestForm.get('tax')?.value;
      const customerType = this.requestForm.get('CustomerType')?.value;
      
      if (tax && customerType) {
        console.log('Real-time duplicate validation for:', tax, customerType);
        console.log('Validation conditions:', { 
          tax, 
          customerType, 
          currentRecordId: this.currentRecordId, 
          isGoldenEditMode: this.isGoldenEditMode,
          isFromQuarantine: this.isFromQuarantine,
          status: this.status
        });
        
        // Run validation for all cases except golden records in edit mode
        if (!this.isGoldenEditMode) {
          console.log('Running duplicate validation for:', {
            type: this.currentRecordId ? 'existing record' : 'new record',
            status: this.status,
            isFromQuarantine: this.isFromQuarantine
          });
          await this.checkForDuplicate();
        } else {
          console.log('Skipping validation for golden record edit');
        }
      } else {
        console.log('Validation skipped - missing data:', { tax, customerType });
      }
    }, 1000);
  }

  private async loadRequestData(): Promise<void> {
    const routeId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParams;
    
    console.log('=== LOAD REQUEST DATA ===');
    console.log('Route ID:', routeId);
    console.log('Query params:', queryParams);
    console.log('Current user role:', this.userRole);
    console.log('Current user type:', this.userType);
    
    // Clean up ID if it has REQ- prefix
    const cleanId = routeId?.replace('REQ-', '');
    console.log('Clean ID:', cleanId);
    
    // Check if this is coming from reviewer
    if (queryParams['userRole'] === 'reviewer' && queryParams['action'] === 'review') {
      console.log('Reviewer mode detected from query params');
      this.userRole = 'reviewer';
      this.userType = '2';
      this.currentUserRole = 'reviewer';
    }

    // Force compliance mode if coming from compliance-task-list
    if (queryParams['from'] === 'compliance-task-list') {
      this.userRole = 'compliance';
      this.userType = '3';
      this.currentUserRole = 'compliance';
      console.log('Forced compliance mode from navigation');
    }
    
    // CRITICAL FIX: Handle the case where ID exists but needs loading
    if (cleanId && cleanId !== 'new') {
      // Load existing record from API
      this.isLoading = true;
      console.log('Loading request data for ID:', cleanId, 'Query params:', queryParams);
      try {
        const apiUrl = `${this.apiBase}/requests/${cleanId}`;
        console.log('Making API call to:', apiUrl);
        const record = await Promise.race([
          firstValueFrom(this.http.get<TaskRecord>(apiUrl)),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          )
        ]) as TaskRecord;
        console.log('API response received:', record);
        console.log('Record type:', typeof record);
        console.log('Record keys:', record ? Object.keys(record) : 'No record');
        
        if (record && record.id) {
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
            console.log('🔧 === SETTING PERMISSIONS === 🔧');
            console.log('📋 Record before permissions:', {
              id: record.id,
              status: record.status,
              assignedTo: record.assignedTo,
              userRole: this.userRole
            });
            this.setPermissionsFromRecord(record);
            console.log('✅ === PERMISSIONS SET === ✅');
            
            // Set form state based on permissions
            if (this.canEdit) {
              // Data entry can edit
              console.log('🔓 ENABLING FORM - Data entry can edit this record');
              this.requestForm.enable();
              this.editPressed = true;
            } else {
              // Reviewer, Compliance, and view-only modes
              console.log('🔒 DISABLING FORM - Read-only mode');
              this.requestForm.disable();
              this.editPressed = false;
              
              // For reviewer/compliance, ensure they can still interact with documents
              if (this.canApproveReject || this.canComplianceAction) {
                console.log('Form disabled for review/compliance mode');
              }
            }
            
            console.log('🎯 FINAL FORM STATE:', {
              canEdit: this.canEdit,
              editPressed: this.editPressed,
              formDisabled: this.requestForm.disabled,
              formEnabled: this.requestForm.enabled
            });
          }
          
          // CRITICAL FIX: Force enable form for rejected records assigned to data_entry
          if (record.status === 'Rejected' && 
              record.assignedTo === 'data_entry' && 
              this.userRole === 'data_entry') {
            console.log('🚨 FORCE ENABLING FORM for rejected record assigned to data_entry');
            this.canEdit = true;
            this.editPressed = true;
            this.requestForm.enable();
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
        } else {
          console.error('No valid record received from API!');
          this.msg.error('Invalid record data received');
          
          // Set basic reviewer permissions anyway
          if (queryParams['userRole'] === 'reviewer') {
            this.userRole = 'reviewer';
            this.userType = '2';
            this.canView = true;
            this.canApproveReject = false; // Cannot approve without data
            this.canEdit = false;
            this.requestForm.disable();
          }
        }
      } catch (error: any) {
        console.error('Error loading request:', {
          error: error,
          message: error?.message,
          status: error?.status,
          url: error?.url,
          cleanId: cleanId,
          apiBase: this.apiBase
        });
        
        // Set fallback permissions for reviewer
        if (queryParams['userRole'] === 'reviewer') {
          console.log('Setting fallback reviewer permissions');
          this.userRole = 'reviewer';
          this.userType = '2';
          this.canView = true;
          this.canApproveReject = true;
          this.canEdit = false;
          this.requestForm.disable();
          this.editPressed = false;
        }
        
        if (error?.status === 404) {
          this.msg.error('Request not found');
        } else if (error?.status === 0) {
          this.msg.error('Cannot connect to server. Please check if the API server is running.');
        } else if (error?.name === 'TimeoutError') {
          this.msg.error('Request timed out. Please try again.');
        } else {
          this.msg.error(`Failed to load request data: ${error?.message || 'Unknown error'}`);
        }
      } finally {
        this.isLoading = false;
      }
    } else if (!cleanId || cleanId === 'new') {
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
        // Check for multiple assignedTo values including system_import
        const isAssignedToDataEntry = record.assignedTo === 'data_entry' || 
                                       record.assignedTo === 'system_import' ||
                                       !record.assignedTo;
        
        // FIXED: Can edit rejected requests (including quarantine rejected)
        this.canEdit = (record.status === 'Rejected' && isAssignedToDataEntry) ||
                      (record.status === 'Rejected' && isQuarantineRejected) ||
                      record.status === 'Quarantine' || 
                      record.status === 'Quarantined';
        
        this.canView = !this.canEdit;
        
        console.log('🔧 Data Entry Permissions:', {
          status: record.status,
          assignedTo: record.assignedTo,
          isAssignedToDataEntry,
          isQuarantineRejected,
          canEdit: this.canEdit,
          canView: this.canView,
          shouldBeEditable: record.status === 'Rejected' && isAssignedToDataEntry
        });
        break;
        
      case 'reviewer':
        // ✅ FIX: More flexible condition for canApproveReject
        this.canApproveReject = (record.status === 'Pending' || record.status === 'pending') && 
                               (record.assignedTo === 'reviewer' || 
                                record.assignedTo === 'data_entry' ||
                                !record.assignedTo);
        this.canView = true; // Reviewer can always view
        this.canEdit = false; // Reviewer cannot edit
        
        // CRITICAL: Ensure userType is set for template
        this.userType = '2';
        
        // CRITICAL: Disable the form for reviewer but keep it viewable
        if (this.canApproveReject || this.canView) {
          this.requestForm.disable();
          this.editPressed = false; // Make sure edit mode is off
        }
        
        // ✅ DEBUG: Log permissions for debugging
        console.log('🔍 Reviewer Permissions:', {
          canApproveReject: this.canApproveReject,
          status: record.status,
          assignedTo: record.assignedTo,
          userType: this.userType
        });
        break;
        
      case 'compliance':
        // Can approve/block approved requests assigned to compliance
        // FIXED: More flexible condition
        this.canComplianceAction = record.status === 'Approved' && 
                                  (record.assignedTo === 'compliance' || 
                                   record.assignedTo === 'reviewer' || // Sometimes still assigned to reviewer
                                   !record.ComplianceStatus); // Or no compliance status yet
        
        this.canView = true; 
        this.canEdit = false;
        
        // CRITICAL: Ensure userType is set
          this.userType = '3';
        
        // Disable form for compliance
        this.requestForm.disable();
        this.editPressed = false;
        
        console.log('Compliance permissions set:', {
          canComplianceAction: this.canComplianceAction,
          userType: this.userType,
          recordStatus: record.status,
          assignedTo: record.assignedTo,
          ComplianceStatus: record.ComplianceStatus
        });
        break;
        
      case 'admin':
        // Admin can do everything based on status
        this.canEdit = ['Rejected', 'Pending', 'Quarantine', 'Quarantined'].includes(record.status || '');
        this.canApproveReject = record.status === 'Pending';
        this.canComplianceAction = record.status === 'Approved' && 
                                  (!record.ComplianceStatus || record.ComplianceStatus === '');
        this.canView = true;
          this.userType = 'admin';
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
      userType: this.userType,
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

      this.notification.success('Master record created as Blocked Golden Record!', '');
      this.router.navigate(['/dashboard/compliance-task-list']);
    } catch (error) {
      console.error('Error blocking request:', error);
      this.notification.error('Error blocking record. Please try again.', '');
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

      this.notification.success('Master record approved as Active Golden Record successfully!', '');
      this.router.navigate(['/dashboard/compliance-task-list']);
    } catch (error) {
      console.error('Error approving request:', error);
      this.notification.error('Error approving record. Please try again.', '');
    }
  }

  // Check for duplicate golden records
  async checkForDuplicate(): Promise<boolean> {
    // Get values directly from form controls
    const tax = this.requestForm.get('tax')?.value;
    const customerType = this.requestForm.get('CustomerType')?.value;
    
    console.log('🔍 Checking for duplicate:', { tax, customerType });
    console.log('🔍 Form values:', this.requestForm.value); // Debug line
    
    if (!tax || !customerType) {
      console.log('❌ Missing tax or customerType, resetting hasDuplicate');
      this.hasDuplicate = false; // Reset if fields are empty
      this.duplicateRecord = null;
      this.cdr.markForCheck(); // Force change detection
      return false; // No validation needed if required fields are missing
    }
    
    try {
      console.log('📡 Making API call to check duplicate...');
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/check-duplicate`, {
          tax: tax,
          CustomerType: customerType
        })
      );
      
      console.log('📡 API Response:', response);
      
      if (response.isDuplicate) {
        console.log('🚨 DUPLICATE FOUND! Setting hasDuplicate = true');
        this.hasDuplicate = true;
        this.duplicateRecord = response.existingRecord;
        
        // Force Angular to detect changes
        this.cdr.detectChanges();
        
        // Also try manual update
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);
        
        console.log('🔍 hasDuplicate after setting:', this.hasDuplicate);
        console.log('🔍 duplicateRecord after setting:', this.duplicateRecord);
        
        this.msg.error(`Duplicate found: ${response.message}`);
        return true;
      }
      
      console.log('✅ No duplicate found, setting hasDuplicate = false');
      this.hasDuplicate = false;
      this.duplicateRecord = null;
      this.cdr.markForCheck(); // Force change detection
      console.log('🔍 Duplicate record cleared:', this.duplicateRecord);
      return false; // No duplicate
    } catch (error) {
      console.error('❌ Error checking for duplicate:', error);
      this.hasDuplicate = false; // Assume no duplicate if API call fails
      this.duplicateRecord = null;
      this.cdr.markForCheck(); // Force change detection
      return false; // Allow submission if check fails
    }
  }

  // Check if submit button should be disabled
  isSubmitDisabled(): boolean {
    return this.hasDuplicate || this.isLoading;
  }

  // Show duplicate record details
  showDuplicateDetails(): void {
    if (this.duplicateRecord) {
      this.showDuplicateModal = true;
      this.showGoldenSummaryInModal = false;
      this.goldenSummaryUrl = null;
    }
  }

  // Close duplicate modal
  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.showGoldenSummaryInModal = false;
    this.goldenSummaryUrl = null;
  }

  // Return from iframe view to basic duplicate info
  backToDuplicateInfo(): void {
    this.showGoldenSummaryInModal = false;
    this.goldenSummaryUrl = null;
  }

  // Action: guide user to upload a different document
  uploadDifferentDocument(): void {
    this.closeDuplicateModal();
    this.openUploadModal();
  }

  // Action: enable editing and focus on tax/CustomerType to make data unique
  startFixDuplicateByEditing(): void {
    this.closeDuplicateModal();
    this.editPressed = true;
    this.requestForm.enable();
    // Prefer focusing Tax then CustomerType
    setTimeout(() => {
      const taxInput = document.getElementById('tax') as HTMLInputElement | null;
      if (taxInput) {
        taxInput.focus();
        taxInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const typeSelect = document.getElementById('CustomerType') as HTMLElement | null;
      if (typeSelect) {
        (typeSelect as HTMLElement).focus();
        typeSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 0);
  }

  // Load Golden Summary in iframe
  loadGoldenSummaryInModal(): void {
    if (this.duplicateRecord?.id) {
      const url = `/dashboard/golden-summary/${this.duplicateRecord.id}?embedded=true`;
      this.goldenSummaryUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.showGoldenSummaryInModal = true;
    }
  }

  // Back to basic view
  backToBasicView(): void {
    this.showGoldenSummaryInModal = false;
    this.goldenSummaryUrl = null;
  }

  // Fetch duplicate details from API
  async fetchDuplicateDetails(): Promise<void> {
    try {
      const tax = this.requestForm.get('tax')?.value;
      const customerType = this.requestForm.get('CustomerType')?.value;
      
      if (!tax || !customerType) {
        this.msg.error('Cannot fetch duplicate details without tax and customer type');
        return;
      }
      
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiBase}/golden-records`, {
          params: {
            tax: tax,
            customerType: customerType
          }
        })
      );
      
      if (response && response.length > 0) {
        this.duplicateRecord = response[0];
        console.log('✅ Duplicate details fetched:', this.duplicateRecord);
        this.showDuplicateModal = true;
      } else {
        this.msg.error('Could not fetch duplicate record details');
      }
    } catch (error) {
      console.error('Error fetching duplicate details:', error);
      this.msg.error('Failed to load duplicate record details');
    }
  }

  // Get duplicate message with company name
  getDuplicateMessage(): any {
    if (!this.duplicateRecord) {
      const warningHtml = `
        <div style="padding: 10px; background: #fff2f0; border-left: 4px solid #ff4d4f;">
          <strong style="color: #ff4d4f;">⚠️ WARNING:</strong><br>
          A customer with the same tax number and company type already exists in golden records.
        </div>
      `;
      return this.sanitizer.bypassSecurityTrustHtml(warningHtml);
    }
    
    const htmlContent = `
      <div style="padding: 10px; background: #fff2f0; border-left: 4px solid #ff4d4f;">
        <strong style="color: #ff4d4f;">⚠️ DUPLICATE FOUND:</strong><br>
        <div style="margin: 10px 0;">
          <strong>Existing Customer:</strong> ${this.duplicateRecord.name || this.duplicateRecord.firstName || 'Unknown'}<br>
          <strong>Tax Number:</strong> ${this.duplicateRecord.tax || this.duplicateRecord.taxNumber || 'N/A'}<br>
          <strong>Type:</strong> ${this.duplicateRecord.customerType || this.duplicateRecord.CustomerType || 'N/A'}
        </div>
      </div>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }

  // Navigate to duplicate record in Golden Summary
  navigateToDuplicateRecord(): void {
    if (this.duplicateRecord?.id) {
      console.log('Navigating to golden summary for duplicate record:', this.duplicateRecord.id);
      
      // Close modal first
      this.closeDuplicateModal();
      
      // Navigate to golden-summary with the record ID as route param
      this.router.navigate(['/dashboard/golden-summary', this.duplicateRecord.id]);
    } else {
      console.error('No duplicate record ID found');
      this.msg.error('Cannot navigate - record ID missing');
      this.closeDuplicateModal();
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

    // Check for duplicate golden records (for all cases except golden records in edit mode)
    if (!this.isGoldenEditMode) {
      console.log('Checking for duplicate golden records...', {
        type: this.currentRecordId ? 'existing record' : 'new record',
        status: this.status,
        isFromQuarantine: this.isFromQuarantine,
        currentRecordId: this.currentRecordId
      });
      const isDuplicate = await this.checkForDuplicate();
      if (isDuplicate) {
        console.log('Duplicate found, preventing submission');
        return;
      }
    } else {
      console.log('Skipping duplicate check for golden record edit');
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

    // Add update tracking fields when updating existing records
    if (this.currentRecordId && !this.isGoldenEditMode) {
      payload.updatedBy = this.currentUser?.username || 'data_entry';
      payload.updatedByRole = this.userRole || 'data_entry';
      payload.updateReason = 'User update';
    }

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
    console.log('=== PATCH FROM RECORD ===');
    console.log('Record to patch:', rec);
    
    if (!rec) {
      console.error('No record provided to patch!');
      return;
    }
    
    this.suppressCityReset = true;
    this.status = rec.status || 'Pending';

    // Patch basic fields
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
    }, { emitEvent: false });

    // Setup city options
    if (rec.country) {
      this.filteredCityOptions = getCitiesByCountry(rec.country);
    }

    // CRITICAL: Load contacts properly
    console.log('Loading contacts:', rec.contacts);
    this.contactsFA.clear();
    
    // Check multiple possible locations for contacts
    const contacts = rec.contacts || rec['contacts'] || [];
    
    if (Array.isArray(contacts) && contacts.length > 0) {
      contacts.forEach((c: any) => {
        const contactGroup = this.fb.group({
          id: [c.id || this.uid()],
          name: [c.name || '', Validators.required],
          jobTitle: [c.jobTitle || ''],
          email: [c.email || ''],
          mobile: [c.mobile || ''],
          landline: [c.landline || ''],
          preferredLanguage: [c.preferredLanguage || '']
        });
        this.contactsFA.push(contactGroup);
      });
      console.log('Contacts loaded:', this.contactsFA.length);
    } else {
      console.log('No contacts found in record');
    }

    // CRITICAL: Load documents properly
    console.log('Loading documents:', rec.documents);
    this.documentsFA.clear();
    
    // Check multiple possible locations for documents
    const documents = rec.documents || rec['documents'] || [];
    
    if (Array.isArray(documents) && documents.length > 0) {
      documents.forEach((d: any) => {
        const docGroup = this.fb.group({
          id: [d.id || this.uid()],
          name: [d.name || ''],
          type: [d.type || 'Other'],
          description: [d.description || ''],
          size: [d.size || 0],
          mime: [d.mime || ''],
          uploadedAt: [d.uploadedAt || new Date().toISOString()],
          contentBase64: [d.contentBase64 || '']
        });
        this.documentsFA.push(docGroup);
      });
      console.log('Documents loaded:', this.documentsFA.length);
    } else {
      console.log('No documents found in record');
    }

    // Show summary for rejected/quarantined
    if (rec.rejectReason || rec.issues?.length) {
      this.stateIssues = rec.issues || [{ 
        description: rec.rejectReason || rec.blockReason || 'Issue found' 
      }];
      this.showSummary = true;
    }

    // If no contacts loaded, add at least one empty contact for entry
    if (this.contactsFA.length === 0 && this.userType === '1' && !this.hasRecord) {
      this.addContact();
    }
    
    console.log('=== PATCH COMPLETED ===');
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

      this.notification.success('Request approved and sent to compliance!', '');
      this.navigateToTaskList();
    } catch (error) {
      console.error('Error approving request:', error);
      this.notification.error('Error approving request. Please try again.', '');
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

      this.notification.success('Request rejected and returned to data entry', '');
      this.navigateToTaskList();
    } catch (error) {
      console.error('Error rejecting request:', error);
      this.notification.error('Error rejecting record. Please try again.', '');
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

  // Add this helper method for chunked processing
  private toBase64Chunked(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      // Read as data URL (includes base64)
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

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  showApproveModal(): void { 
    if (this.canApproveReject || this.userRole === 'admin') {
      this.submitApprove();
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

  // ====== Demo Data Generator ======
  
  /**
   * Fills the form with demo data from a real company
   * Perfect for demonstrations and testing
   */
  fillWithDemoData(): void {
    try {
      // Get current country from form to generate appropriate data
      const currentCountry = this.requestForm.get('country')?.value || 'Saudi Arabia';
      const demoCompany = this.demoDataGenerator.generateDemoData();
      
      // Show loading animation
      this.msg.loading('Generating demo data...', { nzDuration: 1000 });
      
      // Fill general data
      this.requestForm.patchValue({
        firstName: demoCompany.name,
        firstNameAr: demoCompany.nameAr,
        customerType: demoCompany.customerType,
        CompanyOwnerFullName: demoCompany.ownerName,
        tax: demoCompany.taxNumber,
        buildingNumber: demoCompany.buildingNumber,
        street: demoCompany.street,
        country: demoCompany.country,
        city: demoCompany.city,
        salesOrg: demoCompany.salesOrg,
        distributionChannel: demoCompany.distributionChannel,
        division: demoCompany.division
      });

      // Clear existing contacts and add demo contacts
      this.clearAllContacts();
      demoCompany.contacts.forEach(contact => {
        this.addContact();
        const lastIndex = this.contactsFA.length - 1;
        this.contactsFA.at(lastIndex).patchValue({
          name: contact.name,
          jobTitle: contact.jobTitle,
          email: contact.email,
          mobile: contact.mobile,
          landline: contact.landline,
          preferredLanguage: contact.preferredLanguage
        });
      });

      // Add some additional random contacts for variety
      const additionalContacts = this.demoDataGenerator.generateAdditionalContacts(2, this.currentDemoCompany.country);
      additionalContacts.forEach(contact => {
        this.addContact();
        const lastIndex = this.contactsFA.length - 1;
        this.contactsFA.at(lastIndex).patchValue({
          name: contact.name,
          jobTitle: contact.jobTitle,
          email: contact.email,
          mobile: contact.mobile,
          landline: contact.landline,
          preferredLanguage: contact.preferredLanguage
        });
      });

      // Update city options based on selected country
      this.filteredCityOptions = getCitiesByCountry(demoCompany.country);

      // Show success message with company name
      setTimeout(() => {
        this.msg.success(`Demo data loaded: ${demoCompany.name}`, { nzDuration: 3000 });
      }, 1000);

      // Log remaining companies for reference
      const remaining = this.demoDataGenerator.getRemainingCompaniesCount();
      console.log(`Demo data loaded for: ${demoCompany.name}`);
      console.log(`Remaining companies: ${remaining}`);

    } catch (error) {
      console.error('Error generating demo data:', error);
      this.msg.error('Failed to generate demo data. Please try again.');
    }
  }

  /**
   * Clears all contacts from the form
   */
  private clearAllContacts(): void {
    while (this.contactsFA.length !== 0) {
      this.contactsFA.removeAt(0);
    }
  }

  /**
   * Gets the current demo company info (for display)
   */
  getCurrentDemoCompany(): DemoCompany | null {
    return this.demoDataGenerator.getLastUsedCompany();
  }

  /**
   * Gets remaining demo companies count
   */
  getRemainingDemoCompanies(): number {
    return this.demoDataGenerator.getRemainingCompaniesCount();
  }

  /**
   * Resets the demo generator (clears used companies)
   */
  resetDemoGenerator(): void {
    this.demoDataGenerator.resetGenerator();
    this.msg.success('Demo generator reset. All companies available again!');
  }

  // ====== Auto Translation ======
  
  /**
   * Automatically translates English company name to Arabic
   * Triggered when English name field changes
   */
  onEnglishNameChange(englishName: string): void {
    if (!englishName || englishName.trim() === '') {
      return;
    }

    // Check if the name needs translation
    if (this.autoTranslate.needsTranslation(englishName)) {
      const arabicTranslation = this.autoTranslate.translateCompanyName(englishName);
      
      if (arabicTranslation && arabicTranslation !== englishName) {
        // Update the Arabic name field
        this.requestForm.patchValue({
          firstNameAR: arabicTranslation
        });
        
        // Silent translation - no notification needed
      }
    }
  }

  /**
   * Manually trigger translation (for button click)
   */
  translateToArabic(): void {
    const englishName = this.requestForm.get('firstName')?.value;
    
    if (!englishName || englishName.trim() === '') {
      this.msg.warning('Please enter an English company name first');
      return;
    }

    const arabicTranslation = this.autoTranslate.translateCompanyName(englishName);
    
    if (arabicTranslation && arabicTranslation !== englishName) {
      this.requestForm.patchValue({
        firstNameAR: arabicTranslation
      });
      
      // Silent translation - no notification needed
    } else {
      this.msg.warning('Unable to translate this name automatically');
    }
  }

  /**
   * Gets translation confidence for current names
   */
  getTranslationConfidence(): number {
    const englishName = this.requestForm.get('firstName')?.value;
    const arabicName = this.requestForm.get('firstNameAR')?.value;
    
    if (!englishName || !arabicName) return 0;
    
    return this.autoTranslate.getTranslationConfidence(englishName, arabicName);
  }

  /**
   * Gets alternative translations
   */
  getAlternativeTranslations(): string[] {
    const englishName = this.requestForm.get('firstName')?.value;
    
    if (!englishName) return [];
    
    return this.autoTranslate.getAlternativeTranslations(englishName);
  }

  // ====== Upload Document Modal ======
  
  /**
   * Opens the upload document modal
   */
  openUploadModal(): void {
    // CRITICAL: Prevent change detection loops
    if (this.showUploadModal) {
      return;
    }
    
    // Stop console spam immediately
    const originalLog = console.log;
    let logCount = 0;
    console.log = (...args: any[]) => {
      logCount++;
      if (logCount < 50) {
        originalLog.apply(console, args);
      }
    };
    
    // Reset document with timeout to avoid change detection
    setTimeout(() => {
      this.newDocument = {
        name: '',
        type: '',
        description: '',
        file: null
      };
      this.showUploadModal = true;
      
      // Restore console after modal opens
      setTimeout(() => {
        console.log = originalLog;
      }, 500);
    }, 0);
  }

  /**
   * Closes the upload document modal
   */
  closeUploadModal(): void {
    console.log('❌ CLOSING UPLOAD MODAL');
    this.showUploadModal = false;
    this.newDocument = {
      name: '',
      type: '',
      description: '',
      file: null
    };
  }

  // Helper methods for modal inputs to avoid ngModel loops
  updateDocumentName(event: any): void {
    setTimeout(() => {
      this.newDocument.name = event.target.value;
    }, 0);
  }

  updateDocumentType(event: any): void {
    setTimeout(() => {
      this.newDocument.type = event.target.value;
    }, 0);
  }

  updateDocumentDescription(event: any): void {
    setTimeout(() => {
      this.newDocument.description = event.target.value;
    }, 0);
  }

  // TrackBy function to prevent unnecessary re-renders
  trackByIndex(index: number): number {
    return index;
  }

  /**
   * Handles file selection
   */
  onFileSelected(event: any): void {
    // Prevent repeated calls
    if (!event?.target?.files?.[0]) {
      return;
    }
    
    const file = event.target.files[0];
    
    // Use timeout to avoid change detection loops
    setTimeout(() => {
      this.newDocument.file = file;
      this.newDocument.name = file.name;
      
      // Auto-detect type
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        this.newDocument.type = 'Commercial Registration';
      } else if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
        this.newDocument.type = 'Tax Certificate';
      } else {
        this.newDocument.type = 'Other';
      }
    }, 0);
  }

  /**
   * Saves the new document
   */
  async saveNewDocument(): Promise<void> {
    console.log('🚀 SAVE NEW DOCUMENT - OPTIMIZED');
    
    if (!this.newDocument.file) {
      this.msg.warning('Please select a file first');
      return;
    }

    if (!this.newDocument.type) {
      this.msg.warning('Please select a document type');
      return;
    }

    // Strict size limit
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB only!
    if (this.newDocument.file.size > MAX_FILE_SIZE) {
      this.msg.error('File size must be less than 2MB for now');
      return;
    }

    const loadingMsg = this.msg.loading('Processing...', { nzDuration: 0 });

    // Use setTimeout to avoid blocking UI
    setTimeout(async () => {
      try {
        // Convert in chunks to avoid blocking
        const base64Content = await this.toBase64(this.newDocument.file);
        
        // Create minimal document object
        const docData = {
          id: this.uid(),
          name: this.newDocument.name || this.newDocument.file.name,
          type: this.newDocument.type,
          description: this.newDocument.description || '',
          size: this.newDocument.file.size,
          mime: this.newDocument.file.type,
          uploadedAt: new Date().toISOString(),
          // Store base64 separately to avoid Angular change detection issues
          contentBase64: ''
        };
        
        // Add to FormArray first
        const docFormGroup = this.fb.group(docData);
        this.documentsFA.push(docFormGroup);
        
        // Trigger change detection
        this.cdr.markForCheck();
        
        // Then update base64 after a delay
        setTimeout(() => {
          docFormGroup.patchValue({ contentBase64: base64Content }, { emitEvent: false });
          this.cdr.markForCheck();
        }, 100);
        
        this.msg.remove(loadingMsg.messageId);
        this.msg.success('Document uploaded');
        this.closeUploadModal();
        // Immediately validate for duplicate after successful upload
        await this.validateForDuplicateImmediate();
        if (this.hasDuplicate) {
          this.showDuplicateModal = true;
          this.cdr.markForCheck();
        }
        
      } catch (error) {
        console.error('Error:', error);
        this.msg.remove(loadingMsg?.messageId);
        this.msg.error('Failed to process file');
      }
    }, 10);
  }

  // ====== Document Preview & Download (NEW) ======

  /**
   * Opens document preview modal
   */
  previewDocument(doc: any): void {
    const documentData = doc.value || doc;
    
    console.log('=== PREVIEW DOCUMENT ===');
    console.log('Document data:', documentData);
    console.log('MIME type:', documentData?.mime);
    console.log('Is PDF:', this.isPdf(documentData));
    console.log('Has contentBase64:', !!documentData?.contentBase64);
    
    if (!documentData) {
      this.msg.error('Document data not found');
      return;
    }
    
    if (!documentData.contentBase64) {
      this.msg.error('Document content not available');
      return;
    }
    
    this.selectedDocument = documentData;
    this.showDocumentPreviewModal = true;
  }

  /**
   * Closes document preview modal
   */
  closeDocumentPreview(): void {
    this.showDocumentPreviewModal = false;
    this.selectedDocument = null;
  }

  /**
   * Downloads document - Fixed implementation
   */
  downloadDocument(doc: any): void {
    try {
      const docData = doc.value || doc;
      // Extract base64 content (remove data URL prefix if exists)
      let base64Content = docData.contentBase64 || '';
      
      // If it's a data URL, extract the base64 part
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1];
      }
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: docData.mime || 'application/octet-stream' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docData.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      this.msg.success('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      this.msg.error('Failed to download document');
    }
  }

  /**
   * Gets preview URL for document
   */
  getPreviewUrl(doc: any): string {
    if (!doc || !doc.contentBase64) {
      return '';
    }
    
    if (doc.contentBase64.startsWith('data:')) {
      return doc.contentBase64;
    }
    
    return `data:${doc.mime || 'application/pdf'};base64,${doc.contentBase64}`;
  }

  /**
   * Gets safe preview URL for iframe (bypasses security)
   */
  getSafePreviewUrl(doc: any): SafeResourceUrl {
    const url = this.getPreviewUrl(doc);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Checks if document can be previewed in browser
   */
  canPreview(doc: any): boolean {
    if (!doc) return false;
    
    // REMOVED console.log to prevent spam
    const docData = doc.value || doc;
    const mime = (docData.mime || '').toLowerCase();
    const name = (docData.name || '').toLowerCase();
    
    return mime.includes('pdf') || 
           mime === 'application/pdf' ||
           mime.includes('image') ||
           name.endsWith('.pdf');
  }

  /**
   * Handles document click - preview for supported types, download for others
   */
  handleDocumentClick(doc: any): void {
    // Extract the actual document data
    const docData = doc.value || doc;
    
    console.log('=== HANDLE DOCUMENT CLICK ===');
    console.log('Raw doc:', doc);
    console.log('Doc data:', docData);
    console.log('MIME:', docData.mime);
    console.log('Can preview:', this.canPreview(docData));
    
    if (this.canPreview(docData)) {
      this.previewDocument(docData);
    } else {
      this.downloadDocument(docData);
      this.msg.info('Downloading file... Preview not available for this file type.');
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Enhanced helper methods for document type detection
   */
  isPdf(doc: any): boolean {
    if (!doc) return false;
    
    // REMOVED console.log
    const docData = doc.value || doc;
    const mime = (docData.mime || '').toLowerCase();
    const name = (docData.name || '').toLowerCase().trim();
    
    return mime === 'application/pdf' || 
           mime.includes('pdf') ||
           name.endsWith('.pdf');
  }

  isImage(doc: any): boolean {
    if (!doc) return false;
    const mime = doc.mime || '';
    const name = doc.name || '';
    const result = mime.includes('image') || 
           name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/);
    return !!result; // Force boolean instead of null
  }

  isWord(doc: any): boolean {
    if (!doc) return false;
    const mime = doc.mime || '';
    const name = doc.name || '';
    return mime.includes('word') || 
           mime.includes('document') || 
           mime.includes('officedocument') ||
           name.toLowerCase().match(/\.(doc|docx)$/);
  }

  isExcel(doc: any): boolean {
    if (!doc) return false;
    const mime = doc.mime || '';
    const name = doc.name || '';
    return mime.includes('excel') || 
           mime.includes('spreadsheet') ||
           name.toLowerCase().match(/\.(xls|xlsx)$/);
  }



  /**
   * Opens document in new tab - Simple solution (OLD - kept for compatibility)
   */
  downloadDoc(doc: any): void {
    try {
      // Simple solution - just open in new tab
      const dataUrl = `data:${doc.mime || 'application/pdf'};base64,${doc.contentBase64}`;
      window.open(dataUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Error opening document. Please try again.');
    }
  }

  /**
   * Check if user can manage documents (add/delete)
   */
  get canManageDocuments(): boolean {
    return this.userType === '1' && (this.editPressed || !this.hasRecord);
  }

  /**
   * Check if user is in view-only mode for documents
   */
  get isDocumentsViewOnly(): boolean {
    return this.userType === '2' || this.userType === '3';
  }

  /**
   * Gets documents count
   */
  getDocumentsCount(): number {
    if (this.documentsFA) {
      return this.documentsFA.length;
    }
    if (this.originalRecord?.documents) {
      return this.originalRecord.documents.length;
    }
    return 0;
  }

  /**
   * Gets documents list for display (extracts from FormArray)
   */
  getDocumentsList(): any[] {
    // Extract from FormArray
    if (this.documentsFA && this.documentsFA.length > 0) {
      return this.documentsFA.controls.map(control => {
        const rawValue = control.getRawValue ? control.getRawValue() : control.value;
        return rawValue;
      });
    }
    
    // Direct documents from record
    if (this.originalRecord?.documents && Array.isArray(this.originalRecord.documents)) {
      return this.originalRecord.documents;
    }
    
    return [];
  }

  /**
   * Downloads document directly (handles both FormGroup and plain objects)
   */
  downloadDocumentDirect(doc: any): void {
    try {
      // Handle both FormGroup values and direct objects
      const docData = doc.value || doc;
      
      // Extract base64 content
      let base64Content = docData.contentBase64 || '';
      
      if (!base64Content) {
        this.msg.error('Document content not available');
        return;
      }
      
      // If it's a data URL, extract the base64 part
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1];
      }
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: docData.mime || 'application/octet-stream' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docData.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      this.msg.success('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      this.msg.error('Failed to download document');
    }
  }

  /**
   * View document - alias for handleDocumentClick for compatibility
   */
  viewDocument(doc: any): void {
    this.handleDocumentClick(doc);
  }

  /**
   * Get file extension from document
   */
  getFileExtension(doc: any): string {
    const name = doc?.name || '';
    const parts = name.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1].toUpperCase() : '';
  }


  /**
   * Approve compliance action
   */
  approveCompliance(): void {
    console.log('=== APPROVE COMPLIANCE ===');
    console.log('Current Record ID:', this.currentRecordId);
    console.log('User Type:', this.userType);
    console.log('Can Compliance Action:', this.canComplianceAction);
    
    if (!this.currentRecordId) {
      this.msg.error('No record to approve');
      return;
    }

    this.isLoading = true;
    
    // FIXED: Use correct endpoint
    this.http.post(`${this.apiBase}/requests/${this.currentRecordId}/compliance/approve`, {
      note: 'Approved by compliance officer'
    }).subscribe({
      next: (response) => {
        console.log('Compliance approval response:', response);
        this.notification.success('Master record approved as Active Golden Record!', '');
        this.router.navigate(['/dashboard/compliance-task-list']);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Compliance approval error:', error);
        this.msg.error('Failed to approve request');
        this.isLoading = false;
      }
    });
  }

  /**
   * Debug compliance state for troubleshooting
   */
  debugComplianceState(): void {
    console.log('=== COMPLIANCE DEBUG ===');
    console.log('User Role:', this.userRole);
    console.log('User Type:', this.userType);
    console.log('Current User Role:', this.currentUserRole);
    console.log('Has Record:', this.hasRecord);
    console.log('Can Compliance Action:', this.canComplianceAction);
    console.log('Status:', this.status);
    console.log('Original Record:', this.originalRecord);
    console.log('Assigned To:', this.originalRecord?.assignedTo);
    console.log('Compliance Status:', this.originalRecord?.ComplianceStatus);
  }

  // ============== Keyboard Auto-Fill Functionality ==============
  
  currentDemoCompany: any = null;
  private keyboardListener: ((event: KeyboardEvent) => void) | null = null;
  private lastSpaceTime: number = 0;
  private spaceClickCount: number = 0;

  /**
   * Setup keyboard auto-fill functionality
   * Press Ctrl+D (or Cmd+D on Mac) to auto-fill the focused field
   */
  setupKeyboardAutoFill(): void {
    console.log('Setting up keyboard auto-fill for data entry user');
    
    // Generate demo company data once
    this.currentDemoCompany = this.demoDataGenerator.generateDemoData();
    
    // Create keyboard listener - Double Space for auto-fill
    this.keyboardListener = (event: KeyboardEvent) => {
      // Check for Space key
      if (event.key === ' ' || event.code === 'Space') {
        const now = Date.now();
        
        // If less than 500ms since last space, it's a double space
        if (now - this.lastSpaceTime < 500) {
          this.spaceClickCount++;
          if (this.spaceClickCount >= 2) {
            event.preventDefault();
            console.log('Double space detected - triggering auto-fill');
            this.handleAutoFillKeypress();
            this.spaceClickCount = 0;
          }
        } else {
          this.spaceClickCount = 1;
        }
        
        this.lastSpaceTime = now;
      }
    };

    // Add event listener
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('keydown', this.keyboardListener);
      
      // No tip notification - keep it clean
    }
  }

  /**
   * Handle auto-fill keypress
   */
  handleAutoFillKeypress(): void {
    console.log('=== AUTO-FILL TRIGGERED ===');
    
    const activeElement = document.activeElement as HTMLElement;
    console.log('Active element:', activeElement);
    console.log('Demo company:', this.currentDemoCompany);
    
    if (!activeElement || !this.currentDemoCompany) {
      this.msg.warning('Please focus on a form field first');
      return;
    }

    // Get the field name from various possible attributes
    const fieldName = this.getFieldNameFromElement(activeElement);
    console.log('Detected field name:', fieldName);
    
    if (!fieldName) {
      this.msg.warning('Cannot auto-fill this field');
      return;
    }

    // Get demo value for this field
    const demoValue = this.getDemoValueForField(fieldName);
    console.log('Demo value for field:', fieldName, '=', demoValue);
    
    if (demoValue !== null && demoValue !== undefined) {
      // Fill the field
      this.fillFieldWithValue(fieldName, demoValue);
      
      // Visual feedback only - no notification message
    } else {
      this.msg.warning(`No demo data available for "${fieldName}"`);
    }
  }

  /**
   * Extract field name from DOM element
   */
  private getFieldNameFromElement(element: HTMLElement): string | null {
    // Check various attributes to identify the field
    const formControlName = element.getAttribute('formControlName');
    if (formControlName) return formControlName;
    
    const name = element.getAttribute('name');
    if (name) return name;
    
    const id = element.getAttribute('id');
    if (id) return id;
    
    // Check for nz-select elements
    const nzSelectId = element.getAttribute('nzSelectId');
    if (nzSelectId) return nzSelectId;
    
    // Check parent elements for form control name
    let parent = element.parentElement;
    while (parent && parent.tagName !== 'FORM') {
      const parentFormControlName = parent.getAttribute('formControlName');
      if (parentFormControlName) return parentFormControlName;
      
      // Check for nz-form-item with specific classes
      if (parent.classList.contains('nz-form-item')) {
        const label = parent.querySelector('nz-form-label');
        if (label) {
          const labelText = label.textContent?.toLowerCase();
          if (labelText?.includes('name')) return 'name';
          if (labelText?.includes('email')) return 'email';
          if (labelText?.includes('mobile')) return 'mobile';
          if (labelText?.includes('job')) return 'jobTitle';
          if (labelText?.includes('landline')) return 'landline';
          if (labelText?.includes('language')) return 'preferredLanguage';
        }
      }
      
      parent = parent.parentElement;
    }
    
    return null;
  }

  /**
   * Get demo value for specific field
   */
  private getDemoValueForField(fieldName: string): any {
    if (!this.currentDemoCompany) return null;

    // Generate additional contacts if needed
    const allContacts = [...this.currentDemoCompany.contacts];
    if (allContacts.length < 3) {
      const additionalContacts = this.demoDataGenerator.generateAdditionalContacts(3 - allContacts.length, this.currentDemoCompany.country);
      allContacts.push(...additionalContacts);
    }

    const fieldMapping: { [key: string]: any } = {
      // Company Info
      'firstName': this.currentDemoCompany.name,
      'firstNameAR': this.currentDemoCompany.nameAr,
      'firstNameAr': this.currentDemoCompany.nameAr,
      'tax': this.currentDemoCompany.taxNumber,
      'CustomerType': this.currentDemoCompany.customerType,
      'customerType': this.currentDemoCompany.customerType,
      'CompanyOwnerFullName': this.currentDemoCompany.ownerName,
      'companyOwner': this.currentDemoCompany.ownerName,
      
      // Address Info
      'buildingNumber': this.currentDemoCompany.buildingNumber,
      'street': this.currentDemoCompany.street,
      'country': this.currentDemoCompany.country,
      'city': this.currentDemoCompany.city,
      
      // Sales Info
      'salesOrg': this.currentDemoCompany.salesOrg,
      'SalesOrgOption': this.currentDemoCompany.salesOrg,
      'distributionChannel': this.currentDemoCompany.distributionChannel,
      'DistributionChannelOption': this.currentDemoCompany.distributionChannel,
      'division': this.currentDemoCompany.division,
      'DivisionOption': this.currentDemoCompany.division,
      
      // Contact Info - Dynamic based on which contact we're filling
      'name': this.getContactDataByField('name', fieldName),
      'contactName': this.getContactDataByField('name', fieldName),
      'ContactName': this.getContactDataByField('name', fieldName),
      'email': this.getContactDataByField('email', fieldName),
      'EmailAddress': this.getContactDataByField('email', fieldName),
      'mobile': this.getContactDataByField('mobile', fieldName),
      'MobileNumber': this.getContactDataByField('mobile', fieldName),
      'jobTitle': this.getContactDataByField('jobTitle', fieldName),
      'JobTitle': this.getContactDataByField('jobTitle', fieldName),
      'landline': this.getContactDataByField('landline', fieldName),
      'Landline': this.getContactDataByField('landline', fieldName),
      'preferredLanguage': this.getContactDataByField('preferredLanguage', fieldName),
      'PrefferedLanguage': this.getContactDataByField('preferredLanguage', fieldName)
    };

    return fieldMapping[fieldName] || null;
  }

  /**
   * Get contact data by field type - SIMPLIFIED
   */
  private getContactDataByField(dataType: string, fieldName: string): any {
    if (!this.currentDemoCompany) return null;
    
    // Use the last contact index for variety
    const contactIndex = Math.max(0, this.contactsFA.length - 1);
    
    // Generate additional contacts if needed
    const allContacts = [...this.currentDemoCompany.contacts];
    if (allContacts.length <= contactIndex) {
      const additionalContacts = this.demoDataGenerator.generateAdditionalContacts(contactIndex + 1 - allContacts.length, this.currentDemoCompany.country);
      allContacts.push(...additionalContacts);
    }
    
    const contact = allContacts[contactIndex];
    if (!contact) return null;
    
    // Return the specific field data
    switch (dataType) {
      case 'name': return contact.name;
      case 'email': return contact.email;
      case 'mobile': return contact.mobile;
      case 'jobTitle': return contact.jobTitle;
      case 'landline': return contact.landline;
      case 'preferredLanguage': return contact.preferredLanguage;
      default: return null;
    }
  }

  /**
   * Fill specific field with value
   */
  private fillFieldWithValue(fieldName: string, value: any): void {
    try {
      console.log(`Trying to fill field: ${fieldName} with value:`, value);
      
      // First try main form controls
      const control = this.requestForm.get(fieldName);
      if (control) {
        control.patchValue(value, { emitEvent: false });
        
        // Special handling for country/city dependency
        if (fieldName === 'country') {
          setTimeout(() => {
            this.filteredCityOptions = getCitiesByCountry(value || '');
          }, 100);
        }
        
        // Trigger change detection
        control.markAsTouched();
        control.updateValueAndValidity();
        
        this.addVisualFeedback();
        console.log(`Successfully filled main form field: ${fieldName}`);
        return;
      }

      // Try to fill FormArray fields (contacts)
      if (this.fillFormArrayField(fieldName, value)) {
        this.addVisualFeedback();
        console.log(`Successfully filled FormArray field: ${fieldName}`);
        return;
      }

      console.log(`Could not find field: ${fieldName}`);
    } catch (error) {
      console.error('Error filling field:', error);
    }
  }

  /**
   * Fill FormArray field (for contacts) - SUPER SIMPLIFIED
   */
  private fillFormArrayField(fieldName: string, value: any): boolean {
    // Check if we're dealing with contact fields
    const contactFields = ['name', 'email', 'mobile', 'jobTitle', 'landline', 'preferredLanguage'];
    
    if (contactFields.includes(fieldName)) {
      console.log('Trying to fill contact field:', fieldName);
      
      // Find the focused input element
      const activeElement = document.activeElement as HTMLInputElement;
      
      // Simple approach: try to fill the focused element directly
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
        const formControlName = activeElement.getAttribute('formControlName');
        
        if (formControlName === fieldName) {
          // Generate demo value based on total contacts (for variety)
          const demoValue = this.getContactDemoValue(fieldName, this.contactsFA.length - 1);
          
          // Set the value directly
          activeElement.value = demoValue || '';
          
          // Trigger Angular form update
          const event = new Event('input', { bubbles: true });
          activeElement.dispatchEvent(event);
          
          console.log(`Direct fill: "${fieldName}" with: ${demoValue}`);
          return true;
        }
      }
      
      // Fallback: try to fill any empty contact field
      for (let i = 0; i < this.contactsFA.length; i++) {
        const contact = this.contactsFA.at(i);
        const control = contact.get(fieldName);
        
        if (control && !control.value) {
          const demoValue = this.getContactDemoValue(fieldName, i);
          control.patchValue(demoValue, { emitEvent: false });
          control.markAsTouched();
          control.updateValueAndValidity();
          
          console.log(`Fallback fill: "${fieldName}" in contact #${i + 1} with: ${demoValue}`);
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Get sales organization label for display
   * Used by reviewer read-only view
   */
  getSalesOrgLabel(value: string): string {
    if (!value) return '';
    
    const option = this.SalesOrgOption.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  /**
   * Get distribution channel label for display
   * Used by reviewer read-only view
   */
  getDistributionChannelLabel(value: string): string {
    if (!value) return '';
    
    const option = this.DistributionChannelOption.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  /**
   * Get division label for display
   * Used by reviewer read-only view
   */
  getDivisionLabel(value: string): string {
    if (!value) return '';
    
    const option = this.DivisionOption.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  /**
   * Get demo value for specific contact field and index
   */
  private getContactDemoValue(fieldName: string, contactIndex: number): any {
    if (!this.currentDemoCompany) return null;
    
    // Generate enough contacts
    const allContacts = [...this.currentDemoCompany.contacts];
    while (allContacts.length <= contactIndex) {
      const additionalContacts = this.demoDataGenerator.generateAdditionalContacts(1, this.currentDemoCompany.country);
      allContacts.push(...additionalContacts);
    }
    
    const contact = allContacts[contactIndex];
    if (!contact) return null;
    
    switch (fieldName) {
      case 'name': return contact.name;
      case 'email': return contact.email;
      case 'mobile': return contact.mobile;
      case 'jobTitle': return contact.jobTitle;
      case 'landline': return contact.landline;
      case 'preferredLanguage': return contact.preferredLanguage;
      default: return null;
    }
  }




  /**
   * Add visual feedback to focused element
   */
  private addVisualFeedback(): void {
    const element = document.activeElement as HTMLElement;
    if (element) {
      element.style.background = '#e6f7ff';
      element.style.transition = 'background 0.3s ease';
      setTimeout(() => {
        element.style.background = '';
      }, 1000);
    }
  }

  /**
   * Cleanup keyboard listener
   */
  ngOnDestroy(): void {
    if (this.keyboardListener && isPlatformBrowser(this.platformId)) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
  }

}