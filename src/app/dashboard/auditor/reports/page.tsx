'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, FileWarning, Search, Users } from 'lucide-react';

import { ROUTES } from '@/config';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

type SettlementMode = 'confidential_payroll' | 'shielded_pool';

type AuditReportSummary = {
  payrollRunId: number;
  companyName?: string | null;
  periodStart?: string;
  periodEnd?: string;
  payeeCount?: number;
  totalXlm?: string | number | null;
  totalUsdc?: string | number | null;
  status?: string | null;
  verifiedAt?: string;
  settlementMode?: SettlementMode;
};

function readReportsFromSession(): AuditReportSummary[] {
  const raw = window.sessionStorage.getItem('zetapayAuditReports');

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatAmount(value?: string | number | null) {
  const numberValue = Number(value || 0);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(numberValue);
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function displayStatus(report: AuditReportSummary) {
  if (report.settlementMode !== 'shielded_pool') {
    return titleCase(report.status || 'verified');
  }

  if (report.status === 'withdrawn') return 'Completed';
  if (report.status === 'partially_withdrawn') return 'In Progress';

  return 'In Progress';
}

function statusBadgeClass(report: AuditReportSummary) {
  if (report.settlementMode !== 'shielded_pool') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (report.status === 'withdrawn') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (report.status === 'partially_withdrawn') {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-blue-50 text-blue-700';
}

function settlementLabel(mode?: SettlementMode) {
  return mode === 'shielded_pool' ? 'Shielded Pool' : 'Confidential Payroll';
}

export default function AuditorReportsPage() {
  const [reports, setReports] = useState<AuditReportSummary[]>([]);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setReports(readReportsFromSession());
      setMounted(true);
    });
  }, []);

  const filteredReports = reports.filter((report) => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return true;

    return (
      String(report.payrollRunId).includes(normalized) ||
      (report.companyName || '').toLowerCase().includes(normalized) ||
      settlementLabel(report.settlementMode).toLowerCase().includes(normalized)
    );
  });

  if (!mounted) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Reports"
        description="Browse payroll reports unlocked through verified audit keys."
        backLink={{ href: ROUTES.auditor.root, label: 'Back to Dashboard' }}
        action={
          <Link href={ROUTES.auditor.verify}>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
              Verify New Key
            </Button>
          </Link>
        }
      />

      <Card className="mt-5 border-0 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by company, payroll id, or mode"
              className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pr-4 pl-11 text-sm transition outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredReports.length === 0 ? (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-10 text-center">
            <FileWarning className="mx-auto h-10 w-10 text-slate-300" />

            <h2 className="mt-4 text-xl font-bold text-slate-900">No audit reports found</h2>

            <p className="mt-2 text-sm text-slate-500">
              Verify an audit key to unlock a report in this auditor session.
            </p>

            <Link href={ROUTES.auditor.verify}>
              <Button className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700">
                Verify Audit Key
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Link
              key={report.payrollRunId}
              href={`${ROUTES.auditor.reports}/${report.payrollRunId}`}
            >
              <Card className="border-0 bg-white shadow-xl shadow-slate-200/50 transition hover:shadow-emerald-500/10">
                <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_160px_160px_140px] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        Payroll #{report.payrollRunId}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                          report
                        )}`}
                      >
                        {displayStatus(report)}
                      </span>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {settlementLabel(report.settlementMode)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {report.companyName || 'Private company'}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {report.periodStart && report.periodEnd
                          ? `${new Date(report.periodStart).toLocaleDateString()} to ${new Date(
                              report.periodEnd
                            ).toLocaleDateString()}`
                          : 'Payroll period'}
                      </span>

                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {report.payeeCount || 0} payees
                      </span>
                    </div>
                  </div>

                  <Metric label="XLM" value={`${formatAmount(report.totalXlm)} XLM`} />
                  <Metric label="USDC" value={`${formatAmount(report.totalUsdc)} USDC`} />
                  <Metric
                    label="Verified"
                    value={
                      report.verifiedAt ? new Date(report.verifiedAt).toLocaleDateString() : 'Now'
                    }
                  />
                </CardContent>
              </Card>
            </Link>
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
