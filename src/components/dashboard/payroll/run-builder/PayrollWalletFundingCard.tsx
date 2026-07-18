'use client';

import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  Coins,
  RefreshCw,
  Wallet,
  WifiOff,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BalanceData } from '@/types/payroll';

function formatWallet(address?: string | null) {
  if (!address) return 'No wallet connected';
  if (address.length < 16) return address;

  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

function formatAmount(value: number, decimals = 2) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function PayrollWalletFundingCard({
  balance,
  loading,
  error,
  walletAddress,
  requiredXlm,
  requiredUsdc,
  onRefresh,
}: {
  balance: BalanceData | null;
  loading: boolean;
  error: string | null;
  walletAddress?: string | null;
  requiredXlm: number;
  requiredUsdc: number;
  onRefresh: () => void;
}) {
  const availableXlm = balance ? Number(balance.xlm || 0) : 0;
  const availableUsdc = balance ? Number(balance.usdc || 0) : 0;

  const xlmRemaining = availableXlm - requiredXlm;
  const usdcRemaining = availableUsdc - requiredUsdc;

  const hasEnoughXlm = xlmRemaining >= 0;
  const hasEnoughUsdc = usdcRemaining >= 0;
  const hasSelectedPayroll = requiredXlm > 0 || requiredUsdc > 0;
  const fullyFunded = balance && hasEnoughXlm && hasEnoughUsdc;

  return (
    <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
      <CardHeader className="border-b border-slate-100 bg-white/70 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-50 p-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-800">Employer Wallet</CardTitle>
          </div>

          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <WifiOff className="mx-auto h-6 w-6 text-amber-600" />
            <p className="mt-2 text-sm font-medium text-amber-800">{error}</p>
            <p className="mt-1 text-xs text-amber-600">
              Connect your employer wallet to check available funds.
            </p>
          </div>
        ) : balance ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Connected wallet</p>
              <p className="mt-1 truncate font-mono text-sm font-medium text-slate-700">
                {formatWallet(walletAddress || balance.wallet)}
              </p>
            </div>

            <div className="grid gap-3">
              <BalanceLine
                icon={<Coins className="h-4 w-4 text-blue-600" />}
                label="XLM available"
                available={`${formatAmount(availableXlm, 4)} XLM`}
                required={`${formatAmount(requiredXlm, 4)} required`}
                remaining={`${formatAmount(xlmRemaining, 4)} remaining`}
                funded={hasEnoughXlm}
                active={requiredXlm > 0}
              />

              <BalanceLine
                icon={<Wallet className="h-4 w-4 text-emerald-600" />}
                label="USDC available"
                available={`${formatAmount(availableUsdc, 2)} USDC`}
                required={`${formatAmount(requiredUsdc, 2)} required`}
                remaining={`${formatAmount(usdcRemaining, 2)} remaining`}
                funded={hasEnoughUsdc}
                active={requiredUsdc > 0}
              />
            </div>

            <div
              className={
                fullyFunded
                  ? 'flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
                  : hasSelectedPayroll
                    ? 'flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700'
                    : 'flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600'
              }
            >
              {fullyFunded ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : hasSelectedPayroll ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CircleOff className="h-4 w-4" />
              )}

              <span className="font-medium">
                {fullyFunded
                  ? 'Payroll is fully funded'
                  : hasSelectedPayroll
                    ? 'Payroll needs more funds'
                    : 'Select payees to check funding'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="rounded-full bg-slate-100 p-3">
              <Wallet className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Loading wallet balance...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceLine({
  icon,
  label,
  available,
  required,
  remaining,
  funded,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  available: string;
  required: string;
  remaining: string;
  funded: boolean;
  active: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-50 p-2">{icon}</div>
          <div>
            <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
            <p className="mt-1 text-base font-bold text-slate-900">{available}</p>
          </div>
        </div>

        {active && (
          <span
            className={
              funded
                ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700'
            }
          >
            {funded ? 'Enough' : 'Low'}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{required}</span>
        <span>{remaining}</span>
      </div>
    </div>
  );
}
