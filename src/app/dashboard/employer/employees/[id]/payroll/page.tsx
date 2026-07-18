'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { API, ROUTES } from '@/config';
import Link from 'next/link';
import { DollarSign } from 'lucide-react';

interface PayrollHistory {
  id: number;
  payrollRunId: number;
  grossSalary: string;
  netSalary: string;
  taxWithheld: string;
  status: string;
  processedAt: string;
  txHash: string;
  payrollRun: {
    runDate: string;
    periodStart: string;
    periodEnd: string;
    status: string;
  };
}

interface Employee {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  type: string;
}

export default function EmployeePayrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [payrollHistory, setPayrollHistory] = useState<PayrollHistory[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalPayrolls: 0,
    totalPaid: 0,
    averagePayment: 0,
  });

  const fetchEmployeePayroll = useCallback(async (id: string) => {
    try {
      const response = await fetch(API.employees.payroll(id));

      if (!response.ok) {
        throw new Error('Failed to fetch payroll history');
      }

      const data = await response.json();

      setEmployee(data.employee);
      setPayrollHistory(data.payrollHistory || []);
      setSummary(
        data.summary || {
          totalPayrolls: 0,
          totalPaid: 0,
          averagePayment: 0,
        }
      );
    } catch (error) {
      console.error('Error fetching employee payroll:', error);
      setPayrollHistory([]);
      setSummary({ totalPayrolls: 0, totalPaid: 0, averagePayment: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const triggerFetch = async () => {
      await Promise.resolve();
      if (isMounted) {
        await fetchEmployeePayroll(id);
      }
    };

    triggerFetch();

    return () => {
      isMounted = false;
    };
  }, [id, fetchEmployeePayroll]);

  const columns = [
    {
      key: 'payrollRunId',
      header: 'Payroll #',
      render: (item: PayrollHistory) => (
        <Link href={ROUTES.employer.employeePayrollRun(id, item.payrollRunId)}>
          <span className="font-medium text-emerald-600 hover:underline">#{item.payrollRunId}</span>
        </Link>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (item: PayrollHistory) => (
        <span className="text-sm text-slate-600">
          {new Date(item.payrollRun.runDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (item: PayrollHistory) => (
        <span className="text-sm text-slate-600">
          {new Date(item.payrollRun.periodStart).toLocaleDateString()} -{' '}
          {new Date(item.payrollRun.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'grossSalary',
      header: 'Gross',
      render: (item: PayrollHistory) => (
        <span className="font-medium text-slate-900">
          ${parseFloat(item.grossSalary || '0').toFixed(2)}
        </span>
      ),
    },
    {
      key: 'netSalary',
      header: 'Net',
      render: (item: PayrollHistory) => (
        <span className="font-medium text-emerald-600">
          ${parseFloat(item.netSalary || '0').toFixed(2)}
        </span>
      ),
    },
    {
      key: 'taxWithheld',
      header: 'Tax',
      render: (item: PayrollHistory) => (
        <span className="text-sm text-slate-500">
          ${parseFloat(item.taxWithheld || '0').toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PayrollHistory) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            item.status === 'completed' || item.status === 'Completed'
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
        title={`${employee?.fullName || 'Employee'} - Payroll History`}
        description={`Payroll transactions for ${employee?.email || ''}`}
        backLink={{ href: ROUTES.employer.employees, label: 'Back to People' }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Payrolls</p>
          <p className="text-2xl font-bold text-slate-900">{summary.totalPayrolls}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-600">${summary.totalPaid.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Average Payroll</p>
          <p className="text-2xl font-bold text-slate-900">${summary.averagePayment.toFixed(2)}</p>
        </div>
      </div>

      {payrollHistory.length > 0 ? (
        <DataTable<PayrollHistory> data={payrollHistory} columns={columns} />
      ) : (
        <EmptyState
          icon={<DollarSign className="h-12 w-12 text-slate-300" />}
          title="No payroll found"
          description="This employee hasn't been paid yet."
        />
      )}
    </div>
  );
}
