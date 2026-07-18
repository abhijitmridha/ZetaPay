'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileWarning,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config';

type PayrollEmployeeRecord = {
  id: number;
  payrollRunId: number;
  employeeId: number;
  payoutCurrency: string | null;
  grossSalary: string;
  netSalary: string;
  taxWithheld: string;
  status: string | null;
  txHash: string | null;
  batchIndex: number | null;
  payeeIndex: number | null;
  salt: string | null;
  commitment: string | null;
  merklePath: unknown;
  pathIndices: unknown;
  paymentVerifiedAt: string | null;
  employee?: {
    id: number;
    fullName: string;
    email: string | null;
    walletAddress: string;
    type: string | null;
    title: string | null;
  };
  employeeVerificationLink: {
    id: number;
    linkType: string;
    expiresAt: string;
    usedAt: string | null;
    revokedAt: string | null;
    verificationUrl: string | null;
  } | null;
};

type PoolNotePayload = {
  employeeId: number;
  amount: string;
  employeeTotalAmount?: string;
  atomicAmount: string;
  currency: 'XLM' | 'USDC';
  token: string;
  commitment: string;
  payeeIndex: number;
  employeeNoteIndex?: number;
  denomination?: string;
};

type PayrollRunMetadata = {
  settlementMode?: 'confidential_payroll' | 'shielded_pool';
  sourceOfTruth?: string;
  fixedDenomination?: boolean;
  noteCount?: number;
  denominationPolicy?: {
    enabled?: boolean;
    atomicScale?: number;
    xlm?: string[];
    usdc?: string[];
  };
  soroban?: {
    stage?: string;
    contractBatchId?: number | null;
    submitTxHash?: string | null;
    executeTxHash?: string | null;
    lastTxHash?: string | null;
    poolContractId?: string;
    verifierContractId?: string;
    txHashes?: string[];
    poolPayload?: {
      root?: string;
      notes?: PoolNotePayload[];
      totals?: {
        xlm: number;
        usdc: number;
        gross: number;
      };
    };
  };
};

type PayrollRunDetail = {
  id: number;
  enterpriseId: number;
  auditKey: string;
  periodStart: string;
  periodEnd: string;
  totalGross: string;
  totalNet: string;
  totalTaxWithheld: string;
  totalXlm: string;
  totalUsdc: string;
  payeeCount: number | null;
  batchSize: number | null;
  batchCount: number | null;
  batchRoot: string | null;
  payrollRunHash: string | null;
  proofHash: string | null;
  contractBatchId: number | null;
  txHash: string | null;
  publicVerificationUrl: string | null;
  status: string | null;
  createdAt: string;
  metadata?: PayrollRunMetadata | null;
  employees: PayrollEmployeeRecord[];
};

type GeneratedPayrollResult = {
  payrollRunId: number;
  publicVerificationUrl?: string;
  txHash?: string | null;
  submitTxHash?: string | null;
  executeTxHash?: string | null;
  fixedDenomination?: boolean;
  noteCount?: number;
  employeeVerificationLinks?: {
    employeeId: number;
    payrollEmployeeId: number;
    verificationUrl: string;
    token: string;
    expiresAt: string;
  }[];
};

type AggregatedPoolPayee = {
  employeeId: number;
  employee?: PayrollEmployeeRecord['employee'];
  currencyTotals: Record<string, number>;
  noteCount: number;
  statuses: string[];
  txHash: string | null;
  sampleCommitments: string[];
};

function stellarTxUrl(txHash?: string | null) {
  return txHash ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : null;
}

function formatAmount(value?: string | number | null) {
  const numberValue = Number(value || 0);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(numberValue);
}

function shortHash(value?: string | null) {
  if (!value) return 'Not generated';
  if (value.length <= 18) return value;

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function isShieldedPoolRun(data: PayrollRunDetail) {
  return data.metadata?.settlementMode === 'shielded_pool';
}

function aggregatePoolPayees(payees: PayrollEmployeeRecord[]) {
  const groups = new Map<number, AggregatedPoolPayee>();

  for (const payee of payees) {
    const current =
      groups.get(payee.employeeId) ||
      ({
        employeeId: payee.employeeId,
        employee: payee.employee,
        currencyTotals: {},
        noteCount: 0,
        statuses: [],
        txHash: payee.txHash,
        sampleCommitments: [],
      } satisfies AggregatedPoolPayee);

    const currency = payee.payoutCurrency || 'USDC';

    current.currencyTotals[currency] =
      (current.currencyTotals[currency] || 0) + Number(payee.netSalary || 0);

    current.noteCount += 1;

    if (payee.status) {
      current.statuses.push(payee.status);
    }

    if (payee.commitment && current.sampleCommitments.length < 3) {
      current.sampleCommitments.push(payee.commitment);
    }

    if (!current.txHash && payee.txHash) {
      current.txHash = payee.txHash;
    }

    groups.set(payee.employeeId, current);
  }

  return Array.from(groups.values());
}

export default function EmployerPayrollDetailPage() {
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<PayrollRunDetail | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedPayrollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function copy(text?: string | null, label = 'value') {
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopied(label);

    setTimeout(() => setCopied(null), 1600);
  }

  useEffect(() => {
    queueMicrotask(() => {
      const rawGenerated = window.sessionStorage.getItem('zetapayGeneratedPayroll');

      if (rawGenerated) {
        try {
          setGeneratedResult(JSON.parse(rawGenerated) as GeneratedPayrollResult);
        } catch {
          setGeneratedResult(null);
        }
      }

      async function loadPayrollRun() {
        try {
          const response = await fetch(`/api/payroll/${params.id}`);
          const body = await response.json();

          if (!response.ok) {
            throw new Error(body.error || 'Failed to load payroll run');
          }

          setData(body);
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load payroll run');
        } finally {
          setLoading(false);
        }
      }

      void loadPayrollRun();
    });
  }, [params.id]);

  const poolPayees = useMemo(() => {
    return data ? aggregatePoolPayees(data.employees) : [];
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <FileWarning className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Payroll not found</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load payroll run'}</p>
        </div>
      </div>
    );
  }

  const shieldedPool = isShieldedPoolRun(data);
  const verified = Boolean(data.batchRoot && data.proofHash);

  const poolTxHash =
    data.txHash ||
    data.metadata?.soroban?.lastTxHash ||
    generatedResult?.txHash ||
    generatedResult?.submitTxHash ||
    null;

  const executeTxHash =
    data.txHash ||
    data.metadata?.soroban?.executeTxHash ||
    generatedResult?.executeTxHash ||
    generatedResult?.txHash ||
    null;

  const submitTxHash =
    data.metadata?.soroban?.submitTxHash || generatedResult?.submitTxHash || null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payroll #${data.id}`}
        description={
          shieldedPool
            ? 'Shielded pool funding report with encrypted withdrawal notes and Stellar pool settlement records.'
            : 'Private employer payroll report with encrypted payroll records, proof data, verification links, and Stellar settlement records.'
        }
        backLink={{ href: ROUTES.employer.payroll, label: 'Back to Payroll' }}
      />

      {shieldedPool ? (
        <ShieldedPoolDetail
          data={data}
          generatedResult={generatedResult}
          copied={copied}
          poolTxHash={poolTxHash}
          poolPayees={poolPayees}
          onCopy={copy}
        />
      ) : (
        <ConfidentialPayrollDetail
          data={data}
          generatedResult={generatedResult}
          copied={copied}
          verified={verified}
          executeTxHash={executeTxHash}
          submitTxHash={submitTxHash}
          onCopy={copy}
        />
      )}
    </div>
  );
}

function ShieldedPoolDetail({
  data,
  generatedResult,
  copied,
  poolTxHash,
  poolPayees,
  onCopy,
}: {
  data: PayrollRunDetail;
  generatedResult: GeneratedPayrollResult | null;
  copied: string | null;
  poolTxHash: string | null;
  poolPayees: AggregatedPoolPayee[];
  onCopy: (value?: string | null, label?: string) => void;
}) {
  const noteCount =
    data.metadata?.noteCount ||
    generatedResult?.noteCount ||
    data.metadata?.soroban?.poolPayload?.notes?.length ||
    data.employees.length;

  const poolStage = data.metadata?.soroban?.stage || 'pool_funded';
  const poolContractId = data.metadata?.soroban?.poolContractId || 'Not available';
  const root = data.metadata?.soroban?.poolPayload?.root || data.batchRoot;
  const fixedDenomination = Boolean(
    data.metadata?.fixedDenomination || generatedResult?.fixedDenomination
  );

  return (
    <>
      <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
            <LockKeyhole className="h-4 w-4" />
            Shielded pool funding report
          </div>

          <h1 className="mt-4 text-3xl font-bold">Payroll deposited into pool</h1>

          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            Employer funds were deposited into the shielded pool as private withdrawal notes.
            Employees withdraw later using proof material. Auditors can verify the encrypted
            employer report using the audit key.
          </p>
        </div>

        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <Metric label="Status" value={data.status || 'completed'} />
          <Metric label="Employees" value={`${data.payeeCount || poolPayees.length}`} />
          <Metric label="Shielded notes" value={`${noteCount}`} />
          <Metric label="Mode" value={fixedDenomination ? 'Fixed denominations' : 'Direct notes'} />
        </CardContent>
      </Card>

      <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Pool funding transaction</h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                This transaction funded the pool contract. Public chain data shows token amounts and
                commitments, but not employee ownership.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Info label="Network" value="Stellar Testnet" />
                <Info label="Pool stage" value={poolStage} />
                <Info label="Status" value={data.status || 'unknown'} />
              </div>

              <HashBox label="Pool contract" value={poolContractId} onCopy={onCopy} />
              <HashBox label="Funding transaction" value={poolTxHash} onCopy={onCopy} />
            </div>

            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={() => onCopy(poolTxHash, 'stellar-tx')}>
                <Copy className="mr-2 h-4 w-4" />
                {copied === 'stellar-tx' ? 'Copied' : 'Copy tx'}
              </Button>

              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  const url = stellarTxUrl(poolTxHash);
                  if (url) window.open(url, '_blank');
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Stellar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.auditKey && (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Auditor access key</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Share this key only with an authorized auditor. It unlocks the encrypted shielded
                  pool payroll audit report, including employer totals and withdrawal note metadata.
                </p>

                <p className="mt-3 rounded-2xl bg-amber-50 p-3 font-mono text-sm font-semibold tracking-wide text-amber-800">
                  {data.auditKey}
                </p>
              </div>

              <Button variant="outline" onClick={() => onCopy(data.auditKey, 'audit-key')}>
                <Copy className="mr-2 h-4 w-4" />
                {copied === 'audit-key' ? 'Copied' : 'Copy key'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Shielded note details</h2>
            </div>

            <div className="mt-5 space-y-4">
              <HashRow label="Merkle root" value={root} onCopy={onCopy} />
              <HashRow label="Proof hash" value={data.proofHash} onCopy={onCopy} />
              <HashRow
                label="Sample commitment"
                value={data.employees.find((item) => item.commitment)?.commitment}
                onCopy={onCopy}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Pool summary</h2>
            </div>

            <div className="mt-5 space-y-3">
              <SummaryRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Period"
                value={`${new Date(data.periodStart).toLocaleDateString()} to ${new Date(
                  data.periodEnd
                ).toLocaleDateString()}`}
              />
              <SummaryRow
                icon={<Users className="h-4 w-4" />}
                label="Employees"
                value={`${poolPayees.length}`}
              />
              <SummaryRow label="Notes" value={`${noteCount}`} />
              <SummaryRow label="Total XLM" value={`${formatAmount(data.totalXlm)} XLM`} />
              <SummaryRow label="Total USDC" value={`${formatAmount(data.totalUsdc)} USDC`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Employee withdrawal readiness</h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            The rows below are grouped by employee for the employer dashboard. The pool contract
            stores only notes and commitments.
          </p>

          <div className="mt-5 divide-y divide-slate-100">
            {poolPayees.map((payee) => {
              const payeeTxUrl = stellarTxUrl(payee.txHash || poolTxHash);

              return (
                <div
                  key={payee.employeeId}
                  className="grid gap-4 py-5 lg:grid-cols-[1fr_180px_140px_220px] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {payee.employee?.fullName || `Employee #${payee.employeeId}`}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {payee.employee?.email || 'No email'}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Wallet is not stored in the pool note.
                    </p>

                    <div className="mt-2 space-y-1">
                      {payee.sampleCommitments.map((commitment) => (
                        <p key={commitment} className="truncate font-mono text-xs text-slate-400">
                          Commitment: {shortHash(commitment)}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm font-semibold text-slate-900">
                    {Object.entries(payee.currencyTotals).map(([currency, amount]) => (
                      <p key={currency}>
                        {formatAmount(amount)} {currency}
                      </p>
                    ))}
                  </div>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-center text-xs font-medium text-emerald-700">
                    {payee.noteCount} notes
                  </span>

                  <div className="space-y-2">
                    <p className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                      Withdrawal page pending. Employee will claim using encrypted note proof.
                    </p>

                    {payeeTxUrl && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(payeeTxUrl, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Stellar tx
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ConfidentialPayrollDetail({
  data,
  generatedResult,
  copied,
  verified,
  executeTxHash,
  submitTxHash,
  onCopy,
}: {
  data: PayrollRunDetail;
  generatedResult: GeneratedPayrollResult | null;
  copied: string | null;
  verified: boolean;
  executeTxHash: string | null;
  submitTxHash: string | null;
  onCopy: (value?: string | null, label?: string) => void;
}) {
  const publicVerificationUrl = data.publicVerificationUrl;

  return (
    <>
      <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
            <ShieldCheck className="h-4 w-4" />
            Confidential employer report
          </div>

          <h1 className="mt-4 text-3xl font-bold">Payroll proof record</h1>

          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            This payroll was generated with Groth16 proof material, encrypted payroll records, and
            settled through the ZetaPay Stellar contract.
          </p>
        </div>

        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <Metric label="Status" value={data.status || (verified ? 'completed' : 'incomplete')} />
          <Metric label="Payees" value={`${data.payeeCount || data.employees.length}`} />
          <Metric label="Total XLM" value={`${data.totalXlm || '0'} XLM`} />
          <Metric label="Total USDC" value={`${data.totalUsdc || '0'} USDC`} />
        </CardContent>
      </Card>

      {executeTxHash && (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <WalletCards className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Stellar execution</h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  This payroll was verified by the ZetaPay contract and executed on Stellar Testnet.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Info label="Network" value="Stellar Testnet" />
                  <Info
                    label="Contract batch"
                    value={data.contractBatchId ? `#${data.contractBatchId}` : 'N/A'}
                  />
                  <Info label="Status" value={data.status || 'unknown'} />
                </div>

                <HashBox label="Execution transaction" value={executeTxHash} onCopy={onCopy} />

                {submitTxHash && submitTxHash !== executeTxHash && (
                  <HashBox
                    label="Proof submission transaction"
                    value={submitTxHash}
                    onCopy={onCopy}
                  />
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={() => onCopy(executeTxHash, 'stellar-tx')}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied === 'stellar-tx' ? 'Copied' : 'Copy tx'}
                </Button>

                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    const url = stellarTxUrl(executeTxHash);
                    if (url) window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Stellar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {publicVerificationUrl && (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">Public proof link</h2>
                <p className="mt-1 text-sm text-slate-500">
                  This public link shows proof metadata only. Payroll records are encrypted and
                  payees are not exposed.
                </p>

                <p className="mt-3 rounded-2xl bg-slate-50 p-3 font-mono text-xs break-all text-slate-700">
                  {publicVerificationUrl}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onCopy(publicVerificationUrl, 'public')}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied === 'public' ? 'Copied' : 'Copy'}
                </Button>

                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => window.open(publicVerificationUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.auditKey && (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Auditor access key</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Share this key only with an authorized auditor. It unlocks the full payroll audit
                  report.
                </p>

                <p className="mt-3 rounded-2xl bg-amber-50 p-3 font-mono text-sm font-semibold tracking-wide text-amber-800">
                  {data.auditKey}
                </p>
              </div>

              <Button variant="outline" onClick={() => onCopy(data.auditKey, 'audit-key')}>
                <Copy className="mr-2 h-4 w-4" />
                {copied === 'audit-key' ? 'Copied' : 'Copy key'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">Proof details</h2>

            <div className="mt-5 space-y-4">
              <HashRow label="Batch root" value={data.batchRoot} onCopy={onCopy} />
              <HashRow label="Payroll run hash" value={data.payrollRunHash} onCopy={onCopy} />
              <HashRow label="Proof hash" value={data.proofHash} onCopy={onCopy} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Payroll summary</h2>
            </div>

            <div className="mt-5 space-y-3">
              <SummaryRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Period"
                value={`${new Date(data.periodStart).toLocaleDateString()} to ${new Date(
                  data.periodEnd
                ).toLocaleDateString()}`}
              />
              <SummaryRow
                icon={<Users className="h-4 w-4" />}
                label="Payees"
                value={`${data.employees.length}`}
              />
              <SummaryRow label="Batch count" value={`${data.batchCount || 1}`} />
              <SummaryRow label="Status" value={data.status || 'unknown'} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Payees</h2>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {data.employees.map((payee) => {
              const generatedLink = generatedResult?.employeeVerificationLinks?.find(
                (link) => link.payrollEmployeeId === payee.id
              );

              const verificationUrl =
                generatedLink?.verificationUrl || payee.employeeVerificationLink?.verificationUrl;

              const payeeTxUrl = stellarTxUrl(payee.txHash || executeTxHash);

              return (
                <div
                  key={payee.id}
                  className="grid gap-4 py-5 lg:grid-cols-[1fr_160px_120px_260px] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {payee.employee?.fullName || `Employee #${payee.employeeId}`}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {payee.employee?.email || 'No email'}
                    </p>

                    <p className="mt-1 truncate font-mono text-xs text-slate-400">
                      {payee.employee?.walletAddress || 'No wallet'}
                    </p>

                    <p className="mt-1 truncate font-mono text-xs text-slate-400">
                      Commitment: {payee.commitment || 'Not generated'}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-slate-900">
                    {payee.netSalary} {payee.payoutCurrency || 'USDC'}
                  </p>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-center text-xs font-medium text-emerald-700">
                    {payee.status}
                  </span>

                  <div className="space-y-2">
                    {verificationUrl ? (
                      <>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => onCopy(verificationUrl, `employee-${payee.id}`)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {copied === `employee-${payee.id}` ? 'Copied' : 'Copy verification'}
                        </Button>

                        <Button
                          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => window.open(verificationUrl, '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open verification
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">Verification link unavailable.</p>
                    )}

                    {payeeTxUrl && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(payeeTxUrl, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Stellar tx
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function HashBox({
  label,
  value,
  onCopy,
}: {
  label: string;
  value?: string | null;
  onCopy: (value?: string | null, label?: string) => void;
}) {
  if (!value) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>

        <button
          type="button"
          onClick={() => onCopy(value, label)}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
      </div>

      <p className="mt-1 rounded-2xl bg-slate-50 p-3 font-mono text-xs break-all text-slate-700">
        {value}
      </p>
    </div>
  );
}

function HashRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value?: string | null;
  onCopy: (value?: string | null, label?: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>

        {value && (
          <button
            type="button"
            onClick={() => onCopy(value, label)}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
        )}
      </div>

      <p className="mt-1 rounded-2xl bg-slate-50 p-3 font-mono text-xs break-all text-slate-700">
        {value || 'Not generated'}
      </p>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
