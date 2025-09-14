import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

// Import unified lookup data
import {
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  DIVISION_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  getCitiesByCountry
} from '../shared/lookup-data';

interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  icon: string;
  type?: 'text' | 'dropdown' | 'email' | 'tel';
}

interface DropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-duplicate-customer',
  templateUrl: './duplicate-customer.component.html',
  styleUrls: ['./duplicate-customer.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DuplicateCustomerComponent implements OnInit {

  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  
  // User Roles
  userRole: string = 'data_entry';
  isDataEntry: boolean = true;
  isReviewer: boolean = false;
  isCompliance: boolean = false;
  isReviewMode: boolean = false;
  isComplianceMode: boolean = false;
  isEditingRejected: boolean = false;

  // Data Properties
  records: any[] = [];
  linkedRecords: any[] = [];
  quarantineRecords: any[] = [];
  originalRecords: any[] = [];
  currentTaxNumber: string = '';
  currentGroupName: string = '';
  masterRecordData: any = null;
  
  // UI State
  currentStep: number = 1;
  showEditModal: boolean = false;
  editingRecord: any = null;
  loading: boolean = false;
  activeTab: string = 'contacts';
  expandedFields: string[] = [];
  showHelp: boolean = false;
  showSuccessModal: boolean = false;
  successMessage: string = '';
  focusedField: string | null = null;

  // Review Mode Properties
  showRejectModal: boolean = false;
  rejectionReason: string = '';
  processing: boolean = false;
  currentRecordId: string = '';

  // Compliance specific properties
  showComplianceActions: boolean = false;
  showActiveModal: boolean = false;
  showBlockModal: boolean = false;
  blockReason: string = '';
  approvalNote: string = '';

  // Progress Steps - SIMPLIFIED
  progressSteps = [
    { id: 1, label: 'Build Golden Record', icon: '🏗️' },
    { id: 2, label: 'Link Records', icon: '🔗' }
  ];

  // Master Record Builder
  selectedMasterRecordId: string | null = null;
  selectedFields: { [key: string]: string } = {};
  manualFields: { [key: string]: string } = {};
  manualFieldValues: { [key: string]: string } = {};
  masterContacts: any[] = [];
  masterDocuments: any[] = [];
  contacts: any[] = [];
  documents: any[] = [];
  quarantineReason: string = '';
  
  // Field Definitions
  fieldDefinitions: FieldDefinition[] = [
    { key: 'firstName', label: 'Company Name', required: true, icon: '🏢' },
    { key: 'firstNameAr', label: 'Company Name (Arabic)', required: true, icon: '🏢' },
    { key: 'tax', label: 'Tax Number', required: true, icon: '📋' },
    { key: 'CustomerType', label: 'Customer Type', required: false, icon: '👥', type: 'dropdown' },
    { key: 'CompanyOwner', label: 'Company Owner', required: false, icon: '👤' },
    { key: 'buildingNumber', label: 'Building Number', required: false, icon: '🏗️' },
    { key: 'street', label: 'Street', required: false, icon: '🛣️' },
    { key: 'country', label: 'Country', required: false, icon: '🌍', type: 'dropdown' },
    { key: 'city', label: 'City', required: false, icon: '🏙️', type: 'dropdown' },
    { key: 'SalesOrgOption', label: 'Sales Organization', required: false, icon: '💼', type: 'dropdown' },
    { key: 'DistributionChannelOption', label: 'Distribution Channel', required: false, icon: '🚚', type: 'dropdown' },
    { key: 'DivisionOption', label: 'Division', required: false, icon: '🏭', type: 'dropdown' }
  ];

  // Use unified lookup data from shared constants
  dropdownOptions: { [key: string]: DropdownOption[] } = {
    CustomerType: CUSTOMER_TYPE_OPTIONS,
    SalesOrgOption: SALES_ORG_OPTIONS,
    DistributionChannelOption: DISTRIBUTION_CHANNEL_OPTIONS,
    DivisionOption: DIVISION_OPTIONS,
    country: COUNTRY_OPTIONS,
    city: []
  };

  // Additional lookup data
  documentTypes = DOCUMENT_TYPE_OPTIONS;
  countryOptions = COUNTRY_OPTIONS;
  cityOptions = CITY_OPTIONS;
  preferredLanguageOptions = PREFERRED_LANGUAGE_OPTIONS;

  // File Upload
  uploadedFiles: { [key: string]: any[] } = {};
  
  // Contact Management
  newContact: any = {
    name: '',
    jobTitle: '',
    email: '',
    mobile: '',
    landline: '',
    preferredLanguage: 'English'
  };
  showContactModal: boolean = false;
  showAddContactModal: boolean = false;
  editingContact: any = null;
  editingContactIndex: number = -1;

  // Document Management
  newDocument: any = {
    name: '',
    type: '',
    description: '',
    file: null
  };
  showDocumentModal: boolean = false;
  showUploadDocumentModal: boolean = false;
  
  // Quality Scores
  qualityScores: { [recordId: string]: number } = {};
  
  // Submit State
  building: boolean = false;
  buildSuccess: boolean = false;
  buildError: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const queryParams = this.route.snapshot.queryParams;
    const queryUsername = queryParams['username'];
    const recordId = queryParams['recordId'] || queryParams['groupId'] || queryParams['masterId'];
    const action = queryParams['action'];
    const userRole = queryParams['userRole'];
    const rejectionReasonParam = queryParams['rejectionReason'];
    const mode = queryParams['mode'];
    const from = queryParams['from'];
    
    console.log('Query Params:', queryParams);
    console.log('Record ID from params:', recordId);
    console.log('Action from params:', action);
    console.log('UserRole from params:', userRole);
    console.log('Mode from params:', mode);
    console.log('From from params:', from);
    
    // Check if compliance mode
    if ((mode === 'compliance-review' || action === 'compliance-review' || userRole === 'compliance' || from === 'compliance-task-list') && recordId) {
      console.log('Compliance mode activated for record:', recordId);
      this.isComplianceMode = true;
      this.showComplianceActions = true;
      this.currentRecordId = recordId;
      this.userRole = 'compliance';
      this.isCompliance = true;
      this.isReviewer = false;
      this.isDataEntry = false;
      
      await this.loadMasterRecordForCompliance();
      
    } else if (recordId && action === 'edit' && rejectionReasonParam) {
      console.log('Editing rejected duplicate:', recordId);
      this.isEditingRejected = true;
      this.currentRecordId = recordId;
      this.userRole = 'data_entry';
      this.isDataEntry = true;
      this.isReviewer = false;
      
      this.showRejectionMessage(rejectionReasonParam);
      await this.loadRejectedDuplicate(recordId);
      
    } else if (recordId && (action === 'review' || userRole === 'reviewer')) {
      this.isReviewMode = true;
      this.currentRecordId = recordId;
      this.userRole = 'reviewer';
      this.isReviewer = true;
      this.isDataEntry = false;
      console.log('Review mode activated for record:', recordId);
      await this.loadMasterRecordForReview();
      
    } else if (queryUsername) {
      try {
        const userResponse = await firstValueFrom(
          this.http.get<any>(`${this.apiBase}/auth/me?username=${queryUsername}`)
        );
        this.userRole = userResponse.role || 'data_entry';
      } catch (error) {
        console.log('Could not get user info from API, using username to determine role');
        if (queryUsername === 'reviewer') {
          this.userRole = 'reviewer';
        } else if (queryUsername === 'compliance') {
          this.userRole = 'compliance';
        } else {
          this.userRole = 'data_entry';
        }
      }
      
      this.isDataEntry = this.userRole === 'data_entry';
      this.isReviewer = this.userRole === 'reviewer';
      this.isCompliance = this.userRole === 'compliance';
      
      await this.loadDataEntryData();
    } else {
      this.userRole = 'data_entry';
      this.isDataEntry = true;
      this.isReviewer = false;
      this.isCompliance = false;
      
      await this.loadDataEntryData();
    }

    console.log('Final User Role:', this.userRole);
    console.log('Is Compliance Mode:', this.isComplianceMode);
    console.log('Is Review Mode:', this.isReviewMode);
    console.log('Is Editing Rejected:', this.isEditingRejected);
    
    this.contacts = this.masterContacts;
    this.documents = this.masterDocuments;
  }

  async loadMasterRecordForCompliance(): Promise<void> {
    this.loading = true;
    
    try {
      const masterResponse = await firstValueFrom(
        this.http.get<any>(`${this.apiBase}/requests/${this.currentRecordId}`)
      );
      
      if (masterResponse) {
        this.masterRecordData = masterResponse;
        
        const builtFromRecords = masterResponse.builtFromRecords ? 
          JSON.parse(masterResponse.builtFromRecords) : {};
        const selectedFieldSources = masterResponse.selectedFieldSources ? 
          JSON.parse(masterResponse.selectedFieldSources) : {};
        
        console.log('Master Record Data for Compliance:', masterResponse);
        console.log('Built From Records:', builtFromRecords);
        console.log('Selected Field Sources:', selectedFieldSources);
        
        this.currentTaxNumber = masterResponse.tax;
        this.currentGroupName = masterResponse.firstName || 'Master Record';
        this.selectedMasterRecordId = this.currentRecordId;
        this.selectedFields = selectedFieldSources;
        
        if (masterResponse.country) {
          this.updateCityOptions(masterResponse.country);
        }
        
        try {
          const duplicatesResponse = await firstValueFrom(
            this.http.get<any>(`${this.apiBase}/duplicates/by-tax/${masterResponse.tax}`)
          );
          
          if (duplicatesResponse.success && duplicatesResponse.records) {
            const allRecords = duplicatesResponse.records.filter((r: any) => 
              r.id !== this.currentRecordId
            );
            
            this.linkedRecords = allRecords.filter((r: any) => 
              r.masterId === this.currentRecordId && r.status === 'Linked'
            );
            
            this.quarantineRecords = allRecords.filter((r: any) => 
              r.status === 'Quarantine'
            );
            
            this.records = allRecords.map((record: any) => ({
              ...record,
              recordName: record.firstName || record.firstNameAr || `Record ${record.id}`,
              matchScore: Math.round((record.confidence || 0.9) * 100),
              linkStatus: record.masterId === this.currentRecordId && record.status === 'Linked' ? 'linked' : 
                         record.status === 'Quarantine' ? 'quarantine' : 'unlinked'
            }));
            
            console.log('Linked Records for Compliance:', this.linkedRecords);
            console.log('Quarantine Records for Compliance:', this.quarantineRecords);
            console.log('All Records for Compliance:', this.records);
          }
        } catch (error) {
          console.error('Error loading linked records for compliance:', error);
        }
        
        this.masterContacts = masterResponse.contacts || [];
        this.masterDocuments = masterResponse.documents || [];
        this.contacts = this.masterContacts;
        this.documents = this.masterDocuments;
        
        this.isComplianceMode = true;
        this.showComplianceActions = true;
      }
    } catch (error) {
      console.error('Error loading master record for compliance:', error);
      alert('Error loading record for compliance review. Please try again.');
      this.router.navigate(['/dashboard/compliance-task-list']);
    } finally {
      this.loading = false;
    }
  }

  openActiveModal(): void {
    this.showActiveModal = true;
    this.approvalNote = '';
  }

  closeActiveModal(): void {
    this.showActiveModal = false;
    this.approvalNote = '';
  }

  async confirmActive(): Promise<void> {
    if (!confirm('Are you sure you want to approve this as an Active Golden Record?')) {
      return;
    }
    
    this.processing = true;
    
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/${this.currentRecordId}/compliance/approve`, {
          note: this.approvalNote || 'Duplicate Master approved as Golden Record - Active',
          requestType: 'duplicate',
          originalRequestType: this.masterRecordData?.originalRequestType || 'duplicate',
          companyStatus: 'Active'
        })
      );
      
      if (response) {
        this.successMessage = 'Master record approved as Active Golden Record successfully!';
        this.showSuccessModal = true;
        
        setTimeout(() => {
          this.router.navigate(['/dashboard/compliance-task-list']);
        }, 2000);
      }
    } catch (error) {
      console.error('Error approving as active:', error);
      alert('Error approving record. Please try again.');
    } finally {
      this.processing = false;
      this.closeActiveModal();
    }
  }

  openBlockModal(): void {
    this.showBlockModal = true;
    this.blockReason = '';
  }

  closeBlockModal(): void {
    this.showBlockModal = false;
    this.blockReason = '';
  }

  async confirmBlock(): Promise<void> {
    if (!this.blockReason || this.blockReason.trim().length < 10) {
      alert('Please provide a detailed block reason (at least 10 characters)');
      return;
    }
    
    if (!confirm('Are you sure you want to block this company? This will prevent them from transacting.')) {
      return;
    }
    
    this.processing = true;
    
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/${this.currentRecordId}/compliance/block`, {
          reason: this.blockReason,
          requestType: 'duplicate',
          originalRequestType: this.masterRecordData?.originalRequestType || 'duplicate',
          companyStatus: 'Blocked'
        })
      );
      
      if (response) {
        this.successMessage = 'Master record created as Blocked Golden Record!';
        this.showSuccessModal = true;
        
        setTimeout(() => {
          this.router.navigate(['/dashboard/compliance-task-list']);
        }, 2000);
      }
    } catch (error) {
      console.error('Error blocking record:', error);
      alert('Error blocking record. Please try again.');
    } finally {
      this.processing = false;
      this.closeBlockModal();
    }
  }

  canPerformActions(): boolean {
    return this.isCompliance && this.isComplianceMode && !this.processing;
  }

  async loadDataEntryData(): Promise<void> {
    const navigation = this.router.getCurrentNavigation();
    let state = navigation?.extras?.state;
    
    if (!state) {
      state = history.state;
    }
    
    console.log('Loading data entry data with state:', state);
    
    if (state && state['group'] && state['records']) {
      this.records = state['records'] || [];
      this.currentTaxNumber = state['group']['taxNumber'] || '';
      this.currentGroupName = state['group']['groupName'] || '';
      
      console.log('Loaded records from state:', this.records.length);
      console.log('Tax Number:', this.currentTaxNumber);
      console.log('Group Name:', this.currentGroupName);
      
      this.records = this.records.map((record: any) => ({
        ...record,
        recordName: record.firstName || record.firstNameAr || `Record ${record.id}`,
        matchScore: Math.round((record.confidence || 0.9) * 100),
        linkStatus: 'linked'
      }));
      
      this.initializeContactsAndDocuments();
      // Start with builder view
      this.currentStep = 1;
      this.autoFillBest();
    } else {
      this.route.queryParams.subscribe(async params => {
        if (params['taxNumber']) {
          this.currentTaxNumber = params['taxNumber'];
          await this.loadRecordsByTax();
        } else {
          console.log('No data available to load');
        }
      });
    }
  }

  async loadMasterRecordForReview(): Promise<void> {
    this.loading = true;
    
    try {
      const masterResponse = await firstValueFrom(
        this.http.get<any>(`${this.apiBase}/requests/${this.currentRecordId}`)
      );
      
      if (masterResponse) {
        this.masterRecordData = masterResponse;
        
        const builtFromRecords = masterResponse.builtFromRecords ? 
          JSON.parse(masterResponse.builtFromRecords) : {};
        const selectedFieldSources = masterResponse.selectedFieldSources ? 
          JSON.parse(masterResponse.selectedFieldSources) : {};
        
        console.log('Master Record Data:', masterResponse);
        console.log('Built From Records:', builtFromRecords);
        console.log('Selected Field Sources:', selectedFieldSources);
        
        this.currentTaxNumber = masterResponse.tax;
        this.currentGroupName = masterResponse.firstName || 'Master Record';
        this.selectedMasterRecordId = this.currentRecordId;
        this.selectedFields = selectedFieldSources;
        
        if (masterResponse.country) {
          this.updateCityOptions(masterResponse.country);
        }
        
        try {
          const duplicatesResponse = await firstValueFrom(
            this.http.get<any>(`${this.apiBase}/duplicates/by-tax/${masterResponse.tax}`)
          );
          
          if (duplicatesResponse.success && duplicatesResponse.records) {
            const allRecords = duplicatesResponse.records.filter((r: any) => 
              r.id !== this.currentRecordId
            );
            
            this.linkedRecords = allRecords.filter((r: any) => 
              r.masterId === this.currentRecordId && r.status === 'Linked'
            );
            
            this.quarantineRecords = allRecords.filter((r: any) => 
              r.status === 'Quarantine'
            );
            
            this.records = allRecords.map((record: any) => ({
              ...record,
              recordName: record.firstName || record.firstNameAr || `Record ${record.id}`,
              matchScore: Math.round((record.confidence || 0.9) * 100),
              linkStatus: record.masterId === this.currentRecordId && record.status === 'Linked' ? 'linked' : 
                        (record.status === 'Quarantine' || record.requestType === 'quarantine') ? 'quarantine' : 'unlinked'
            }));
            
            console.log('Linked Records:', this.linkedRecords);
            console.log('Quarantine Records:', this.quarantineRecords);
            console.log('All Records:', this.records);
          }
        } catch (error) {
          console.error('Error loading linked records:', error);
        }
        
        this.masterContacts = masterResponse.contacts || [];
        this.masterDocuments = masterResponse.documents || [];
        this.contacts = this.masterContacts;
        this.documents = this.masterDocuments;
        
        this.isReviewMode = true;
      }
    } catch (error) {
      console.error('Error loading master record for review:', error);
      alert('Error loading record for review. Please try again.');
      this.router.navigate(['/dashboard/admin-task-list']);
    } finally {
      this.loading = false;
    }
  }

  async loadRejectedDuplicate(recordId: string): Promise<void> {
    this.loading = true;
    
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiBase}/requests/${recordId}`)
      );
      
      if (response) {
        this.masterRecordData = response;
        this.currentTaxNumber = response.tax;
        this.currentGroupName = response.firstName || response.firstNameAr || 'Master Record';
        
        if (response.country) {
          this.updateCityOptions(response.country);
        }
        
        if (response.selectedFieldSources) {
          try {
            this.selectedFields = JSON.parse(response.selectedFieldSources);
          } catch (e) {
            console.error('Error parsing selectedFieldSources:', e);
          }
        }
        
        if (response.selectedFieldSources) {
          try {
            const sources = JSON.parse(response.selectedFieldSources);
            this.fieldDefinitions.forEach(field => {
              if (sources[field.key] === 'MANUAL_ENTRY' && response[field.key]) {
                this.manualFields[field.key] = response[field.key];
                this.manualFieldValues[field.key] = response[field.key];
              }
            });
          } catch (e) {
            console.error('Error restoring manual fields:', e);
          }
        }
        
        if (response.contacts) {
          console.log('=== RAW CONTACTS FROM DATABASE ===');
          console.log('response.contacts:', response.contacts);
          
          this.masterContacts = Array.isArray(response.contacts) ? 
            response.contacts.map((contact: any, index: number) => {
              console.log(`Processing contact ${index}:`, contact);
              
              let contactName = contact.name || 
                               contact.ContactName || 
                               contact.contactName ||
                               '';
              
              if (!contactName) {
                if (contact.jobTitle && contact.jobTitle.includes('@')) {
                  contactName = contact.email || contact.jobTitle;
                } else if (contact.jobTitle && !contact.jobTitle.includes('Manager') && !contact.jobTitle.includes('Director')) {
                  contactName = contact.jobTitle;
                  contact.jobTitle = '';
                } else if (contact.email) {
                  contactName = contact.email.split('@')[0];
                } else {
                  contactName = `Contact ${index + 1}`;
                }
              }
              
              const processedContact = {
                ...contact,
                name: contactName,
                ContactName: contactName,
                jobTitle: contact.jobTitle || contact.JobTitle || '',
                email: contact.email || contact.EmailAddress || contact.emailAddress || '',
                mobile: contact.mobile || contact.MobileNumber || contact.mobileNumber || '',
                landline: contact.landline || contact.Landline || '',
                preferredLanguage: contact.preferredLanguage || contact.PreferredLanguage || contact.PrefferedLanguage || 'English',
                selected: contact.selected !== false,
                isPrimary: contact.isPrimary || false,
                sourceRecord: contact.source || contact.sourceRecord || 'Master Builder',
                sourceRecordName: contact.source || contact.sourceRecordName || 'Master Builder'
              };
              
              console.log(`Processed contact ${index}:`, processedContact);
              return processedContact;
            }) : [];
          
          console.log('=== FINAL PROCESSED CONTACTS ===');
          console.log('this.masterContacts:', this.masterContacts);
        } else {
          this.masterContacts = [];
        }

        if (response.documents) {
          this.masterDocuments = Array.isArray(response.documents) ? 
            response.documents.map((doc: any) => ({
              ...doc,
              selected: doc.selected !== false
            })) : [];
        } else {
          this.masterDocuments = [];
        }
        
        await this.loadRecordsByTax();
        
        if (response.builtFromRecords) {
          try {
            const builtData = JSON.parse(response.builtFromRecords);
            console.log('Restoring link status from:', builtData);
            
            if (builtData.quarantineRecords && Array.isArray(builtData.quarantineRecords)) {
              builtData.quarantineRecords.forEach((quarantineId: string) => {
                const record = this.records.find(r => r.id === quarantineId);
                if (record) {
                  record.linkStatus = 'quarantine';
                  console.log(`Restored quarantine status for: ${quarantineId}`);
                }
              });
            }
            
            if (builtData.trueDuplicates && Array.isArray(builtData.trueDuplicates)) {
              builtData.trueDuplicates.forEach((linkedId: string) => {
                const record = this.records.find(r => r.id === linkedId);
                if (record && record.linkStatus !== 'quarantine') {
                  record.linkStatus = 'linked';
                  console.log(`Restored linked status for: ${linkedId}`);
                }
              });
            }
            
            this.records.forEach(record => {
              if (record.linkStatus !== 'linked' && record.linkStatus !== 'quarantine') {
                record.linkStatus = 'unlinked';
              }
            });
            
          } catch (e) {
            console.error('Error restoring link status:', e);
          }
        }
        
        this.fieldDefinitions.forEach(field => {
          if (this.masterRecordData[field.key]) {
            const sourceId = this.selectedFields[field.key];
            if (sourceId === 'MANUAL_ENTRY') {
              this.manualFields[field.key] = this.masterRecordData[field.key];
              this.manualFieldValues[field.key] = this.masterRecordData[field.key];
            }
          }
        });
        
        this.currentStep = 1;
        
        this.contacts = this.masterContacts;
        this.documents = this.masterDocuments;
        
        console.log('Loaded rejected duplicate for editing:', this.masterRecordData);
        console.log('Final records with link status:', this.records);
      }
    } catch (error) {
      console.error('Error loading rejected duplicate:', error);
      alert('Error loading rejected record. Please try again.');
      this.router.navigate(['/dashboard/my-task-list']);
    } finally {
      this.loading = false;
    }
  }

  showRejectionMessage(reason: string): void {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      left: 20px;
      max-width: 600px;
      margin: 0 auto;
      background: #fef2f2;
      border: 2px solid #ef4444;
      border-radius: 12px;
      padding: 20px;
      z-index: 9999;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    `;
    
    alertDiv.innerHTML = `
      <div style="display: flex; align-items: start; gap: 15px;">
        <span style="font-size: 24px;">⚠️</span>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 10px 0; color: #dc2626;">Duplicate Record Rejected</h3>
          <p style="margin: 0 0 10px 0; color: #991b1b;">
            <strong>Rejection Reason:</strong> ${reason}
          </p>
          <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
            Please fix the issues mentioned above and resubmit the master record.
          </p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; font-size: 20px; cursor: pointer; color: #991b1b;">
          ✕
        </button>
      </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, 10000);
  }

  getMasterFieldValue(fieldKey: string): string {
    if (this.masterRecordData && this.masterRecordData[fieldKey]) {
      return this.masterRecordData[fieldKey];
    }
    
    const sourceId = this.selectedFields[fieldKey];
    if (sourceId === 'MANUAL_ENTRY') {
      return this.manualFields[fieldKey] || 'Not Set';
    } else if (sourceId) {
      const record = this.records.find(r => r.id === sourceId);
      return record ? (record[fieldKey] || 'Not Set') : 'Not Set';
    }
    
    return 'Not Set';
  }

  async approveAndSendToCompliance(): Promise<void> {
    if (!confirm('Are you sure you want to approve this master record and send it to compliance?')) {
      return;
    }
    
    this.processing = true;
    
    try {
      const quarantineRecordIds = this.records
        .filter(r => r.linkStatus === 'quarantine')
        .map(r => r.id);
      
      console.log('Sending approval with quarantine IDs:', quarantineRecordIds);
      
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/${this.currentRecordId}/approve`, {
          note: 'Master record approved after review',
          quarantineIds: quarantineRecordIds
        })
      );
      
      if (response) {
        let message = 'Master record approved and sent to compliance!';
        if (quarantineRecordIds.length > 0) {
          message += `\n${quarantineRecordIds.length} records marked for quarantine.`;
        }
        alert(message);
        this.router.navigate(['/dashboard/admin-task-list']);
      }
    } catch (error) {
      console.error('Error in approval:', error);
      alert('Master record may have been approved. Please check the task list.');
      this.router.navigate(['/dashboard/admin-task-list']);
    } finally {
      this.processing = false;
    }
  }

  openRejectModal(): void {
    this.showRejectModal = true;
    this.rejectionReason = '';
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectionReason = '';
  }

  async confirmReject(): Promise<void> {
    if (!this.rejectionReason || this.rejectionReason.trim().length < 10) {
      alert('Please provide a detailed rejection reason (at least 10 characters)');
      return;
    }
    
    this.processing = true;
    
    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/${this.currentRecordId}/reject`, {
          reason: this.rejectionReason
        })
      );
      
      if (response) {
        alert('Master record rejected and returned to data entry!');
        this.closeRejectModal();
        this.router.navigate(['/dashboard/admin-task-list']);
      }
    } catch (error) {
      console.error('Error rejecting record:', error);
      alert('Error rejecting record. Please try again.');
    } finally {
      this.processing = false;
    }
  }

  async loadRecordsByTax(): Promise<void> {
    if (!this.currentTaxNumber) return;
    
    this.loading = true;
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiBase}/duplicates/by-tax/${this.currentTaxNumber}`)
      );
      
      if (response.success && response.records) {
        this.records = response.records
          .filter((record: any) => this.isEditingRejected ? record.id !== this.currentRecordId : true)
          .map((record: any) => ({
            ...record,
            recordName: record.firstName || record.firstNameAr || `Record ${record.id}`,
            matchScore: Math.round((record.confidence || 0.9) * 100),
            linkStatus: 'linked'
          }));
        
        this.currentGroupName = response.groupName || `Tax ${this.currentTaxNumber} Group`;
        
        if (!this.isEditingRejected) {
          this.initializeContactsAndDocuments();
        } else {
          this.contacts = this.masterContacts;
          this.documents = this.masterDocuments;
        }
        
        // Start with builder and auto-fill
        this.currentStep = 1;
        this.autoFillBest();
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      this.loading = false;
    }
  }

  initializeContactsAndDocuments(): void {
    if (this.isEditingRejected && this.masterContacts.length > 0) {
      console.log('Skipping contact initialization - editing rejected with existing contacts');
      this.contacts = this.masterContacts;
      this.documents = this.masterDocuments;
      return;
    }
    
    this.masterContacts = [];
    this.masterDocuments = [];
    
    this.records.forEach(record => {
      if (record.contacts && Array.isArray(record.contacts)) {
        record.contacts.forEach((contact: any) => {
          this.masterContacts.push({
            ...contact,
            name: contact.name || contact.ContactName || record.ContactName || 'No Name',
            jobTitle: contact.jobTitle || contact.JobTitle || record.JobTitle || '',
            email: contact.email || contact.EmailAddress || record.EmailAddress || '',
            mobile: contact.mobile || contact.MobileNumber || record.MobileNumber || '',
            landline: contact.landline || contact.Landline || record.Landline || '',
            preferredLanguage: contact.preferredLanguage || contact.PreferredLanguage || 'English',
            sourceRecord: record.id,
            sourceRecordName: record.recordName,
            selected: true
          });
        });
      } else if (record.ContactName || record.EmailAddress || record.MobileNumber) {
        this.masterContacts.push({
          name: record.ContactName || 'Primary Contact',
          jobTitle: record.JobTitle || '',
          email: record.EmailAddress || '',
          mobile: record.MobileNumber || '',
          landline: record.Landline || '',
          preferredLanguage: record.PreferredLanguage || 'English',
          sourceRecord: record.id,
          sourceRecordName: record.recordName,
          selected: true
        });
      }
      
      if (record.documents && Array.isArray(record.documents)) {
        record.documents.forEach((doc: any) => {
          this.masterDocuments.push({
            ...doc,
            sourceRecord: record.id,
            sourceRecordName: record.recordName,
            selected: true
          });
        });
      }
    });
    
    this.contacts = this.masterContacts;
    this.documents = this.masterDocuments;
    
    console.log('Initialized contacts:', this.masterContacts);
  }

  autoFillBest(): void {
    console.log('Auto Fill Best - Starting');
    
    const newSelectedFields: { [key: string]: string } = {};
    const newManualFields: { [key: string]: string } = {};
    
    this.fieldDefinitions.forEach(field => {
      let bestValue = '';
      let bestRecordId = '';
      let bestQuality = 0;
      
      this.records.forEach(record => {
        const value = record[field.key];
        if (value && value.toString().trim() !== '') {
          const quality = this.getFieldQuality(record, field.key);
          
          if (quality > bestQuality) {
            bestQuality = quality;
            bestValue = value;
            bestRecordId = record.id;
          }
        }
      });
      
      if (bestRecordId) {
        newSelectedFields[field.key] = bestRecordId;
      }
    });
    
    this.selectedFields = newSelectedFields;
    this.manualFields = newManualFields;
    this.manualFieldValues = {};
    
    this.expandedFields = [];
    
    this.cdr.detectChanges();
    
    console.log('Smart Fill completed with', Object.keys(this.selectedFields).length, 'fields');
  }

  clearAllFields(): void {
    this.selectedFields = {};
    this.manualFields = {};
    this.manualFieldValues = {};
    this.expandedFields = [];
    this.cdr.detectChanges();
  }

  toggleFieldExpansion(field: FieldDefinition): void {
    this.expandField(field.key);
  }

  expandField(fieldKey: string): void {
    const index = this.expandedFields.indexOf(fieldKey);
    if (index === -1) {
      this.expandedFields.push(fieldKey);
    } else {
      this.expandedFields.splice(index, 1);
    }
  }

  getFieldQuality(record: any, fieldKey: string): number {
    const value = record[fieldKey];
    if (!value) return 0;
    
    let score = 50;
    const valueStr = value.toString().trim();
    
    if (valueStr.length > 3 && valueStr.length < 100) {
      score += 20;
    }
    
    if (fieldKey === 'firstNameAr' && /[\u0600-\u06FF]/.test(valueStr)) {
      score += 30;
    }
    
    if (fieldKey === 'EmailAddress' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueStr)) {
      score += 30;
    }
    
    if ((fieldKey === 'MobileNumber' || fieldKey === 'Landline') && 
        /^\+?[\d\s\-()]{7,15}$/.test(valueStr)) {
      score += 20;
    }
    
    if (fieldKey === 'tax' && valueStr.length >= 10) {
      score += 25;
    }
    
    return Math.min(score, 100);
  }

  isDifferentFromMaster(fieldKey: string, record: any): boolean {
    if (!this.selectedMasterRecordId) return false;
    
    const masterRecord = this.records.find(r => r.id === this.selectedMasterRecordId);
    if (!masterRecord) return false;
    
    return masterRecord[fieldKey] !== record[fieldKey];
  }

  getAvailableValues(fieldKey: string): any[] {
    const values: any[] = [];
    const seenValues = new Set();
    
    this.records.forEach(record => {
      const value = record[fieldKey];
      if (value && !seenValues.has(value)) {
        seenValues.add(value);
        values.push({
          value: value,
          recordId: record.id,
          recordName: record.recordName || record.firstName || record.id
        });
      }
    });
    
    return values;
  }

  selectFieldValue(fieldKey: string, value: string): void {
    const record = this.records.find(r => r[fieldKey] === value);
    if (record) {
      this.selectedFields[fieldKey] = record.id;
      const index = this.expandedFields.indexOf(fieldKey);
      if (index > -1) {
        this.expandedFields.splice(index, 1);
      }
      
      if (fieldKey === 'country') {
        this.updateCityOptions(value);
      }
      
      this.cdr.detectChanges();
    }
  }

  applyManualValue(fieldKey: string): void {
    const value = this.manualFieldValues[fieldKey];
    if (value) {
      this.manualFields[fieldKey] = value;
      this.selectedFields[fieldKey] = 'MANUAL_ENTRY';
      const index = this.expandedFields.indexOf(fieldKey);
      if (index > -1) {
        this.expandedFields.splice(index, 1);
      }
      
      if (fieldKey === 'country') {
        this.updateCityOptions(value);
      }
      
      this.cdr.detectChanges();
    }
  }

  getDropdownOptions(fieldKey: string): DropdownOption[] {
    return this.dropdownOptions[fieldKey] || [];
  }

  updateCityOptions(country: string): void {
    this.dropdownOptions['city'] = getCitiesByCountry(country);
    this.cdr.detectChanges();
  }

  getFieldValue(record: any, field: string): string {
    return record[field] || '';
  }

  selectFieldSource(fieldKey: string, recordId: string): void {
    this.selectedFields[fieldKey] = recordId;
    if (this.manualFields[fieldKey]) {
      delete this.manualFields[fieldKey];
    }
    this.cdr.detectChanges();
  }

  isFieldSelected(fieldKey: string, recordId: string): boolean {
    return this.selectedFields[fieldKey] === recordId;
  }

  useManualEntry(fieldKey: string): void {
    this.selectedFields[fieldKey] = 'MANUAL_ENTRY';
    this.focusedField = fieldKey;
  }

  updateManualField(fieldKey: string, value: string): void {
    this.manualFields[fieldKey] = value;
    this.selectedFields[fieldKey] = 'MANUAL_ENTRY';
  }

  // ENHANCED: Get field source with system name
  getFieldSource(fieldKey: string): string {
    const sourceId = this.selectedFields[fieldKey];
    if (!sourceId) {
      return 'Not Selected';
    }
    
    if (sourceId === 'MANUAL_ENTRY') {
      const manualValue = this.manualFields[fieldKey];
      return manualValue ? `Manual: ${manualValue}` : 'Manual Entry';
    }
    
    const record = this.records.find(r => r.id === sourceId);
    if (record) {
      const value = record[fieldKey];
      const sourceName = record.recordName || record.firstName || record.id;
      return value ? `${value}` : sourceName;
    }
    
    return 'Not Selected';
  }

  // NEW METHOD: Get source system badge for display
  getFieldSourceSystem(fieldKey: string): string {
    const sourceId = this.selectedFields[fieldKey];
    
    if (!sourceId) {
      return '';
    }
    
    if (sourceId === 'MANUAL_ENTRY') {
      return 'Data Steward';
    }
    
    const record = this.records.find(r => r.id === sourceId);
    if (record) {
      const system = record.sourceSystem || record.origin || 'Unknown';
      // Normalize the system name
      if (system.toLowerCase().includes('sap') && system.toLowerCase().includes('byd')) {
        return 'SAP ByD';
      } else if (system.toLowerCase().includes('sap') || system.toLowerCase().includes('s/4')) {
        return 'SAP S/4HANA';
      } else if (system.toLowerCase().includes('oracle')) {
        return 'Oracle Forms';
      } else {
        return 'Data Steward';
      }
    }
    
    return '';
  }

  // NEW METHOD: Get badge color based on source system
  getSourceSystemColor(system: string): string {
    switch(system) {
      case 'SAP S/4HANA':
        return '#0854a0'; // SAP Blue
      case 'SAP ByD':
        return '#0854a0'; // SAP Blue
      case 'Oracle Forms':
        return '#f80000'; // Oracle Red
      case 'Data Steward':
        return '#10b981'; // Green
      default:
        return '#6b7280'; // Gray
    }
  }

  getFieldStatus(fieldKey: string): 'completed' | 'required' | 'empty' {
    const hasSelection = this.selectedFields[fieldKey] || this.manualFields[fieldKey];
    
    if (hasSelection) {
      return 'completed';
    }
    
    const field = this.fieldDefinitions.find(f => f.key === fieldKey);
    if (field?.required) {
      return 'required';
    }
    
    return 'empty';
  }

  toggleLinkStatus(recordId: string): void {
    const record = this.records.find(r => r.id === recordId);
    if (record) {
      record.linkStatus = record.linkStatus === 'linked' ? 'unlinked' : 'linked';
    }
  }

  toggleLink(record: any): void {
    record.linkStatus = record.linkStatus === 'linked' ? 'unlinked' : 'linked';
  }

  toggleQuarantine(record: any): void {
    record.linkStatus = record.linkStatus === 'quarantine' ? 'linked' : 'quarantine';
  }

  linkAll(): void {
    this.records.forEach(record => {
      if (record.id !== this.selectedMasterRecordId) {
        record.linkStatus = 'linked';
      }
    });
  }

  quarantineAll(): void {
    this.records.forEach(record => {
      if (record.id !== this.selectedMasterRecordId) {
        record.linkStatus = 'quarantine';
      }
    });
  }

  selectMasterRecord(recordId: string): void {
    this.selectedMasterRecordId = recordId;
    this.fieldDefinitions.forEach(field => {
      const masterRecord = this.records.find(r => r.id === recordId);
      if (masterRecord && masterRecord[field.key]) {
        this.selectedFields[field.key] = recordId;
      }
    });
  }

  isMasterRecord(recordId: string): boolean {
    return this.selectedMasterRecordId === recordId;
  }

  calculateQualityScore(record: any): number {
    let score = 0;
    let totalFields = 0;
    
    this.fieldDefinitions.forEach(field => {
      if (field.required) {
        totalFields += 2;
        if (record[field.key]) {
          score += 2;
        }
      } else {
        totalFields += 1;
        if (record[field.key]) {
          score += 1;
        }
      }
    });
    
    const percentage = (score / totalFields) * 100;
    this.qualityScores[record.id] = percentage;
    return percentage;
  }

  getQualityLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  getQualityColor(score: number): string {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  openEditModal(record: any): void {
    this.editingRecord = { ...record };
    this.showEditModal = true;
  }

  saveEditedRecord(): void {
    if (this.editingRecord) {
      const index = this.records.findIndex(r => r.id === this.editingRecord.id);
      if (index !== -1) {
        this.records[index] = { ...this.editingRecord };
        this.calculateQualityScore(this.records[index]);
      }
    }
    this.closeEditModal();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingRecord = null;
  }

  openContactModal(): void {
    this.newContact = {
      name: '',
      jobTitle: '',
      email: '',
      mobile: '',
      landline: '',
      preferredLanguage: 'English'
    };
    this.showContactModal = true;
    this.showAddContactModal = true;
  }

  addNewContact(): void {
    this.editingContact = null;
    this.editingContactIndex = -1;
    this.openContactModal();
  }

  editContact(contact: any, index: number): void {
    this.editingContact = contact;
    this.editingContactIndex = index;
    this.newContact = { ...contact };
    this.showContactModal = true;
  }

  addContact(): void {
    if (this.newContact.name && this.newContact.email) {
      const contact = {
        ...this.newContact,
        id: Date.now().toString(),
        sourceRecord: 'MANUAL',
        sourceRecordName: 'Manual Entry',
        selected: true
      };
      this.masterContacts.push(contact);
      this.contacts = this.masterContacts;
      this.closeContactModal();
    }
  }

  saveNewContact(): void {
    this.saveContact();
  }

  saveContact(): void {
    if (this.newContact.name) {
      if (this.editingContactIndex >= 0) {
        this.masterContacts[this.editingContactIndex] = {
          ...this.masterContacts[this.editingContactIndex],
          ...this.newContact
        };
      } else {
        const contact = {
          ...this.newContact,
          id: Date.now().toString(),
          sourceRecord: 'MANUAL',
          sourceRecordName: 'Manual Entry',
          selected: true
        };
        this.masterContacts.push(contact);
      }
      this.contacts = this.masterContacts;
      this.closeContactModal();
    }
  }

  removeContact(index: number): void {
    this.masterContacts.splice(index, 1);
    this.contacts = this.masterContacts;
  }

  updateContactSelection(contact: any): void {
    contact.selected = !contact.selected;
  }

  setPrimaryContact(contact: any): void {
    this.masterContacts.forEach(c => c.isPrimary = false);
    contact.isPrimary = true;
  }

  closeContactModal(): void {
    this.showContactModal = false;
    this.showAddContactModal = false;
    this.editingContact = null;
    this.editingContactIndex = -1;
    this.newContact = {
      name: '',
      jobTitle: '',
      email: '',
      mobile: '',
      landline: '',
      preferredLanguage: 'English'
    };
  }

  cancelAddContact(): void {
    this.closeContactModal();
  }

  openDocumentModal(): void {
    this.newDocument = {
      name: '',
      type: '',
      description: '',
      file: null
    };
    this.showDocumentModal = true;
    this.showUploadDocumentModal = true;
  }

  uploadDocument(): void {
    this.openDocumentModal();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.newDocument.file = file;
      this.newDocument.name = file.name;
      
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (['pdf'].includes(extension || '')) {
        this.newDocument.type = 'PDF Document';
      } else if (['doc', 'docx'].includes(extension || '')) {
        this.newDocument.type = 'Word Document';
      } else if (['xls', 'xlsx'].includes(extension || '')) {
        this.newDocument.type = 'Excel Document';
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
        this.newDocument.type = 'Image';
      } else {
        this.newDocument.type = 'Other Document';
      }
    }
  }

  addDocument(): void {
    if (this.newDocument.name && this.newDocument.file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Content = base64.split(',')[1];
        
        const doc = {
          id: Date.now().toString(),
          documentId: 'DOC-' + Date.now(),
          name: this.newDocument.name,
          type: this.newDocument.type,
          description: this.newDocument.description,
          size: this.newDocument.file.size,
          mime: this.newDocument.file.type,
          contentBase64: base64Content,
          sourceRecord: 'MANUAL',
          sourceRecordName: 'Manual Entry',
          uploadedAt: new Date().toISOString(),
          selected: true
        };
        
        this.masterDocuments.push(doc);
        this.documents = this.masterDocuments;
        this.closeDocumentModal();
      };
      reader.readAsDataURL(this.newDocument.file);
    }
  }

  saveNewDocument(): void {
    this.addDocument();
  }

  removeDocument(index: number): void {
    this.masterDocuments.splice(index, 1);
    this.documents = this.masterDocuments;
  }

  updateDocumentSelection(doc: any): void {
    doc.selected = !doc.selected;
  }

  formatFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
  }

  viewDocument(doc: any): void {
    if (doc.contentBase64) {
      try {
        let mimeType = doc.mime || 'application/octet-stream';
        
        if (!doc.mime && doc.name) {
          const extension = doc.name.split('.').pop()?.toLowerCase();
          const mimeTypes: { [key: string]: string } = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'txt': 'text/plain'
          };
          mimeType = mimeTypes[extension || ''] || 'application/octet-stream';
        }

        const byteCharacters = atob(doc.contentBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name || 'document';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
        
      } catch (error) {
        console.error('Error downloading document:', error);
        alert('Error downloading document. Please try again.');
      }
    } else {
      alert('Document content not available for download.');
    }
  }

  closeDocumentModal(): void {
    this.showDocumentModal = false;
    this.showUploadDocumentModal = false;
    this.newDocument = {
      name: '',
      type: '',
      description: '',
      file: null
    };
  }

  cancelUploadDocument(): void {
    this.closeDocumentModal();
  }

  navigateToStep(step: number): void {
    if (!this.isReviewMode && !this.isComplianceMode) {
      this.currentStep = step;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1 && !this.isReviewMode && !this.isComplianceMode) {
      this.currentStep--;
    }
  }

  proceedToLinking(): void {
    if (this.isGoldenRecordComplete()) {
      this.currentStep = 2;
    }
  }

  isGoldenRecordComplete(): boolean {
    const requiredFields = this.fieldDefinitions.filter(f => f.required);
    return requiredFields.every(field => {
      return this.selectedFields[field.key] || this.manualFields[field.key];
    });
  }

  canProceedToSubmit(): boolean {
    return this.getLinkedCount() > 0;
  }

  getCompletedFieldsCount(): number {
    return Object.keys(this.selectedFields).length + Object.keys(this.manualFields).length;
  }

  getSelectedContactsCount(): number {
    return this.masterContacts.filter(c => c.selected !== false).length;
  }

  getSelectedDocumentsCount(): number {
    return this.masterDocuments.filter(d => d.selected !== false).length;
  }

  getLinkedCount(): number {
    if (this.isReviewMode || this.isComplianceMode) {
      return this.linkedRecords.length;
    }
    return this.records.filter(r => r.linkStatus === 'linked' && r.id !== this.selectedMasterRecordId).length;
  }

  getQuarantineCount(): number {
    if (this.isReviewMode || this.isComplianceMode) {
      return this.quarantineRecords.length;
    }
    return this.records.filter(r => r.linkStatus === 'quarantine' || r.linkStatus === 'unlinked').length;
  }

  onFileUpload(event: any, recordId: string): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Content = base64.split(',')[1];
        
        if (!this.uploadedFiles[recordId]) {
          this.uploadedFiles[recordId] = [];
        }
        
        this.uploadedFiles[recordId].push({
          name: file.name,
          size: file.size,
          type: file.type,
          mime: file.type,
          contentBase64: base64Content,
          uploadedAt: new Date().toISOString()
        });
        
        const record = this.records.find(r => r.id === recordId);
        if (record) {
          if (!record.documents) {
            record.documents = [];
          }
          record.documents.push({
            id: Date.now().toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            mime: file.type,
            contentBase64: base64Content,
            uploadedAt: new Date().toISOString()
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile(recordId: string, index: number): void {
    if (this.uploadedFiles[recordId]) {
      this.uploadedFiles[recordId].splice(index, 1);
    }
  }

  saveDraft(): void {
    const draft = {
      taxNumber: this.currentTaxNumber,
      selectedFields: this.selectedFields,
      manualFields: this.manualFields,
      masterContacts: this.masterContacts,
      masterDocuments: this.masterDocuments,
      selectedMasterRecordId: this.selectedMasterRecordId,
      recordStatus: this.records.map(r => ({ id: r.id, linkStatus: r.linkStatus }))
    };
    
    console.log('Draft saved:', draft);
    alert('Draft saved successfully!');
  }

  // FIXED: Submit with complete record data
  async submitToReviewer(): Promise<void> {
    this.building = true;
    this.buildError = '';
    
    try {
      const linkedRecords = this.records.filter(r => r.linkStatus === 'linked' && r.id !== this.selectedMasterRecordId);
      const duplicateIds = linkedRecords.map(r => r.id);
      
      const unlinkedRecords = this.records.filter(r => r.linkStatus === 'unlinked' || r.linkStatus === 'quarantine');
      const quarantineIds = unlinkedRecords.map(r => r.id);

      // Prepare complete record data for lineage
      const builtFromRecords = this.records.map(record => ({
        id: record.id,
        firstName: record.firstName,
        firstNameAr: record.firstNameAr,
        tax: record.tax,
        CustomerType: record.CustomerType,
        CompanyOwner: record.CompanyOwner,
        buildingNumber: record.buildingNumber,
        street: record.street,
        country: record.country,
        city: record.city,
        ContactName: record.ContactName,
        EmailAddress: record.EmailAddress,
        MobileNumber: record.MobileNumber,
        JobTitle: record.JobTitle,
        Landline: record.Landline,
        PrefferedLanguage: record.PrefferedLanguage,
        SalesOrgOption: record.SalesOrgOption,
        DistributionChannelOption: record.DistributionChannelOption,
        DivisionOption: record.DivisionOption,
        sourceSystem: record.sourceSystem || record.origin || 'Data Steward',
        origin: record.origin,
        status: record.status,
        recordName: record.recordName
      }));

      const masterData: any = {};
      
      this.fieldDefinitions.forEach(field => {
        const sourceRecordId = this.selectedFields[field.key];
        if (sourceRecordId === 'MANUAL_ENTRY') {
          masterData[field.key] = this.manualFields[field.key] || '';
        } else if (sourceRecordId) {
          const sourceRecord = this.records.find(r => r.id === sourceRecordId);
          if (sourceRecord) {
            masterData[field.key] = sourceRecord[field.key] || '';
          }
        } else {
          const masterRecord = this.records.find(r => r.id === this.selectedMasterRecordId);
          if (masterRecord) {
            masterData[field.key] = masterRecord[field.key] || '';
          }
        }
      });

      masterData.tax = this.currentTaxNumber;
      masterData.status = 'Pending';
      masterData.assignedTo = 'reviewer';
      masterData.requestType = 'duplicate';
      masterData.originalRequestType = 'duplicate';
      masterData.createdBy = 'data_entry';
      masterData.sourceSystem = 'Master Builder';
      masterData.isMaster = 1;
      masterData.confidence = 0.95;
      
      if (this.isEditingRejected && this.currentRecordId) {
        masterData.originalId = this.currentRecordId;
        masterData.isResubmission = true;
      }

      const selectedContacts = this.masterContacts.filter(c => c.selected !== false).map(contact => ({
        name: contact.name || 'No Name',
        jobTitle: contact.jobTitle || '',
        email: contact.email || '',
        mobile: contact.mobile || '',
        landline: contact.landline || '',
        preferredLanguage: contact.preferredLanguage || 'English',
        isPrimary: contact.isPrimary || false,
        selected: contact.selected
      }));

      console.log('=== CONTACTS BEING SENT TO BACKEND ===');
      console.log('selectedContacts:', selectedContacts);

      const selectedDocuments = this.masterDocuments.filter(d => d.selected !== false);

      const documentsWithMime = selectedDocuments.map(doc => ({
        ...doc,
        mime: doc.mime || 'application/octet-stream'
      }));

      const payload = {
        taxNumber: this.currentTaxNumber,
        duplicateIds: duplicateIds,
        quarantineIds: quarantineIds,
        selectedFields: this.selectedFields,
        selectedFieldSources: this.selectedFields, // Same for compatibility
        builtFromRecords: builtFromRecords, // ADDED: Complete record data
        manualFields: this.manualFields,
        masterContacts: selectedContacts,
        masterDocuments: documentsWithMime,
        masterData: masterData,
        isResubmission: this.isEditingRejected,
        originalRecordId: this.isEditingRejected ? this.currentRecordId : null
      };

      console.log('Submitting master build with data:', payload);

      const endpoint = this.isEditingRejected ? 
        `${this.apiBase}/duplicates/resubmit-master` : 
        `${this.apiBase}/duplicates/build-master`;

      const response = await firstValueFrom(
        this.http.post<any>(endpoint, payload)
      );

      if (response.success) {
        this.buildSuccess = true;
        
        const message = this.isEditingRejected ? 
          `Successfully resubmitted for Master Data Review!` :
          `Successfully sent for Master Data Review!`;
          
        this.successMessage = `${message}\n\nMaster Record ID: ${response.masterId}\nLinked Duplicates: ${response.linkedCount}\nQuarantined Records: ${response.quarantineCount}`;
        
        this.showSuccessModal = true;
        
        setTimeout(() => {
          this.navigateToList();
        }, 3000);
      } else {
        this.buildError = response.error || 'Failed to build master record';
      }
    } catch (error: any) {
      console.error('Error submitting to reviewer:', error);
      this.buildError = error.error?.message || 'An error occurred while building master record';
    } finally {
      this.building = false;
    }
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  closeHelp(): void {
    this.showHelp = false;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.navigateToList();
  }

  // Get source system for a specific record
getRecordSourceSystem(recordId: string): string {
  const record = this.records.find(r => r.id === recordId);
  if (record) {
    const system = record.sourceSystem || record.origin || 'Unknown';
    // Normalize the system name
    if (system.toLowerCase().includes('sap') && system.toLowerCase().includes('byd')) {
      return 'SAP ByD';
    } else if (system.toLowerCase().includes('sap') || system.toLowerCase().includes('s/4')) {
      return 'SAP S/4HANA';
    } else if (system.toLowerCase().includes('oracle')) {
      return 'Oracle Forms';
    } else {
      return 'Data Steward';
    }
  }
  return '';
}

  navigateToList(): void {
    if (this.isComplianceMode) {
      this.router.navigate(['/dashboard/compliance-task-list']);
    } else {
      this.router.navigate(['/dashboard/duplicate-records']);
    }
  }

  goBack(): void {
    if (this.isComplianceMode) {
      this.router.navigate(['/dashboard/compliance-task-list']);
    } else {
      this.router.navigate(['/dashboard/duplicate-records']);
    }
  }
}