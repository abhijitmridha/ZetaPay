'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Key,
  WalletCards,
  Banknote,
} from 'lucide-react';

import { ROUTES } from '@/config';
import { supabase } from '@/lib/supabase/client';

const employerNav = [
  { name: 'Dashboard', href: ROUTES.employer.root, icon: LayoutDashboard },
  { name: 'People', href: ROUTES.employer.employees, icon: Users },
  { name: 'Payroll', href: ROUTES.employer.payroll, icon: WalletCards },
  { name: 'History', href: ROUTES.employer.history, icon: History },
  { name: 'Settings', href: ROUTES.employer.settings, icon: Settings },
];

const employeeNav = [
  { name: 'Dashboard', href: ROUTES.employee.root, icon: LayoutDashboard },
  { name: 'Payroll', href: ROUTES.employee.payroll, icon: Banknote },
];

const auditorNav = [
  { name: 'Dashboard', href: ROUTES.auditor.root, icon: LayoutDashboard },
  { name: 'Verify', href: ROUTES.auditor.verify, icon: Key },
  { name: 'Reports', href: ROUTES.auditor.reports, icon: FileText },
  { name: 'History', href: ROUTES.auditor.history, icon: History },
];

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isEmployer = pathname.startsWith(ROUTES.employer.root);
  const isEmployee = pathname.startsWith(ROUTES.employee.root);
  const isAuditor = pathname.startsWith(ROUTES.auditor.root);

  const navItems = isEmployer
    ? employerNav
    : isEmployee
      ? employeeNav
      : isAuditor
        ? auditorNav
        : [];

  async function handleLogout() {
    if (isAuditor) {
      await supabase.auth.signOut();
      clearCookie('auditorSession');
      clearCookie('zetaRole');
      router.push(ROUTES.auth.auditorLogin);
      return;
    }

    clearCookie('zetaWallet');
    clearCookie('zetaRole');
    clearCookie('enterpriseId');
    clearCookie('employeeId');
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
        />
      )}

      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-20 left-4 z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-lg md:hidden"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-72 border-r border-slate-200 bg-white transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="mt-5 flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isRoot =
                  item.href === ROUTES.employer.root ||
                  item.href === ROUTES.employee.root ||
                  item.href === ROUTES.auditor.root;

                const isActive =
                  pathname === item.href || (!isRoot && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-slate-200 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <LogOut className="h-5 w-5 text-slate-500" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="ml-0 flex min-h-screen flex-col transition-all duration-300 md:ml-72">
        <main className="flex-1 px-4 pt-24 pb-6 sm:px-6 md:px-8 md:pt-24 md:pb-8">{children}</main>

        <footer className="relative overflow-hidden border-t border-white/10 bg-slate-950 px-4 py-5 text-xs text-slate-400 sm:px-6 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.14),transparent_34%),linear-gradient(to_bottom,#0f172a,#020617)]" />

          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-slate-300">ZetaPay Dashboard</p>
            <p>Private payroll verification</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
