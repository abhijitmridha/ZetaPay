'use client';

import { EMPLOYEE, FREELANCER, CONTRACTOR, VENDOR, CONSULTANT } from '@/config';
import { PersonStatsProps } from '@/types/person';

export function PersonStats({ people }: PersonStatsProps) {
  const stats = {
    total: people.length,
    employees: people.filter((p) => p.type === EMPLOYEE).length,
    contractors: people.filter((p) => p.type === FREELANCER || p.type === CONTRACTOR).length,
    vendors: people.filter((p) => p.type === VENDOR || p.type === CONSULTANT).length,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        <p className="text-sm text-slate-500">Total People</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-2xl font-bold text-emerald-600">{stats.employees}</p>
        <p className="text-sm text-slate-500">Employees</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-2xl font-bold text-indigo-600">{stats.contractors}</p>
        <p className="text-sm text-slate-500">Freelancers/Contractors</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-2xl font-bold text-purple-600">{stats.vendors}</p>
        <p className="text-sm text-slate-500">Vendors/Consultants</p>
      </div>
    </div>
  );
}
