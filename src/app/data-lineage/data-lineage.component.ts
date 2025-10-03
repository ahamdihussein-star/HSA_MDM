// data-lineage.component.ts - Complete Final Version
import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type SourceSys = 'SAP ByD' | 'SAP S/4HANA' | 'Oracle Forms' | 'Data Steward';
type DeltaKind = 'added' | 'changed' | 'removed';

interface WorkflowHistoryEntry {
  id: string;
  requestId: string;
  action: string;
  performedBy: string;
  performedByRole?: string;
  performedAt: string;
  payload?: any;
  note?: string;
}

interface LineageRow {
  section: 'Identity' | 'Contact' | 'Address' | 'Sales & Compliance' | 'Documents' | 'Other';
  field: string;
  oldValue: string | null;
  newValue: string | null;
  updatedBy: string;
  updatedDate: string;
  source: SourceSys;
  changeType?: 'Create' | 'Update' | 'Delete' | 'Merge' | 'Current' | 'Extracted';
  approvedBy?: string | null;
  approvedDate?: string | null;
  requestId?: string;
  step?: string;
  isOriginal?: boolean;
}

interface IssueRow {
  id: string;
  field: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedOn: string;
  source: string;
  status: 'Open' | 'Resolved';
}

interface ContactItem {
  name?: string;
  jobTitle?: string;
  email?: string;
  mobile?: string;
  landline?: string;
  preferredLanguage?: string;
  title?: string; 
  old?: string; 
  now?: string; 
  histKey?: string;
  delta: DeltaKind;
  when?: string; 
  by?: string; 
  source?: string;
  changes?: ContactFieldChange[];
}

interface ContactFieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

interface DocumentItem {
  type?: string; 
  name?: string;
  description?: string; 
  mime?: string; 
  size?: string | number; 
  uploadedAt?: string;
  url?: string;
  title?: string; 
  old?: string; 
  now?: string; 
  histKey?: string;
  delta: DeltaKind;
  when?: string; 
  by?: string; 
  source?: string;
}

// Document Preview Interface
interface DocumentPreviewItem {
  name: string;
  type: string;
  mime?: string;
  url?: string;
  size?: number;
  description?: string;
}

@Component({
  selector: 'app-data-lineage',
  templateUrl: './data-lineage.component.html',
  styleUrls: ['./data-lineage.component.scss']
})
export class DataLineageComponent implements OnInit {

  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';

  customerName = 'Unknown Customer';
  goldenCode: string | null = null;
  recordType: 'Customer' | 'Supplier' | 'Unknown' = 'Unknown';
  country: string | null = null;
  status: 'Active' | 'Blocked' | 'Unknown' = 'Unknown';

  viewMode: 'table' = 'table';
  onlyChanges = false;
  isLoading = false;

  lineageFields: LineageRow[] = [];
  issues: IssueRow[] = [];

  showHistory = false;
  historyField = '';

  // Document Preview
  showDocumentPreviewModal = false;
  selectedDocument: any = null;
  historyKind: 'scalar' | 'contact' | 'document' = 'scalar';
  historyItems: Array<{ when: string; from: any; to: any; by: string; source: string; action: string; changes?: any[]; value?: any }> = [];

  contactsView: { items: ContactItem[]; stats: { changed: number; added: number; removed: number } } =
    { items: [], stats: { changed: 0, added: 0, removed: 0 } };

  documentsView: { items: DocumentItem[]; stats: { changed: number; added: number; removed: number } } =
    { items: [], stats: { changed: 0, added: 0, removed: 0 } };

  private currentRecord: any = null;
  private currentRequestId: string | null = null;
  private linkedRecords: any[] = [];
  private fieldOriginalSources: Map<string, { source: string; value: any; when: string; by: string }> = new Map();
  private builtFromRecords: any[] = [];
  private processedUpdateFields: Set<string> = new Set();
  private workflowHistory: WorkflowHistoryEntry[] = [];

  constructor(
    private location: Location, 
    private http: HttpClient, 
    public router: Router,
    private sanitizer: DomSanitizer
  ) {}
  
  goBack(): void { this.location.back(); }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private format(val: any): string | null {
    if (val === null || val === undefined || val === '') return null;
    return String(val);
  }

  private userFullNames: Map<string, string> = new Map();

  private async fetchUserFullName(username: string): Promise<string> {
    // Check if we already have this user's full name
    if (this.userFullNames.has(username)) {
      return this.userFullNames.get(username)!;
    }

    try {
      // Fetch user data from API
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiBase}/auth/me?username=${username}`)
      );
      
      const fullName = response?.fullName || username;
      const role = response?.role || 'user';
      
      console.log(`🔍 Fetched user data for ${username}:`, { fullName, role });
      
      // Format as "role/Name"
      const displayName = `${role}/${fullName}`;
      this.userFullNames.set(username, displayName);
      console.log(`✅ Cached display name: ${displayName}`);
      return displayName;
    } catch (error) {
      console.warn(`Failed to fetch full name for user: ${username}`, error);
      // Fallback to username if API fails
      this.userFullNames.set(username, username);
      return username;
    }
  }

  private getUserDisplayName(user: string): string {
    // Special cases that should not be changed
    if (user === 'system_import' || user === 'Extracted Data' || user === 'Generated by MDM' || user === 'System') {
      return user;
    }
    
    // Check if we have the full name cached
    if (this.userFullNames.has(user)) {
      return this.userFullNames.get(user)!;
    }
    
    // For now, return the user as is - full names will be fetched asynchronously
    // and the display will be updated when available
    return user;
  }

  private async updateUserDisplayNames(): Promise<void> {
    console.log('🔄 Updating user display names...');
    
    // Clear cache to ensure fresh data
    this.userFullNames.clear();
    console.log('🧹 Cleared user cache');
    
    // Get all unique usernames from lineage data
    const uniqueUsers = new Set<string>();
    // From lineage table rows
    this.lineageFields.forEach(row => {
      const val = row.updatedBy;
      if (val && !this.isSystemUser(val) && !val.includes('/')) {
        uniqueUsers.add(val);
      }
    });
    // From contacts view
    if (this.contactsView?.items?.length) {
      this.contactsView.items.forEach(item => {
        const val = item.by as string;
        if (val && !this.isSystemUser(val) && !val.includes('/')) {
          uniqueUsers.add(val);
        }
      });
    }
    // From documents view
    if (this.documentsView?.items?.length) {
      this.documentsView.items.forEach(item => {
        const val = item.by as string;
        if (val && !this.isSystemUser(val) && !val.includes('/')) {
          uniqueUsers.add(val);
        }
      });
    }

    console.log('📋 Found unique users:', Array.from(uniqueUsers));

    // Fetch full names for all unique users
    const promises = Array.from(uniqueUsers).map(async (username) => {
      try {
        const fullName = await this.fetchUserFullName(username);
        console.log(`✅ Fetched full name for ${username}: ${fullName}`);
        return { username, fullName };
      } catch (error) {
        console.warn(`Failed to fetch full name for ${username}:`, error);
        return { username, fullName: username };
      }
    });

    const results = await Promise.all(promises);
    
    // Update the cache
    results.forEach(({ username, fullName }) => {
      this.userFullNames.set(username, fullName);
    });

    // Update the lineage data with full names
    this.lineageFields.forEach(row => {
      if (row.updatedBy && !row.updatedBy.includes('/') && this.userFullNames.has(row.updatedBy)) {
        const oldName = row.updatedBy;
        const newName = this.userFullNames.get(row.updatedBy)!;
        row.updatedBy = newName;
        console.log(`🔄 Updated ${oldName} to ${newName}`);
      } else if (row.updatedBy && !this.isSystemUser(row.updatedBy) && !row.updatedBy.includes('/')) {
        console.log(`⚠️ No cached name found for: ${row.updatedBy}`);
      }
    });

    // Also update contact and document history
    this.updateContactHistoryUserNames();
    this.updateDocumentHistoryUserNames();

    console.log('✅ User display names updated');
  }

  private updateContactHistoryUserNames(): void {
    // Update contact history user names
    if (this.contactsView && this.contactsView.items) {
      this.contactsView.items.forEach(contact => {
        if (contact.by && this.userFullNames.has(contact.by)) {
          contact.by = this.userFullNames.get(contact.by)!;
        }
      });
    }
  }

  private updateDocumentHistoryUserNames(): void {
    // Update document history user names
    if (this.documentsView && this.documentsView.items) {
      this.documentsView.items.forEach(doc => {
        if (doc.by && this.userFullNames.has(doc.by)) {
          doc.by = this.userFullNames.get(doc.by)!;
        }
      });
    }
  }

  private isSystemUser(user: string): boolean {
    return ['system_import', 'Extracted Data', 'Generated by MDM', 'System'].includes(user);
  }

  private getSourceSystemFromPayload(entry: WorkflowHistoryEntry, currentRecord: any): string {
    // For MASTER_BUILT with field selections
    if (entry.action === 'MASTER_BUILT' && entry.payload?.selectedFieldSources) {
      // Check if all fields are from the same source
      const sources = Object.values(entry.payload.selectedFieldSources);
      const uniqueSources = [...new Set(sources)];
      if (uniqueSources.length === 1 && uniqueSources[0] !== 'MANUAL_ENTRY') {
        // All from same source
        const sourceId = uniqueSources[0] as string;
        const sourceRecord = this.findSourceRecord(sourceId, entry.payload);
        if (sourceRecord?.sourceSystem) {
          return sourceRecord.sourceSystem;
        }
      }
      // Mixed sources
      return 'varies';
    }
    
    let source = entry.payload?.sourceSystem || 
                 entry.payload?.data?.sourceSystem ||
                 entry.performedByRole;
    
    if (!source && currentRecord) {
      source = currentRecord.sourceSystem || currentRecord.origin;
    }
    
    if (!source) {
      if (entry.performedBy === 'system_import') {
        source = currentRecord?.sourceSystem || 'System';
      } else {
        source = 'Data Steward';
      }
    }
    
    return source;
  }

  private findSourceRecord(sourceId: string, payload: any): any {
    // Check in builtFromRecords
    if (payload?.builtFromRecords) {
      if (Array.isArray(payload.builtFromRecords)) {
        return payload.builtFromRecords.find((r: any) => r.id === sourceId);
      } else if (typeof payload.builtFromRecords === 'object') {
        const records = Object.values(payload.builtFromRecords)
          .filter((item: any) => item && typeof item === 'object' && item.id);
        return records.find((r: any) => r.id === sourceId);
      }
    }
    
    // Check in linked records
    return this.linkedRecords.find(r => r.id === sourceId) ||
           this.builtFromRecords.find(r => r.id === sourceId);
  }

  private getSourceFromFieldSelection(fieldKey: string, payload: any): string {
    const selectedFields = payload?.selectedFieldSources || payload?.selectedFields || {};
    const builtFrom = payload?.builtFromRecords || [];
    
    console.log('Getting source for field:', fieldKey);
    console.log('Selected fields:', selectedFields);
    
    // Check if manually entered
    const manualFields = payload?.manualFields || {};
    if (manualFields[fieldKey]) {
      return 'Data Steward';
    }
    
    // Get source record ID for this field
    const sourceRecordId = selectedFields[fieldKey];
    if (sourceRecordId) {
      if (sourceRecordId === 'MANUAL_ENTRY' || sourceRecordId === 'manual') {
        return 'Data Steward';
      }
      
      // Find the source record
      const sourceRecord = this.findSourceRecord(sourceRecordId, payload);
      if (sourceRecord?.sourceSystem) {
        return sourceRecord.sourceSystem;
      }
    }
    
    // Try to match by field value
    const fieldValue = payload?.data?.[fieldKey];
    if (fieldValue && builtFrom) {
      let recordsArray: any[] = [];
      
      if (Array.isArray(builtFrom)) {
        recordsArray = builtFrom;
      } else if (typeof builtFrom === 'object') {
        recordsArray = Object.values(builtFrom)
          .filter((item: any) => item && typeof item === 'object' && item.id);
      }
      
      for (const record of recordsArray) {
        if (record[fieldKey] === fieldValue && record.sourceSystem) {
          return record.sourceSystem;
        }
      }
    }
    
    return 'Data Steward';
  }

  private prettyFieldName(field: string): string {
    const mappings: { [key: string]: string } = {
      'firstName': 'Company Name (English)',
      'firstNameAr': 'Company Name (Arabic)',
      'tax': 'Tax Number',
      'CustomerType': 'Customer Type',
      'CompanyOwner': 'Company Owner',
      'buildingNumber': 'Building Number',
      'street': 'Street',
      'country': 'Country',
      'city': 'City',
      'ContactName': 'Contact Name',
      'EmailAddress': 'Email Address',
      'MobileNumber': 'Mobile Number',
      'JobTitle': 'Job Title',
      'Landline': 'Landline',
      'PrefferedLanguage': 'Preferred Language',
      'SalesOrgOption': 'Sales Organization',
      'DistributionChannelOption': 'Distribution Channel',
      'DivisionOption': 'Division'
    };
    
    return mappings[field] || field.replace(/([A-Z])/g, ' $1').trim();
  }

  private fieldSection(field: string): 'Identity' | 'Contact' | 'Address' | 'Sales & Compliance' | 'Documents' | 'Other' {
    if (field.startsWith('Contact:') || field.includes('Contact')) {
      return 'Contact';
    }
    if (field.startsWith('Document:')) {
      return 'Documents';
    }
    
    const basicInfoFields = ['firstName', 'firstNameAr', 'tax', 'CustomerType', 'CompanyOwner'];
    const addressFields = ['buildingNumber', 'street', 'country', 'city'];
    const contactFields = ['ContactName', 'EmailAddress', 'MobileNumber', 'JobTitle', 'Landline', 'PrefferedLanguage'];
    const salesFields = ['SalesOrgOption', 'DistributionChannelOption', 'DivisionOption'];
    const identityFields = ['goldenRecordCode', 'id'];
    
    if (identityFields.includes(field)) return 'Identity';
    if (basicInfoFields.includes(field)) return 'Other';
    if (addressFields.includes(field)) return 'Address';
    if (contactFields.includes(field)) return 'Contact';
    if (salesFields.includes(field)) return 'Sales & Compliance';
    
    return 'Other';
  }

  private normalizeSource(src: any): SourceSys {
    const s = String(src || '').toLowerCase();
    
    if (s === 'varies') return 'Data Steward';
    if (s.includes('master builder')) return 'Data Steward';
    if (s.includes('byd') || s.includes('by design')) return 'SAP ByD';
    if (s.includes('s/4') || s.includes('s4') || (s.includes('sap') && !s.includes('byd'))) return 'SAP S/4HANA';
    if (s.includes('oracle') || s.includes('forms') || s.includes('ebs')) return 'Oracle Forms';
    if (s.includes('steward') || s.includes('user') || s.includes('data entry')) return 'Data Steward';
    
    return 'Data Steward';
  }

  private async buildFromRecord(record: any): Promise<void> {
    console.log('=== BUILDING DATA LINEAGE FROM REAL DATA ===');
    console.log('Record:', record);
    
    this.currentRecord = record;
    this.currentRequestId = record?.id || record?.requestId;
    this.processedUpdateFields.clear();

    // Load linked records if needed
    if ((record?.isMaster === 1 || record?.originalRequestType === 'duplicate') && record?.tax) {
      await this.loadLinkedRecords(record.tax);
    }

    // Set basic info
    this.customerName = record?.firstName || record?.name || 'Unknown Customer';
    this.goldenCode = record?.goldenRecordCode || record?.goldenCode || null;
    this.recordType = 'Customer';
    this.country = record?.country || null;
    this.status = (record?.companyStatus === 'Active' ? 'Active' : 
                  record?.companyStatus === 'Blocked' ? 'Blocked' : 'Unknown') as any;

    this.lineageFields = [];
    this.fieldOriginalSources.clear();

    if (!this.currentRequestId) {
      console.warn('No request ID found, showing current state only');
      this.buildAllFieldsFromCurrentState(record);
      return;
    }

    try {
      console.log('Fetching workflow history for:', this.currentRequestId);
      const history = await firstValueFrom(
        this.http.get<WorkflowHistoryEntry[]>(`${this.apiBase}/requests/${this.currentRequestId}/history`)
      );

      console.log('Workflow history received:', history);

      if (history && history.length > 0) {
        const sortedHistory = [...history].sort((a, b) => 
          new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
        );
        
        this.processWorkflowHistory(sortedHistory, record);
      } else {
        // No history, show current state
        this.buildAllFieldsFromCurrentState(record);
      }
      
      // Build contacts and documents views
      this.buildContactsViewFromHistory(history || [], record);
      this.buildDocumentsViewFromHistory(history || [], record);

      // Sort by date (most recent first)
      this.lineageFields.sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());

      // Update user display names after building all data
      await this.updateUserDisplayNames();

    } catch (error) {
      console.error('Error fetching workflow history:', error);
      this.buildAllFieldsFromCurrentState(record);
      // Update user display names even for error case
      await this.updateUserDisplayNames();
    }
  }

  private async loadLinkedRecords(taxNumber: string): Promise<void> {
    try {
      console.log('Loading linked records for tax:', taxNumber);
      
      try {
        const response = await firstValueFrom(
          this.http.get<any>(`${this.apiBase}/duplicates/by-tax/${taxNumber}`)
        );
        
        if (response?.records) {
          this.linkedRecords = response.records;
        } else if (Array.isArray(response)) {
          this.linkedRecords = response;
        }
      } catch (e) {
        console.log('First endpoint failed, trying alternative...');
        
        const response = await firstValueFrom(
          this.http.get<any[]>(`${this.apiBase}/requests?tax=${taxNumber}`)
        );
        
        if (Array.isArray(response)) {
          this.linkedRecords = response.filter(r => r.id !== this.currentRequestId);
        }
      }
      
      console.log('Loaded linked records:', this.linkedRecords);
      
    } catch (error) {
      console.error('Error loading linked records:', error);
      this.linkedRecords = [];
    }
  }

  private processWorkflowHistory(history: WorkflowHistoryEntry[], currentRecord: any): void {
    console.log('=== PROCESSING WORKFLOW HISTORY ===');
    console.log('Total history entries:', history.length);
    
    this.workflowHistory = history;
    
    const fieldChangeTracker = new Map<string, any>();
    
    history.forEach((entry, index) => {
      console.log(`Processing entry ${index + 1}/${history.length}:`, entry.action, entry);
      
      const when = this.formatDate(entry.performedAt);
      const originalUser = entry.performedBy || 'system';
      const displayUser = this.getUserDisplayName(originalUser);
      const sourceSystem = this.getSourceSystemFromPayload(entry, currentRecord);
      const source = this.normalizeSource(sourceSystem);
      
      switch (entry.action) {
        case 'CREATE':
        case 'MASTER_BUILT':
        case 'IMPORTED_TO_QUARANTINE':
        case 'DUPLICATE_DETECTED':
          this.processCreateAction(entry, when, originalUser, displayUser, source, fieldChangeTracker);
          break;
          
        // Support UPDATE action
        case 'UPDATE':
        case 'FIELD_UPDATE':
        case 'RESUBMIT':
        case 'MASTER_RESUBMITTED':
          this.processUpdateAction(entry, when, originalUser, displayUser, source, fieldChangeTracker);
          break;
          
        case 'MASTER_APPROVE':
        case 'MASTER_REJECT':
          console.log('Skipping review action for data lineage display');
          break;
          
        case 'COMPLIANCE_APPROVE':
        case 'COMPLIANCE_BLOCK':
          this.processComplianceAction(entry, when, displayUser, source);
          break;
          
        case 'GOLDEN_SUSPEND':
        case 'GOLDEN_RESTORE':
        case 'GOLDEN_SUPERSEDE':
          this.processGoldenAction(entry, when, displayUser, source);
          break;
          
        default:
          console.log('Unknown action:', entry.action);
      }
    });
  }

  private processCreateAction(entry: WorkflowHistoryEntry, when: string, originalUser: string, displayUser: string, source: SourceSys, tracker: Map<string, any>): void {
    console.log('Processing CREATE action with payload:', entry.payload);
    
    const originalSource = this.getSourceSystemFromPayload(entry, this.currentRecord);
    const isFromQuarantine = entry.payload?.originalRequestType === 'quarantine' || 
                        entry.payload?.requestType === 'quarantine';
    const isFromDuplicate = entry.payload?.originalRequestType === 'duplicate' || 
                       entry.payload?.requestType === 'duplicate';
    
    // Handle MASTER_BUILT action specially
    if (entry.action === 'MASTER_BUILT') {
      // Store built from records for later reference
      if (entry.payload?.builtFromRecords) {
        if (Array.isArray(entry.payload.builtFromRecords)) {
          this.builtFromRecords = entry.payload.builtFromRecords;
        } else if (typeof entry.payload.builtFromRecords === 'object') {
          this.builtFromRecords = Object.values(entry.payload.builtFromRecords)
            .filter((item: any) => item && typeof item === 'object' && item.id);
        }
      }
      
      // Process field selections
      if (entry.payload?.selectedFieldSources && entry.payload?.data) {
        const data = entry.payload.data;
        const selectedSources = entry.payload.selectedFieldSources;
        
        // Filter out unwanted fields
        const excludedFields = ['assignedTo', 'confidence', 'createdBy', 'isMaster', 'originalRequestType', 'requestType', 'sourceSystem', 'status'];
        
        Object.keys(data).forEach(fieldKey => {
          if (excludedFields.includes(fieldKey)) {
            return; // Skip excluded fields
          }
          
          if (data[fieldKey] !== null && data[fieldKey] !== undefined && data[fieldKey] !== '') {
            const fieldName = this.prettyFieldName(fieldKey);
            
            // Get the actual source for this field
            let fieldSource: SourceSys = 'Data Steward';
            const sourceId = selectedSources[fieldKey];
            
            if (sourceId === 'MANUAL_ENTRY' || sourceId === 'manual') {
              fieldSource = 'Data Steward';
            } else if (sourceId) {
              const sourceRecord = this.findSourceRecord(sourceId, entry.payload);
              if (sourceRecord?.sourceSystem) {
                fieldSource = this.normalizeSource(sourceRecord.sourceSystem);
              }
            }
            
            // Determine the user who provided this field
            let fieldUser = displayUser;
            if (sourceId && sourceId !== 'MANUAL_ENTRY') {
              fieldUser = 'Extracted Data';
            }
            
            this.fieldOriginalSources.set(fieldName, {
              source: fieldSource,
              value: data[fieldKey],
              when: when,
              by: fieldUser
            });
            
            this.lineageFields.push({
              section: this.fieldSection(fieldKey),
              field: fieldName,
              oldValue: null,
              newValue: this.format(data[fieldKey]),
              updatedBy: fieldUser,
              updatedDate: when,
              source: fieldSource,
              changeType: fieldUser === 'Extracted Data' ? 'Extracted' : 'Create',
              requestId: entry.requestId,
              step: 'Master Record Built',
              isOriginal: true
            });
            
            tracker.set(fieldName, data[fieldKey]);
          }
        });
      }
      return;
    }
    
    // Handle import/duplicate detection - تعديل مهم هنا
    if (entry.action === 'IMPORTED_TO_QUARANTINE' || entry.action === 'DUPLICATE_DETECTED') {
      if (this.currentRecord) {
        const fieldsToTrack = [
          'firstName', 'firstNameAr', 'tax', 'CustomerType', 'CompanyOwner',
          'buildingNumber', 'street', 'country', 'city',
          'ContactName', 'EmailAddress', 'MobileNumber', 'JobTitle', 'Landline', 'PrefferedLanguage',
          'SalesOrgOption', 'DistributionChannelOption', 'DivisionOption'
        ];
        
        fieldsToTrack.forEach(fieldKey => {
          const value = this.currentRecord[fieldKey];
          if (value !== null && value !== undefined && value !== '') {
            const fieldName = this.prettyFieldName(fieldKey);
            
            this.fieldOriginalSources.set(fieldName, {
              source: this.normalizeSource(entry.payload?.sourceSystem || originalSource),
              value: value,
              when: when,
              by: 'Extracted Data'
            });
            
            this.lineageFields.push({
              section: this.fieldSection(fieldKey),
              field: fieldName,
              oldValue: null,
              newValue: this.format(value),
              updatedBy: 'Extracted Data',
              updatedDate: when,
              source: this.normalizeSource(entry.payload?.sourceSystem || originalSource),
              changeType: 'Extracted', // ✅ تم التغيير من 'Create' إلى 'Extracted'
              requestId: entry.requestId,
              step: entry.action === 'IMPORTED_TO_QUARANTINE' ? 'Imported to Quarantine' : 'Duplicate Detected',
              isOriginal: true
            });
            
            tracker.set(fieldName, value);
          }
        });
      }
      return;
    }
    
    // Handle regular CREATE - تعديل مهم هنا
    if (entry.payload?.data) {
      const data = entry.payload.data;
      
      // Filter out unwanted fields
      const excludedFields = ['assignedTo', 'confidence', 'createdBy', 'isMaster', 'originalRequestType', 'requestType', 'sourceSystem', 'status'];
      
      Object.keys(data).forEach(fieldKey => {
        if (excludedFields.includes(fieldKey)) {
          return; // Skip excluded fields
        }
        
        if (data[fieldKey] !== null && data[fieldKey] !== undefined && data[fieldKey] !== '') {
          const fieldName = this.prettyFieldName(fieldKey);
          console.log(`🔧 CREATE: Processing field ${fieldName} = ${data[fieldKey]}`);
          
          let actualSource = source;
          if (isFromQuarantine || isFromDuplicate) {
            actualSource = this.normalizeSource(originalSource);
          }
          
          this.fieldOriginalSources.set(fieldName, {
            source: actualSource,
            value: data[fieldKey],
            when: when,
            by: displayUser
          });
          
          this.lineageFields.push({
            section: this.fieldSection(fieldKey),
            field: fieldName,
            oldValue: null,  // ✅ تم التغيير من this.format(data[fieldKey]) إلى null
            newValue: this.format(data[fieldKey]),
            updatedBy: displayUser,
            updatedDate: when,
            source: actualSource,
            changeType: 'Create',  // ✅ تم إضافة changeType صراحة
            requestId: entry.requestId,
            step: isFromQuarantine ? 'From Quarantine' : 
                  isFromDuplicate ? 'From Duplicate' : 
                  'Initial Creation',
            isOriginal: true
          });
          
          tracker.set(fieldName, data[fieldKey]);
        }
      });
    }
  }

  private processUpdateAction(entry: WorkflowHistoryEntry, when: string, originalUser: string, displayUser: string, source: SourceSys, tracker: Map<string, any>): void {
    console.log('Processing UPDATE action with payload:', entry.payload);
    
    // Process changes from payload
    if (entry.payload?.changes) {
      // If changes is an array (new database structure)
      if (Array.isArray(entry.payload.changes)) {
        entry.payload.changes.forEach((change: any) => {
          
          // Handle contacts specially
          if (change.field && change.field.startsWith('Contact:')) {
            const contactName = change.field.replace('Contact:', '').trim();
            
            // Parse old and new values
            const oldParts = change.oldValue ? change.oldValue.split(' | ') : [];
            const newParts = change.newValue ? change.newValue.split(' | ') : [];
            
            // Field order: Name | JobTitle | Email | Mobile | Landline | Language
            const fieldNames = ['Name', 'Job Title', 'Email', 'Mobile', 'Landline', 'Preferred Language'];
            
            if (!change.oldValue && change.newValue) {
              // New contact added
              this.lineageFields.push({
                section: 'Contact',
                field: `Contact: ${contactName}`,
                oldValue: null,
                newValue: change.newValue,
                updatedBy: displayUser,
                updatedDate: when,
                source: source,
                changeType: 'Create',
                requestId: entry.requestId,
                step: 'New Contact Added'
              });
            } else if (oldParts.length === newParts.length) {
              // Same contact but with field changes
              let changedFields = [];
              
              for (let i = 0; i < oldParts.length; i++) {
                if (oldParts[i] !== newParts[i]) {
                  const fieldName = fieldNames[i] || `Field ${i + 1}`;
                  changedFields.push({
                    field: fieldName,
                    from: oldParts[i] || '(empty)',
                    to: newParts[i] || '(empty)'
                  });
                  
                  // Add separate row for each changed field
                  this.lineageFields.push({
                    section: 'Contact',
                    field: `${contactName} - ${fieldName}`,
                    oldValue: oldParts[i] || '—',
                    newValue: newParts[i] || '—',
                    updatedBy: displayUser,
                    updatedDate: when,
                    source: source,
                    changeType: 'Update',
                    requestId: entry.requestId,
                    step: 'Contact Field Update'
                  });
                }
              }
              
              // If no field changes, add row as is
              if (changedFields.length === 0) {
                this.lineageFields.push({
                  section: 'Contact',
                  field: `Contact: ${contactName}`,
                  oldValue: change.oldValue,
                  newValue: change.newValue,
                  updatedBy: displayUser,
                  updatedDate: when,
                  source: source,
                  changeType: 'Update',
                  requestId: entry.requestId,
                  step: 'Contact Update'
                });
              }
            } else {
              // Complete contact change
              this.lineageFields.push({
                section: 'Contact',
                field: `Contact: ${contactName}`,
                oldValue: change.oldValue || '—',
                newValue: change.newValue || '—',
                updatedBy: displayUser,
                updatedDate: when,
                source: source,
                changeType: 'Update',
                requestId: entry.requestId,
                step: 'Contact Update'
              });
            }
            
          } else if (change.field && change.field.startsWith('Document:')) {
            // Handle documents
            const docName = change.field.replace('Document:', '').trim();
            
            this.lineageFields.push({
              section: 'Documents',
              field: docName,
              oldValue: change.oldValue || '—',
              newValue: change.newValue || '—',
              updatedBy: displayUser,
              updatedDate: when,
              source: source,
              changeType: !change.oldValue && change.newValue ? 'Create' :
                         change.oldValue && !change.newValue ? 'Delete' :
                         'Update',
              requestId: entry.requestId,
              step: 'Document Update'
            });
            
          } else {
            // Handle regular fields
            const fieldName = this.prettyFieldName(change.field);
            
            // Determine if this is a Create or Update based on oldValue
            const oldVal = change.oldValue || change.from;
            const newVal = change.newValue || change.to;
            const isCreate = (!oldVal || oldVal === '') && newVal && newVal !== '';
            
            this.lineageFields.push({
              section: this.fieldSection(change.field),
              field: fieldName,
              oldValue: this.format(oldVal),
              newValue: this.format(newVal),
              updatedBy: displayUser,
              updatedDate: when,
              source: source,
              changeType: isCreate ? 'Create' : 'Update',
              requestId: entry.requestId,
              step: isCreate ? 'Field Creation' : 'Field Update'
            });
          }
          
          // Update tracker
          tracker.set(change.field, change.newValue || change.to);
        });
      } 
      // If changes is an object (old structure)
      else if (typeof entry.payload.changes === 'object') {
        // Filter out unwanted fields
        const excludedFields = ['assignedTo', 'confidence', 'createdBy', 'isMaster', 'originalRequestType', 'requestType', 'sourceSystem', 'status'];
        
        Object.keys(entry.payload.changes).forEach(fieldKey => {
          if (excludedFields.includes(fieldKey)) {
            return; // Skip excluded fields
          }
          
          const change = entry.payload.changes[fieldKey];
          const fieldName = change.fieldName || this.prettyFieldName(fieldKey);
          
          this.lineageFields.push({
            section: this.fieldSection(fieldKey),
            field: fieldName,
            oldValue: this.format(change.from || change.oldValue),
            newValue: this.format(change.to || change.newValue),
            updatedBy: displayUser,
            updatedDate: when,
            source: source,
            changeType: 'Update',
            requestId: entry.requestId,
            step: 'Field Update'
          });
          
          // Update tracker
          tracker.set(fieldName, change.to || change.newValue);
        });
      }
    } else if (this.historyKind === 'document') {
      const docName = this.historyField.includes(':') ? this.historyField.split(':')[1].trim() : this.historyField.replace('Document', '').trim();
      const items: any[] = [];
      // Build from workflow history
      this.workflowHistory.forEach(entry => {
        if (entry.payload?.changes && Array.isArray(entry.payload.changes)) {
          entry.payload.changes.forEach((change: any) => {
            if (change.field === `Document: ${docName}`) {
              const action = change.changeType || (!change.oldValue ? 'Create' : change.newValue ? 'Update' : 'Delete');
              items.push({
                when: this.formatDate(entry.performedAt),
                from: change.oldValue || null,
                to: change.newValue || null,
                by: this.getUserDisplayName(entry.performedBy),
                source: 'Data Steward',
                action: action
              });
            }
          });
        }
      });

      if (items.length === 0) {
        // Fallback: use current state from documentsView
        const d = this.documentsView?.items?.find(x => x.name === docName);
        items.push({
          when: 'Current State',
          from: null,
          to: d?.name || docName,
          by: d?.by || this.getUserDisplayName('data_entry'),
          source: d?.source || 'Data Steward',
          action: 'Current'
        });
      }

      this.historyItems = items;
      // Ensure role/Name formatting for any raw usernames in history
      this.updateUserDisplayNames();
    }
  }

  private findImportEntry(): WorkflowHistoryEntry | null {
    if (this.workflowHistory) {
      return this.workflowHistory.find(entry => 
        entry.action === 'IMPORTED_TO_QUARANTINE' || 
        entry.action === 'DUPLICATE_DETECTED' ||
        entry.action === 'CREATE'
      ) || null;
    }
    return null;
  }

  private processComplianceAction(entry: WorkflowHistoryEntry, when: string, user: string, source: SourceSys): void {
    if (entry.payload?.goldenCode || entry.payload?.goldenRecordCode) {
      this.lineageFields.push({
        section: 'Identity',
        field: 'Golden Record Code',
        oldValue: null,
        newValue: entry.payload.goldenCode || entry.payload.goldenRecordCode,
        updatedBy: 'Generated by MDM',
        updatedDate: when,
        source: source,
        changeType: 'Create',
        requestId: entry.requestId,
        step: 'Golden Record Creation'
      });
    }
  }

  private processGoldenAction(entry: WorkflowHistoryEntry, when: string, user: string, source: SourceSys): void {
    let field = 'Golden Record Status';
    
    switch (entry.action) {
      case 'GOLDEN_SUSPEND':
        this.lineageFields.push({
          section: 'Sales & Compliance',
          field: field,
          oldValue: 'Active',
          newValue: 'Under Review',
          updatedBy: user,
          updatedDate: when,
          source: source,
          changeType: 'Update',
          requestId: entry.requestId,
          step: 'Golden Record Suspension'
        });
        break;
        
      case 'GOLDEN_RESTORE':
        this.lineageFields.push({
          section: 'Sales & Compliance',
          field: field,
          oldValue: 'Under Review',
          newValue: 'Active',
          updatedBy: user,
          updatedDate: when,
          source: source,
          changeType: 'Update',
          requestId: entry.requestId,
          step: 'Golden Record Restoration'
        });
        break;
    }
  }

  private addCurrentStateFields(record: any): void {
    console.log('Adding current state fields that don\'t have history');
    
    const existingFields = new Set<string>();
    this.lineageFields.forEach(entry => {
      existingFields.add(entry.field);
    });
    
    console.log('Existing fields in lineage:', Array.from(existingFields));
    
    const allFields: Record<string, any> = {
      firstName: record?.firstName || record?.name,
      firstNameAr: record?.firstNameAr || record?.nameAr,
      tax: record?.tax || record?.taxNumber,
      CustomerType: record?.CustomerType || record?.recordType,
      CompanyOwner: record?.CompanyOwner || record?.companyOwnerName,
      buildingNumber: record?.buildingNumber || record?.building,
      street: record?.street || record?.streetName,
      city: record?.city,
      country: record?.country,
      ContactName: record?.ContactName || record?.contactName,
      EmailAddress: record?.EmailAddress || record?.email,
      MobileNumber: record?.MobileNumber || record?.phone || record?.mobileNumber,
      JobTitle: record?.JobTitle || record?.jobTitle,
      Landline: record?.Landline || record?.landline,
      PrefferedLanguage: record?.PrefferedLanguage || record?.preferredLanguage,
      SalesOrgOption: record?.SalesOrgOption || record?.salesOrg,
      DistributionChannelOption: record?.DistributionChannelOption || record?.distributionChannel,
      DivisionOption: record?.DivisionOption || record?.division
    };

    Object.keys(allFields).forEach(key => {
      const fieldName = this.prettyFieldName(key);
      const current = this.format(allFields[key]);
      
      if (current && !existingFields.has(fieldName)) {
        const originalSource = record?.sourceSystem || 'Data Steward';
        
        console.log(`Adding missing field: ${fieldName} = ${current}`);
        
        this.lineageFields.push({
          section: this.fieldSection(key),
          field: fieldName,
          oldValue: current,
          newValue: current,
          updatedBy: this.getUserDisplayName(record?.createdBy || 'system'),
          updatedDate: this.formatDate(record?.createdAt || new Date().toISOString()),
          source: this.normalizeSource(originalSource),
          changeType: undefined
        });
      }
    });

    // Add golden code if exists
    if (record?.goldenRecordCode && !existingFields.has('Golden Record Code')) {
      this.lineageFields.push({
        section: 'Identity',
        field: 'Golden Record Code',
        oldValue: null,
        newValue: record.goldenRecordCode,
        updatedBy: 'Generated by MDM',
        updatedDate: this.formatDate(record?.updatedAt || record?.createdAt || new Date().toISOString()),
        source: 'Data Steward',
        changeType: 'Create'
      });
    }
  }

  private buildAllFieldsFromCurrentState(record: any): void {
    console.log('🔧 Building all fields from current state (fallback) - FIXED VERSION');
    
    // Only build current state if we don't have workflow history
    if (this.lineageFields.length > 0) {
      console.log('🔧 Skipping buildAllFieldsFromCurrentState - workflow history exists');
      return;
    }
    
    const flatNow: Record<string, any> = {
      firstName: record?.firstName || record?.name,
      firstNameAr: record?.firstNameAr || record?.nameAr,
      tax: record?.tax || record?.taxNumber,
      CustomerType: record?.CustomerType || record?.recordType,
      CompanyOwner: record?.CompanyOwner || record?.companyOwnerName,
      buildingNumber: record?.buildingNumber || record?.building,
      street: record?.street || record?.streetName,
      city: record?.city,
      country: record?.country,
      ContactName: record?.ContactName || record?.contactName,
      EmailAddress: record?.EmailAddress || record?.email,
      MobileNumber: record?.MobileNumber || record?.phone || record?.mobileNumber,
      JobTitle: record?.JobTitle || record?.jobTitle,
      Landline: record?.Landline || record?.landline,
      PrefferedLanguage: record?.PrefferedLanguage || record?.preferredLanguage,
      SalesOrgOption: record?.SalesOrgOption || record?.salesOrg,
      DistributionChannelOption: record?.DistributionChannelOption || record?.distributionChannel,
      DivisionOption: record?.DivisionOption || record?.division
    };

    console.log('Current state fields:', flatNow);

    Object.keys(flatNow).forEach(key => {
      const section = this.fieldSection(key);
      const field = this.prettyFieldName(key);
      const current = this.format(flatNow[key]);
      
      if (current || ['firstName', 'tax', 'CustomerType', 'country', 'city'].includes(key)) {
        const originalSource = record?.sourceSystem || 'Data Steward';
        
        console.log(`🔧 Adding current state for field: ${field}, value: ${current}`);
        this.addRow({
          section,
          field,
          oldValue: null,
          newValue: current,
          updatedBy: this.getUserDisplayName(record?.createdBy || 'system'),
          updatedDate: this.formatDate(record?.updatedAt || record?.createdAt || new Date().toISOString()),
          source: this.normalizeSource(originalSource),
          changeType: 'Create'
        });
      }
    });

    // Add golden code if exists
    if (record?.goldenRecordCode) {
      this.addRow({
        section: 'Identity',
        field: 'Golden Record Code',
        oldValue: null,
        newValue: record.goldenRecordCode,
        updatedBy: 'Generated by MDM',
        updatedDate: this.formatDate(record?.updatedAt || record?.createdAt || new Date().toISOString()),
        source: 'Data Steward',
        changeType: 'Create'
      });
    }

    // Update user display names after building current state
    this.updateUserDisplayNames();
  }

  private buildContactsViewFromHistory(history: WorkflowHistoryEntry[], currentRecord: any): void {
    const items: ContactItem[] = [];
    const stats = { changed: 0, added: 0, removed: 0 };
    const processedContacts = new Map<string, ContactItem>();
    const contactHistory = new Map<string, any[]>();

    // Process history entries to track contact changes
    history.forEach(entry => {
      if (entry.payload?.changes && Array.isArray(entry.payload.changes)) {
        entry.payload.changes.forEach((change: any) => {
          if (change.field && change.field.startsWith('Contact:')) {
            const contactName = change.field.replace('Contact:', '').trim();
            
            if (!contactHistory.has(contactName)) {
              contactHistory.set(contactName, []);
            }
            
            contactHistory.get(contactName)!.push({
              oldValue: change.oldValue,
              newValue: change.newValue,
              when: entry.performedAt,
              by: entry.performedBy,
              action: entry.action
            });
          }
        });
      }
    });

    // Get current contacts from database
    if (this.currentRequestId) {
      firstValueFrom(
        this.http.get<any>(`${this.apiBase}/requests/${this.currentRequestId}`)
      ).then(response => {
        const currentContacts = response?.contacts || [];
        
        // Process each current contact
        currentContacts.forEach((contact: any, index: number) => {
          const contactKey = `${contact.name}_${contact.email}`;
          const contactBy = this.getUserDisplayName(contact.addedBy || 'data_entry');
          
          // Check if this contact has history
          const historyEntries = contactHistory.get(contact.name) || [];
          let changes: ContactFieldChange[] = [];
          
          // Process history to find changes
          if (historyEntries.length > 0) {
            const latestEntry = historyEntries[historyEntries.length - 1];
            if (latestEntry.oldValue && latestEntry.newValue) {
              const oldParts = latestEntry.oldValue.split(' | ');
              const newParts = latestEntry.newValue.split(' | ');
              const fieldNames = ['Name', 'Job Title', 'Email', 'Mobile', 'Landline', 'Preferred Language'];
              
              for (let i = 0; i < Math.min(oldParts.length, newParts.length); i++) {
                if (oldParts[i] !== newParts[i]) {
                  changes.push({
                    field: fieldNames[i] || `Field ${i + 1}`,
                    oldValue: oldParts[i] || null,
                    newValue: newParts[i] || null
                  });
                }
              }
            }
          }
          
          // Fallback name when extracted data misses explicit name
          let derivedName: string | undefined = contact.name;
          if (!derivedName && historyEntries.length > 0) {
            const latestEntry = historyEntries[historyEntries.length - 1];
            if (latestEntry?.newValue) {
              const parts = String(latestEntry.newValue).split(' | ');
              derivedName = parts[0] || undefined;
            }
          }
          if (!derivedName && contact.email) {
            const local = String(contact.email).split('@')[0] || '';
            derivedName = local
              .replace(/[._-]+/g, ' ')
              .split(' ')
              .filter(Boolean)
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ') || undefined;
          }

          const item: ContactItem = {
            name: derivedName || contact.name,
            jobTitle: contact.jobTitle,
            email: contact.email,
            mobile: contact.mobile,
            landline: contact.landline,
            preferredLanguage: contact.preferredLanguage,
            title: (derivedName || contact.name || contact.email || 'Contact'),
            now: `${contact.name || ''} | ${contact.jobTitle || ''} | ${contact.email || ''} | ${contact.mobile || ''}`,
            delta: changes.length > 0 ? 'changed' : (index === 0 ? 'added' : 'added'),
            when: this.formatDate(contact.addedWhen || currentRecord.createdAt || new Date().toISOString()),
            by: contactBy,
            source: 'Data Steward', 
            histKey: contactKey,
            changes: changes
          };
          
          processedContacts.set(contactKey, item);
        });
        
        // Convert to array and update stats
        items.push(...Array.from(processedContacts.values()));
        
        // Count final stats
        items.forEach(item => {
          if (item.delta === 'added') stats.added++;
          if (item.delta === 'changed') stats.changed++;
          if (item.delta === 'removed') stats.removed++;
        });
        
        this.contactsView = { items, stats };
        // Update names to role/Name after async build
        this.updateUserDisplayNames();
      }).catch(error => {
        console.error('Error fetching contacts:', error);
        this.contactsView = { items, stats };
      });
    }
  }

  private buildDocumentsViewFromHistory(history: WorkflowHistoryEntry[], currentRecord: any): void {
    const items: DocumentItem[] = [];
    const stats = { changed: 0, added: 0, removed: 0 };
    const processedDocuments = new Map<string, DocumentItem>();
    const documentHistory = new Map<string, any[]>();

    // Process history entries to track document changes
    history.forEach(entry => {
      if (entry.payload?.changes && Array.isArray(entry.payload.changes)) {
        entry.payload.changes.forEach((change: any) => {
          if (change.field && change.field.startsWith('Document:')) {
            const docName = change.field.replace('Document:', '').trim();
            
            if (!documentHistory.has(docName)) {
              documentHistory.set(docName, []);
            }
            
            documentHistory.get(docName)!.push({
              oldValue: change.oldValue,
              newValue: change.newValue,
              changeType: change.changeType,
              when: entry.performedAt,
              by: entry.performedBy,
              action: entry.action,
              documentId: change.documentId,
              oldDescription: change.oldDescription,
              newDescription: change.newDescription,
              oldSize: change.oldSize,
              newSize: change.newSize
            });
          }
        });
      }
    });

    // Get current documents from database
    if (this.currentRequestId) {
      firstValueFrom(
        this.http.get<any>(`${this.apiBase}/requests/${this.currentRequestId}`)
      ).then(response => {
        const currentDocuments = response?.documents || [];
        
        // Process each current document
        currentDocuments.forEach((doc: any) => {
          const docKey = `${doc.name}_${doc.type}`;
          const docBy = this.getUserDisplayName(doc.uploadedBy || 'data_entry');
          
          // Check if this document has history
          const historyEntries = documentHistory.get(doc.name) || [];
          let delta: DeltaKind = 'added';
          let when = this.formatDate(doc.uploadedAt || currentRecord.createdAt || new Date().toISOString());
          let by = docBy;
          
          // Process history to determine document status
          if (historyEntries.length > 0) {
            const latestEntry = historyEntries[historyEntries.length - 1];
            
            if (latestEntry.changeType === 'Create') {
              delta = 'added';
              when = this.formatDate(latestEntry.when);
              by = this.getUserDisplayName(latestEntry.by);
            } else if (latestEntry.changeType === 'Update') {
              delta = 'changed';
              when = this.formatDate(latestEntry.when);
              by = this.getUserDisplayName(latestEntry.by);
            } else if (latestEntry.changeType === 'Delete') {
              // Document was deleted, but we still show it as removed
              delta = 'removed';
              when = this.formatDate(latestEntry.when);
              by = this.getUserDisplayName(latestEntry.by);
            }
          }
          
          // Fix the URL construction
          const item: DocumentItem = {
            type: doc.type,
            name: doc.name,
            description: doc.description,
            mime: doc.mime,
            size: doc.size,
            uploadedAt: doc.uploadedAt,
            title: [doc.type, doc.name].filter(Boolean).join(' · '),
            now: doc.name,
            delta: delta,
            when: when,
            by: by,
            source: doc.source || 'Data Steward',
            histKey: docKey,
            url: doc.contentBase64 ? this.createProperDataUrl(doc) : undefined
          };
          
          processedDocuments.set(docKey, item);
        });
        
        // Add removed documents from history
        documentHistory.forEach((historyEntries, docName) => {
          const latestEntry = historyEntries[historyEntries.length - 1];
          if (latestEntry.changeType === 'Delete') {
            const docKey = `${docName}_deleted`;
            const item: DocumentItem = {
              type: 'Unknown',
              name: docName,
              description: 'Document was removed',
              title: `Removed: ${docName}`,
              now: docName,
              delta: 'removed',
              when: this.formatDate(latestEntry.when),
              by: this.getUserDisplayName(latestEntry.by),
              source: 'Data Steward',
              histKey: docKey
            };
            processedDocuments.set(docKey, item);
          }
        });
        
        // Convert to array and update stats
        items.push(...Array.from(processedDocuments.values()));
        
        // Count final stats
        items.forEach(item => {
          if (item.delta === 'added') stats.added++;
          if (item.delta === 'changed') stats.changed++;
          if (item.delta === 'removed') stats.removed++;
        });
        
        this.documentsView = { items, stats };
        // Ensure role/Name formatting is applied for documents as well
        this.updateUserDisplayNames();
      }).catch(error => {
        console.error('Error fetching documents:', error);
        this.documentsView = { items, stats };
      });
    } else {
      // Fallback for when no request ID is available
      const currentDocuments = currentRecord?.documents || [];
      
      currentDocuments.forEach((doc: any) => {
        items.push({
          type: doc.type,
          name: doc.name,
          description: doc.description,
          mime: doc.mime,
          size: doc.size,
          uploadedAt: doc.uploadedAt,
          title: [doc.type, doc.name].filter(Boolean).join(' · '),
          now: doc.name,
          delta: 'added',
          when: this.formatDate(doc.uploadedAt || new Date().toISOString()),
          by: this.getUserDisplayName(doc.uploadedBy || 'data_entry'),
          source: 'Data Steward',
          url: doc.contentBase64 ? `data:${doc.mime};base64,${doc.contentBase64}` : undefined
        });
        stats.added++;
      });

      this.documentsView = { items, stats };
    }
  }

  private buildIssuesFromRecord(record: any): void {
    this.issues = [];
    
    if (!record?.firstNameAr) {
      this.issues.push({
        id: 'ISS-001',
        field: 'Company Name (Arabic)',
        description: 'Arabic company name is missing.',
        severity: 'medium',
        detectedOn: this.formatDate(new Date().toISOString()),
        source: 'DQ Rule',
        status: 'Open'
      });
    }
  }

  async ngOnInit(): Promise<void> {
    console.log('🚀 Data lineage component initialized - CLEARING OLD DATA');
    this.isLoading = true;

    // Clear any existing data to prevent duplicates
    this.lineageFields = [];
    this.workflowHistory = [];
    this.contactsView = { items: [], stats: { changed: 0, added: 0, removed: 0 } };
    this.documentsView = { items: [], stats: { changed: 0, added: 0, removed: 0 } };
    
    // Clear cache
    this._cachedGrouped = null;
    this._lastLineageFieldsLength = 0;

    try {
      const state = (window as any).history?.state;
      const recordFromState = state?.record;

      console.log('=== DATA LINEAGE COMPONENT INITIALIZED ===');
      console.log('State from navigation:', state);
      console.log('Record from state:', recordFromState);

      if (recordFromState) {
        await this.buildFromRecord(recordFromState);
        this.buildIssuesFromRecord(recordFromState);
      } else {
        const urlSegments = this.router.url.split('/');
        const possibleId = urlSegments[urlSegments.length - 1];
        
        if (possibleId && possibleId !== 'data-lineage') {
          console.log('Trying to fetch record from API with ID:', possibleId);
          
          try {
            const record = await firstValueFrom(
              this.http.get<any>(`${this.apiBase}/requests/${possibleId}`)
            );
            
            console.log('Record fetched from API:', record);
            await this.buildFromRecord(record);
            this.buildIssuesFromRecord(record);
          } catch (error) {
            console.error('Failed to fetch record from API:', error);
            await this.buildDemoData();
          }
        } else {
          console.warn('No record found in navigation state and no ID in URL, using demo data');
          await this.buildDemoData();
        }
      }

    } catch (error) {
      console.error('Error in ngOnInit:', error);
      await this.buildDemoData();
    } finally {
      // Update user display names with full names from database
      await this.updateUserDisplayNames();
      this.isLoading = false;
    }
  }

  private async buildDemoData(): Promise<void> {
    console.log('Building demo data');
    
    this.customerName = 'Demo Company';
    this.status = 'Active';
    
    this.lineageFields = [
      {
        section: 'Identity',
        field: 'Company Name',
        oldValue: 'Demo Company',
        newValue: 'Demo Company',
        updatedBy: 'System',
        updatedDate: this.formatDate(new Date().toISOString()),
        source: 'Data Steward',
        changeType: undefined
      }
    ];

    // Update user display names for demo data as well
    await this.updateUserDisplayNames();
  }

  // UI Helper Methods
  statusChipClass() {
    return { 
      'chip': true, 
      'chip--ok': this.status === 'Active', 
      'chip--blocked': this.status === 'Blocked' 
    };
  }

  isChanged = (r: LineageRow): boolean => {
    // Don't consider "Current" state as a change
    if (r.changeType === 'Current') {
      return false;
    }
    
    // Consider "Create" as a change (even though oldValue might be null)
    if (r.changeType === 'Create') {
      return true;
    }
    
    // Only consider it changed if the values are actually different
    return (r.oldValue ?? '') !== (r.newValue ?? '');
  };

  // تعديل مهم في getActionType
  getActionType = (ev: any): string => {
    // Check for Extracted type first
    if (ev.changeType === 'Extracted') {
      return 'Extracted';
    }
    
    // If explicitly marked as Create, keep it as Create  
    if (ev.changeType === 'Create') {
      return 'Created';
    }
    
    // If explicitly marked as Update
    if (ev.changeType === 'Update') {
      return 'Updated';
    }
    
    // If explicitly marked as Current state
    if (ev.changeType === 'Current') {
      return 'Current State';
    }
    
    // If oldValue is null/empty and newValue exists, it's a Create
    if ((!ev.oldValue || ev.oldValue === '') && ev.newValue && ev.newValue !== '') {
      return 'Created';
    }
    
    // If oldValue exists and newValue is null/empty, it's a Delete
    if (ev.oldValue && ev.oldValue !== '' && (!ev.newValue || ev.newValue === '')) {
      return 'Deleted';
    }
    
    // If both values exist and are different, it's an Update
    if (this.isChanged(ev)) {
      return ev.changeType || 'Updated';
    }
    
    // If values are the same, it's Current State
    return 'Current State';
  };

  countChanged(rows: LineageRow[]) { 
    return rows.filter(r => this.isChanged(r)).length; 
  }

  trackByField = (_: number, item: LineageRow | { section: string; rows: LineageRow[]; _open?: boolean }) =>
    (item as any).field ?? (item as any).section;

  trackBySection = (_: number, g: { section: string; rows: LineageRow[]; _open?: boolean }) => g.section;

  // تعديل مهم في changeBadgeClass
  changeBadgeClass(r: LineageRow) {
    const base = 'dl-badge';
    const actionType = this.getActionType(r);
    
    if (actionType === 'Current State') {
      return { [base]: true, [base + '--same']: true };
    }
    
    return {
      [base]: true,
      [base + '--update']: actionType === 'Updated',
      [base + '--create']: actionType === 'Created',
      [base + '--extracted']: actionType === 'Extracted', // ✅ أضف class للـ extracted
      [base + '--delete']: actionType === 'Deleted',
      [base + '--merge']: actionType === 'Merge',
      [base + '--current']: actionType === 'Current State'
    };
  }
  
  changeTypeLabel(r: LineageRow) {
    return this.getActionType(r);
  }

  private _cachedGrouped: any[] | null = null;
  private _lastLineageFieldsLength = 0;
  private _lastOnlyChanges = false;

  get grouped() {
    // Use cache if data hasn't changed
    if (this._cachedGrouped && 
        this._lastLineageFieldsLength === this.lineageFields.length && 
        this._lastOnlyChanges === this.onlyChanges) {
      return this._cachedGrouped;
    }
    
    const allRows = this.onlyChanges 
      ? this.lineageFields.filter(r => this.isChanged(r))
      : this.lineageFields;
    
    const lastPerField = new Map<string, LineageRow>();
    
    for (const row of allRows) {
      const existing = lastPerField.get(row.field);
      
      if (!existing) {
        lastPerField.set(row.field, row);
      } else {
        // Priority Rules - FIXED ORDER:
        
        // 1. Always prefer UPDATE over EXTRACTED or CREATE if it's more recent
        if (row.changeType === 'Update' && existing.changeType !== 'Update') {
          lastPerField.set(row.field, row);
        }
        // 2. If both are updates, take the most recent one
        else if (row.changeType === 'Update' && existing.changeType === 'Update') {
          if (new Date(row.updatedDate) > new Date(existing.updatedDate)) {
            lastPerField.set(row.field, row);
          }
        }
        // 3. For non-updates, prefer the one with actual changes
        else if (row.changeType !== 'Update') {
          // If the new row has changes and existing doesn't, take the new one
          if (this.isChanged(row) && !this.isChanged(existing)) {
            lastPerField.set(row.field, row);
          }
          // If both have same change status, take the most recent
          else if (this.isChanged(row) === this.isChanged(existing)) {
            if (new Date(row.updatedDate) > new Date(existing.updatedDate)) {
              lastPerField.set(row.field, row);
            }
          }
          // Special case: CREATE has priority over EXTRACTED for initial data
          else if (row.changeType === 'Create' && existing.changeType === 'Extracted') {
            lastPerField.set(row.field, row);
          }
        }
      }
    }

    const rows = Array.from(lastPerField.values());

    const groups: { section: LineageRow['section']; rows: LineageRow[]; _open?: boolean }[] = [];
    for (const row of rows) {
      let g = groups.find(x => x.section === row.section);
      if (!g) { g = { section: row.section, rows: [], _open: true }; groups.push(g); }
      g.rows.push(row);
    }
    
    groups.forEach(g => g.rows.sort((a, b) => a.field.localeCompare(b.field)));
    
    // عرض كل الأقسام ما عدا Contact و Documents (لأنهم ليهم sections خاصة)
    const result = groups.filter(g => g.section !== 'Contact' && g.section !== 'Documents');
    
    // Cache the result
    this._cachedGrouped = result;
    this._lastLineageFieldsLength = this.lineageFields.length;
    this._lastOnlyChanges = this.onlyChanges;
    
    return result;
  }

  openHistory(fieldName: string, kind: 'scalar'|'contact'|'document' = 'scalar') {
    this.historyField = fieldName;
    this.historyKind = kind;

    if (kind === 'contact') {
      const contactName = fieldName.includes(':') ? fieldName.split(':')[1].trim() : '';
      
      // Build history for contact
      const contactChanges: any[] = [];
      
      // Find all changes for this contact in workflow history
      this.workflowHistory.forEach(entry => {
        if (entry.payload?.changes && Array.isArray(entry.payload.changes)) {
          entry.payload.changes.forEach((change: any) => {
            if (change.field === `Contact: ${contactName}`) {
              const oldParts = change.oldValue ? change.oldValue.split(' | ') : [];
              const newParts = change.newValue ? change.newValue.split(' | ') : [];
              
              const changes: any = {};
              const fieldNames = ['Name', 'Job Title', 'Email', 'Mobile', 'Landline', 'Preferred Language'];
              
              for (let i = 0; i < fieldNames.length; i++) {
                changes[fieldNames[i]] = {
                  oldValue: oldParts[i] || null,
                  newValue: newParts[i] || null
                };
              }
              
              contactChanges.push({
                when: this.formatDate(entry.performedAt),
                from: change.oldValue,
                to: change.newValue,
                by: this.getUserDisplayName(entry.performedBy),
                source: 'Data Steward',
                action: !change.oldValue ? 'Create' : 'Update',
                changes: changes
              });
            }
          });
        }
      });
      
      // If no changes found, create a fallback entry showing current state
      if (contactChanges.length === 0) {
        const currentContact = this.contactsView?.items?.find(c => c.name === contactName);
        if (currentContact) {
          contactChanges.push({
            when: 'Current State',
            from: null,
            to: `${currentContact.name} | ${currentContact.jobTitle || ''} | ${currentContact.email || ''} | ${currentContact.mobile || ''} | ${currentContact.landline || ''} | ${currentContact.preferredLanguage || ''}`,
            by: this.getUserDisplayName('data_entry'),
            source: 'Data Steward',
            action: 'Current',
            changes: {
              'Name': { oldValue: null, newValue: currentContact.name },
              'Job Title': { oldValue: null, newValue: currentContact.jobTitle },
              'Email': { oldValue: null, newValue: currentContact.email },
              'Mobile': { oldValue: null, newValue: currentContact.mobile },
              'Landline': { oldValue: null, newValue: currentContact.landline },
              'Preferred Language': { oldValue: null, newValue: currentContact.preferredLanguage }
            }
          });
        }
      }
      
      this.historyItems = contactChanges;
      this.showHistory = true;
      return;
    }

    if (kind === 'document') {
      const docName = fieldName.includes(':') ? fieldName.split(':')[1].trim() : fieldName;
      
      // Build history for document
      const documentChanges: any[] = [];
      
      // Find all changes for this document in workflow history
      this.workflowHistory.forEach(entry => {
        if (entry.payload?.changes && Array.isArray(entry.payload.changes)) {
          entry.payload.changes.forEach((change: any) => {
            if (change.field === `Document: ${docName}`) {
              const changes: any = {};
              
              // Add detailed change information
              if (change.oldDescription !== undefined && change.newDescription !== undefined) {
                changes['Description'] = {
                  oldValue: change.oldDescription,
                  newValue: change.newDescription
                };
              }
              
              if (change.oldSize !== undefined && change.newSize !== undefined) {
                changes['Size'] = {
                  oldValue: change.oldSize ? `${change.oldSize} bytes` : null,
                  newValue: change.newSize ? `${change.newSize} bytes` : null
                };
              }
              
              documentChanges.push({
                when: this.formatDate(entry.performedAt),
                from: change.oldValue,
                to: change.newValue,
                by: this.getUserDisplayName(entry.performedBy),
                source: 'Data Steward',
                action: change.changeType || (!change.oldValue ? 'Create' : 'Update'),
                changes: changes,
                documentId: change.documentId
              });
            }
          });
        }
      });
      
      // If no history found, show current document info
      if (documentChanges.length === 0) {
        const currentDoc = this.documentsView.items.find(d => d.name === docName);
        if (currentDoc) {
          documentChanges.push({
            when: 'Current State',
            from: null,
            to: `${currentDoc.name} (${currentDoc.type || 'Document'})`,
            by: this.getUserDisplayName('data_entry'),
            source: 'Data Steward',
            action: 'Current',
            changes: {
              'Document Name': { oldValue: null, newValue: currentDoc.name },
              'Document Type': { oldValue: null, newValue: currentDoc.type },
              'File Size': { oldValue: null, newValue: currentDoc.size ? this.formatFileSize(currentDoc.size) : 'Unknown' }
            }
          });
        } else {
          // If document not found, create basic entry
          documentChanges.push({
            when: 'Current State',
            from: null,
            to: docName,
            by: this.getUserDisplayName('data_entry'),
            source: 'Data Steward',
            action: 'Current',
            changes: {
              'Document Name': { oldValue: null, newValue: docName }
            }
          });
        }
      }
      
      this.historyItems = documentChanges;
      this.showHistory = true;
      return;
    }

    // Build history from workflow entries for accuracy
    const historyEntries: any[] = [];
    const fieldKey = this.getFieldKeyFromPrettyName(fieldName);
    
    // Track the original extracted value
    let originalExtractedValue: string | null = null;
    
    this.workflowHistory.forEach(entry => {
      // Check for IMPORTED_TO_QUARANTINE or DUPLICATE_DETECTED (these are EXTRACTED)
      if (entry.action === 'IMPORTED_TO_QUARANTINE' || entry.action === 'DUPLICATE_DETECTED') {
        // Find the original value from the first CREATE or from payload
        const firstCreateEntry = this.workflowHistory.find(e => e.action === 'CREATE');
        
        if (firstCreateEntry && firstCreateEntry.payload?.data && firstCreateEntry.payload.data[fieldKey]) {
          originalExtractedValue = this.format(firstCreateEntry.payload.data[fieldKey]);
          
          historyEntries.push({
            when: this.formatDate(entry.performedAt),
            from: null,
            to: null,
            value: originalExtractedValue, // This will be "Doha"
            by: 'Extracted Data',
            source: this.normalizeSource(entry.payload?.sourceSystem || 'Oracle Forms'),
            action: 'Extracted'
          });
        }
      }
      
      // Check for CREATE action (only if not extracted)
      if (entry.action === 'CREATE' && entry.payload?.data) {
        if (entry.payload.data[fieldKey] && !originalExtractedValue) {
          const initialValue = this.format(entry.payload.data[fieldKey]);
          
          historyEntries.push({
            when: this.formatDate(entry.performedAt),
            from: null,
            to: null,
            value: initialValue,
            by: this.getUserDisplayName(entry.performedBy),
            source: 'Data Steward',
            action: 'Created'
          });
        }
      }
      
      // Check for UPDATE actions
      if ((entry.action === 'UPDATE' || entry.action === 'FIELD_UPDATE' || 
           entry.action === 'RESUBMIT' || entry.action === 'MASTER_RESUBMITTED') && 
          entry.payload?.changes) {
        
        if (Array.isArray(entry.payload.changes)) {
          entry.payload.changes.forEach((change: any) => {
            // Check if this change is for our field
            if (change.field === fieldKey || this.prettyFieldName(change.field) === fieldName) {
              historyEntries.push({
                when: this.formatDate(entry.performedAt),
                from: this.format(change.oldValue || change.from),
                to: this.format(change.newValue || change.to),
                value: null,
                by: this.getUserDisplayName(entry.performedBy),
                source: 'Data Steward',
                action: 'Updated'
              });
            }
          });
        } else if (typeof entry.payload.changes === 'object') {
          // Handle object-based changes
          Object.keys(entry.payload.changes).forEach(changeFieldKey => {
            if (changeFieldKey === fieldKey || this.prettyFieldName(changeFieldKey) === fieldName) {
              const change = entry.payload.changes[changeFieldKey];
              historyEntries.push({
                when: this.formatDate(entry.performedAt),
                from: this.format(change.from || change.oldValue),
                to: this.format(change.to || change.newValue),
                value: null,
                by: this.getUserDisplayName(entry.performedBy),
                source: 'Data Steward',
                action: 'Updated'
              });
            }
          });
        }
      }
    });
    
    // Sort by date
    historyEntries.sort((a, b) => 
      new Date(a.when).getTime() - new Date(b.when).getTime()
    );
    
    this.historyItems = historyEntries;

    this.showHistory = true;
  }

  closeHistory() { 
    this.showHistory = false; 
    this.historyField = ''; 
    this.historyItems = []; 
  }

  // Helper method to get field key from pretty name
  private getFieldKeyFromPrettyName(prettyName: string): string {
    const reverseMapping: { [key: string]: string } = {
      'Company Name (English)': 'firstName',
      'Company Name (Arabic)': 'firstNameAr',
      'Tax Number': 'tax',
      'Customer Type': 'CustomerType',
      'Company Owner': 'CompanyOwner',
      'Building Number': 'buildingNumber',
      'Street': 'street',
      'Country': 'country',
      'City': 'city',
      'Contact Name': 'ContactName',
      'Email Address': 'EmailAddress',
      'Mobile Number': 'MobileNumber',
      'Job Title': 'JobTitle',
      'Landline': 'Landline',
      'Preferred Language': 'PrefferedLanguage',
      'Sales Organization': 'SalesOrgOption',
      'Distribution Channel': 'DistributionChannelOption',
      'Division': 'DivisionOption'
    };
    
    return reverseMapping[prettyName] || prettyName;
  }

  isItemChanged(h: { from?: any; to?: any; action?: string }): boolean {
    const from = h?.from ?? '';
    const to = h?.to ?? '';
    return JSON.stringify(from) !== JSON.stringify(to);
  }
  
  miniLabel(h: { from?: any; to?: any; action?: string }): string {
    return this.isItemChanged(h) ? (h.action || 'Update') : 'No change';
  }

  pillClass(delta: DeltaKind) {
    return {
      'pill--add': delta === 'added',
      'pill--edit': delta === 'changed',
      'pill--del': delta === 'removed'
    };
  }

  getFieldChangeIcon(contact: ContactItem): string {
    if (!contact.changes || contact.changes.length === 0) return '';
    
    const hasNameChange = contact.changes.some(c => c.field === 'Name');
    const hasEmailChange = contact.changes.some(c => c.field === 'Email');
    const hasPhoneChange = contact.changes.some(c => c.field === 'Mobile' || c.field === 'Landline');
    
    if (hasNameChange) return '👤';
    if (hasEmailChange) return '✉️';
    if (hasPhoneChange) return '📞';
    return '✏️';
  }

  private addRow(p: Omit<LineageRow, 'updatedBy' | 'updatedDate' | 'source'> & {
    updatedBy?: string; updatedDate?: string; source?: SourceSys | string; approvedBy?: string | null; approvedDate?: string | null;
  }) {
    this.lineageFields.push({
      updatedBy: p.updatedBy ?? this.getUserDisplayName('data_entry'),
      updatedDate: p.updatedDate ?? this.formatDate(new Date().toISOString()),
      source: (p.source as SourceSys) ?? 'Data Steward',
      approvedBy: p.approvedBy ?? null,
      approvedDate: p.approvedDate ?? null,
      ...p
    } as LineageRow);
    
    // Clear cache when data changes
    this._cachedGrouped = null;
  }

  // Template helper methods
  getSectionIcon(section: string): string {
    const icons: any = {
      'Identity': '🏢',
      'Contact': '📞',
      'Address': '📍',
      'Sales & Compliance': '💼',
      'Documents': '📄',
      'Other': '📊'
    };
    return icons[section] || '📁';
  }
  
  getDocIcon(type: string | undefined): string {
    const lower = (type || '').toLowerCase();
    if (lower.includes('tax')) return '🧾';
    if (lower.includes('registration')) return '📋';
    if (lower.includes('contract')) return '📜';
    if (lower.includes('invoice')) return '💰';
    return '📄';
  }

  parseContactString(contactStr: string | undefined | null): string[] {
    if (!contactStr) return [];
    return contactStr.split(' | ').map((s: string) => s.trim());
  }
  
  getContactFieldLabel(index: number): string {
    const labels = ['Name', 'Job Title', 'Email', 'Mobile', 'Landline', 'Language'];
    return labels[index] || `Field ${index + 1}`;
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  // Helper methods for accessing contact change properties
  getChangeFieldOldValue(changes: any, field: string): any {
    return changes && changes[field] ? changes[field]['oldValue'] : null;
  }

  getChangeFieldNewValue(changes: any, field: string): any {
    return changes && changes[field] ? changes[field]['newValue'] : null;
  }

  isFieldChanged(changes: any, field: string): boolean {
    if (!changes || !changes[field]) return false;
    return changes[field]['oldValue'] !== changes[field]['newValue'];
  }

  // Unused methods for compatibility
  taskList: any[] = [];
  checked: boolean = false;
  indeterminate: boolean = false;
  setOfCheckedId: Set<string> = new Set<string>();
  isApprovedVisible: boolean = false;
  isRejectedConfirmVisible: boolean = false;
  isRejectedVisible: boolean = false;
  isAssignVisible: boolean = false;
  inputValue: string = '';
  selectedDepartment: string | null = null;

  onlyPending(): boolean { return false; }
  onlyQuarantined(): boolean { return false; }
  mixedStatuses(): boolean { return false; }
  deleteRows(): void {}
  deleteSingle(_row?: any): void {}
  showApproveModal(): void { this.isApprovedVisible = true; }
  showRejectedModal(): void { this.isRejectedVisible = true; }
  showAssignModal(): void { this.isAssignVisible = true; }
  submitApprove(): void { this.isApprovedVisible = false; }
  rejectApprove(): void { this.isRejectedConfirmVisible = false; }
  confirmReject(): void { this.isRejectedVisible = false; }
  onAllChecked(_ev?: any): void {}
  onItemChecked(id: string, checkedOrEvent: any, status?: string): void {}

  /**
   * Opens document preview modal
   */
  previewDocument(doc: any): void {
    console.log('Preview document:', doc);
    
    if (!doc.url && !doc.mime) {
      console.error('No document content available');
      return;
    }
    
    // Create document object compatible with viewer
    this.selectedDocument = {
      name: doc.name,
      type: doc.type,
      mime: doc.mime || this.getMimeFromUrl(doc.url),
      contentBase64: this.extractBase64FromUrl(doc.url),
      size: doc.size,
      description: doc.description
    };
    
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
   * Create proper data URL from document
   */
  private createProperDataUrl(doc: any): string {
    if (!doc.contentBase64) return '';
    
    // Check if it's already a proper data URL
    if (doc.contentBase64.startsWith('data:')) {
      // Fix malformed URLs
      if (doc.contentBase64.includes('base64,data:')) {
        const parts = doc.contentBase64.split('base64,');
        if (parts.length > 1) {
          const base64Part = parts[1];
          const cleanBase64 = base64Part.replace(/^data:application\/pdf;base64,/, '');
          return `data:${doc.mime || 'application/pdf'};base64,${cleanBase64}`;
        }
      }
      return doc.contentBase64;
    }
    
    // Create new data URL
    return `data:${doc.mime || 'application/pdf'};base64,${doc.contentBase64}`;
  }

  /**
   * Downloads document (Fixed)
   */
  downloadDocument(doc: any): void {
    try {
      let url = '';
      
      if (doc.url) {
        url = this.getPreviewUrl(doc);
      } else if (doc.contentBase64) {
        url = this.createProperDataUrl(doc);
      }
      
      if (!url) {
        console.error('No document content available');
        return;
      }
      
      // If it's a data URL, extract and download
      if (url.startsWith('data:')) {
        const parts = url.split(',');
        if (parts.length === 2) {
          const base64 = parts[1];
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: doc.mime || 'application/octet-stream' });
          
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = doc.name || 'document';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
        }
      } else {
        // Direct URL download
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      console.log('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  }

  /**
   * Extract MIME type from data URL
   */
  private getMimeFromUrl(url: string | undefined): string {
    if (!url) return 'application/octet-stream';
    const match = url.match(/data:([^;]+);/);
    return match ? match[1] : 'application/octet-stream';
  }

  /**
   * Extract base64 content from URL (Fixed)
   */
  private extractBase64FromUrl(url: string | undefined): string {
    if (!url) return '';
    
    // Fix malformed URLs
    if (url.includes('base64,data:')) {
      const parts = url.split('base64,');
      if (parts.length > 1) {
        const base64Part = parts[1];
        // Remove duplicate "data:application/pdf;" if exists
        const cleanBase64 = base64Part.replace(/^data:application\/pdf;base64,/, '');
        return cleanBase64;
      }
    }
    
    // If it's a proper data URL, return as is
    if (url.startsWith('data:')) {
      return url;
    }
    
    return '';
  }

  /**
   * Check if document can be previewed
   */
  canPreview(doc: any): boolean {
    if (!doc.url && !doc.mime) return false;
    
    const mime = doc.mime || this.getMimeFromUrl(doc.url);
    const name = doc.name || '';
    
    return mime.includes('pdf') || 
           mime.includes('image') ||
           name.toLowerCase().endsWith('.pdf') ||
           !!(name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/));
  }

  /**
   * Check if document is PDF
   */
  isPdf(doc: any): boolean {
    const mime = doc.mime || this.getMimeFromUrl(doc.url);
    const name = doc.name || '';
    
    return mime.includes('pdf') || 
           mime === 'application/pdf' ||
           name.toLowerCase().endsWith('.pdf');
  }

  /**
   * Check if document is image
   */
  isImage(doc: any): boolean {
    const mime = doc.mime || this.getMimeFromUrl(doc.url);
    const name = doc.name || '';
    
    return mime.includes('image') || 
           name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/);
  }

  /**
   * Get safe preview URL for iframe (bypasses security)
   */
  getSafePreviewUrl(doc: any): SafeResourceUrl {
    const url = this.getPreviewUrl(doc);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Get preview URL for document
   */
  getPreviewUrl(doc: any): string {
    if (!doc) return '';
    
    // If we have contentBase64, use it
    if (doc.contentBase64) {
      // Check if it's already a data URL
      if (doc.contentBase64.startsWith('data:')) {
        return doc.contentBase64;
      }
      // Create data URL
      return `data:${doc.mime || 'application/pdf'};base64,${doc.contentBase64}`;
    }
    
    // If we have url, clean it
    if (doc.url) {
      // Fix malformed URLs
      if (doc.url.includes('base64,data:')) {
        // Extract the actual base64 content
        const parts = doc.url.split('base64,');
        if (parts.length > 1) {
          const base64Part = parts[1];
          // Remove duplicate "data:application/pdf;" if exists
          const cleanBase64 = base64Part.replace(/^data:application\/pdf;base64,/, '');
          return `data:${doc.mime || 'application/pdf'};base64,${cleanBase64}`;
        }
      }
      return doc.url;
    }
    
    return '';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number | string): string {
    if (!bytes) return '0 Bytes';
    const size = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return Math.round(size / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }


  private getRowId(row: any): string {
    return ((row?.requestId ?? row?.id ?? row?.key ?? row?.RequestId ?? '') + '');
  }

  viewOrEditRequest(row: any, editable: boolean): void {
    const id = this.getRowId(row);
    if (!id) return;
    this.router?.navigate(['/new-request', id], {
      queryParams: { mode: editable ? 'edit' : 'view' },
    });
  }
}