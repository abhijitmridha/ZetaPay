export type AuditStatus = 'Verified' | 'Pending' | 'Failed';

export interface AuditRecord {
  id: string;
  date: string;
  payroll: string;
  status: AuditStatus;
  auditor: 'Internal' | 'External';
  keyType: 'Full Access' | 'Limited Access';
  employeeCount: number;
  [key: string]: unknown;
}

export interface AuditStats {
  total: number;
  verified: number;
  pending: number;
  complianceRate: number;
}
