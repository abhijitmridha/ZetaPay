'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PayrollRunDetail } from '@/types/payroll';
import { Badge } from '@/components/ui/Badge';
import { ROUTES } from '@/config';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  User,
  Mail,
  Wallet,
  Hash,
} from 'lucide-react';
import Link from 'next/link';

export default function EmployeePayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const router = useRouter();
  const { id, runId } = use(params);
  const [payrollRun, setPayrollRun] = useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayrollRunDetail = useCallback(async (employeeId: string, payrollRunId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/payroll/${payrollRunId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch payroll run details');
      }

      const data = await response.json();
      setPayrollRun(data);
    } catch (err) {
      console.error('Error fetching payroll run details:', err);
      setError('Failed to load payroll run details');
    } finally {
      setLoading(false);
    }
  }, []);

  const formatDate = (date: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return null;
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { variant: 'success' | 'warning' | 'error' | 'default'; label: string }
    > = {
      completed: { variant: 'success', label: 'Completed' },
      pending: { variant: 'warning', label: 'Pending' },
      failed: { variant: 'error', label: 'Failed' },
      processing: { variant: 'default', label: 'Processing' },
    };

    const statusInfo = statusMap[status?.toLowerCase()] || {
      variant: 'default',
      label: status || 'Unknown',
    };

    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  useEffect(() => {
    if (!id || !runId) return;

    let isMounted = true;

    const triggerFetch = async () => {
      await Promise.resolve();
      if (isMounted) {
        await fetchPayrollRunDetail(id, runId);
      }
    };

    triggerFetch();

    return () => {
      isMounted = false;
    };
  }, [id, runId, fetchPayrollRunDetail]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !payrollRun) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Error</p>
        <p>{error || 'Payroll run not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payroll #${payrollRun.payrollRunId}`}
        description={`Payroll details for ${payrollRun.employee.fullName}`}
        backLink={{
          href: ROUTES.employer.employeePayroll(parseInt(id)),
          label: 'Back to Payroll History',
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-500">Status:</span>
          {getStatusBadge(payrollRun.status)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Gross Salary</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(payrollRun.grossSalary)}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Net Salary</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(payrollRun.netSalary)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tax Withheld</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(payrollRun.taxWithheld)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Transaction</p>
                <p className="max-w-[120px] truncate font-mono text-sm text-slate-600">
                  {payrollRun.txHash ? `0x...${payrollRun.txHash.slice(-6)}` : 'N/A'}
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 p-2">
                <Hash className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium">{payrollRun.employee.fullName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium">{payrollRun.employee.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wallet className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Wallet</p>
                <p className="truncate font-mono text-sm">
                  {payrollRun.employee.walletAddress || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="info" className="mt-0.5">
                {payrollRun.employee.type || 'Employee'}
              </Badge>
              <div>
                <p className="text-sm text-slate-500">Type</p>
                <p className="font-medium capitalize">{payrollRun.employee.type || 'Employee'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Run Date</p>
                <p className="font-medium">{formatDate(payrollRun.payrollRun.runDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Period Start</p>
                <p className="font-medium">{formatDate(payrollRun.payrollRun.periodStart)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Period End</p>
                <p className="font-medium">{formatDate(payrollRun.payrollRun.periodEnd)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Processed At</p>
                <p className="font-medium">
                  {payrollRun.processedAt ? formatDate(payrollRun.processedAt) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span className="text-slate-600">Gross Salary</span>
              <span className="font-medium">{formatCurrency(payrollRun.grossSalary)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span className="text-slate-600">Tax Withheld</span>
              <span className="font-medium text-amber-600">
                -{formatCurrency(payrollRun.taxWithheld)}
              </span>
            </div>
            <div className="flex justify-between py-2 pt-4">
              <span className="font-semibold text-slate-900">Net Salary</span>
              <span className="text-xl font-bold text-emerald-600">
                {formatCurrency(payrollRun.netSalary)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Link href={ROUTES.employer.employeePayroll(parseInt(id))}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </Link>
      </div>
    </div>
  );
}
