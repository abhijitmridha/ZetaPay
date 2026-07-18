import { computePayrollCommitment } from './payroll-commitment';
import { generateMerkleProof, verifyMerkleProof } from './merkle';

export type VerifyPayeeInput = {
  payeeIndex: number;
  payeeId: bigint;
  recipientHash: bigint;
  amount: bigint;
  payeeType: bigint;
  tokenType: bigint;
  periodId: bigint;
  salt: bigint;
  commitments: bigint[];
};

export async function verifyPayee({
  payeeIndex,
  payeeId,
  recipientHash,
  amount,
  payeeType,
  tokenType,
  periodId,
  salt,
  commitments,
}: VerifyPayeeInput) {
  const commitment = await computePayrollCommitment({
    payeeId,
    recipientHash,
    amount,
    payeeType,
    tokenType,
    periodId,
    salt,
  });

  if (commitment !== commitments[payeeIndex]) {
    return {
      verified: false,
      reason: 'Commitment mismatch',
    };
  }

  const proof = await generateMerkleProof(commitments, payeeIndex);

  const verified = await verifyMerkleProof({
    leaf: commitment,
    siblings: proof.siblings,
    pathIndices: proof.pathIndices,
    expectedRoot: proof.root,
  });

  return {
    verified,
    commitment,
    merkleRoot: proof.root,
    siblings: proof.siblings,
    pathIndices: proof.pathIndices,
  };
}
