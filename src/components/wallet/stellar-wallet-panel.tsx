'use client';

import { useEffect, useState } from 'react';
import { Loader2, ExternalLink, Wallet, RefreshCw, Send, LogOut } from 'lucide-react';

import { detectFreighter } from '@/lib/stellar-wallet';
import { useStellarWalletDemo } from '@/hooks/use-stellar-wallet-demo';

interface TxFeedback {
  status: 'success' | 'error';
  message: string;
  hash?: string;
}

export function StellarWalletPanel() {
  const wallet = useStellarWalletDemo();

  const [freighterDetected, setFreighterDetected] = useState<boolean | null>(null);
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<TxFeedback | null>(null);

  useEffect(() => {
    detectFreighter().then(setFreighterDetected);
  }, []);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!destination || !amount) {
      setFeedback({ status: 'error', message: 'Enter a destination address and amount.' });
      return;
    }

    setIsSending(true);

    try {
      const { hash } = await wallet.sendXlm(destination, amount);
      setFeedback({ status: 'success', message: 'Transaction sent!', hash });
      setDestination('');
      setAmount('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed.';
      setFeedback({ status: 'error', message });
    } finally {
      setIsSending(false);
    }
  }

  if (freighterDetected === null) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!freighterDetected) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Wallet className="mx-auto mb-4 h-10 w-10 text-slate-400" />
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Freighter not detected</h2>
        <p className="mb-6 text-sm text-slate-600">
          Install the Freighter browser extension to connect a Stellar wallet.
        </p>
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
        >
          Install Freighter
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  if (!wallet.isConnected) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Wallet className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Connect your wallet</h2>
        <p className="mb-6 text-sm text-slate-600">
          Freighter is installed. Connect to view your testnet balance and send XLM.
        </p>

        <button
          type="button"
          onClick={wallet.connect}
          disabled={wallet.isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {wallet.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Connect Wallet
        </button>

        {wallet.error && <p className="mt-4 text-sm text-red-600">{wallet.error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500 uppercase">Connected Address</h2>
          <button
            type="button"
            onClick={wallet.disconnect}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-red-500 hover:text-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>

        <p className="mb-6 rounded-lg bg-slate-50 p-3 font-mono text-sm break-all text-slate-800">
          {wallet.address}
        </p>

        <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase">XLM Balance</p>
            <p className="text-2xl font-bold text-emerald-900">
              {wallet.balance ? `${wallet.balance} XLM` : '0 XLM (account not funded)'}
            </p>
          </div>

          <button
            type="button"
            onClick={wallet.refreshBalance}
            disabled={wallet.isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 transition-all hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {wallet.isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh Balance
          </button>
        </div>

        {wallet.error && <p className="mt-4 text-sm text-red-600">{wallet.error}</p>}
      </div>

      <form
        onSubmit={handleSend}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2 className="text-sm font-semibold text-slate-500 uppercase">Send XLM</h2>

        <div>
          <label htmlFor="destination" className="mb-1 block text-xs font-medium text-slate-600">
            Destination Address
          </label>
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="G..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="amount" className="mb-1 block text-xs font-medium text-slate-600">
            Amount (XLM)
          </label>
          <input
            id="amount"
            type="number"
            min="0"
            step="0.0000001"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send XLM
        </button>

        {feedback && (
          <div
            className={
              feedback.status === 'success'
                ? 'rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800'
                : 'rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800'
            }
          >
            <p className="font-medium">
              {feedback.status === 'success'
                ? `Transaction sent! Hash: ${feedback.hash}`
                : feedback.message}
            </p>

            {feedback.status === 'success' && feedback.hash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${feedback.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 underline"
              >
                View on Stellar Expert
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
