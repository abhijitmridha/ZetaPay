'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, History, Key, ShieldCheck } from 'lucide-react';

import { ROUTES } from '@/config';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatsCard } from '@/components/ui/StatsCard';

type AuditReportSummary = {
  payrollRunId: number;
  companyName?: string | null;
  payeeCount?: number;
  status?: string | null;
  verifiedAt?: string;
};

function readReportsFromSession(): AuditReportSummary[] {
  if (typeof window === 'undefined') return [];

  const raw = window.sessionStorage.getItem('zetapayAuditReports');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AuditorDashboardPage() {
  const [reports, setReports] = useState<AuditReportSummary[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setReports(readReportsFromSession());
      setMounted(true);
    });
  }, []);

  const stats = useMemo(() => {
    const totalPayees = reports.reduce((sum, report) => sum + Number(report.payeeCount || 0), 0);

    return [
      { label: 'Total Audits', value: String(reports.length) },
      { label: 'Verified Reports', value: String(reports.length) },
      { label: 'Payees Reviewed', value: String(totalPayees) },
      { label: 'Compliance Rate', value: reports.length > 0 ? '100%' : '0%' },
    ];
  }, [reports]);

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
        title="Auditor Portal"
        description="Verify permissioned payroll reports with audit keys and proof metadata."
        action={
          <Link href={ROUTES.auditor.verify}>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Key className="mr-2 h-4 w-4" />
              Verify Audit Key
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickAction
          icon={<Key className="h-5 w-5 text-emerald-600" />}
          title="Verify Payroll"
          description="Enter an audit key"
          href={ROUTES.auditor.verify}
        />
        <QuickAction
          icon={<FileText className="h-5 w-5 text-emerald-600" />}
          title="Reports"
          description="Review unlocked reports"
          href={ROUTES.auditor.reports}
        />
        <QuickAction
          icon={<History className="h-5 w-5 text-emerald-600" />}
          title="Audit History"
          description="View audit activity"
          href={ROUTES.auditor.history}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                <p className="mt-1 text-sm text-slate-500">Reports unlocked in this session.</p>
              </div>

              <Link href={ROUTES.auditor.reports} className="text-sm text-emerald-600">
                View All
              </Link>
            </div>

            {reports.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-4 font-semibold text-slate-900">No audits yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Verify an audit key to unlock the first payroll report.
                </p>

                <Link href={ROUTES.auditor.verify}>
                  <Button className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700">
                    Verify Audit Key
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reports.slice(0, 5).map((report) => (
                  <Link
                    key={report.payrollRunId}
                    href={`${ROUTES.auditor.reports}/${report.payrollRunId}`}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">Payroll #{report.payrollRunId}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {report.companyName || 'Private company'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        {report.status || 'Verified'}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900">Audit access model</h3>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>Public proof links show only totals.</p>
              <p>Audit keys unlock full payroll detail.</p>
              <p>Employee links show only one payment.</p>
              <p>Audit logs record every access.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-500 hover:shadow-lg">
        <div className="rounded-lg bg-emerald-50 p-2">{icon}</div>
        <div className="text-left">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}
