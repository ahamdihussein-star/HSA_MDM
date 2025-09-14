// data-lineage.component.ts - Complete Final Version
import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
  changeType?: 'Create' | 'Update' | 'Delete' | 'Merge';
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
  historyKind: 'scalar' | 'contact' | 'document' = 'scalar';
  historyItems: Array<{ when: string; from: any; to: any; by: string; source: string; action: string; changes?: any[] }> = [];

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

  constructor(private location: Location, private http: HttpClient, public router: Router) {}
  
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

  private getUserDisplayName(user: string): string {
    const mapping: Record<string, string> = {
      'system_import': 'Extracted Data',
      'data_entry': 'Data Entry User',
      'reviewer': 'Reviewer User',
      'compliance': 'Compliance User',
      'system': 'System',
      'admin': 'Administrator'
    };
    return mapping[user] || user;
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

    } catch (error) {
      console.error('Error fetching workflow history:', error);
      this.buildAllFieldsFromCurrentState(record);
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
        
        Object.keys(data).forEach(fieldKey => {
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
              oldValue: this.format(data[fieldKey]),
              newValue: this.format(data[fieldKey]),
              updatedBy: fieldUser,
              updatedDate: when,
              source: fieldSource,
              changeType: undefined,
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
    
    // Handle import/duplicate detection
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
              oldValue: this.format(value),
              newValue: this.format(value),
              updatedBy: 'Extracted Data',
              updatedDate: when,
              source: this.normalizeSource(entry.payload?.sourceSystem || originalSource),
              changeType: undefined,
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
    
    // Handle regular CREATE
    if (entry.payload?.data) {
      const data = entry.payload.data;
      
      Object.keys(data).forEach(fieldKey => {
        if (data[fieldKey] !== null && data[fieldKey] !== undefined && data[fieldKey] !== '') {
          const fieldName = this.prettyFieldName(fieldKey);
          
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
            oldValue: this.format(data[fieldKey]),
            newValue: this.format(data[fieldKey]),
            updatedBy: displayUser,
            updatedDate: when,
            source: actualSource,
            changeType: undefined,
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
            
            this.lineageFields.push({
              section: this.fieldSection(change.field),
              field: fieldName,
              oldValue: this.format(change.oldValue || change.from),
              newValue: this.format(change.newValue || change.to),
              updatedBy: displayUser,
              updatedDate: when,
              source: source,
              changeType: 'Update',
              requestId: entry.requestId,
              step: 'Field Update'
            });
          }
          
          // Update tracker
          tracker.set(change.field, change.newValue || change.to);
        });
      } 
      // If changes is an object (old structure)
      else if (typeof entry.payload.changes === 'object') {
        Object.keys(entry.payload.changes).forEach(fieldKey => {
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
    console.log('Building all fields from current state (fallback)');
    
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
        
        this.addRow({
          section,
          field,
          oldValue: current,
          newValue: current,
          updatedBy: this.getUserDisplayName(record?.createdBy || 'system'),
          updatedDate: this.formatDate(record?.updatedAt || record?.createdAt || new Date().toISOString()),
          source: this.normalizeSource(originalSource),
          changeType: undefined
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
          
          const item: ContactItem = {
            name: contact.name,
            jobTitle: contact.jobTitle,
            email: contact.email,
            mobile: contact.mobile,
            landline: contact.landline,
            preferredLanguage: contact.preferredLanguage,
            title: contact.name || contact.email || 'Contact',
            now: `${contact.name || ''} | ${contact.jobTitle || ''} | ${contact.email || ''} | ${contact.mobile || ''}`,
            delta: changes.length > 0 ? 'changed' : (index === 0 ? 'added' : 'added'),
            when: this.formatDate(contact.addedWhen || currentRecord.createdAt || new Date().toISOString()),
            by: contactBy,
            source: contact.source || 'Data Steward',
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
      }).catch(error => {
        console.error('Error fetching contacts:', error);
        this.contactsView = { items, stats };
      });
    }
  }

  private buildDocumentsViewFromHistory(history: WorkflowHistoryEntry[], currentRecord: any): void {
    const items: DocumentItem[] = [];
    const stats = { changed: 0, added: 0, removed: 0 };

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
    this.isLoading = true;

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
            this.buildDemoData();
          }
        } else {
          console.warn('No record found in navigation state and no ID in URL, using demo data');
          this.buildDemoData();
        }
      }

    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.buildDemoData();
    } finally {
      this.isLoading = false;
    }
  }

  private buildDemoData(): void {
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
    if (r.changeType === 'Create' || r.changeType === 'Update' || r.changeType === 'Delete') {
      return true;
    }
    return (r.oldValue ?? '') !== (r.newValue ?? '');
  };

  countChanged(rows: LineageRow[]) { 
    return rows.filter(r => this.isChanged(r)).length; 
  }

  trackByField = (_: number, item: LineageRow | { section: string; rows: LineageRow[]; _open?: boolean }) =>
    (item as any).field ?? (item as any).section;

  trackBySection = (_: number, g: { section: string; rows: LineageRow[]; _open?: boolean }) => g.section;

  changeBadgeClass(r: LineageRow) {
    const base = 'dl-badge';
    if (!this.isChanged(r)) return { [base]: true, [base + '--same']: true };
    const type = r.changeType || 'Update';
    return {
      [base]: true,
      [base + '--update']: type === 'Update',
      [base + '--create']: type === 'Create',
      [base + '--delete']: type === 'Delete',
      [base + '--merge']: type === 'Merge'
    };
  }
  
  changeTypeLabel(r: LineageRow) {
    return this.isChanged(r) ? (r.changeType || 'Update') : 'No change';
  }

  get grouped() {
    const allRows = this.onlyChanges 
      ? this.lineageFields.filter(r => this.isChanged(r))
      : this.lineageFields;
    
    const lastPerField = new Map<string, LineageRow>();
    
    for (const row of allRows) {
      const existing = lastPerField.get(row.field);
      
      if (!existing) {
        lastPerField.set(row.field, row);
      } else {
        if (this.isChanged(row) && !this.isChanged(existing)) {
          lastPerField.set(row.field, row);
        }
        else if (this.isChanged(row) === this.isChanged(existing)) {
          if (new Date(row.updatedDate) > new Date(existing.updatedDate)) {
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
    return groups.filter(g => g.section !== 'Contact' && g.section !== 'Documents');
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
      
      this.historyItems = contactChanges;
      this.showHistory = true;
      return;
    }

    if (kind === 'document') {
      this.historyItems = this.documentsView.items.map(d => ({
        when: d.when || this.formatDate(new Date().toISOString()),
        from: d.old || null,
        to: d.now || null,
        by: d.by || this.getUserDisplayName('data_entry'),
        source: d.source || 'Data Steward',
        action: (d.delta === 'added') ? 'Create' : (d.delta === 'removed') ? 'Delete' : (d.delta === 'changed') ? 'Update' : 'No change'
      }));
      this.showHistory = true;
      return;
    }

    const sameFieldEvents = this.lineageFields
      .filter(r => r.field === fieldName)
      .sort((a,b) => new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime());

    this.historyItems = sameFieldEvents.map(ev => ({
      when: ev.updatedDate,
      from: ev.oldValue ?? null,
      to: ev.newValue ?? null,
      by: ev.updatedBy,
      source: String(ev.source || 'MDM'),
      action: this.isChanged(ev) ? (ev.changeType || 'Update') : 'No change'
    }));

    this.showHistory = true;
  }

  closeHistory() { 
    this.showHistory = false; 
    this.historyField = ''; 
    this.historyItems = []; 
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