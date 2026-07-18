'use client';

import { useRouter } from 'next/navigation';
import { Building2, Shield, UserRound } from 'lucide-react';
import { ROUTES } from '@/config';

export default function RoleSelection() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <Building2 className="h-7 w-7 text-emerald-600" />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">Choose Your Role</h1>

          <p className="mt-2 text-slate-500">Select how you want to proceed with ZetaPay</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <RoleCard
            icon={<Building2 className="h-6 w-6 text-emerald-600" />}
            title="Employer"
            description="Run payroll and manage employees"
            action="Connect Stellar Wallet"
            onClick={() => router.push(ROUTES.auth.employerConnect)}
          />

          <RoleCard
            icon={<UserRound className="h-6 w-6 text-sky-600" />}
            title="Employee"
            description="Claim shielded payroll deposits"
            action="Connect Stellar Wallet"
            tone="sky"
            onClick={() => router.push(ROUTES.auth.employeeConnect)}
          />

          <RoleCard
            icon={<Shield className="h-6 w-6 text-indigo-600" />}
            title="Auditor"
            description="Verify payroll with audit keys"
            action="Login with Email and Audit Key"
            tone="indigo"
            onClick={() => router.push(ROUTES.auth.auditorLogin)}
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  description,
  action,
  onClick,
  tone = 'emerald',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  tone?: 'emerald' | 'sky' | 'indigo';
}) {
  const toneClass = {
    emerald: 'hover:border-emerald-500 hover:bg-emerald-50/50 bg-emerald-50 text-emerald-600',
    sky: 'hover:border-sky-500 hover:bg-sky-50/50 bg-sky-50 text-sky-600',
    indigo: 'hover:border-indigo-500 hover:bg-indigo-50/50 bg-indigo-50 text-indigo-600',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 border-slate-200 p-6 text-center transition-all ${toneClass}`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white">
        {icon}
      </div>

      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <p className="mt-2 text-xs font-medium">{action}</p>
    </button>
  );
}
