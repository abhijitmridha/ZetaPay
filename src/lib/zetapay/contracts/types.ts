export interface ContractAddresses {
  verifier: string;
  payroll: string;
  token: string;
}

export interface PayrollInitialization {
  employer: string;
  verifier: string;
  xlmToken: string;
  usdcToken: string;
}

export type BuildInitializeShieldedPoolInput = {
  admin: string;
  verificationKeyPath?: string;
};

export type RegisterTokenInput = {
  admin: string;
  token: string;
};

export type PostRootInput = {
  admin: string;
  root: string;
};

export type DepositNoteInput = {
  depositor: string;
  token: string;
  amount: string;
  commitment: string;
};

export type BatchDepositNote = {
  token: string;
  amount: string;
  commitment: string;
};

export type DepositNotesInput = {
  depositor: string;
  deposits: BatchDepositNote[];
};

export type FundPayrollInput = {
  admin: string;
  root: string;
  deposits: BatchDepositNote[];
};

export type WithdrawWithProofInput = {
  recipient: string;
  token: string;
  amount: string;
  commitment: string;
  root: string;
  nullifierHash: string;
  recipientHash: string;
  tokenHash: string;
  withdrawalHash: string;
  proof: {
    a: string;
    b: string;
    c: string;
  };
  publicInputs: string[];
};

export type ShieldedNote = {
  depositor: string;
  token: string;
  amount: number | bigint;
  commitment: string;
  createdAtLedger: number | bigint;
  withdrawn: boolean;
};

export type ShieldedWithdrawal = {
  token: string;
  amount: number | bigint;
  recipient: string;
  commitment: string;
  root: string;
  nullifierHash: string;
  withdrawalHash: string;
  withdrawnAtLedger: number | bigint;
};

export type ShieldedPoolStats = {
  depositCount: number | bigint;
  withdrawalCount: number | bigint;
};
