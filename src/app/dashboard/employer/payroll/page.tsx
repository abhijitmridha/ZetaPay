'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { CalendarDays, Layers3, LockKeyhole, Plus, ShieldCheck, Users } from 'lucide-react';

import { API, ROUTES } from '@/config';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { PayrollRun } from '@/types/payroll';

type PayrollRunWithMetadata = PayrollRun & {
  metadata?: {
    settlementMode?: 'confidential_payroll' | 'shielded_pool';
    fixedDenomination?: boolean;
    noteCount?: number;
    soroban?: {
      stage?: string;
      poolPayload?: {
        notes?: unknown[];
      };
    };
  } | null;
};

function isShieldedPoolRun(run: PayrollRunWithMetadata) {
  return run.metadata?.settlementMode === 'shielded_pool';
}

function getNoteCount(run: PayrollRunWithMetadata) {
  return run.metadata?.noteCount || run.metadata?.soroban?.poolPayload?.notes?.length || 0;
}

function formatAmount(value?: string | number | null) {
  const numberValue = Number(value || 0);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(numberValue);
}

export default function EmployerPayrollPage() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const shieldedPoolCount = payrollRuns.filter(isShieldedPoolRun).length;
    const confidentialCount = payrollRuns.length - shieldedPoolCount;

    return {
      total: payrollRuns.length,
      shieldedPoolCount,
      confidentialCount,
    };
  }, [payrollRuns]);

  useEffect(() => {
    async function loadPayrollRuns() {
      try {
        const enterpriseId = Cookies.get('enterpriseId');

        if (!enterpriseId) {
          setError('Enterprise session not found');
          setPayrollRuns([]);
          return;
        }

        const response = await fetch(API.payroll.list(enterpriseId));
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error || 'Failed to load payroll runs');
        }

        setPayrollRuns(Array.isArray(body) ? body : []);
      } catch (loadError) {
        setPayrollRuns([]);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load payroll runs');
      } finally {
        setLoading(false);
      }
    }

    void loadPayrollRuns();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Create, review, and verify confidential payroll and shielded pool payroll runs."
        action={
          <Link href={ROUTES.employer.payrollNew}>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Payroll
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {payrollRuns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewMetric label="Total runs" value={`${summary.total}`} />
          <OverviewMetric label="Confidential payroll" value={`${summary.confidentialCount}`} />
          <OverviewMetric label="Shielded pool" value={`${summary.shieldedPoolCount}`} />
        </div>
      )}

      {payrollRuns.length === 0 ? (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">No payroll runs yet</h2>

            <p className="mt-2 text-sm text-slate-500">
              Create your first confidential payroll or shielded pool payroll run.
            </p>

            <Link href={ROUTES.employer.payrollNew}>
              <Button className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700">
                Create Payroll
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payrollRuns.map((run) => {
            const shieldedPool = isShieldedPoolRun(run);
            const noteCount = getNoteCount(run);
            const modeLabel = shieldedPool ? 'Shielded Pool' : 'Confidential Payroll';
            const stage = run.metadata?.soroban?.stage;
            const fixedDenomination = Boolean(run.metadata?.fixedDenomination);

            return (
              <Link key={run.id} href={ROUTES.employer.payrollDetails(String(run.id))}>
                <Card className="border-0 bg-white shadow-xl shadow-slate-200/50 transition hover:shadow-emerald-500/10">
                  <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_160px_160px_150px] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">Payroll #{run.id}</h3>

                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {run.status}
                        </span>

                        <span
                          className={
                            shieldedPool
                              ? 'inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700'
                              : 'inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700'
                          }
                        >
                          {shieldedPool ? (
                            <LockKeyhole className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          {modeLabel}
                        </span>

                        {run.proofHash && !shieldedPool && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Proof saved
                          </span>
                        )}

                        {shieldedPool && fixedDenomination && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <Layers3 className="h-3.5 w-3.5" />
                            Fixed denominations
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {new Date(run.periodStart).toLocaleDateString()} to{' '}
                          {new Date(run.periodEnd).toLocaleDateString()}
                        </span>

                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {run.payeeCount || 0} employees
                        </span>

                        {shieldedPool && noteCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Layers3 className="h-4 w-4" />
                            {noteCount} shielded notes
                          </span>
                        )}

                        {shieldedPool && stage && (
                          <span className="text-slate-400">Pool stage: {stage}</span>
                        )}
                      </div>
                    </div>

                    <Metric label="XLM" value={`${formatAmount(run.totalXlm)} XLM`} />
                    <Metric label="USDC" value={`${formatAmount(run.totalUsdc)} USDC`} />

                    {shieldedPool ? (
                      <Metric label="Notes" value={`${noteCount || run.payeeCount || 0}`} />
                    ) : (
                      <Metric label="Batches" value={`${run.batchCount || 1}`} />
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
      <CardContent className="p-5">
        <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
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
