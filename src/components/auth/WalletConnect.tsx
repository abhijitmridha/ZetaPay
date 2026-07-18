'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Building2, CheckCircle, UserRound, Wallet } from 'lucide-react';

import { AUTH, ROUTES } from '@/config';
import { isFreighterAvailable, getFreighterPublicKey } from '@/lib/stellar/freighter';
import { useWallet } from '@/app/providers';

type WalletConnectMode = 'employer' | 'employee';

type WalletConnectProps = {
  mode: WalletConnectMode;
};

const copy = {
  employer: {
    icon: <Building2 className="h-7 w-7 text-emerald-600" />,
    title: 'Connect Employer Wallet',
    description: 'Connect your Stellar wallet to run payroll',
    endpoint: '/api/auth/session',
    redirectTo: ROUTES.employer.root,
    success: 'Employer wallet connected',
  },
  employee: {
    icon: <UserRound className="h-7 w-7 text-sky-600" />,
    title: 'Connect Employee Wallet',
    description: 'Connect the wallet registered by your employer to claim payroll',
    endpoint: '/api/auth/employee-session',
    redirectTo: ROUTES.employee.root,
    success: 'Employee wallet connected',
  },
};

export default function WalletConnect({ mode }: WalletConnectProps) {
  const router = useRouter();
  const { refreshUser } = useWallet();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const content = copy[mode];

  async function handleConnect() {
    setError(null);
    setIsConnecting(true);

    try {
      const available = await isFreighterAvailable();

      if (!available) {
        setError(
          'Freighter wallet is not active or installed. Please install the extension from freighter.app to continue.'
        );
        return;
      }

      const publicKey = await getFreighterPublicKey();
      setWalletAddress(publicKey);

      const response = await fetch(content.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || body.message || 'Wallet authorization failed.');
      }

      refreshUser(publicKey);
      setIsConnected(true);
      router.refresh();

      window.setTimeout(() => {
        router.push(content.redirectTo);
      }, 800);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'Failed to authenticate wallet. Please approve the prompt and try again.'
      );
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <button
          type="button"
          onClick={() => router.push(AUTH)}
          className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
            {content.icon}
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">{content.title}</h1>
          <p className="mt-2 text-slate-500">{content.description}</p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {walletAddress && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">Connected Wallet</p>
            <p className="font-mono text-sm text-slate-700">
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {isConnected ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
              <p className="mt-2 font-semibold text-emerald-700">{content.success}</p>
              <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5" />
                    Connect Freighter Wallet
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-xs text-slate-400">
                  Supported: Freighter Wallet on Stellar Testnet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  <a
                    href="https://freighter.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    Install Freighter
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
