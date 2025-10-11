// src/app/dashboard/golden-summary/golden-summary.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-golden-summary',
  templateUrl: './golden-summary.component.html',
  styleUrls: ['./golden-summary.component.scss', './golden-summary-table-styles.scss']
})
export class GoldenSummaryComponent implements OnInit {
  // API configuration
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  
  // Main data
  master: any = {};
  contacts: any[] = [];
  documents: any[] = [];
  duplicates: any[] = [];
  blockReason: string = '';
  
  // NEW: Linked and Quarantine Records
  linkedRecords: any[] = [];
  quarantineRecords: any[] = [];
  
  // UI state
  copied = false;
  isBlockModalOpen = false;
  isContactsModalOpen = false;
  isDocsModalOpen = false;
  
  // Document Preview
  showDocumentPreviewModal = false;
  selectedDocument: any = null;
  blockReasonDraft = '';
  isLoading = false;
  
  // NEW: Reviewer reject modal state
  isRejectModalOpen = false;
  rejectReasonDraft = '';
  isProcessing = false;
  
  // User permissions (from API, not localStorage)
  isCompliance = false;
  isDataEntry = false;
  isReviewer = false;
  currentUser: any = null;
  
  // Customer Type Options for display
  CustomerTypeOptions = [
    { value: 'Corporate', label: 'Corporate' },
    { value: 'SME', label: 'SME (Small & Medium Enterprise)' },
    { value: 'limited_liability', label: 'Limited Liability Company' },
    { value: 'corporation', label: 'Corporation' },
    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
    { value: 'joint_stock', label: 'Joint Stock Company' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'public_sector', label: 'Public Sector' },
    { value: 'other', label: 'Other' }
  ];
  
  // Check if has duplicates
  get hasDuplicates(): boolean {
    return this.duplicates && this.duplicates.length > 0;
  }

  // Check if has linked records
  get hasLinkedRecords(): boolean {
    return this.linkedRecords && this.linkedRecords.length > 0;
  }

  // Check if has quarantine records
  get hasQuarantineRecords(): boolean {
    return this.quarantineRecords && this.quarantineRecords.length > 0;
  }

  // Check if record is blocked
  get isBlocked(): boolean {
    return (this.master.status || '').toLowerCase() === 'blocked';
  }

  // Check if record is active
  get isActive(): boolean {
    return (this.master.status || '').toLowerCase() === 'active';
  }

  // Check if block reason should be visible (only for compliance users)
  get shouldShowBlockReason(): boolean {
    return this.isBlocked && !!this.blockReason && this.isCompliance;
  }

  // NEW: Check if record can be approved/rejected by reviewer
  get canReviewerApprove(): boolean {
    const status = this.master.status || this.master.requestStatus;
    const hasGoldenFields = this.master.goldenCode || this.master.goldenRecordCode || this.master.isGolden;
    
    const canApprove = this.isReviewer && 
           status === 'Pending' && 
           hasGoldenFields;
    
    console.log('[DEBUG] canReviewerApprove check:', {
      isReviewer: this.isReviewer,
      status: status,
      hasGoldenFields: hasGoldenFields,
      canApprove: canApprove
    });
    
    return canApprove;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit(): Promise<void> {
    // Check if embedded in iframe
    const isEmbedded = this.route.snapshot.queryParams['embedded'] === 'true';
    
    if (isEmbedded) {
      // Hide navigation elements when embedded
      document.body.classList.add('embedded-mode');
    }
    
    // Get current user from API first
    await this.getCurrentUser();
    
    // Debug user permissions
    console.log('User permissions:', {
      currentUser: this.currentUser,
      isDataEntry: this.isDataEntry,
      isCompliance: this.isCompliance,
      isReviewer: this.isReviewer
    });
    
    // Check if data was passed via router state first
    const routerState = history.state;
    
    if (routerState && routerState['master']) {
      // Data passed via router state - use it directly
      console.log('Found router state data:', routerState);
      this.loadFromRouterState(routerState);
    } else {
      // No router state, try to get ID from route parameters
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        console.log('Loading via API with ID:', id);
        await this.loadGoldenRecord(id);
      } else {
        console.error('No golden record data provided - neither router state nor ID parameter');
        this.router.navigate(['/dashboard/golden-requests']);
      }
    }
  }

private loadFromRouterState(state: any): void {
  console.log('Loading from router state:', state);
  
  // Load master data
  this.master = state.master || {};
  
  // DEBUG: Check the structure of master data from router state
  console.log('[DEBUG] Raw master from router state:', this.master);
  console.log('[DEBUG] Master keys:', Object.keys(this.master));
  console.log('[DEBUG] Master status properties:', {
    status: this.master.status,
    requestStatus: this.master.requestStatus,
    assignedTo: this.master.assignedTo,
    ComplianceStatus: this.master.ComplianceStatus
  });
  
  // Load additional data
  this.duplicates = state.duplicates || [];
  
  // ✅ ENHANCED: Load contacts from multiple possible sources
  this.contacts = state.record?.contacts || 
                  state.contacts || 
                  this.master.contacts || 
                  [];
  
  // If contacts is still empty, try parsing if it's a JSON string
  if (this.contacts.length === 0 && this.master.contacts) {
    try {
      if (typeof this.master.contacts === 'string') {
        this.contacts = JSON.parse(this.master.contacts);
      }
    } catch (e) {
      console.log('Failed to parse contacts from master:', e);
    }
  }
  
  console.log('Loaded contacts:', this.contacts.length, this.contacts);
  
  // ✅ ENHANCED: Load documents with better source checking
  let docsToProcess = state.record?.documents || 
                      state.documents || 
                      this.master.documents || 
                      [];
  
  // If documents is a JSON string, parse it
  if (typeof docsToProcess === 'string') {
    try {
      docsToProcess = JSON.parse(docsToProcess);
    } catch (e) {
      console.log('Failed to parse documents:', e);
      docsToProcess = [];
    }
  }
  
  // Ensure it's an array
  if (!Array.isArray(docsToProcess)) {
    docsToProcess = [];
  }
  
  // Load documents with deduplication
  if (docsToProcess.length > 0) {
    const uniqueDocs = new Map();
    
    docsToProcess.forEach((doc: any) => {
      const key = doc.documentId || doc.id || `${doc.name}_${doc.type}`;
      if (key && doc.name && doc.name !== 'N/A' && doc.name !== 'Not Uploaded') {
        if (!uniqueDocs.has(key)) {
          uniqueDocs.set(key, doc);
        }
      }
    });
    
    this.documents = Array.from(uniqueDocs.values());
  } else {
    this.documents = [];
  }
  
  console.log('Loaded documents from router state:', this.documents.length, this.documents);
  
  // ✅ FIX: Check if documents have valid content (fileUrl or contentBase64)
  const hasValidDocuments = this.documents.some(d => d.fileUrl || d.contentBase64);
  if (this.documents.length > 0 && !hasValidDocuments && this.master.id) {
    console.log('⚠️ [GOLDEN] Documents loaded but missing content, fetching from API...');
    // Fetch full documents from API
    this.loadGoldenRecord(this.master.id);
  }
  
  // NEW: Load linked and quarantine records if available
  this.linkedRecords = state.linkedRecords || [];
  this.quarantineRecords = state.quarantineRecords || [];
  
  // If not in state but we have tax number, try to load them
  if ((!this.linkedRecords.length && !this.quarantineRecords.length) && this.master.taxNumber) {
    this.loadLinkedRecords(this.master.taxNumber);
  }
  
  // ✅ ENHANCED: Also try to load tax number from multiple sources
  if (!this.master.taxNumber && (this.master.tax || this.master.taxNumber)) {
    this.master.taxNumber = this.master.tax || this.master.taxNumber;
  }
  
  // Only load block reason for compliance users
  this.blockReason = this.isCompliance ? (state.record?.blockReason || state.blockReason || '') : '';
  
  // ✅ ENHANCED DEBUG: More detailed logging
  console.log('=== FINAL LOADED DATA ===');
  console.log('Master:', this.master);
  console.log('Linked records:', this.linkedRecords.length, this.linkedRecords);
  console.log('Quarantine records:', this.quarantineRecords.length, this.quarantineRecords);
  console.log('Contacts:', this.contacts.length, this.contacts);
  console.log('Documents:', this.documents.length, this.documents);
  console.log('Block reason:', this.blockReason);
  console.log('========================');
  
  // ✅ NEW: If critical data is missing, try to fetch from API
  if (this.master.id && (this.contacts.length === 0 || this.documents.length === 0)) {
    console.log('Critical data missing, attempting to fetch from API...');
    this.loadMissingDataFromAPI(this.master.id);
  }
}

// ✅ NEW METHOD: Load missing data from API
private async loadMissingDataFromAPI(recordId: string): Promise<void> {
  if (!recordId) return;
  
  try {
    console.log('Fetching missing data from API for record:', recordId);
    
    const response = await firstValueFrom(
      this.http.get<any>(`${this.apiBase}/requests/${recordId}`)
    );
    
    if (response) {
      // Load contacts if missing
      if (this.contacts.length === 0 && response.contacts) {
        try {
          this.contacts = Array.isArray(response.contacts) 
            ? response.contacts 
            : (typeof response.contacts === 'string' ? JSON.parse(response.contacts) : []);
          console.log('Loaded contacts from API:', this.contacts.length);
        } catch (e) {
          console.error('Error parsing contacts from API:', e);
        }
      }
      
      // Load documents if missing
      if (this.documents.length === 0 && response.documents) {
        try {
          let docs = Array.isArray(response.documents) 
            ? response.documents 
            : (typeof response.documents === 'string' ? JSON.parse(response.documents) : []);
          
          // Deduplicate documents
          const uniqueDocs = new Map();
          docs.forEach((doc: any) => {
            const key = doc.documentId || doc.id || `${doc.name}_${doc.type}`;
            if (key && doc.name && doc.name !== 'N/A' && doc.name !== 'Not Uploaded') {
              if (!uniqueDocs.has(key)) {
                uniqueDocs.set(key, doc);
              }
            }
          });
          
          this.documents = Array.from(uniqueDocs.values());
          console.log('Loaded documents from API:', this.documents.length);
        } catch (e) {
          console.error('Error parsing documents from API:', e);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching missing data from API:', error);
  }
}

private async getCurrentUser(): Promise<void> {
  try {
    // استخدام sessionStorage فقط
    const username = sessionStorage.getItem('username');
    
    console.log('Getting user with username:', username);
    
    if (!username) {
      console.error('No username found in sessionStorage');
      // لا تعطي صلاحيات افتراضية - اجعل كل شيء false
      this.isCompliance = false;
      this.isDataEntry = false;
      this.isReviewer = false;
      this.currentUser = null;
      return;
    }
    
    const url = `${this.apiBase}/auth/me?username=${username}`;
    
    const user = await firstValueFrom(
      this.http.get<any>(url)
    );
    
    if (user) {
      this.currentUser = user;
      
      // Fix role mapping - handle the database inconsistency
      let correctedRole = user.role;
      
      // If username is data_entry but role is wrong, fix it
      if (username === 'data_entry' && user.role !== 'data_entry' && user.role !== '1') {
        console.log('Fixing role for data_entry user');
        correctedRole = 'data_entry';
      }
      
      // If username is reviewer but role is wrong, fix it  
      if (username === 'reviewer' && user.role !== 'reviewer' && user.role !== '2') {
        console.log('Fixing role for reviewer user');
        correctedRole = 'reviewer';
      }
      
      // If username is compliance but role is wrong, fix it
      if (username === 'compliance' && user.role !== 'compliance' && user.role !== '3') {
        console.log('Fixing role for compliance user');
        correctedRole = 'compliance';
      }
      
      // Set permissions based on corrected role
      this.isCompliance = correctedRole === 'compliance' || correctedRole === '3';
      this.isDataEntry = correctedRole === 'data_entry' || correctedRole === '1';
      this.isReviewer = correctedRole === 'reviewer' || correctedRole === '2';
      
      console.log('Current user loaded successfully:', {
        username: username,
        originalRole: user.role,
        correctedRole: correctedRole,
        isCompliance: this.isCompliance,
        isDataEntry: this.isDataEntry,
        isReviewer: this.isReviewer
      });
      
      // Update the currentUser object with corrected role for display
      this.currentUser.role = correctedRole;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    
    // Fallback: استخدام sessionStorage فقط
    const username = sessionStorage.getItem('username');
    
    if (username) {
      console.log('Using fallback role detection for username:', username);
      
      // تحديد الصلاحيات بناءً على اسم المستخدم
      this.isCompliance = username === 'compliance';
      this.isDataEntry = username === 'data_entry';
      this.isReviewer = username === 'reviewer';
      
      // Create a mock currentUser object
      this.currentUser = {
        username: username,
        role: username === 'data_entry' ? 'data_entry' : 
              username === 'reviewer' ? 'reviewer' : 
              username === 'compliance' ? 'compliance' : 'unknown'
      };
      
      console.log('Fallback permissions set:', {
        username: username,
        isCompliance: this.isCompliance,
        isDataEntry: this.isDataEntry,
        isReviewer: this.isReviewer
      });
    } else {
      // No username found - no permissions
      console.log('No username found in fallback - setting all permissions to false');
      this.isCompliance = false;
      this.isDataEntry = false;
      this.isReviewer = false;
      this.currentUser = null;
    }
  }
}

async loadGoldenRecord(id: string): Promise<void> {
  this.isLoading = true;
  try {
    const response = await firstValueFrom(
      this.http.get<any>(`${this.apiBase}/requests/${id}`)
    );
    
    if (response) {
      // Debug: طباعة الـ response كامل لفهم المشكلة
      console.log('=== FULL API RESPONSE DEBUG ===');
      console.log('Full API Response:', response);
      console.log('CustomerType from response:', response.CustomerType);
      console.log('customerType (lowercase) from response:', response.customerType);
      console.log('originalRequestType from response:', response.originalRequestType);
      console.log('All response keys:', Object.keys(response));
      console.log('================================');
      
      // Map database fields to template fields
      this.master = {
        id: response.id,
        name: response.firstName,
        nameAr: response.firstNameAr,
        goldenCode: response.goldenRecordCode || `GR-${response.id}`,
        status: response.companyStatus || 'Active',
        recordType: response.CustomerType || response.customerType || response.customer_type || 'Customer',
        CustomerType: response.CustomerType || response.customerType || response.customer_type || '',
        country: response.country,
        city: response.city,
        
        // Identity
        oldCode: response.requestId || response.id,
        customerCode: response.requestId,
        companyOwnerName: response.CompanyOwner,
        
        // Contact info (primary)
        contactName: response.ContactName,
        jobTitle: response.JobTitle,
        email: response.EmailAddress,
        phone: response.MobileNumber,
        landline: response.Landline,
        
        // Address
        buildingNumber: response.buildingNumber,
        streetName: response.street,
        
        // Sales & Compliance
        taxNumber: response.tax,
        salesOrg: response.SalesOrgOption,
        distributionChannel: response.DistributionChannelOption,
        division: response.DivisionOption,
        preferredLanguage: response.PrefferedLanguage,
        
        // Documents placeholders
        commercialRegDocName: 'N/A',
        taxCertificateDocName: 'N/A',

        // ✅ ADD: originalRequestType to track origin
        originalRequestType: response.originalRequestType,
        
        // Status info for reviewer actions
        requestStatus: response.status,
        assignedTo: response.assignedTo
      };
      
      // Debug: طباعة النتيجة النهائية
      console.log('=== FINAL MASTER OBJECT DEBUG ===');
      console.log('Final master.recordType:', this.master.recordType);
      console.log('Final master.CustomerType:', this.master.CustomerType);
      console.log('Final master.originalRequestType:', this.master.originalRequestType);
      console.log('getCustomerTypeLabel result:', this.getCustomerTypeLabel(this.master.recordType));
      console.log('==================================');
      
      // Set block reason only for compliance users
      this.blockReason = this.isCompliance ? (response.blockReason || '') : '';
      
      // Load contacts - handle both array and JSON string
      try {
        this.contacts = Array.isArray(response.contacts) 
          ? response.contacts 
          : (response.contacts ? JSON.parse(response.contacts) : []);
      } catch (e) {
        this.contacts = [];
      }
      
      // Load documents - handle both array and JSON string with deduplication
      try {
        let loadedDocs = [];
        
        if (Array.isArray(response.documents)) {
          loadedDocs = response.documents;
        } else if (response.documents) {
          try {
            loadedDocs = JSON.parse(response.documents);
          } catch (e) {
            console.error('Error parsing documents:', e);
            loadedDocs = [];
          }
        }
        
        // Remove duplicates based on document ID, name, or content
        const uniqueDocs = new Map();
        loadedDocs.forEach((doc: any) => {
          // Create a unique key for each document
          const key = doc.documentId || doc.id || `${doc.name}_${doc.type}`;
          
          // Only add if not already exists and not a placeholder
          if (key && doc.name && doc.name !== 'N/A' && doc.name !== 'Not Uploaded') {
            if (!uniqueDocs.has(key)) {
              uniqueDocs.set(key, doc);
            }
          }
        });
        
        this.documents = Array.from(uniqueDocs.values());
        
        console.log('=== DOCUMENTS DEBUG ===');
        console.log('Raw documents from response:', loadedDocs);
        console.log('Unique documents after filtering:', this.documents);
        console.log('Documents count:', this.documents.length);
        console.log('=======================');
        
      } catch (e) {
        console.error('Error loading documents:', e);
        this.documents = [];
      }
      
      // Process documents for display - with better handling
      if (this.documents.length > 0) {
        // Only set if we find actual documents (not placeholders)
        const commercialDoc = this.documents.find((d: any) => 
          d.type && (d.type.toLowerCase().includes('commercial') || d.type.toLowerCase().includes('registration')) &&
          d.name && d.name !== 'N/A' && d.name !== 'Not Uploaded'
        );
        
        const taxDoc = this.documents.find((d: any) => 
          d.type && d.type.toLowerCase().includes('tax') &&
          d.name && d.name !== 'N/A' && d.name !== 'Not Uploaded'
        );
        
        this.master.commercialRegDocName = commercialDoc ? commercialDoc.name : 'Not Uploaded';
        this.master.taxCertificateDocName = taxDoc ? taxDoc.name : 'Not Uploaded';
      } else {
        // No documents found
        this.master.commercialRegDocName = 'Not Uploaded';
        this.master.taxCertificateDocName = 'Not Uploaded';
      }
      
      // ✅ UPDATED: Load linked records ONLY if NOT from quarantine
      if ((response.isMaster || response.isGolden || response.requestType === 'duplicate' || response.tax) && 
          response.originalRequestType !== 'quarantine') {
        console.log('Loading linked records - not a quarantine origin');
        await this.loadLinkedRecords(response.tax || response.taxNumber);
      } else if (response.originalRequestType === 'quarantine') {
        // ✅ Clear any linked/duplicate records for quarantine-origin records
        console.log('Skipping linked records - record originated from quarantine');
        this.linkedRecords = [];
        this.quarantineRecords = [];
        this.duplicates = [];
      } else {
        // Load linked records for other cases
        await this.loadLinkedRecords(response.tax || response.taxNumber);
      }
      
      // Load duplicates (if needed and not from quarantine)
      if (response.originalRequestType !== 'quarantine') {
        await this.loadDuplicates();
      }
    }
  } catch (error) {
    console.error('Error loading golden record:', error);
  } finally {
    this.isLoading = false;
  }
}

 // NEW: Load linked records method
async loadLinkedRecords(taxNumber: string): Promise<void> {
  // Check if this record originated from quarantine - skip loading linked records
  if (this.master.originalRequestType === 'quarantine') {
    console.log('Skipping linked records - record originated from quarantine');
    this.linkedRecords = [];
    this.quarantineRecords = [];
    this.duplicates = [];
    return;
  }
  
  if (!taxNumber) {
    console.log('No tax number provided for loading linked records');
    return;
  }
  
  try {
    console.log('=== LOADING LINKED RECORDS ===');
    console.log('Tax Number:', taxNumber);
    console.log('Master ID:', this.master.id);
    console.log('Master originalRequestType:', this.master.originalRequestType);
    
    // Get all duplicates with the same tax number
    const duplicatesResponse = await firstValueFrom(
      this.http.get<any>(`${this.apiBase}/duplicates/by-tax/${taxNumber}`)
    );
    
    console.log('Duplicates API Response:', duplicatesResponse);
    
    if (duplicatesResponse && duplicatesResponse.success && duplicatesResponse.records) {
      const allRecords = duplicatesResponse.records;
      console.log('All records found:', allRecords.length);
      console.log('All records data:', allRecords);
      
      // Debug each record
      allRecords.forEach((record: any, index: number) => {
        console.log(`Record ${index}:`, {
          id: record.id,
          masterId: record.masterId,
          status: record.status,
          firstName: record.firstName,
          tax: record.tax
        });
      });
      
      // ✅ FIXED: Filter linked records - ONLY records linked to THIS master
      this.linkedRecords = allRecords.filter((record: any) => {
        // ONLY include records that have masterId pointing to THIS master
        const isLinked = (
          record.masterId && 
          String(record.masterId) === String(this.master.id) &&
          record.id !== this.master.id
        );
        
        if (isLinked) {
          console.log('Found linked record to THIS master:', record.id, record.firstName, 'masterId:', record.masterId);
        }
        
        return isLinked;
      });
      
      // Filter quarantine records (status or requestType = quarantine)
      this.quarantineRecords = allRecords.filter((record: any) => {
        const isQuarantine = (
          record.status === 'Quarantine' ||
          record.requestType === 'quarantine'
        );
        
        if (isQuarantine) {
          console.log('Found quarantine record:', record.id, record.firstName);
        }
        
        return isQuarantine;
      });
      
      // ✅ UPDATED: Other duplicates - only other GOLDEN records with same tax
      this.duplicates = allRecords.filter((record: any) => {
        // Only include other golden records, not regular records
        const isOtherGolden = (
          record.id !== this.master.id &&
          record.isGolden === 1 &&
          !this.linkedRecords.some((lr: any) => lr.id === record.id) &&
          !this.quarantineRecords.some((qr: any) => qr.id === record.id)
        );
        
        if (isOtherGolden) {
          console.log('Found other golden record:', record.id, record.firstName);
        }
        
        return isOtherGolden;
      }).map((r: any) => ({
        oldCode: r.requestId || r.id,
        goldenCode: r.goldenRecordCode || `GR-${r.id}`,
        name: r.firstName,
        nameAr: r.firstNameAr,
        companyNameAr: r.firstNameAr,
        email: r.EmailAddress,
        phone: r.MobileNumber,
        address: r.street,
        country: r.country,
        taxNumber: r.tax,
        salesOrg: r.SalesOrgOption,
        division: r.DivisionOption,
        sourceSystem: r.sourceSystem,
        status: r.status
      }));
      
      console.log('=== FINAL RESULTS ===');
      console.log('Linked Records:', this.linkedRecords.length, this.linkedRecords);
      console.log('Quarantine Records:', this.quarantineRecords.length, this.quarantineRecords);
      console.log('Other Golden Duplicates:', this.duplicates.length, this.duplicates);
      
    } else {
      console.log('No duplicate records found in API response');
      
      // Try alternative - get the built records from the master record itself
      if (this.master.id) {
        console.log('Trying to load from master record details...');
        
        const masterDetailsResponse = await firstValueFrom(
          this.http.get<any>(`${this.apiBase}/requests/${this.master.id}`)
        );
        
        console.log('Master details response:', masterDetailsResponse);
        
        // Check if there's builtFromRecords data
        if (masterDetailsResponse.builtFromRecords) {
          try {
            const builtData = JSON.parse(masterDetailsResponse.builtFromRecords);
            console.log('Built from records data:', builtData);
            
            // Get the linked record IDs
            const linkedIds = builtData.trueDuplicates || [];
            const quarantineIds = builtData.quarantineRecords || [];
            
            console.log('Linked IDs from master:', linkedIds);
            console.log('Quarantine IDs from master:', quarantineIds);
            
            // Now fetch these specific records
            if (linkedIds.length > 0 || quarantineIds.length > 0) {
              const allRequests = await firstValueFrom(
                this.http.get<any[]>(`${this.apiBase}/requests`)
              );
              
              this.linkedRecords = allRequests.filter((r: any) => 
                linkedIds.includes(r.id)
              );
              
              this.quarantineRecords = allRequests.filter((r: any) => 
                quarantineIds.includes(r.id) || r.status === 'Quarantine'
              );
              
              console.log('Loaded from builtFromRecords:', {
                linked: this.linkedRecords.length,
                quarantine: this.quarantineRecords.length
              });
            }
          } catch (parseError) {
            console.error('Error parsing builtFromRecords:', parseError);
          }
        }
      }
      
      // Final fallback
      if (this.linkedRecords.length === 0 && this.quarantineRecords.length === 0) {
        this.linkedRecords = [];
        this.quarantineRecords = [];
        this.duplicates = [];
      }
    }
  } catch (error) {
    console.error('Error loading linked records:', error);
    
    // Ultimate fallback - try to get all requests with same tax
    try {
      console.log('Trying ultimate fallback...');
      
      const allRequests = await firstValueFrom(
        this.http.get<any[]>(`${this.apiBase}/requests`)
      );
      
      if (allRequests) {
        console.log('Got all requests:', allRequests.length);
        
        // Filter for records with same tax number
        const relatedRecords = allRequests.filter((r: any) => {
          const sameT = r.tax === taxNumber && r.id !== this.master.id;
          if (sameT) {
            console.log('Found related record:', r.id, r.firstName, r.status, r.masterId);
          }
          return sameT;
        });
        
        console.log('Related records with same tax:', relatedRecords.length);
        
        // ✅ FIXED: Only get records linked to THIS master
        this.linkedRecords = relatedRecords.filter((r: any) => {
          return (
            r.masterId === this.master.id || 
            r.masterId === String(this.master.id)
          );
        });
        
        // Get quarantine records
        this.quarantineRecords = relatedRecords.filter((r: any) => 
          r.status === 'Quarantine' || r.requestType === 'quarantine'
        );
        
        // ✅ UPDATED: Only other golden records as duplicates
        this.duplicates = relatedRecords.filter((r: any) => 
          r.isGolden === 1 &&
          !this.linkedRecords.some((lr: any) => lr.id === r.id) &&
          !this.quarantineRecords.some((qr: any) => qr.id === r.id)
        ).map((r: any) => ({
          oldCode: r.requestId || r.id,
          goldenCode: r.goldenRecordCode || `GR-${r.id}`,
          name: r.firstName,
          nameAr: r.firstNameAr,
          email: r.EmailAddress,
          phone: r.MobileNumber,
          country: r.country,
          taxNumber: r.tax,
          status: r.status || 'Active'
        }));
        
        console.log('Ultimate fallback results:', {
          linked: this.linkedRecords.length,
          quarantine: this.quarantineRecords.length,
          duplicates: this.duplicates.length
        });
      }
    } catch (altError) {
      console.error('Ultimate fallback also failed:', altError);
      this.linkedRecords = [];
      this.quarantineRecords = [];
      this.duplicates = [];
    }
  }
}

  async loadDuplicates(): Promise<void> {
    try {
      // Load duplicate records with same tax number or similar name
      const allRecords = await firstValueFrom(
        this.http.get<any[]>(`${this.apiBase}/requests`)
      );
      
      if (allRecords && this.master.taxNumber) {
        // Find duplicates (same tax number but different ID)
        this.duplicates = allRecords
          .filter((r: any) => 
            r.tax === this.master.taxNumber && 
            r.id !== this.master.id &&
            r.isGolden === 1
          )
          .map((r: any) => ({
            oldCode: r.requestId || r.id,
            goldenCode: r.goldenRecordCode || `GR-${r.id}`,
            name: r.firstName,
            nameAr: r.firstNameAr,
            companyNameAr: r.firstNameAr,
            email: r.EmailAddress,
            phone: r.MobileNumber,
            address: r.street,
            country: r.country,
            taxNumber: r.tax,
            salesOrg: r.SalesOrgOption,
            division: r.DivisionOption
          }));
      }
    } catch (error) {
      console.error('Error loading duplicates:', error);
      this.duplicates = [];
    }
  }

  // UI Actions
  copyGoldenCode(): void {
    if (this.master.goldenCode) {
      navigator.clipboard.writeText(this.master.goldenCode);
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    }
  }

  // Test Navigation Method (for debugging)
  testNavigation(): void {
    console.log('Testing simple navigation...');
    console.log('Current data:', {
      master: this.master,
      isDataEntry: this.isDataEntry,
      routerExists: !!this.router
    });
    
    // Try simple navigation first
    this.router.navigate(['/dashboard/new-request']).then(success => {
      console.log('Simple navigation result:', success);
    }).catch(error => {
      console.error('Simple navigation error:', error);
    });
  }
  
  editAndResubmit(): void {
    if (!this.isDataEntry) {
      console.log('Edit blocked - not data entry user');
      return;
    }
    
    if (!this.master || !this.master.goldenCode) {
      console.log('Edit blocked - no master data or ID');
      console.log('Master data:', this.master);
      return;
    }
    
    console.log('Data Entry user editing golden record:', this.master);
    console.log('Navigating to new-request with data...');
    
    // Navigate to new-request page with golden record data
    // This will create a NEW request based on the golden record data
    this.router.navigate(['/dashboard/new-request'], {
      queryParams: {
        mode: 'edit-golden',
        from: 'golden-summary',
        userRole: 'data_entry'
      },
      state: {
        goldenRecord: this.master,
        contacts: this.contacts,
        documents: this.documents,
        sourceGoldenId: this.master.id || this.master.goldenCode
      }
    }).then(success => {
      if (success) {
        console.log('Navigation successful');
      } else {
        console.error('Navigation failed');
      }
    }).catch(error => {
      console.error('Navigation error:', error);
    });
  }

  // NEW: Reviewer Actions
  async approveGoldenRecord(): Promise<void> {
    if (!this.canReviewerApprove || this.isProcessing) return;

    try {
      this.isProcessing = true;
      console.log('[REVIEWER] Approving golden record:', this.master.id);

      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${this.master.id}/approve`, {
          note: 'Golden record changes approved by reviewer'
        })
      );

      // Update local state
      this.master.requestStatus = 'Approved';
      this.master.assignedTo = 'compliance';

      // Show success message (you can replace with proper toast/alert)
      alert('Golden record approved successfully! Forwarded to compliance for final approval.');

      // Navigate back to task list
      this.router.navigate(['/dashboard/admin-task-list']);

    } catch (error) {
      console.error('[REVIEWER] Error approving golden record:', error);
      alert('Error approving golden record. Please try again.');
    } finally {
      this.isProcessing = false;
    }
  }

  openRejectModal(): void {
    if (!this.canReviewerApprove) return;
    
    this.rejectReasonDraft = '';
    this.isRejectModalOpen = true;
  }

  async submitReject(): Promise<void> {
    if (!this.canReviewerApprove || !this.rejectReasonDraft.trim() || this.isProcessing) return;

    try {
      this.isProcessing = true;
      console.log('[REVIEWER] Rejecting golden record:', this.master.id);

      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${this.master.id}/reject`, {
          reason: this.rejectReasonDraft.trim()
        })
      );

      // Update local state
      this.master.requestStatus = 'Rejected';
      this.master.assignedTo = 'data_entry';

      // Close modal
      this.isRejectModalOpen = false;
      this.rejectReasonDraft = '';

      // Show success message
      alert('Golden record rejected successfully! Sent back to data entry for corrections.');

      // Navigate back to task list
      this.router.navigate(['/dashboard/admin-task-list']);

    } catch (error) {
      console.error('[REVIEWER] Error rejecting golden record:', error);
      alert('Error rejecting golden record. Please try again.');
    } finally {
      this.isProcessing = false;
    }
  }

  cancelReject(): void {
    this.isRejectModalOpen = false;
    this.rejectReasonDraft = '';
  }

  // Compliance Actions
  async setActive(): Promise<void> {
    if (!this.isCompliance || !this.master.id) return;
    
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${this.master.id}/compliance/approve`, {
          note: 'Set as Active'
        })
      );
      
      this.master.status = 'Active';
      this.blockReason = '';
    } catch (error) {
      console.error('Error setting active:', error);
    }
  }

  openBlockModal(): void {
    if (!this.isCompliance) return;
    this.blockReasonDraft = '';
    this.isBlockModalOpen = true;
  }

  async submitBlock(): Promise<void> {
    if (!this.isCompliance || !this.master.id || !this.blockReasonDraft.trim()) return;
    
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/requests/${this.master.id}/compliance/block`, {
          reason: this.blockReasonDraft
        })
      );
      
      this.master.status = 'Blocked';
      this.blockReason = this.blockReasonDraft;
      this.isBlockModalOpen = false;
      this.blockReasonDraft = '';
    } catch (error) {
      console.error('Error blocking:', error);
    }
  }

  cancelBlock(): void {
    this.isBlockModalOpen = false;
    this.blockReasonDraft = '';
  }

  // Navigation Actions
  goBack(): void {
    this.router.navigate(['/dashboard/golden-requests']);
  }

  goToDataLineage(): void {
    const recordForLineage = {
      goldenCode: this.master.goldenCode,
      recordType: this.master.recordType,
      status: this.master.status,
      country: this.master.country,
      name: this.master.name,
      firstName: this.master.name,
      nameAr: this.master.nameAr,
      firstNameAr: this.master.nameAr,
      oldCode: this.master.oldCode,
      customerCode: this.master.customerCode,
      companyOwnerName: this.master.companyOwnerName,
      CompanyOwner: this.master.companyOwnerName,
      contactName: this.master.contactName,
      ContactName: this.master.contactName,
      jobTitle: this.master.jobTitle,
      JobTitle: this.master.jobTitle,
      email: this.master.email,
      EmailAddress: this.master.email,
      phone: this.master.phone,
      mobileNumber: this.master.phone,
      MobileNumber: this.master.phone,
      landline: this.master.landline,
      Landline: this.master.landline,
      buildingNumber: this.master.buildingNumber,
      streetName: this.master.streetName,
      city: this.master.city,
      country2: this.master.country,
      taxNumber: this.master.taxNumber,
      tax: this.master.taxNumber,
      salesOrg: this.master.salesOrg,
      SalesOrgOption: this.master.salesOrg,
      distributionChannel: this.master.distributionChannel,
      DistributionChannelOption: this.master.distributionChannel,
      division: this.master.division,
      DivisionOption: this.master.division,
      preferredLanguage: this.master.preferredLanguage,
      PrefferedLanguage: this.master.preferredLanguage,
      ComplianceStatus: this.master.status,
      commercialRegDocName: this.master.commercialRegDocName,
      CommercialRegistrationDocName: this.master.commercialRegDocName,
      taxCertificateDocName: this.master.taxCertificateDocName,
      TaxCertificateDocName: this.master.taxCertificateDocName,
      contacts: this.contacts,
      documents: this.documents,
      summary: { duplicates: this.duplicates }
    };
    
    this.router.navigate(["/dashboard/data-lineage"], { 
      state: { record: recordForLineage } 
    });
  }

  // Modal Controls
  openContactsModal(): void {
    this.isContactsModalOpen = true;
  }

  closeContactsModal(): void {
    this.isContactsModalOpen = false;
  }

  openDocsModal(): void {
    this.isDocsModalOpen = true;
  }

  closeDocsModal(): void {
    this.isDocsModalOpen = false;
  }

  // Document Helpers
  docIcon(doc: any): string {
    if (!doc.mime && !doc.type) return '📄';
    
    const mime = (doc.mime || '').toLowerCase();
    const type = (doc.type || '').toLowerCase();
    
    if (mime.includes('pdf') || type.includes('pdf')) return '📕';
    if (mime.includes('image') || type.includes('image')) return '🖼️';
    if (mime.includes('word') || type.includes('doc')) return '📘';
    if (mime.includes('excel') || type.includes('sheet')) return '📗';
    if (type.includes('tax')) return '🧾';
    if (type.includes('commercial')) return '📜';
    
    return '📄';
  }

  openDoc(doc: any): void {
    console.log('🖱️ [GOLDEN] openDoc() called with:', doc);
    this.previewDocument(doc);
  }

  previewDocument(doc: any): void {
    console.log('👁️ [GOLDEN] previewDocument() called with:', doc);
    console.log('👁️ [GOLDEN] canPreview result:', this.canPreview(doc));
    this.selectedDocument = doc;
    this.showDocumentPreviewModal = true;
  }

  closeDocumentPreview(): void {
    this.showDocumentPreviewModal = false;
    this.selectedDocument = null;
  }

  canPreview(doc: any): boolean {
    console.log('🔍 [GOLDEN] canPreview() called with:', {
      name: doc?.name,
      mime: doc?.mime,
      fileUrl: doc?.fileUrl,
      hasContentBase64: !!doc?.contentBase64
    });
    
    if (!doc) {
      console.log('❌ [GOLDEN] canPreview: doc is null/undefined');
      return false;
    }
    
    // Check mime type if available
    if (doc.mime) {
      const mime = doc.mime.toLowerCase();
      if (mime.includes('image') || mime.includes('pdf')) {
        console.log('✅ [GOLDEN] canPreview: true (mime check)');
        return true;
      }
    }
    
    // ✅ FIX: Fallback to file extension if mime is not available
    if (doc.name) {
      const ext = doc.name.toLowerCase().split('.').pop();
      const canPreview = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
      console.log(`${canPreview ? '✅' : '❌'} [GOLDEN] canPreview: ${canPreview} (name extension: ${ext})`);
      if (canPreview) return true;
    }
    
    // ✅ FIX: Check fileUrl extension
    if (doc.fileUrl) {
      const ext = doc.fileUrl.toLowerCase().split('.').pop()?.split('?')[0]; // Remove query params
      const canPreview = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
      console.log(`${canPreview ? '✅' : '❌'} [GOLDEN] canPreview: ${canPreview} (fileUrl extension: ${ext})`);
      if (canPreview) return true;
    }
    
    console.log('❌ [GOLDEN] canPreview: false (no valid preview method found)');
    return false;
  }

  getPreviewUrl(doc: any): string {
    if (!doc) return '';
    
    // ✅ HYBRID: Support filesystem documents (fileUrl)
    if (doc.fileUrl) {
      console.log('🔍 [PREVIEW] Using filesystem URL:', doc.fileUrl);
      return doc.fileUrl;
    }
    
    // ✅ HYBRID: Support base64 documents (contentBase64)
    if (doc.contentBase64) {
      if (doc.contentBase64.startsWith('data:')) {
        return doc.contentBase64;
      }
      return `data:${doc.mime || 'application/pdf'};base64,${doc.contentBase64}`;
    }
    
    return '';
  }

  // Add method for Safe URL
  getSafePreviewUrl(doc: any): SafeResourceUrl {
    const url = this.getPreviewUrl(doc);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  downloadDoc(doc: any): void {
    // ✅ HYBRID: Support filesystem documents (fileUrl)
    if (doc.fileUrl) {
      console.log('📥 [DOWNLOAD] Using filesystem URL:', doc.fileUrl);
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.name || 'document';
      link.click();
      return;
    }
    
    // ✅ HYBRID: Support base64 documents (contentBase64)
    if (!doc.contentBase64) {
      alert('Document content not available');
      return;
    }
    
    try {
      let base64Content = doc.contentBase64;
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1];
      }
      
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: doc.mime || 'application/octet-stream' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  }

  // Utility Methods
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Get customer type label from value
  getCustomerTypeLabel(value: string): string {
    if (!value) return 'N/A';
    
    // البحث في المصفوفة أولاً
    const option = this.CustomerTypeOptions.find(opt => opt.value === value);
    if (option) {
      return option.label;
    }
    
    // إذا مش موجود، ارجع القيمة كما هي مع تحسين العرض
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Track By Functions
  trackByContact(index: number, contact: any): any {
    return contact.id || index;
  }

  trackByDoc(index: number, doc: any): any {
    return doc.id || doc.documentId || index;
  }

  trackByDuplicate(index: number, dup: any): any {
    return dup.oldCode || dup.goldenCode || index;
  }

  // NEW: Track by functions for linked records
  trackByLinkedRecord(index: number, record: any): any {
    return record.id || index;
  }

  trackByQuarantineRecord(index: number, record: any): any {
    return record.id || index;
  }
}