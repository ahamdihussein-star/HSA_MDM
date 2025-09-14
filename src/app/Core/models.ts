export type DocType = 'Commercial Registration' | 'Tax Certificate' | 'License' | 'Other';

export interface UploadedDoc {
  id: string;
  name: string;
  type: DocType;
  description: string;
  size: number;
  mime: string;
  uploadedAt: string;      // ISO string
  contentBase64: string;   // data URL
}

export type Role = 'DATA_ENTRY' | 'MASTER' | 'COMPLIANCE';

export type RequestStatus =
  | 'Draft' | 'Pending' | 'Rejected' | 'Updated'
  | 'Approved' | 'Quarantined' | 'Blocked';

export interface LineageEvent {
  at: string;    // ISO date
  byRole: Role;
  action:
    | 'CREATE'
    | 'SUBMIT_TO_MASTER'
    | 'MASTER_REJECT'
    | 'RESUBMIT_TO_MASTER'
    | 'MASTER_APPROVE'
    | 'ROUTE_TO_COMPLIANCE'
    | 'COMPLIANCE_BLOCK'
    | 'COMPLIANCE_APPROVE'
    | 'MERGE'
    | 'QUARANTINE';
  payload?: any;
}

export interface CustomerRecord {
  id: string;                    // ex: CR-2025-000123
  status: RequestStatus;
  assignedTo: Role;              // صندوق الوارد الحالي
  ownerUserId?: string;          // لصاحب الطلب (اختياري)
  isGolden?: boolean;            // بعد موافقة Compliance
  formData: any;                 // requestForm.getRawValue()
  documents?: any[];
  issues?: Array<{ description: string; date?: string; reviewedBy?: string }>;
  lineage: LineageEvent[];
  createdAt: string;
  updatedAt: string;
  contacts?: any[];
}