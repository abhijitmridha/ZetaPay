import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { verifyPayee } from '@/lib/zk/payee-verification';

type PayrollInputFixture = {
  payee_ids: number[];
  recipient_hashes: number[];
  amounts: number[];
  salts: number[];
  payee_types: number[];
  token_types: number[];
  period_id: number;
  commitments: string[];
  batch_root_public: string;
};

type VerifyPayeeRequest = {
  payeeIndex: number;
};

function loadFixture(): PayrollInputFixture {
  const filePath = path.join(process.cwd(), 'circuits/payroll/inputs/xlm.json');

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PayrollInputFixture;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyPayeeRequest;

    if (typeof body.payeeIndex !== 'number' || body.payeeIndex < 0 || body.payeeIndex >= 128) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Invalid payee index',
        },
        { status: 400 }
      );
    }

    const fixture = loadFixture();
    const payeeIndex = body.payeeIndex;

    const commitments = fixture.commitments.map((commitment) => BigInt(commitment));

    const result = await verifyPayee({
      payeeIndex,
      payeeId: BigInt(fixture.payee_ids[payeeIndex]),
      recipientHash: BigInt(fixture.recipient_hashes[payeeIndex]),
      amount: BigInt(fixture.amounts[payeeIndex]),
      payeeType: BigInt(fixture.payee_types[payeeIndex]),
      tokenType: BigInt(fixture.token_types[payeeIndex]),
      periodId: BigInt(fixture.period_id),
      salt: BigInt(fixture.salts[payeeIndex]),
      commitments,
    });

    return NextResponse.json({
      verified: result.verified,
      reason: result.reason ?? null,
      commitment: result.commitment?.toString() ?? null,
      merkleRoot: result.merkleRoot?.toString() ?? null,
      expectedRoot: fixture.batch_root_public,
      rootMatchesFixture: result.merkleRoot?.toString() === fixture.batch_root_public,
      siblings: result.siblings?.map((sibling) => sibling.toString()) ?? [],
      pathIndices: result.pathIndices ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
