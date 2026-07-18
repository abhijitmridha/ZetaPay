'use client';

import { RefreshCw, WifiOff, Wallet, Coins, CheckCircle2, CircleOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BalanceData, SignTransactionOptions } from '@/types/payroll';
import Cookies from 'js-cookie';

declare global {
  interface Window {
    freighterApi?: {
      openWallet?: () => void;
      connect?: () => Promise<{ publicKey: string }>;
      getPublicKey?: () => Promise<string>;
      isConnected?: () => Promise<boolean>;
      signTransaction?: (tx: string, opts?: SignTransactionOptions) => Promise<string>;
    };
  }
}

interface WalletBalanceCardProps {
  balance: BalanceData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function WalletBalanceCard({ balance, loading, error, onRefresh }: WalletBalanceCardProps) {
  const walletAddress = Cookies.get('zetaWallet');

  return (
    <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white to-slate-50/50">
      <CardHeader className="border-b border-slate-100 bg-white/50 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-1.5">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-700">Wallet Balance</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {error ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-center">
            <div className="rounded-full bg-amber-100 p-2">
              <WifiOff className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">{error}</p>
              <p className="mt-0.5 text-xs text-amber-600">Connect your wallet to view balance</p>
            </div>
          </div>
        ) : balance ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white/60 px-4 py-3 transition-colors hover:bg-white">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Coins className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">XLM</p>
                  <p className="text-lg font-bold text-slate-900">
                    {parseFloat(balance.xlm || '0').toFixed(4)}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">Stellar Lumens</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white/60 px-4 py-3 transition-colors hover:bg-white">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                    USDC
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    ${parseFloat(balance.usdc || '0').toFixed(2)}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">USD Coin</span>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              {balance.isFunded ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">Wallet Funded</span>
                  <span className="ml-auto text-xs text-slate-400">Ready for transactions</span>
                </>
              ) : (
                <>
                  <CircleOff className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700">No Funds Detected</span>
                  <span className="ml-auto text-xs text-slate-400">Add funds to get started</span>
                </>
              )}
            </div>

            {walletAddress && (
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Connected Wallet</p>
                  <span className="text-xs text-emerald-600">Active</span>
                </div>
                <p className="mt-0.5 truncate font-mono text-sm text-slate-700">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="rounded-full bg-slate-100 p-3">
              <Wallet className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Loading balance...</p>
            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-400" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
