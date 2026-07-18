'use client';

import { useCallback, useState } from 'react';

import { connectWallet, getWalletAddress, signTx } from '@/lib/stellar-wallet';
import { fetchXlmBalance, buildPaymentXdr, submitSignedTx } from '@/lib/stellar-sdk';

export interface StellarWalletDemoState {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseStellarWalletDemo extends StellarWalletDemoState {
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  sendXlm: (to: string, amount: string) => Promise<{ hash: string }>;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Manages Freighter wallet connection state and Stellar testnet actions for the demo panel. */
export function useStellarWalletDemo(): UseStellarWalletDemo {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    const current = address ?? (await getWalletAddress());
    if (!current) return;

    setIsLoading(true);
    setError(null);

    try {
      const xlmBalance = await fetchXlmBalance(current);
      setBalance(xlmBalance);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to fetch XLM balance.'));
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const walletAddress = await connectWallet();
      setAddress(walletAddress);

      const xlmBalance = await fetchXlmBalance(walletAddress);
      setBalance(xlmBalance);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to connect wallet.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setError(null);
  }, []);

  const sendXlm = useCallback(
    async (to: string, amount: string): Promise<{ hash: string }> => {
      if (!address) {
        throw new Error('Wallet is not connected.');
      }

      setIsLoading(true);
      setError(null);

      try {
        const unsignedXdr = await buildPaymentXdr(address, to, amount);
        const signedXdr = await signTx(unsignedXdr);
        const result = await submitSignedTx(signedXdr);

        const xlmBalance = await fetchXlmBalance(address);
        setBalance(xlmBalance);

        return result;
      } catch (err: unknown) {
        const message = errorMessage(err, 'Failed to send XLM.');
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [address]
  );

  return {
    address,
    balance,
    isConnected: Boolean(address),
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  };
}
