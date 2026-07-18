'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LockKeyhole,
  ReceiptText,
  WalletCards,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { API } from '@/config';

type PayrollMode = 'confidential_payroll' | 'shielded_pool';

type EmployeeDashboardResponse = {
  employee: {
    id: number;
    fullName: string;
    email: string | null;
    walletAddress: string;
    title: string | null;
    type: string | null;
    preferredCurrency: string | null;
  };
  summary: {
    totalAvailableXlm: string;
    totalAvailableUsdc: string;
    totalReceivedXlm: string;
    totalReceivedUsdc: string;
    availableNoteCount: number;
    payrollCount: number;
  };
  recentPayrolls: {
    payrollRunId: number;
    periodStart: string;
    periodEnd: string;
    amount: string;
    currency: string;
    mode: PayrollMode;
    status: 'completed' | 'deposited_in_pool';
    txHash: string | null;
    noteCount: number;
    createdAt: string;
  }[];
};

function formatAmount(value?: string | number | null) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(Number(value || 0));
}

function shortHash(value?: string | null) {
  if (!value) return 'Not available';
  if (value.length <= 22) return value;

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function modeLabel(mode: PayrollMode) {
  return mode === 'shielded_pool' ? 'Shielded Pool' : 'Confidential Transfer';
}

function statusLabel(status: string, mode: PayrollMode) {
  if (mode === 'shielded_pool') return 'Deposited';
  if (status === 'completed') return 'Completed';

  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(mode: PayrollMode) {
  return mode === 'shielded_pool' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700';
}

export default function EmployeeDashboardPage() {
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const employeeId = Cookies.get('employeeId');

    if (!employeeId) {
      setError('Employee session not found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API.employee.dashboard);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || body.message || 'Failed to load employee dashboard');
      }

      setData(body);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load employee dashboard'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboard();
    });
  }, [loadDashboard]);

  const hasAvailableFunds = useMemo(() => {
    if (!data) return false;

    return (
      Number(data.summary.totalAvailableXlm || 0) > 0 ||
      Number(data.summary.totalAvailableUsdc || 0) > 0
    );
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
          <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || 'Unable to load employee dashboard'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Dashboard"
        description="View your payroll history and withdraw shielded pool deposits."
      />

      <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
            <LockKeyhole className="h-4 w-4" />
            Employee payroll wallet
          </div>

          <h1 className="mt-4 text-3xl font-bold">{data.employee.fullName}</h1>

          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            Confidential transfers appear as completed payroll. Shielded pool payroll appears as
            deposited until you withdraw it.
          </p>
        </div>

        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <Metric
            label="Available XLM"
            value={`${formatAmount(data.summary.totalAvailableXlm)} XLM`}
          />
          <Metric
            label="Available USDC"
            value={`${formatAmount(data.summary.totalAvailableUsdc)} USDC`}
          />
          <Metric label="Available notes" value={`${data.summary.availableNoteCount}`} />
          <Metric label="Payrolls" value={`${data.summary.payrollCount}`} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Recent payrolls</h2>
            </div>

            {data.recentPayrolls.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-500">No payroll records are available yet.</p>
              </div>
            ) : (
              <div className="mt-5 divide-y divide-slate-100">
                {data.recentPayrolls.map((payroll) => (
                  <div
                    key={payroll.payrollRunId}
                    className="grid gap-4 py-5 lg:grid-cols-[1fr_170px_150px] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          Payroll #{payroll.payrollRunId}
                        </p>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {modeLabel(payroll.mode)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(payroll.periodStart).toLocaleDateString()} to{' '}
                        {new Date(payroll.periodEnd).toLocaleDateString()}
                      </p>

                      {payroll.txHash && (
                        <p className="mt-1 truncate font-mono text-xs text-slate-400">
                          Tx: {shortHash(payroll.txHash)}
                        </p>
                      )}

                      {payroll.mode === 'shielded_pool' && (
                        <p className="mt-1 text-xs text-slate-400">
                          {payroll.noteCount} withdrawal notes deposited
                        </p>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-900">
                      {formatAmount(payroll.amount)} {payroll.currency}
                    </p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-center text-xs font-medium ${statusClass(
                        payroll.mode
                      )}`}
                    >
                      {statusLabel(payroll.status, payroll.mode)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <SideCard
            icon={<WalletCards className="h-5 w-5 text-emerald-600" />}
            title="Connected wallet"
            text={data.employee.walletAddress}
          />

          <SideCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            title="Profile matched"
            text={`${data.employee.title || data.employee.type || 'Employee'} profile found from your registered wallet.`}
          />

          <SideCard
            icon={<Clock className="h-5 w-5 text-emerald-600" />}
            title="Withdrawal status"
            text={
              hasAvailableFunds
                ? 'Shielded pool deposits are ready to withdraw.'
                : 'No shielded pool deposits are waiting right now.'
            }
          />
        </div>
      </div>
    </div>
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

function SideCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
          {icon}
        </div>

        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>

      <p className="mt-3 text-sm leading-6 break-all text-slate-500">{text}</p>
    </div>
  );
}
