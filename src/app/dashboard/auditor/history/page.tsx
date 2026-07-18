'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, FileWarning, History, Search, ShieldCheck } from 'lucide-react';

import { API } from '@/config';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

type AuditLogMetadata = {
  auditorEmail?: string;
  companyName?: string;
  payrollRunId?: number;
  source?: string;
};

type AuditHistoryItem = {
  id: number;
  action: string;
  status: string | null;
  auditKey: string;
  payrollRunId: number | null;
  enterpriseId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  metadata?: AuditLogMetadata | null;
};

export default function AuditorHistoryPage() {
  const [items, setItems] = useState<AuditHistoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const response = await fetch(API.audit.history);
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error || body.message || 'Failed to load audit history');
        }

        setItems(Array.isArray(body.records) ? body.records : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load audit history');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const stats = useMemo(() => {
    return {
      total: items.length,
      verified: items.filter((item) => item.status === 'verified').length,
      payrollViews: items.filter((item) => item.action === 'view_payroll').length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return items;

    return items.filter((item) => {
      return (
        String(item.payrollRunId || '').includes(normalized) ||
        item.action.toLowerCase().includes(normalized) ||
        (item.status || '').toLowerCase().includes(normalized) ||
        (item.metadata?.companyName || '').toLowerCase().includes(normalized) ||
        (item.metadata?.auditorEmail || '').toLowerCase().includes(normalized)
      );
    });
  }, [items, query]);

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
        title="Audit History"
        description="Review payroll audit access events and verification activity."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total Events" value={`${stats.total}`} />
        <Metric label="Verified" value={`${stats.verified}`} />
        <Metric label="Payroll Views" value={`${stats.payrollViews}`} />
      </div>

      <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by payroll id, company, auditor, action, or status"
              className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pr-4 pl-11 text-sm transition outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-10 text-center">
            <FileWarning className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No audit events found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Verify an audit key to create the first audit history entry.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_160px_160px_180px] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-2xl bg-emerald-50 p-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      </div>

                      <p className="font-semibold text-slate-900">{formatAction(item.action)}</p>

                      <StatusBadge status={item.status} />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {item.metadata?.companyName || 'Private company'}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-400">
                      Auditor: {item.metadata?.auditorEmail || 'Unknown auditor'}
                    </p>
                  </div>

                  <Info
                    label="Payroll"
                    value={item.payrollRunId ? `#${item.payrollRunId}` : 'N/A'}
                  />

                  <Info label="IP Address" value={item.ipAddress || 'Unknown'} />

                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3">
            <History className="h-5 w-5 text-emerald-600" />
          </div>

          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
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

function StatusBadge({ status }: { status: string | null }) {
  const normalized = status || 'pending';

  const className =
    normalized === 'verified'
      ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
      : normalized === 'failed'
        ? 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700'
        : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700';

  return <span className={className}>{normalized}</span>;
}

function formatAction(action: string) {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
