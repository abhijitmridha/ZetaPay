'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import { API } from '@/config';
import Cookies from 'js-cookie';

interface PayrollHistoryItem {
  id: number;
  runDate: string;
  periodStart: string;
  periodEnd: string;
  totalGross: string;
  totalNet: string;
  status: string;
  auditKey: string;
  txHash: string;
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<PayrollHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const enterpriseId = Cookies.get('enterpriseId');
    if (!enterpriseId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API.payroll.root}?enterpriseId=${enterpriseId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch history');
      setRuns(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const triggerFetch = async () => {
      await Promise.resolve();
      if (isMounted) {
        await fetchHistory();
      }
    };

    triggerFetch();

    return () => {
      isMounted = false;
    };
  }, [fetchHistory]);

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (item: PayrollHistoryItem) => (
        <span className="font-medium text-slate-900">#{item.id}</span>
      ),
    },
    {
      key: 'runDate',
      header: 'Date',
      render: (item: PayrollHistoryItem) => (
        <span className="text-sm text-slate-600">
          {new Date(item.runDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (item: PayrollHistoryItem) => (
        <span className="text-sm text-slate-600">
          {new Date(item.periodStart).toLocaleDateString()} -{' '}
          {new Date(item.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'totalGross',
      header: 'Gross',
      render: (item: PayrollHistoryItem) => (
        <span className="font-medium text-slate-900">
          ${parseFloat(item.totalGross || '0').toFixed(2)}
        </span>
      ),
    },
    {
      key: 'totalNet',
      header: 'Net',
      render: (item: PayrollHistoryItem) => (
        <span className="font-medium text-emerald-600">
          ${parseFloat(item.totalNet || '0').toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PayrollHistoryItem) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.status === 'completed'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-yellow-50 text-yellow-600'
          }`}
        >
          {item.status}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment History"
        description="View all past payments"
        action={
          <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={fetchHistory}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {runs.length > 0 ? (
        <>
          <DataTable<PayrollHistoryItem> data={runs} columns={columns} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{runs.length}</p>
              <p className="text-sm text-slate-500">Total Runs</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {runs.filter((r) => r.status === 'completed').length}
              </p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                ${runs.reduce((sum, r) => sum + parseFloat(r.totalNet || '0'), 0).toFixed(2)}
              </p>
              <p className="text-sm text-slate-500">Total Paid</p>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Calendar className="h-12 w-12 text-slate-300" />}
          title="No payments found"
          description="Send your first payment to see history here"
        />
      )}
    </div>
  );
}
