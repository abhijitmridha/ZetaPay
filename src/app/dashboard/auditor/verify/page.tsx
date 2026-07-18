'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';

import { API, ROUTES } from '@/config';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

type AuditReport = {
  payrollRunId: number;
  companyName?: string | null;
  periodStart?: string;
  periodEnd?: string;
  payeeCount?: number;
  totalXlm?: string;
  totalUsdc?: string;
  status?: string | null;
  verifiedAt?: string;
  payees?: unknown[];
  proof?: unknown;
};

type AuditVerifyResponse = {
  success?: boolean;
  payrollRunId?: number;
  report?: AuditReport;
  error?: string;
  message?: string;
};

function saveAuditReport(report: AuditReport) {
  const raw = window.sessionStorage.getItem('zetapayAuditReports');
  let existing: AuditReport[] = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      existing = Array.isArray(parsed) ? parsed : [];
    } catch {
      existing = [];
    }
  }

  const normalizedReport = {
    ...report,
    verifiedAt: report.verifiedAt || new Date().toISOString(),
  };

  const next = [
    normalizedReport,
    ...existing.filter((item) => item.payrollRunId !== normalizedReport.payrollRunId),
  ];

  window.sessionStorage.setItem('zetapayAuditReports', JSON.stringify(next));
  window.sessionStorage.setItem(
    `zetapayAuditReport:${normalizedReport.payrollRunId}`,
    JSON.stringify(normalizedReport)
  );
}

export default function AuditorVerifyPage() {
  const router = useRouter();

  const [auditKey, setAuditKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verifyAuditKey(event: React.FormEvent) {
    event.preventDefault();

    const cleanAuditKey = auditKey.trim();

    if (!cleanAuditKey) {
      setError('Audit key is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API.audit.verify, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditKey: cleanAuditKey }),
      });

      const result = (await response.json()) as AuditVerifyResponse;

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Audit key verification failed');
      }

      if (!result.report) {
        throw new Error('Audit report was not returned');
      }

      saveAuditReport(result.report);
      router.push(`${ROUTES.auditor.reports}/${result.report.payrollRunId}`);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : 'Audit key verification failed'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify Audit Key"
        description="Enter an employer provided audit key to unlock a permissioned payroll report."
        backLink={{ href: ROUTES.auditor.root, label: 'Back to Dashboard' }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
              <ShieldCheck className="h-4 w-4" />
              Permissioned payroll audit
            </div>

            <h2 className="mt-4 text-2xl font-bold">Unlock full payroll report</h2>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
              Audit key access shows payees, amounts, wallets, commitments, and proof metadata.
            </p>
          </div>

          <CardContent className="p-6">
            <form onSubmit={verifyAuditKey} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Audit key</label>
                <div className="relative">
                  <KeyRound className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={auditKey}
                    onChange={(event) => setAuditKey(event.target.value)}
                    placeholder="Enter audit key"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pr-4 pl-11 text-sm transition outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <Button
                disabled={loading}
                className="w-full bg-emerald-600 py-3 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify and Open Report'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <Lock className="h-6 w-6 text-emerald-600" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-900">Auditor view includes</h2>

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p>Full payee list</p>
              <p>Individual payroll amounts</p>
              <p>Wallet addresses</p>
              <p>Commitment and Merkle data</p>
              <p>Proof metadata and audit logs</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
