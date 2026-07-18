import type { Metadata } from 'next';

import { StellarWalletPanel } from '@/components/wallet/stellar-wallet-panel';

export const metadata: Metadata = {
  title: 'Stellar Wallet — Freighter Integration',
};

export default function WalletPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Stellar Wallet — Freighter Integration
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Detect, connect, and transact with Freighter on Stellar testnet.
        </p>
      </div>

      <StellarWalletPanel />
    </main>
  );
}
