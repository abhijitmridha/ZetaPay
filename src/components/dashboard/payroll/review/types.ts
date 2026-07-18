import { PaymentCurrency } from '@/types/payroll';
import { PersonType } from '@/types/person';

export type PayrollReviewItem = {
  personId: string;
  name: string;
  email: string;
  wallet: string;
  type: PersonType;
  amount: string;
  currency: PaymentCurrency;
  defaultCurrency: PaymentCurrency;
  currencyOverridden: boolean;
};

export type PayrollReviewDraft = {
  periodStart: string;
  periodEnd: string;
  items: PayrollReviewItem[];
  totals: {
    xlm: number;
    usdc: number;
    payeeCount: number;
    batchCount: number;
  };
};

export type PayrollReviewValidation = {
  allWalletsValid: boolean;
  allAmountsValid: boolean;
  hasPayees: boolean;
  hasCurrencyOverrides: boolean;
};
