'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, User, Wallet, X } from 'lucide-react';

import { AUDITOR, AUTH, DASHBOARD, EMPLOYEE, EMPLOYER, ROUTES } from '@/config';
import { useWallet } from '@/app/providers';

type UserInfo = {
  label: string;
  icon: 'Wallet' | 'User';
  type: string;
} | null;

interface NavbarProps {
  initialUserInfo: UserInfo;
}

let refreshCallback: (() => void) | null = null;

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 8)} ... ${wallet.slice(-8)}`;
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;

  return null;
}

function getUserInfoFromCookies(): UserInfo {
  const role = getCookie('zetaRole');
  const auditorSession = getCookie('auditorSession');
  const wallet = getCookie('zetaWallet');

  if ((role === EMPLOYER || role === EMPLOYEE) && wallet) {
    return {
      label: shortWallet(wallet),
      icon: 'Wallet',
      type: role,
    };
  }

  if (role === AUDITOR && auditorSession) {
    try {
      const session = JSON.parse(decodeURIComponent(auditorSession));

      return {
        label: session.email || 'auditor@company.com',
        icon: 'User',
        type: AUDITOR,
      };
    } catch {
      return {
        label: AUDITOR,
        icon: 'User',
        type: AUDITOR,
      };
    }
  }

  return null;
}

export function Navbar({ initialUserInfo }: NavbarProps) {
  const pathname = usePathname();
  const { disconnect } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>(initialUserInfo);

  const isDashboard = pathname?.startsWith(DASHBOARD);
  const isAuthPage = pathname === AUTH || pathname?.startsWith(`${AUTH}/`);
  const isLanding = pathname === '/';
  const isConnected = Boolean(userInfo);

  useEffect(() => {
    const refresh = () => {
      window.queueMicrotask(() => {
        setUserInfo(getUserInfoFromCookies());
      });
    };

    refresh();
    refreshCallback = refresh;

    const interval = window.setInterval(refresh, 1000);

    return () => {
      refreshCallback = null;
      window.clearInterval(interval);
    };
  }, []);

  function handleGetStarted() {
    window.location.href = AUTH;
  }

  function handleLogout() {
    disconnect();
    setIsOpen(false);
    setUserInfo(null);
  }

  function getDashboardHref() {
    if (userInfo?.type === EMPLOYER) return ROUTES.employer.root;
    if (userInfo?.type === EMPLOYEE) return ROUTES.employee.root;
    return ROUTES.auditor.root;
  }

  function renderNavLinks() {
    if (isAuthPage) return null;
    if (!isConnected || !userInfo) return null;

    if (userInfo.type === EMPLOYER) {
      return (
        <>
          <Link
            href={ROUTES.employer.root}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
          >
            Dashboard
          </Link>

          <Link
            href={ROUTES.employer.employees}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
          >
            Employees
          </Link>

          <Link
            href={ROUTES.employer.payroll}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
          >
            Payroll
          </Link>
        </>
      );
    }

    if (userInfo.type === EMPLOYEE) {
      return (
        <>
          <Link
            href={ROUTES.employee.root}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
          >
            Dashboard
          </Link>

          <Link
            href={ROUTES.employee.payroll}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
          >
            Payroll
          </Link>
        </>
      );
    }

    return (
      <Link
        href={ROUTES.auditor.root}
        className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
      >
        Dashboard
      </Link>
    );
  }

  function renderLaunchButton() {
    if (isAuthPage) return null;

    if (isConnected && userInfo) {
      const Icon = userInfo.icon === 'Wallet' ? Wallet : User;

      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
            <Icon className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-600">{userInfo.label}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-red-500 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleGetStarted}
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700"
      >
        Get Started
      </button>
    );
  }

  function renderMobileNavLinks() {
    if (isAuthPage) return null;

    if (isConnected && userInfo) {
      return (
        <>
          <Link
            href={getDashboardHref()}
            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>

          {userInfo.type === EMPLOYER && (
            <>
              <Link
                href={ROUTES.employer.employees}
                className="text-sm font-medium text-slate-600 hover:text-emerald-600"
                onClick={() => setIsOpen(false)}
              >
                Employees
              </Link>

              <Link
                href={ROUTES.employer.payroll}
                className="text-sm font-medium text-slate-600 hover:text-emerald-600"
                onClick={() => setIsOpen(false)}
              >
                Payroll
              </Link>
            </>
          )}

          {userInfo.type === EMPLOYEE && (
            <Link
              href={ROUTES.employee.payroll}
              className="text-sm font-medium text-slate-600 hover:text-emerald-600"
              onClick={() => setIsOpen(false)}
            >
              Payroll
            </Link>
          )}

          <Link
            href="/wallet"
            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
            onClick={() => setIsOpen(false)}
          >
            Wallet
          </Link>

          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
            <span>{userInfo.label}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </>
      );
    }

    return (
      <>
        {!isLanding && (
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
        )}

        <Link
          href="/wallet"
          className="text-sm font-medium text-slate-600 hover:text-emerald-600"
          onClick={() => setIsOpen(false)}
        >
          Wallet
        </Link>

        <button
          type="button"
          onClick={() => {
            handleGetStarted();
            setIsOpen(false);
          }}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-center text-sm font-semibold text-white"
        >
          Get Started
        </button>
      </>
    );
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 ${isDashboard ? 'max-w-full' : 'max-w-[1560px] px-6 sm:px-8 lg:px-12 xl:px-16'}`}
      >
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <Image
              src="/logo.svg"
              alt="ZetaPay"
              width={36}
              height={36}
              priority
              className="h-10 w-10"
            />

            <div className="flex flex-col leading-none">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                Zeta<span className="text-emerald-600">Pay</span>
              </span>

              <span className="text-[10px] font-semibold tracking-[0.32em] text-slate-500 uppercase">
                Verified Payroll
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {renderNavLinks()}

            {!isAuthPage && (
              <Link
                href="/wallet"
                className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
              >
                Wallet
              </Link>
            )}

            {renderLaunchButton()}
          </div>

          {!isAuthPage && (
            <button
              type="button"
              className="text-slate-900 md:hidden"
              onClick={() => setIsOpen((value) => !value)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>

      {isOpen && !isAuthPage && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">{renderMobileNavLinks()}</div>
        </div>
      )}
    </nav>
  );
}

export const refreshNavbarGlobal = () => {
  refreshCallback?.();
};
