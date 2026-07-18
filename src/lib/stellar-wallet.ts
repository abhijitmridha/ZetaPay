'use client';

import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';

export const STELLAR_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
export const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';

function readFreighterError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || fallback;

  if (typeof error === 'object') {
    const value = error as { message?: unknown; error?: unknown };

    if (typeof value.message === 'string') return value.message;
    if (typeof value.error === 'string') return value.error;
  }

  return fallback;
}

/** Detects whether the Freighter browser extension is installed. */
export async function detectFreighter(): Promise<boolean> {
  try {
    const result = await isConnected();
    return Boolean(result?.isConnected);
  } catch {
    return false;
  }
}

/** Requests wallet access from Freighter and returns the connected G-address. */
export async function connectWallet(): Promise<string> {
  try {
    const allowed = await isAllowed();

    if (allowed.error) {
      throw new Error(readFreighterError(allowed.error, 'Freighter access check failed.'));
    }

    if (!allowed.isAllowed) {
      const access = await requestAccess();

      if (access.error) {
        throw new Error(readFreighterError(access.error, 'Wallet connection was cancelled.'));
      }
    }

    const addressResult = await getAddress();

    if (addressResult.error) {
      throw new Error(readFreighterError(addressResult.error, 'Failed to read wallet address.'));
    }

    if (!addressResult.address) {
      throw new Error('Freighter did not return a wallet address.');
    }

    return addressResult.address;
  } catch (error: unknown) {
    if (error instanceof Error) throw error;
    throw new Error(readFreighterError(error, 'Failed to connect to Freighter.'));
  }
}

/** Returns the currently authorized wallet address, or null if not connected. */
export async function getWalletAddress(): Promise<string | null> {
  try {
    const allowed = await isAllowed();

    if (allowed.error || !allowed.isAllowed) return null;

    const addressResult = await getAddress();

    if (addressResult.error || !addressResult.address) return null;

    return addressResult.address;
  } catch {
    return null;
  }
}

/** Signs a transaction XDR with Freighter using the Stellar testnet passphrase. */
export async function signTx(xdr: string): Promise<string> {
  try {
    const result = await signTransaction(xdr, {
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    });

    if (result.error) {
      throw new Error(readFreighterError(result.error, 'Transaction signing was cancelled.'));
    }

    if (!result.signedTxXdr) {
      throw new Error('Freighter did not return a signed transaction.');
    }

    return result.signedTxXdr;
  } catch (error: unknown) {
    if (error instanceof Error) throw error;
    throw new Error(readFreighterError(error, 'Failed to sign transaction.'));
  }
}
