'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import {
  Activity,
  ArrowRight,
  Clock,
  FileText,
  Layers3,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';

import { StatsCard } from '@/components/ui/StatsCard';
import { QuickAction } from '@/components/ui/QuickAction';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ROUTES, API } from '@/config';
import type { Person } from '@/types/person';

type SettlementMode = 'confidential_payroll' | 'shielded_pool';

type EmployeeView = Pick<Person, 'id' | 'name' | 'wallet'> & {
  salary: number;
  status: 'Active' | 'Inactive' | 'Pending';
};

type SettingsState = {
  defaultSettlementMode: SettlementMode;
  useFixedDenominations: boolean;
};

interface ApiEmployeeRecord {
  id: number | string;
  fullName?: string;
  walletAddress?: string;
  salary?: string | number;
  status?: string;
  type?: string | null;
}

const defaultSettings: SettingsState = {
  defaultSettlementMode: 'confidential_payroll',
  useFixedDenominations: true,
};

export default function EmployerDashboard() {
  const [employees, setEmployees] = useState<EmployeeView[]>([]);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    const enterpriseId = Cookies.get('enterpriseId');

    if (!enterpriseId) {
      setLoading(false);
      return;
    }

    try {
      const [employeesResponse, settingsResponse] = await Promise.all([
        fetch(API.employees.byEnterprise(Number.parseInt(enterpriseId, 10))),
        fetch(`/api/settings?enterpriseId=${enterpriseId}`),
      ]);

      const employeesData = await employeesResponse.json();

      const mapped: EmployeeView[] = (Array.isArray(employeesData) ? employeesData : []).map(
        (emp: ApiEmployeeRecord) => ({
          id: String(emp.id),
          name: emp.fullName || 'Unknown person',
          wallet: emp.walletAddress || 'No wallet',
          salary: emp.salary ? Number.parseFloat(String(emp.salary)) : 0,
          status: emp.status === 'active' ? 'Active' : 'Inactive',
        })
      );

      setEmployees(mapped);

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();

        setSettings({
          defaultSettlementMode:
            settingsData.defaultSettlementMode === 'shielded_pool'
              ? 'shielded_pool'
              : 'confidential_payroll',
          useFixedDenominations: settingsData.useFixedDenominations !== false,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void fetchDashboardData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchDashboardData]);

  const totalPayroll = useMemo(
    () => employees.reduce((sum, employee) => sum + employee.salary, 0),
    [employees]
  );

  const activePeople = employees.filter((employee) => employee.status === 'Active').length;
  const shieldedDefault = settings.defaultSettlementMode === 'shielded_pool';

  const stats = [
    {
      icon: Users,
      label: 'People',
      value: employees.length,
    },
    {
      icon: shieldedDefault ? LockKeyhole : ShieldCheck,
      label: 'Default mode',
      value: shieldedDefault ? 'Shielded pool' : 'Confidential',
    },
    {
      icon: Layers3,
      label: 'Fixed notes',
      value: settings.useFixedDenominations ? 'Enabled' : 'Disabled',
    },
    {
      icon: Activity,
      label: 'Ready payees',
      value: activePeople,
    },
  ];

  const quickActions = [
    {
      icon: Send,
      title: 'Create payroll',
      description: shieldedDefault
        ? 'Fund the shielded pool with private withdrawal notes'
        : 'Generate proof, encrypt records, and settle payroll',
      href: ROUTES.employer.payrollNew,
    },
    {
      icon: Users,
      title: 'Manage people',
      description: 'Employees, freelancers, vendors, and contractors',
      href: ROUTES.employer.employees,
    },
    {
      icon: FileText,
      title: 'Payroll history',
      description: 'Review confidential and shielded pool payroll runs',
      href: ROUTES.employer.payroll,
    },
    {
      icon: UserPlus,
      title: 'Add person',
      description: 'Add a new payee wallet and profile',
      href: ROUTES.employer.addEmployee,
    },
  ];

  const columns = [
    { key: 'name', header: 'Name' },
    {
      key: 'wallet',
      header: 'Wallet',
      render: (item: EmployeeView) => (
        <span className="font-mono text-xs text-slate-500">
          {item.wallet.length > 14
            ? `${item.wallet.slice(0, 6)}…${item.wallet.slice(-6)}`
            : item.wallet}
        </span>
      ),
    },
    {
      key: 'salary',
      header: 'Payroll record',
      className: 'text-right',
      render: () => (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <LockKeyhole className="h-3 w-3" />
          Encrypted
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'text-right',
      render: (item: EmployeeView) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            item.status === 'Active'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
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
        title="Employer Dashboard"
        description="Manage confidential payroll, shielded pool funding, encrypted records, and Stellar settlement activity."
      />

      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-950 p-6 text-white shadow-xl shadow-emerald-900/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
              <Sparkles className="h-4 w-4" />
              Privacy preserving payroll
            </div>

            <h2 className="mt-4 max-w-2xl text-3xl font-bold">
              Run confidential payroll or fund a shielded pool for later employee withdrawals.
            </h2>

            <p className="mt-3 max-w-2xl text-sm text-emerald-50/80">
              Your current default is{' '}
              {shieldedDefault ? 'Shielded Payroll Pool' : 'Confidential Payroll'}. Payroll data is
              encrypted, and shielded pool runs use commitments instead of employee payout rows.
            </p>
          </div>

          <Link
            href={ROUTES.employer.payrollNew}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-lg hover:bg-emerald-50"
          >
            Start payroll
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <HeroPill
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Groth16 proof infrastructure"
          />
          <HeroPill icon={<LockKeyhole className="h-4 w-4" />} label="Shielded pool commitments" />
          <HeroPill
            icon={<WalletCards className="h-4 w-4" />}
            label="Freighter and Stellar ready"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.label}
            icon={<stat.icon className="h-4 w-4" />}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href}>
            <QuickAction
              icon={<action.icon className="h-5 w-5 text-emerald-600" />}
              title={action.title}
              description={action.description}
            />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent people</h3>
            <Link
              href={ROUTES.employer.employees}
              className="text-sm font-medium text-emerald-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {employees.length > 0 ? (
            <DataTable<EmployeeView> data={employees.slice(0, 5)} columns={columns} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No people added yet. Add your first payee to start payroll.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SideCard
            icon={<LockKeyhole className="h-5 w-5 text-emerald-600" />}
            title="Shielded pool ready"
            text="Pool payroll stores commitments and lets employees withdraw later with proof material."
          />

          <SideCard
            icon={<Layers3 className="h-5 w-5 text-emerald-600" />}
            title="Fixed denominations"
            text={
              settings.useFixedDenominations
                ? 'Enabled. Deposits split into standard note sizes to reduce amount leakage.'
                : 'Disabled. Deposits use direct payroll amounts.'
            }
          />

          <SideCard
            icon={<Clock className="h-5 w-5 text-emerald-600" />}
            title="Internal payroll estimate"
            text={`Estimated payroll total: $${totalPayroll.toLocaleString()}. This value stays inside the employer dashboard.`}
          />
        </div>
      </div>
    </div>
  );
}

function HeroPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-emerald-50 ring-1 ring-white/10">
      {icon}
      {label}
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

      <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}
