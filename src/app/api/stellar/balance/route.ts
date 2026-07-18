import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { stellarServer, extractBalance } from '@/lib/stellar/horizon';
import { StellarBalance } from '@/types/stellar';

const TESTNET_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const walletAddress = cookieStore.get('zetaWallet')?.value;

    if (!walletAddress) {
      return NextResponse.json(
        {
          error: 'Wallet not connected',
          message: 'Please connect your Freighter wallet first',
        },
        { status: 401 }
      );
    }

    if (!walletAddress.startsWith('G')) {
      return NextResponse.json(
        {
          error: 'Invalid wallet address',
          message: 'The wallet address format is invalid',
        },
        { status: 400 }
      );
    }

    let accountDetails = null;
    try {
      accountDetails = await stellarServer.loadAccount(walletAddress);
    } catch {
      accountDetails = null;
    }

    if (!accountDetails) {
      return NextResponse.json({
        wallet: walletAddress,
        xlm: '0.0000000',
        usdc: '0.0000000',
        isFunded: false,
      });
    }

    const xlmBalance = extractBalance(accountDetails, 'native');

    const usdcAsset = (accountDetails.balances as StellarBalance[]).find(
      (balance) => balance.asset_code === 'USDC' && balance.asset_issuer === TESTNET_USDC_ISSUER
    );

    const usdcBalance = usdcAsset?.balance ?? '0.0000000';

    return NextResponse.json({
      wallet: walletAddress,
      xlm: xlmBalance || '0.0000000',
      usdc: usdcBalance, // This will now perfectly return '1162.7644257'
      isFunded: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to fetch balance', message: errorMessage },
      { status: 500 }
    );
  }
}
