// src/app/Core/data-repo.ts

import { Observable } from 'rxjs';
import { InjectionToken } from '@angular/core';

export type Status =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Quarantined'
  | 'Updated'
  | 'Merged';  // NEW: Added Merged status

export type RequestType =
  | 'new'          // New requests from data entry
  | 'quarantine'   // Data from systems updated from quarantine
  | 'rejected'     // Previously rejected requests, now updated
  | 'golden'       // Golden record updates
  | 'duplicate';   // Duplicate merged records

export interface ContactPerson {
  id: string;
  name: string;
  jobTitle?: string;
  email?: string;
  mobile?: string;
  landline?: string;
  preferredLanguage?: string;
  source?: string;
  by?: string;
  when?: string;
}

export interface UploadedDoc {
  id: string;
  name: string;
  type?: string;
  description?: string;
  size?: number;
  mime?: string;
  uploadedAt?: string;
  contentBase64?: string;
  source?: string;
  by?: string;
  when?: string;
}

export interface CustomerRecord {
  id: string;
  requestId?: string;
  firstName?: string;
  firstNameAr?: string;
  tax?: string;
  buildingNumber?: string;
  street?: string;
  country?: string;
  city?: string;
  assignedTo?: string;
  CustomerType?: string;
  CompanyOwner?: string;
  SalesOrgOption?: string;
  DistributionChannelOption?: string;
  DivisionOption?: string;
  ContactName?: string;
  JobTitle?: string;
  EmailAddress?: string;
  MobileNumber?: string;
  Landline?: string;
  PrefferedLanguage?: string;
  status?: Status;
  ComplianceStatus?: string | null;
  companyStatus?: string;
  origin?: string;
  sourceSystem?: string;
  documents?: UploadedDoc[];
  contacts?: ContactPerson[];
  createdAt?: string;
  createdBy?: string;
  reviewedBy?: string;
  complianceBy?: string;
  updatedAt?: string;
  rejectReason?: string;
  blockReason?: string;
  IssueDescription?: string;
  isGolden?: number;
  goldenRecordCode?: string;
  sourceGoldenId?: string;
  notes?: string;

  // NEW: Request type for better categorization
  requestType?: RequestType;

  // NEW: Duplicate management fields
  masterId?: string;           // Reference to master record
  isMaster?: number;           // Is this the master record? (0/1)
  isMerged?: number;           // Has this been merged? (0/1)
  mergedIntoId?: string;       // Which record was this merged into?
  confidence?: number;         // Duplicate detection confidence (0-1)
}

export interface IDataRepo {
  // ملاحظة: list ترجع Observable علشان تلائم الـ API
  list(): Observable<CustomerRecord[]>;

  // بنسيب get سنكرونس علشان الكود الحالي بيناديه مباشرة من الفورم
  get(id: string): CustomerRecord | null;

  dataEntryCreateAndSubmit(
    payload: Partial<CustomerRecord>,
    note?: string
  ): Observable<{ id: string }>;

  dataEntryFixAndResubmit(
    id: string,
    payload: Partial<CustomerRecord>,
    note?: string
  ): Observable<void>;

  masterApprove(id: string, note?: string): Observable<void>;
  masterReject(id: string, reason?: string): Observable<void>;

  complianceApprove(id: string, note?: string): Observable<void>;
  complianceBlock(id: string, reason: string): Observable<void>;

  // NEW: Duplicate management methods
  getDuplicateGroups?(): Observable<any[]>;
  getDuplicateGroup?(masterId: string): Observable<any>;
  mergeDuplicates?(masterId: string, duplicateIds: string[]): Observable<any>;
  ignoreDuplicates?(recordIds: string[], reason?: string): Observable<any>;
}

export const DATA_REPO = new InjectionToken<IDataRepo>('DATA_REPO');