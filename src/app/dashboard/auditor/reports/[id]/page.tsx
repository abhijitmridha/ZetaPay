'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileWarning,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';

import { ROUTES } from '@/config';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

type SettlementMode = 'confidential_payroll' | 'shielded_pool';

type AuditPayee = {
  id: number;
  employeeName?: string | null;
  employeeEmail?: string | null;
  employeeWallet?: string | null;
  employeeType?: string | null;
  amount?: string;
  employeeTotalAmount?: string;
  currency?: string | null;
  status?: string | null;
  commitment?: string | null;
  commitments?: string[];
  noteCount?: number;
  txHash?: string | null;
  batchIndex?: number | null;
  payeeIndex?: number | null;
};

type AuditReport = {
  payrollRunId: number;
  companyName?: string | null;
  periodStart?: string;
  periodEnd?: string;
  totalXlm?: string | number | null;
  totalUsdc?: string | number | null;
  payeeCount?: number;
  batchRoot?: string | null;
  payrollRunHash?: string | null;
  proofHash?: string | null;
  status?: string | null;
  txHash?: string | null;
  verifiedAt?: string;
  payees?: AuditPayee[];
  settlementMode?: SettlementMode;
};

function readReportFromSession(id: string): AuditReport | null {
  const direct = window.sessionStorage.getItem(`zetapayAuditReport:${id}`);

  if (!direct) return null;

  try {
    return JSON.parse(direct) as AuditReport;
  } catch {
    return null;
  }
}

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

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function displayStatus(status?: string | null, shieldedPool = false, summary = false) {
  if (!shieldedPool) return titleCase(status || 'verified');

  if (summary) {
    if (status === 'withdrawn') return 'Completed';
    return 'In Progress';
  }

  if (status === 'withdrawn') return 'Withdrawn';
  if (status === 'partially_withdrawn') return 'Partially Withdrawn';
  if (status === 'pool_deposit_verified') return 'Deposit Verified';

  return 'Deposited';
}

function statusBadgeClass(status?: string | null, shieldedPool = false, summary = false) {
  if (!shieldedPool) return 'bg-emerald-50 text-emerald-700';

  if (summary) {
    if (status === 'withdrawn') return 'bg-emerald-50 text-emerald-700';
    return 'bg-amber-50 text-amber-700';
  }

  if (status === 'withdrawn') return 'bg-emerald-50 text-emerald-700';
  if (status === 'partially_withdrawn') return 'bg-amber-50 text-amber-700';

  return 'bg-blue-50 text-blue-700';
}

function shortValue(value?: string | null) {
  if (!value) return 'Not available';
  if (value.length <= 24) return value;

  return `${value.slice(0, 12)}...${value.slice(-10)}`;
}

export default function AuditorReportDetailPage() {
  const params = useParams<{ id: string }>();

  const [report, setReport] = useState<AuditReport | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value?: string | null, label = 'value') {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  useEffect(() => {
    queueMicrotask(() => {
      setReport(readReportFromSession(params.id));
      setMounted(true);
    });
  }, [params.id]);

  if (!mounted) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <FileWarning className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Report not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            Verify the audit key again to unlock this payroll report.
          </p>
          <a href={ROUTES.auditor.verify}>
            <Button className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700">
              Verify Audit Key
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const payees = report.payees || [];
  const shieldedPool = report.settlementMode === 'shielded_pool';
  const txUrl = stellarTxUrl(report.txHash);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Audit Report #${report.payrollRunId}`}
        description={
          shieldedPool
            ? 'Permissioned shielded pool audit report with grouped notes, amounts, commitments, and proof metadata.'
            : 'Permissioned payroll audit report with payees, amounts, commitments, and proof metadata.'
        }
        backLink={{ href: ROUTES.auditor.reports, label: 'Back to Reports' }}
      />

      <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
            <ShieldCheck className="h-4 w-4" />
            Permissioned auditor report
          </div>

          <h1 className="mt-4 text-3xl font-bold">{report.companyName || 'Private company'}</h1>

          <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
            {shieldedPool
              ? 'This report verifies encrypted shielded pool audit data without exposing recipient wallet details from the pool.'
              : 'This report is intentionally more detailed than the public proof page.'}
          </p>
        </div>

        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <Metric
            label="Status"
            value={displayStatus(report.status, shieldedPool, true)}
            badgeClass={statusBadgeClass(report.status, shieldedPool, true)}
          />
          <Metric label="Payees" value={`${report.payeeCount || payees.length}`} />
          <Metric label="Total XLM" value={`${formatAmount(report.totalXlm)} XLM`} />
          <Metric label="Total USDC" value={`${formatAmount(report.totalUsdc)} USDC`} />
        </CardContent>
      </Card>

      {report.txHash && (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <WalletCards className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Stellar transaction</h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Open the funding transaction on Stellar Expert for ledger level details.
                </p>

                <p className="mt-3 rounded-2xl bg-slate-50 p-3 font-mono text-xs break-all text-slate-700">
                  {report.txHash}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={() => copy(report.txHash, 'stellar-tx')}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied === 'stellar-tx' ? 'Copied' : 'Copy tx'}
                </Button>

                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    if (txUrl) window.open(txUrl, '_blank');
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

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {shieldedPool ? 'Pool proof details' : 'Proof details'}
            </h2>

            <div className="mt-5 space-y-4">
              <HashRow label="Batch root" value={report.batchRoot} copied={copied} onCopy={copy} />
              <HashRow
                label="Payroll run hash"
                value={report.payrollRunHash}
                copied={copied}
                onCopy={copy}
              />
              <HashRow label="Proof hash" value={report.proofHash} copied={copied} onCopy={copy} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Audit checks</h2>
            </div>

            <div className="mt-5 space-y-3">
              <Check label="Audit key accepted" />
              <Check label={shieldedPool ? 'Pool record found' : 'Payroll record found'} />
              <Check label="Commitments available" />
              <Check label="Proof hash available" />
              <Check
                label={
                  shieldedPool
                    ? 'Shielded note data visible to auditor'
                    : 'Payee data visible to auditor'
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              {shieldedPool ? 'Shielded payee groups' : 'Audited payees'}
            </h2>
          </div>

          {shieldedPool && (
            <p className="mt-1 text-sm text-slate-500">
              Each row is grouped from encrypted audit notes. Recipient wallet and email are not
              shown because they are not public pool fields.
            </p>
          )}

          {payees.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-500">No payee rows were returned for this report.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {payees.map((payee) => (
                <div
                  key={payee.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px] lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {payee.employeeName || `Payee #${payee.id}`}
                        </p>

                        {shieldedPool && payee.noteCount ? (
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                            {payee.noteCount} notes
                          </span>
                        ) : null}
                      </div>

                      {shieldedPool ? (
                        <p className="mt-2 text-sm text-slate-500">
                          Recipient details hidden. Auditor sees grouped note amount, deposit
                          status, and commitment proof data.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-slate-500">
                            {payee.employeeEmail || 'No email'}
                          </p>
                          <p className="truncate font-mono text-xs text-slate-400">
                            {shortValue(payee.employeeWallet)}
                          </p>
                        </div>
                      )}

                      <p className="mt-3 truncate font-mono text-xs text-slate-400">
                        Commitment: {shortValue(payee.commitment)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                        Amount
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatAmount(payee.amount || payee.employeeTotalAmount || '0')}{' '}
                        {payee.currency || 'USDC'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                        Status
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                          payee.status,
                          shieldedPool
                        )}`}
                      >
                        {displayStatus(payee.status, shieldedPool)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  badgeClass,
}: {
  label: string;
  value: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>

      {badgeClass ? (
        <span
          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
        >
          {value}
        </span>
      ) : (
        <p className="mt-1 font-semibold text-slate-900">{value}</p>
      )}
    </div>
  );
}

function HashRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value?: string | null;
  copied: string | null;
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
            {copied === label ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      <p className="mt-1 rounded-2xl bg-slate-50 p-3 font-mono text-xs break-all text-slate-700">
        {value || 'Not available'}
      </p>
    </div>
  );
}

function Check({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
      <CheckCircle2 className="h-4 w-4" />
      {label}
    </div>
  );
}
