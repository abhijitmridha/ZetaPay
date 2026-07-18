import { Person, PersonType } from '@/types/person';
import { PaymentCurrency } from '@/types/payroll';

export type TypeFilter = 'all' | PersonType;

export type PayrollDraftItem = {
  personId: string;
  amount: string;
  currency: PaymentCurrency;
  selected: boolean;
};

export type SelectedPayrollPerson = {
  person: Person;
  item: PayrollDraftItem;
};

export type PayrollWarnings = {
  missingWalletCount: number;
  missingEmailCount: number;
  invalidAmountCount: number;
};

export type PayrollTotals = {
  selectedCount: number;
  totalXlm: number;
  totalUsdc: number;
};
