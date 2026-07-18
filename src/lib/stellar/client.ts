'use client';

import { getFreighterPublicKey, isFreighterAvailable } from './freighter';
import { stellarServer, extractBalance } from './horizon';

export interface ConnectedEmployerWallet {
  publicKey: string;
  xlmBalance: string;
  usdcBalance: string;
}

export async function connectEmployerWallet(): Promise<ConnectedEmployerWallet> {
  const walletConnected = await isFreighterAvailable();
  if (!walletConnected) {
    throw new Error(
      'Freighter extension missing. Please install the wallet extension to continue.'
    );
  }

  const publicKey = await getFreighterPublicKey();

  try {
    const accountDetails = await stellarServer.loadAccount(publicKey);

    return {
      publicKey,
      xlmBalance: extractBalance(accountDetails, 'native'),
      usdcBalance: extractBalance(accountDetails, 'USDC'),
    };
  } catch {
    return {
      publicKey,
      xlmBalance: '0',
      usdcBalance: '0',
    };
  }
}
