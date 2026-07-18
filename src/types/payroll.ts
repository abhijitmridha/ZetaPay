export type PaymentCurrency = 'XLM' | 'USDC';
export type PayrollStatus = 'Completed' | 'Pending' | 'Failed' | 'Processing';

export interface PayrollHistoryItem {
  id: string;
  date: string;
  employees: number;
  total: string;
  status: PayrollStatus;
}

export interface PayrollRunDetail {
  id: number;
  payrollRunId: number;
  grossSalary: string;
  netSalary: string;
  taxWithheld: string;
  status: string;
  processedAt: string;
  txHash: string;
  payrollRun: {
    runDate: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    totalGross: string;
    totalNet: string;
    totalTaxWithheld: string;
  };
  employee: {
    id: string;
    fullName: string;
    email: string;
    walletAddress: string;
    type: string;
  };
}

export interface PaymentFormData {
  personId: string;
  amount: string;
  currency: PaymentCurrency;
  memo: string;
}

export interface BalanceData {
  wallet: string;
  xlm: string;
  usdc: string;
  isFunded: boolean;
}

export interface WalletBalanceCardProps {
  balance: BalanceData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export interface SignTransactionOptions {
  network?: string;
  networkPassphrase?: string;
  accountToSign?: string;
}

export interface PayrollRun {
  id: number;
  periodStart: string;
  periodEnd: string;
  totalXlm: string;
  totalUsdc: string;
  payeeCount: number;
  batchCount: number;
  batchRoot: string | null;
  proofHash: string | null;
  status: string;
  createdAt: string;
}
