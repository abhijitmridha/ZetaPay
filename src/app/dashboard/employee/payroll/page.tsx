'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, ExternalLink, Search, WalletCards } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { API, ROUTES } from '@/config';

type SettlementMode = 'confidential_payroll' | 'shielded_pool';

type EmployeePayroll = {
  payrollRunId: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  mode: SettlementMode;
  status: string;
  totals: Record<string, string>;
  availableTotals?: Record<string, string>;
  amount: string;
  currency: string;
  noteCount: number;
  availableNoteCount: number;
  withdrawnNoteCount: number;
  txHash: string | null;
  stellarUrl: string | null;
  proofHash: string | null;
  paymentVerificationUrl: string | null;
};

type EmployeePayrollResponse = {
  employee: {
    id: number;
    fullName: string;
    walletAddress: string;
    preferredCurrency: string | null;
  };
  payrolls: EmployeePayroll[];
};

function formatAmount(value?: string | number | null) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function modeLabel(mode: SettlementMode) {
  return mode === 'shielded_pool' ? 'Shielded Pool' : 'Confidential Transfer';
}

function statusLabel(status: string, mode: SettlementMode) {
  if (mode === 'shielded_pool') {
    if (status === 'completed') return 'Completed';
    if (status === 'processing') return 'Partially Completed';
    return 'Available To Withdraw';
  }

  if (status === 'completed') return 'Amount Received';
  if (status === 'processing') return 'Processing';
  if (status === 'pending') return 'Pending';

  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string, mode: SettlementMode) {
  if (mode === 'shielded_pool') {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
    if (status === 'processing') return 'bg-amber-50 text-amber-700';
    return 'bg-blue-50 text-blue-700';
  }

  if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'processing' || status === 'pending') return 'bg-amber-50 text-amber-700';

  return 'bg-slate-100 text-slate-600';
}

function formatTotals(totals: Record<string, string>) {
  const entries = Object.entries(totals);

  if (entries.length === 0) return '0 USDC';

  return entries.map(([currency, amount]) => `${formatAmount(amount)} ${currency}`).join(' + ');
}

function canWithdraw(payroll: EmployeePayroll) {
  return payroll.mode === 'shielded_pool' && payroll.status !== 'completed';
}

export default function EmployeePayrollPage() {
  const [data, setData] = useState<EmployeePayrollResponse | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayrolls = useCallback(async () => {
    try {
      const response = await fetch(API.employee.payroll, {
        cache: 'no-store',
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || body.message || 'Failed to load payrolls');
      }

      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load payrolls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPayrolls();
    });
  }, [loadPayrolls]);

  const payrolls = useMemo(() => {
    const items = data?.payrolls || [];
    const normalized = query.trim().toLowerCase();

    if (!normalized) return items;

    return items.filter((payroll) => {
      return (
        String(payroll.payrollRunId).includes(normalized) ||
        payroll.currency.toLowerCase().includes(normalized) ||
        modeLabel(payroll.mode).toLowerCase().includes(normalized) ||
        statusLabel(payroll.status, payroll.mode).toLowerCase().includes(normalized)
      );
    });
  }, [data?.payrolls, query]);

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
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Payroll unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'Unable to load payroll history'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll History"
        description="View confidential transfers and shielded pool payroll available for withdrawal."
      />

      <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search payroll by id, mode, status, or currency"
              className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pr-4 pl-11 text-sm transition outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </CardContent>
      </Card>

      {payrolls.length === 0 ? (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-10 text-center">
            <WalletCards className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No payrolls found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Payroll records will appear here after your employer pays you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payrolls.map((payroll) => (
            <Card
              key={payroll.payrollRunId}
              className="border-0 bg-white shadow-xl shadow-slate-200/50"
            >
              <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_180px_180px_180px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      Payroll #{payroll.payrollRunId}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                        payroll.status,
                        payroll.mode
                      )}`}
                    >
                      {statusLabel(payroll.status, payroll.mode)}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {modeLabel(payroll.mode)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(payroll.periodStart)} to {formatDate(payroll.periodEnd)}
                    </span>

                    <span className="flex items-center gap-1">
                      <WalletCards className="h-4 w-4" />
                      {payroll.mode === 'shielded_pool'
                        ? `${payroll.availableNoteCount} of ${payroll.noteCount} notes available`
                        : 'Direct payroll transfer'}
                    </span>
                  </div>
                </div>

                <Metric label="Amount" value={formatTotals(payroll.totals)} />
                <Metric label="Created" value={formatDate(payroll.createdAt)} />

                <div className="space-y-2">
                  {canWithdraw(payroll) ? (
                    <Link href={`${ROUTES.employee.payroll}/${payroll.payrollRunId}`}>
                      <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                        <WalletCards className="mr-2 h-4 w-4" />
                        Review Withdraw
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full">
                      {payroll.mode === 'shielded_pool' ? 'Completed' : 'Amount Received'}
                    </Button>
                  )}

                  {payroll.stellarUrl && (
                    <a href={payroll.stellarUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Stellar Tx
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
