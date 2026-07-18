'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers3,
  LockKeyhole,
  WalletCards,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { API, ROUTES } from '@/config';
import { signWithFreighter } from '@/lib/stellar/freighter';
import { useWallet } from '@/app/providers';

type SettlementMode = 'confidential_payroll' | 'shielded_pool';

type PayrollDetail = {
  payrollRunId: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  mode: SettlementMode;
  status: string;
  totals: Record<string, string>;
  amount: string;
  currency: string;
  noteCount: number;
  availableNoteCount: number;
  withdrawnNoteCount: number;
  txHash: string | null;
  stellarUrl: string | null;
  proofHash: string | null;
  batchRoot: string | null;
  poolContractId: string | null;
  rootAccepted?: boolean | null;
  canWithdraw: boolean;
  notes: {
    id: number;
    commitment: string | null;
    amount: string;
    currency: string;
    status: string;
    createdAt: string;
    depositTxHash: string | null;
    depositStellarUrl: string | null;
    withdrawalTxHash: string | null;
    withdrawalStellarUrl: string | null;
  }[];
};

type PayrollDetailResponse = {
  payroll: PayrollDetail;
};

function formatAmount(value?: string | number | null) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString();
}

function formatTotals(totals: Record<string, string>) {
  const entries = Object.entries(totals);

  if (entries.length === 0) return '0 USDC';

  return entries.map(([currency, amount]) => `${formatAmount(amount)} ${currency}`).join(' + ');
}

function shortHash(value?: string | null) {
  if (!value) return 'Not available';
  if (value.length <= 24) return value;

  return `${value.slice(0, 12)}...${value.slice(-10)}`;
}

function modeLabel(mode: SettlementMode) {
  return mode === 'shielded_pool' ? 'Shielded Pool' : 'Confidential Transfer';
}

function statusLabel(status: string, mode: SettlementMode) {
  if (mode === 'shielded_pool') {
    if (status === 'withdrawn') return 'Withdrawn';
    if (status === 'partially_withdrawn') return 'Partially Withdrawn';
    if (status === 'pool_deposit_verified') return 'Deposit Verified';
    return 'Available To Withdraw';
  }

  if (status === 'completed') return 'Amount Received';
  if (status === 'processing') return 'Processing';
  if (status === 'pending') return 'Pending';

  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string, mode: SettlementMode) {
  if (mode === 'shielded_pool') {
    if (status === 'withdrawn') return 'bg-emerald-50 text-emerald-700';
    if (status === 'partially_withdrawn') return 'bg-amber-50 text-amber-700';
    return 'bg-blue-50 text-blue-700';
  }

  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'processing' || status === 'pending') return 'bg-amber-50 text-amber-700';

  return 'bg-slate-100 text-slate-600';
}

export default function EmployeePayrollDetailPage() {
  const { walletAddress } = useWallet();
  const params = useParams<{ id: string }>();

  const [data, setData] = useState<PayrollDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayroll = useCallback(async () => {
    try {
      const response = await fetch(`/api/employee/payroll/${params.id}`, {
        cache: 'no-store',
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || body.message || 'Failed to load payroll detail');
      }

      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load payroll detail');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPayroll();
    });
  }, [loadPayroll]);

  const payroll = data?.payroll;
  const shieldedPool = payroll?.mode === 'shielded_pool';

  const canWithdraw = useMemo(() => {
    return Boolean(payroll && shieldedPool && payroll.canWithdraw);
  }, [payroll, shieldedPool]);

  const withdrawnNotes = useMemo(() => {
    return payroll?.notes.filter((note) => note.withdrawalStellarUrl) || [];
  }, [payroll?.notes]);

  async function handleWithdraw() {
    if (!payroll || !walletAddress) return;

    setError(null);
    setWithdrawSuccess(null);
    setWithdrawing(true);

    try {
      const prepareResponse = await fetch(API.employee.withdrawPrepare, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollRunId: payroll.payrollRunId }),
      });

      const prepareBody = await prepareResponse.json();

      if (!prepareResponse.ok) {
        throw new Error(prepareBody.error || prepareBody.message || 'Failed to prepare withdrawal');
      }

      for (const withdrawal of prepareBody.withdrawals) {
        const signedXdr = await signWithFreighter(withdrawal.unsignedXdr, walletAddress);

        const submitResponse = await fetch(API.employee.withdrawSubmit, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payrollEmployeeId: withdrawal.payrollEmployeeId,
            signedXdr,
          }),
        });

        const submitBody = await submitResponse.json();

        if (!submitResponse.ok) {
          throw new Error(submitBody.error || submitBody.message || 'Failed to submit withdrawal');
        }
      }

      setWithdrawSuccess('Withdrawal completed successfully.');
      await loadPayroll();
    } catch (withdrawError) {
      setError(
        withdrawError instanceof Error
          ? withdrawError.message
          : 'Withdrawal failed. Please try again.'
      );
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !payroll) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />

          <h1 className="mt-4 text-2xl font-bold text-slate-900">Payroll unavailable</h1>

          <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load payroll detail'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payroll #${payroll.payrollRunId}`}
        description={
          shieldedPool
            ? 'Review this shielded payroll before withdrawing funds.'
            : 'Review this confidential payroll transfer.'
        }
        backLink={{ href: ROUTES.employee.payroll, label: 'Back to Payroll' }}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {withdrawSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {withdrawSuccess}
        </div>
      )}

      <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
            {shieldedPool ? (
              <LockKeyhole className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {modeLabel(payroll.mode)}
          </div>

          <h1 className="mt-4 text-3xl font-bold">{formatTotals(payroll.totals)}</h1>

          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            {shieldedPool
              ? 'This payroll was deposited into the shielded pool. Review the amount and confirm withdrawal when ready.'
              : 'This payroll was sent as a confidential direct transfer.'}
          </p>
        </div>

        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <Metric label="Status" value={statusLabel(payroll.status, payroll.mode)} />
          <Metric label="Amount" value={formatTotals(payroll.totals)} />
          <Metric
            label="Period"
            value={`${formatDate(payroll.periodStart)} to ${formatDate(payroll.periodEnd)}`}
          />
          <Metric label="Created" value={formatDate(payroll.createdAt)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                {shieldedPool ? 'Withdrawal summary' : 'Payment summary'}
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <InfoRow label="Settlement mode" value={modeLabel(payroll.mode)} />
              <InfoRow label="Current status" value={statusLabel(payroll.status, payroll.mode)} />

              {shieldedPool ? (
                <>
                  <InfoRow label="Withdrawable amount" value={formatTotals(payroll.totals)} />
                  <InfoRow label="Available notes" value={`${payroll.availableNoteCount}`} />
                  <InfoRow label="Withdrawn notes" value={`${payroll.withdrawnNoteCount}`} />
                  <InfoRow
                    label="Pool accepted"
                    value={payroll.rootAccepted === false ? 'No' : 'Yes'}
                  />
                </>
              ) : (
                <>
                  <InfoRow label="Amount received" value={formatTotals(payroll.totals)} />
                  <InfoRow label="Transfer type" value="Direct confidential payment" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Action</h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {shieldedPool
                  ? canWithdraw
                    ? 'This payroll has funds available for withdrawal.'
                    : 'This shielded payroll has no available balance left to withdraw.'
                  : 'This confidential payroll was already transferred directly.'}
              </p>

              <div className="mt-5 space-y-2">
                {canWithdraw ? (
                  <Button
                    disabled={!canWithdraw || withdrawing}
                    loading={withdrawing}
                    onClick={handleWithdraw}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <WalletCards className="mr-2 h-4 w-4" />
                    {withdrawing ? 'Withdrawing' : 'Withdraw Payroll'}
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    {shieldedPool ? 'Nothing To Withdraw' : 'Amount Received'}
                  </Button>
                )}

                {payroll.stellarUrl && (
                  <a href={payroll.stellarUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Deposit Tx
                    </Button>
                  </a>
                )}

                {withdrawnNotes.map((note) => (
                  <a
                    key={note.id}
                    href={note.withdrawalStellarUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Withdrawal Tx #{note.id}
                    </Button>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {shieldedPool && (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <button
              type="button"
              onClick={() => setTechnicalOpen((value) => !value)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Technical details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  View commitments, proof data, and individual pool notes.
                </p>
              </div>

              {technicalOpen ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {technicalOpen && (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoRow label="Batch root" value={shortHash(payroll.batchRoot)} />
                  <InfoRow label="Proof hash" value={shortHash(payroll.proofHash)} />
                  <InfoRow label="Pool contract" value={shortHash(payroll.poolContractId)} />
                  <InfoRow label="Note count" value={`${payroll.noteCount}`} />
                </div>

                {payroll.notes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                    <p className="text-sm text-slate-500">
                      No note records found for this payroll.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {payroll.notes.map((note) => (
                      <div
                        key={note.id}
                        className="grid gap-4 py-5 lg:grid-cols-[1fr_140px_160px] lg:items-center"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">Note #{note.id}</p>

                          <p className="mt-1 truncate font-mono text-xs text-slate-400">
                            Commitment: {shortHash(note.commitment)}
                          </p>
                        </div>

                        <p className="text-sm font-semibold text-slate-900">
                          {formatAmount(note.amount)} {note.currency}
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-1 text-center text-xs font-medium ${statusClass(
                            note.status,
                            'shielded_pool'
                          )}`}
                        >
                          {statusLabel(note.status, 'shielded_pool')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="max-w-[220px] text-right text-sm font-semibold break-all text-slate-900">
        {value}
      </p>
    </div>
  );
}
