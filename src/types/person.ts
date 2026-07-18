import { EMPLOYEE, FREELANCER, CONTRACTOR, VENDOR, CONSULTANT } from '@/config';

export type PaymentCurrency = 'XLM' | 'USDC';

export type PersonType =
  typeof EMPLOYEE | typeof FREELANCER | typeof CONTRACTOR | typeof VENDOR | typeof CONSULTANT;

export interface Person {
  id: string;
  name: string;
  wallet: string;
  email: string;
  type: PersonType;
  title?: string;
  salary?: number;
  preferredCurrency: PaymentCurrency;
  verified: boolean;
  createdAt: string;
}

export interface PersonWithSalary extends Person {
  salary: number;
  status: 'Active' | 'Inactive' | 'Pending';
  walletAddress: string;
  fullName: string;
}

export interface PersonSearchSelectProps {
  people: Person[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TYPE_LABELS: Record<PersonType, string> = {
  [EMPLOYEE]: 'Employee',
  [FREELANCER]: 'Freelancer',
  [CONTRACTOR]: 'Contractor',
  [VENDOR]: 'Vendor',
  [CONSULTANT]: 'Consultant',
};

export const TYPE_COLORS: Record<PersonType, string> = {
  [EMPLOYEE]: 'bg-emerald-50 text-emerald-600',
  [FREELANCER]: 'bg-indigo-50 text-indigo-600',
  [CONTRACTOR]: 'bg-orange-50 text-orange-600',
  [VENDOR]: 'bg-purple-50 text-purple-600',
  [CONSULTANT]: 'bg-pink-50 text-pink-600',
};

export const TYPE_DESCRIPTIONS: Record<PersonType, string> = {
  [EMPLOYEE]: 'Full-time company employee with regular payroll',
  [FREELANCER]: 'Project-based worker paid per deliverable',
  [CONTRACTOR]: 'Independent contractor with contract terms',
  [VENDOR]: 'Supplier or service provider',
  [CONSULTANT]: 'External expert or advisor',
};

export const PERSON_TYPES: PersonType[] = [EMPLOYEE, FREELANCER, CONTRACTOR, VENDOR, CONSULTANT];

export function getTypeLabel(type: PersonType): string {
  return TYPE_LABELS[type];
}

export function getTypeColor(type: PersonType): string {
  return TYPE_COLORS[type];
}

export function getTypeDescription(type: PersonType): string {
  return TYPE_DESCRIPTIONS[type];
}

export interface PersonTypeBadgeProps {
  type: PersonType;
  className?: string;
}

export interface PersonStatsProps {
  people: Person[];
}

export interface PersonTableProps {
  people: Person[];
  onRowClick?: (item: Person) => void;
  emptyMessage?: string;
}

export interface PersonnelManagerProps {
  initialData?: Person[];
  addPersonRoute?: string;
}

export interface PersonFormData {
  id?: string;
  fullName: string;
  email: string;
  walletAddress: string;
  type: PersonType;
  title: string;
  salary: number;
  preferredCurrency: PaymentCurrency;
  taxFilingStatus: string;
  allowances: number;
  additionalWithholding: number;
  isExempt: boolean;
}

export interface AddPersonFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<PersonFormData>;
  isEditing?: boolean;
}

export function getInitialPersonFormData(): PersonFormData {
  return {
    fullName: '',
    email: '',
    walletAddress: '',
    type: EMPLOYEE,
    title: '',
    salary: 0,
    preferredCurrency: 'USDC',
    taxFilingStatus: 'single',
    allowances: 0,
    additionalWithholding: 0,
    isExempt: false,
  };
}

interface ApiRecord {
  id: number | string;
  fullName?: string | null;
  name?: string | null;
  walletAddress?: string | null;
  wallet?: string | null;
  email?: string | null;
  type?: string | null;
  title?: string | null;
  salary?: string | number | null;
  preferredCurrency?: string | null;
  status?: string | null;
  verified?: boolean | null;
  createdAt?: string | null;
}

export function mapApiRecordToPerson(record: ApiRecord): Person {
  let salary = 0;

  if (record.salary !== null && record.salary !== undefined) {
    salary = typeof record.salary === 'string' ? parseFloat(record.salary) : record.salary;
  }

  return {
    id: String(record.id),
    name: record.fullName || record.name || 'Unknown',
    wallet: record.walletAddress || record.wallet || '',
    email: record.email || '',
    type: (record.type as PersonType) || EMPLOYEE,
    title: record.title || undefined,
    salary,
    preferredCurrency: record.preferredCurrency === 'XLM' ? 'XLM' : 'USDC',
    verified: record.status === 'active' || record.verified || false,
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

export function inferPersonTypeFromRecord(record: { type?: string | null }): PersonType {
  return (record.type as PersonType) || EMPLOYEE;
}
