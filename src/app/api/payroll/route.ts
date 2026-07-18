import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';

import {
  buildInitializePayrollXdr,
  buildSubmitAndExecutePayrollBatchXdr,
  sendSignedXdr,
  toSorobanPayrollPayment,
  type SorobanPayrollPayment,
} from '@/lib/zetapay/contracts/payroll';
import { generatePayrollProof } from '@/lib/zetapay/proof/generate-payroll-proof';
import { db } from '@/lib/db';
import {
  employees,
  enterprises,
  payrollEmployees,
  payrollRuns,
  payrollVerificationLinks,
  zkProofs,
} from '@/lib/db/schema';
import { BATCH_SIZE, PayrollBatchInputItem } from '@/lib/zk/payroll-batch';
import { encryptPayload, generateToken, hashToken } from '@/lib/security/tokenVault';

export const runtime = 'nodejs';

type PayrollCreateRequest = {
  action?: 'prepare' | 'submitInitialize' | 'submitSigned';
  walletAddress?: string;
  periodStart?: string;
  periodEnd?: string;
  items?: PayrollBatchInputItem[];
  payrollRunId?: number;
  signedXdr?: string;
};

type StoredSorobanPayload = {
  payments: SorobanPayrollPayment[];
  proof: {
    a: string;
    b: string;
    c: string;
  };
  publicInputs: string[];
  payrollRunHashHex: string;
  payrollRunHashField: string;
  periodId: string;
  batchIndex: number;
  batchCount: number;
  commitmentRootHex: string;
  encryptedPayroll: string;
  encryptedNotes: string[];
};

const EMPLOYEE_LINK_EXPIRY_DAYS = 30;

function generateAuditKey() {
  const hex = crypto.randomBytes(10).toString('hex').toUpperCase();

  return `AUD-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}`;
}

function getBaseUrl(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) return origin;

  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';

  return host ? `${protocol}://${host}` : '';
}

function getEmployeeLinkExpiry() {
  return new Date(Date.now() + EMPLOYEE_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeMetadata(current: unknown, next: Record<string, unknown>) {
  const base = isRecord(current) ? current : {};
  const incomingSoroban = isRecord(next.soroban) ? next.soroban : {};
  const currentSoroban = isRecord(base.soroban) ? base.soroban : {};

  return {
    ...base,
    ...next,
    soroban: {
      ...currentSoroban,
      ...incomingSoroban,
    },
  };
}

function getStoredSorobanPayload(metadata: unknown): StoredSorobanPayload {
  if (!isRecord(metadata)) {
    throw new Error('Missing stored Soroban payload');
  }

  const soroban = metadata.soroban;

  if (!isRecord(soroban)) {
    throw new Error('Missing stored Soroban payload');
  }

  const payload = soroban.payload;

  if (!isRecord(payload)) {
    throw new Error('Missing stored Soroban payload');
  }

  return payload as StoredSorobanPayload;
}

async function getSessionEnterprise() {
  const cookieStore = await cookies();
  const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

  if (!enterpriseIdStr) return null;

  const enterpriseId = Number.parseInt(enterpriseIdStr, 10);

  if (Number.isNaN(enterpriseId)) return null;

  const [enterprise] = await db
    .select()
    .from(enterprises)
    .where(eq(enterprises.id, enterpriseId))
    .limit(1)
    .execute();

  if (!enterprise || !enterprise.isActive) return null;

  return enterprise;
}

function assertWalletMatchesEnterprise(
  walletAddress: string | undefined,
  enterpriseWallet: string
) {
  if (!walletAddress) {
    throw new Error('Connected wallet address is required');
  }

  if (walletAddress !== enterpriseWallet) {
    throw new Error('Connected Freighter wallet does not match this enterprise wallet.');
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const enterpriseId = searchParams.get('enterpriseId');

    if (!enterpriseId) {
      return NextResponse.json({ error: 'Enterprise ID is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionEnterpriseId = cookieStore.get('enterpriseId')?.value;

    if (!sessionEnterpriseId || Number(sessionEnterpriseId) !== Number(enterpriseId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const records = await db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.enterpriseId, Number(enterpriseId)))
      .orderBy(desc(payrollRuns.createdAt))
      .execute();

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll runs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PayrollCreateRequest;
    const action = body.action || 'prepare';

    const enterprise = await getSessionEnterprise();

    if (!enterprise) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    assertWalletMatchesEnterprise(body.walletAddress, enterprise.walletAddress);

    if (action === 'prepare') {
      return await preparePayroll(body, enterprise);
    }

    if (action === 'submitInitialize') {
      return await submitInitializePayroll(body, enterprise);
    }

    if (action === 'submitSigned') {
      return await submitSignedPayroll(request, body, enterprise);
    }

    return NextResponse.json({ error: 'Unsupported payroll action' }, { status: 400 });
  } catch (error) {
    console.error('Error creating ZK payroll:', error);

    return NextResponse.json(
      {
        error: 'Failed to create ZK payroll',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function preparePayroll(
  body: PayrollCreateRequest,
  enterprise: typeof enterprises.$inferSelect
) {
  const periodStart = body.periodStart;
  const periodEnd = body.periodEnd;

  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'Payroll period is required' }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'At least one payee is required' }, { status: 400 });
  }

  if (body.items.length > BATCH_SIZE) {
    return NextResponse.json(
      { error: `This endpoint currently supports ${BATCH_SIZE} payees.` },
      { status: 400 }
    );
  }

  const employeeIds = body.items.map((item) => Number.parseInt(item.personId, 10));

  if (employeeIds.some((id) => Number.isNaN(id))) {
    return NextResponse.json({ error: 'Invalid payee id' }, { status: 400 });
  }

  const employeeRows = await db
    .select()
    .from(employees)
    .where(and(inArray(employees.id, employeeIds), eq(employees.enterpriseId, enterprise.id)))
    .execute();

  if (employeeRows.length !== employeeIds.length) {
    return NextResponse.json(
      { error: 'One or more payees do not belong to this enterprise' },
      { status: 400 }
    );
  }

  const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]));

  const orderedItems = body.items.map((item) => {
    const employee = employeeById.get(Number.parseInt(item.personId, 10));

    if (!employee) {
      throw new Error(`Employee ${item.personId} not found`);
    }

    return { item, employee };
  });

  const auditKey = generateAuditKey();

  const proof = await generatePayrollProof({
    enterpriseId: enterprise.id,
    periodStart,
    periodEnd,
    auditKey,
    payees: orderedItems.map(({ item, employee }) => ({
      personId: item.personId,
      employeeId: employee.id,
      walletAddress: employee.walletAddress,
      amount: item.amount,
      currency: item.currency,
      type: employee.type,
    })),
  });

  const chainPayments = orderedItems.map(({ item, employee }) =>
    toSorobanPayrollPayment({
      payeeId: employee.id,
      recipient: employee.walletAddress,
      amount: Math.round(Number(item.amount) * 10_000_000).toString(),
      currency: item.currency,
      payeeType: employee.type,
    })
  );

  const encryptedNotes = orderedItems.map(({ item, employee }, index) =>
    encryptPayload({
      scope: 'employeePayrollNote',
      enterpriseId: enterprise.id,
      employeeId: employee.id,
      payrollEmployeeIndex: index,
      personId: item.personId,
      walletAddress: employee.walletAddress,
      amount: item.amount,
      atomicAmount: Math.round(Number(item.amount) * 10_000_000).toString(),
      currency: item.currency,
      type: employee.type || 'employee',
      periodStart,
      periodEnd,
      payrollRunHash: proof.payrollRunHashHex,
      payrollRunHashField: proof.payrollRunHashField,
      batchRoot: proof.batchRoot,
      commitment: String(proof.commitments[index] || ''),
      salt: String((proof.inputJson.salts as string[])[index] || ''),
      payeeIndex: index,
      auditKey,
      createdAt: new Date().toISOString(),
    })
  );

  const encryptedPayroll = encryptPayload({
    scope: 'fullPayrollAudit',
    enterpriseId: enterprise.id,
    enterpriseWallet: enterprise.walletAddress,
    periodStart,
    periodEnd,
    auditKey,
    payrollRunHash: proof.payrollRunHashHex,
    payrollRunHashField: proof.payrollRunHashField,
    batchRoot: proof.batchRoot,
    batchRootHex: proof.batchRootHex,
    proofHash: proof.payrollRunHashHex,
    batchIndex: proof.batchIndex,
    batchCount: proof.batchCount,
    totals: {
      totalGross: proof.totals.totalGrossDisplay,
      totalXlm: proof.totals.totalXlmDisplay,
      totalUsdc: proof.totals.totalUsdcDisplay,
      payeeCount: orderedItems.length,
    },
    payees: orderedItems.map(({ item, employee }, index) => ({
      employeeId: employee.id,
      personId: item.personId,
      walletAddress: employee.walletAddress,
      amount: item.amount,
      atomicAmount: Math.round(Number(item.amount) * 10_000_000).toString(),
      currency: item.currency,
      type: employee.type || 'employee',
      commitment: String(proof.commitments[index] || ''),
      salt: String((proof.inputJson.salts as string[])[index] || ''),
      payeeIndex: index,
    })),
    commitments: proof.commitments.map(String),
    publicSignals: proof.publicJson.map(String),
    createdAt: new Date().toISOString(),
  });

  const sorobanPayload: StoredSorobanPayload = {
    payments: chainPayments,
    proof: proof.proof,
    publicInputs: proof.publicInputs,
    payrollRunHashHex: proof.payrollRunHashHex,
    payrollRunHashField: proof.payrollRunHashField,
    periodId: proof.periodId,
    batchIndex: proof.batchIndex,
    batchCount: proof.batchCount,
    commitmentRootHex: proof.batchRoot,
    encryptedPayroll,
    encryptedNotes,
  };

  let initialized = true;
  let initializeXdr: string | null = null;
  let submitXdr: string | null = null;

  try {
    submitXdr = await buildSubmitAndExecutePayrollBatchXdr({
      employer: enterprise.walletAddress,
      ...sorobanPayload,
    });
  } catch {
    initialized = false;

    try {
      initializeXdr = await buildInitializePayrollXdr({
        employer: enterprise.walletAddress,
      });
    } catch (initializeError) {
      const message =
        initializeError instanceof Error ? initializeError.message : String(initializeError);

      if (message.includes('Error(Contract, #2)')) {
        initialized = true;
        initializeXdr = null;

        submitXdr = await buildSubmitAndExecutePayrollBatchXdr({
          employer: enterprise.walletAddress,
          ...sorobanPayload,
        });
      } else {
        throw initializeError;
      }
    }
  }

  const [payrollRun] = await db
    .insert(payrollRuns)
    .values({
      enterpriseId: enterprise.id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalGross: proof.totals.totalGrossDisplay.toString(),
      totalNet: proof.totals.totalGrossDisplay.toString(),
      totalTaxWithheld: '0',
      totalDeductions: '0',
      totalXlm: proof.totals.totalXlmDisplay.toString(),
      totalUsdc: proof.totals.totalUsdcDisplay.toString(),
      payeeCount: orderedItems.length,
      batchSize: BATCH_SIZE,
      batchCount: proof.batchCount,
      batchRoot: proof.batchRoot,
      payrollRunHash: proof.payrollRunHashField,
      auditKey,
      proofHash: proof.payrollRunHashHex,
      proofPublicInputs: {
        publicSignals: proof.publicJson,
        batchRoot: proof.batchRoot,
        batchRootHex: proof.batchRootHex,
        payrollRunHash: proof.payrollRunHashField,
        payrollRunHashHex: proof.payrollRunHashHex,
      },
      status: 'pending',
      processedBy: enterprise.walletAddress,
      runDate: new Date(),
      metadata: {
        generatedBy: 'payroll-review',
        proofMode: 'groth16-soroban',
        employer: enterprise.walletAddress,
        encryptedPayroll,
        encryptedNotes,
        soroban: {
          stage: 'prepared',
          initialized,
          payrollContractId: process.env.ZETAPAY_PAYROLL_CONTRACT_ID,
          verifierContractId: process.env.ZETAPAY_VERIFIER_CONTRACT_ID,
          payload: sorobanPayload,
        },
      },
    })
    .returning()
    .execute();

  for (const [index, { item, employee }] of orderedItems.entries()) {
    await db
      .insert(payrollEmployees)
      .values({
        payrollRunId: payrollRun.id,
        employeeId: employee.id,
        payoutCurrency: item.currency,
        grossSalary: item.amount,
        netSalary: item.amount,
        taxWithheld: '0',
        federalTax: '0',
        stateTax: '0',
        localTax: '0',
        socialSecurity: '0',
        medicare: '0',
        deductions: '0',
        bonuses: '0',
        commissions: '0',
        reimbursements: '0',
        batchIndex: proof.batchIndex,
        payeeIndex: index,
        salt: String((proof.inputJson.salts as string[])[index] || ''),
        commitment: proof.commitments[index],
        merklePath: [],
        pathIndices: [],
        status: 'pending',
      })
      .execute();
  }

  await db
    .insert(zkProofs)
    .values({
      payrollRunId: payrollRun.id,
      proofHash: proof.payrollRunHashHex,
      proofData: Buffer.from(JSON.stringify(proof.proofJson)).toString('base64'),
      publicInputs: {
        publicSignals: proof.publicJson,
        contractPublicInputs: proof.publicInputs,
      },
      verifyingKeyHash: null,
      isValid: true,
      generatedAt: new Date(),
      verifiedAt: new Date(),
    })
    .execute();

  return NextResponse.json(
    {
      success: true,
      step: 'prepared',
      payrollRunId: payrollRun.id,
      employer: enterprise.walletAddress,
      initializeXdr,
      submitXdr,
      batchRoot: proof.batchRoot,
      payrollRunHash: proof.payrollRunHashField,
      proofHash: payrollRun.proofHash,
      totals: {
        xlm: proof.totals.totalXlmDisplay,
        usdc: proof.totals.totalUsdcDisplay,
        payeeCount: orderedItems.length,
        batchCount: proof.batchCount,
      },
    },
    { status: 201 }
  );
}

async function submitInitializePayroll(
  body: PayrollCreateRequest,
  enterprise: typeof enterprises.$inferSelect
) {
  if (!body.payrollRunId) {
    return NextResponse.json({ error: 'Payroll run id is required' }, { status: 400 });
  }

  if (!body.signedXdr) {
    return NextResponse.json({ error: 'Signed initialize XDR is required' }, { status: 400 });
  }

  const [payrollRun] = await db
    .select()
    .from(payrollRuns)
    .where(and(eq(payrollRuns.id, body.payrollRunId), eq(payrollRuns.enterpriseId, enterprise.id)))
    .limit(1)
    .execute();

  if (!payrollRun) {
    return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
  }

  const initializeResult = await sendSignedXdr(body.signedXdr);
  const payload = getStoredSorobanPayload(payrollRun.metadata);

  const submitXdr = await buildSubmitAndExecutePayrollBatchXdr({
    employer: enterprise.walletAddress,
    ...payload,
  });

  await db
    .update(payrollRuns)
    .set({
      metadata: mergeMetadata(payrollRun.metadata, {
        soroban: {
          stage: 'initialized',
          initialized: true,
          payrollContractId: process.env.ZETAPAY_PAYROLL_CONTRACT_ID,
          verifierContractId: process.env.ZETAPAY_VERIFIER_CONTRACT_ID,
          initializeTxHash: initializeResult.txHash,
        },
      }),
      updatedAt: new Date(),
    })
    .where(eq(payrollRuns.id, payrollRun.id))
    .execute();

  return NextResponse.json({
    success: true,
    step: 'initialized',
    payrollRunId: payrollRun.id,
    employer: enterprise.walletAddress,
    initializeTxHash: initializeResult.txHash,
    submitXdr,
  });
}

async function submitSignedPayroll(
  request: Request,
  body: PayrollCreateRequest,
  enterprise: typeof enterprises.$inferSelect
) {
  if (!body.payrollRunId) {
    return NextResponse.json({ error: 'Payroll run id is required' }, { status: 400 });
  }

  if (!body.signedXdr) {
    return NextResponse.json({ error: 'Signed payroll XDR is required' }, { status: 400 });
  }

  const [payrollRun] = await db
    .select()
    .from(payrollRuns)
    .where(and(eq(payrollRuns.id, body.payrollRunId), eq(payrollRuns.enterpriseId, enterprise.id)))
    .limit(1)
    .execute();

  if (!payrollRun) {
    return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
  }

  const submitResult = await sendSignedXdr(body.signedXdr);
  const contractBatchId = submitResult.returnValue;

  if (!contractBatchId) {
    throw new Error('Soroban submit_and_execute_batch did not return a batch id.');
  }

  const chainTxHash = submitResult.txHash;
  const baseUrl = getBaseUrl(request);

  const publicVerificationToken = generateToken();
  const publicVerificationTokenHash = hashToken(publicVerificationToken);
  const publicVerificationPayload = encryptPayload({
    token: publicVerificationToken,
    enterpriseId: enterprise.id,
    payrollRunId: payrollRun.id,
    createdAt: new Date().toISOString(),
  });

  const [updatedPayrollRun] = await db
    .update(payrollRuns)
    .set({
      contractBatchId,
      txHash: chainTxHash,
      publicVerificationTokenHash,
      publicVerificationPayload,
      publicVerificationTokenCreatedAt: new Date(),
      status: 'completed',
      processedBy: enterprise.walletAddress,
      processedAt: new Date(),
      metadata: mergeMetadata(payrollRun.metadata, {
        soroban: {
          stage: 'submitted_and_executed',
          contractBatchId,
          submitAndExecuteTxHash: submitResult.txHash,
        },
      }),
      updatedAt: new Date(),
    })
    .where(eq(payrollRuns.id, payrollRun.id))
    .returning()
    .execute();

  const payrollEmployeeRows = await db
    .select()
    .from(payrollEmployees)
    .where(eq(payrollEmployees.payrollRunId, payrollRun.id))
    .execute();

  await db
    .update(payrollEmployees)
    .set({
      status: 'completed',
      processedAt: new Date(),
      paymentVerifiedAt: new Date(),
      txHash: chainTxHash,
      updatedAt: new Date(),
    })
    .where(eq(payrollEmployees.payrollRunId, payrollRun.id))
    .execute();

  const employeeVerificationLinks = [];

  for (const payrollEmployee of payrollEmployeeRows) {
    const employeeVerificationToken = generateToken();
    const employeeVerificationTokenHash = hashToken(employeeVerificationToken);
    const expiresAt = getEmployeeLinkExpiry();

    const encryptedPayload = encryptPayload({
      token: employeeVerificationToken,
      employeeId: payrollEmployee.employeeId,
      payrollRunId: payrollRun.id,
      payrollEmployeeId: payrollEmployee.id,
      createdAt: new Date().toISOString(),
    });

    await db
      .insert(payrollVerificationLinks)
      .values({
        tokenHash: employeeVerificationTokenHash,
        encryptedPayload,
        linkType: 'employee',
        enterpriseId: enterprise.id,
        employeeId: payrollEmployee.employeeId,
        payrollRunId: payrollRun.id,
        payrollEmployeeId: payrollEmployee.id,
        expiresAt,
      })
      .execute();

    employeeVerificationLinks.push({
      employeeId: payrollEmployee.employeeId,
      payrollEmployeeId: payrollEmployee.id,
      verificationUrl: `${baseUrl}/verify/payment/${employeeVerificationToken}`,
      token: employeeVerificationToken,
      expiresAt: expiresAt.toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    step: 'executed',
    payrollRunId: updatedPayrollRun.id,
    status: updatedPayrollRun.status,
    batchRoot: updatedPayrollRun.batchRoot,
    payrollRunHash: updatedPayrollRun.payrollRunHash,
    proofHash: updatedPayrollRun.proofHash,
    contractBatchId,
    txHash: chainTxHash,
    submitTxHash: submitResult.txHash,
    executeTxHash: submitResult.txHash,
    publicVerificationUrl: `${baseUrl}/verify/payroll/${publicVerificationToken}`,
    publicVerificationToken,
    employeeVerificationLinks,
    employerPayrollUrl: `${baseUrl}/dashboard/employer/payroll/${updatedPayrollRun.id}`,
    totals: {
      xlm: Number(updatedPayrollRun.totalXlm),
      usdc: Number(updatedPayrollRun.totalUsdc),
      payeeCount: updatedPayrollRun.payeeCount || 0,
      batchCount: updatedPayrollRun.batchCount || 1,
    },
  });
}
