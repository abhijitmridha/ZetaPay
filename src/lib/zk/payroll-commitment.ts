import { poseidonHash } from './merkle';

export type PayrollCommitmentInput = {
  payeeId: bigint;
  recipientHash: bigint;
  amount: bigint;
  payeeType: bigint;
  tokenType: bigint;
  periodId: bigint;
  salt: bigint;
};

export async function computePayrollCommitment({
  payeeId,
  recipientHash,
  amount,
  payeeType,
  tokenType,
  periodId,
  salt,
}: PayrollCommitmentInput): Promise<bigint> {
  return poseidonHash([payeeId, recipientHash, amount, payeeType, tokenType, periodId, salt]);
}
