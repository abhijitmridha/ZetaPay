'use client';

import { isConnected, requestAccess, getAddress, signTransaction } from '@stellar/freighter-api';
import { Networks, TransactionBuilder } from '@stellar/stellar-sdk';

function networkPassphrase() {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

function readableFreighterError(error: unknown, fallback: string) {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message || fallback;

  if (typeof error === 'object') {
    const value = error as {
      message?: unknown;
      error?: unknown;
      code?: unknown;
    };

    if (typeof value.message === 'string') return value.message;
    if (typeof value.error === 'string') return value.error;

    if (typeof value.error === 'object' && value.error !== null) {
      const nested = value.error as { message?: unknown };
      if (typeof nested.message === 'string') return nested.message;
    }

    if (value.code === 4001) return 'Wallet connection was cancelled.';
  }

  return fallback;
}

function assertValidTransactionXdr(xdr: string, label: string) {
  try {
    TransactionBuilder.fromXDR(xdr, networkPassphrase());
  } catch {
    throw new Error(`${label} is not a valid Stellar transaction XDR.`);
  }
}

export async function isFreighterAvailable(): Promise<boolean> {
  try {
    const result = await isConnected();
    return Boolean(result?.isConnected);
  } catch {
    return false;
  }
}

export async function getFreighterPublicKey(): Promise<string> {
  try {
    const accessResult = await requestAccess();

    if (accessResult.error) {
      throw new Error(
        readableFreighterError(accessResult.error, 'Wallet connection was cancelled.')
      );
    }

    const result = await getAddress();

    if (result.error) {
      throw new Error(readableFreighterError(result.error, 'Failed to read wallet address.'));
    }

    if (!result.address) {
      throw new Error('Wallet connection was cancelled.');
    }

    return result.address;
  } catch (error: unknown) {
    throw new Error(
      readableFreighterError(error, 'Failed to connect with Freighter. Please try again.')
    );
  }
}

export async function signWithFreighter(xdr: string, userAddress: string): Promise<string> {
  try {
    assertValidTransactionXdr(xdr, 'Unsigned transaction XDR');

    const result = await signTransaction(xdr, {
      networkPassphrase: networkPassphrase(),
      address: userAddress,
    });

    if (result.error) {
      throw new Error(readableFreighterError(result.error, 'Transaction signing was cancelled.'));
    }

    const signedXdr = result.signedTxXdr;

    if (!signedXdr || typeof signedXdr !== 'string') {
      throw new Error('Freighter did not return a signed transaction XDR.');
    }

    assertValidTransactionXdr(signedXdr, 'Signed transaction XDR');

    return signedXdr;
  } catch (error: unknown) {
    throw new Error(
      readableFreighterError(error, 'Transaction authorization failed. Please try again.')
    );
  }
}
