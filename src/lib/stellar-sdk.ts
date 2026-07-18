import { Asset, Horizon, Operation, TransactionBuilder, BASE_FEE } from '@stellar/stellar-sdk';

import { HORIZON_TESTNET_URL, STELLAR_TESTNET_PASSPHRASE } from '@/lib/stellar-wallet';

const server = new Horizon.Server(HORIZON_TESTNET_URL);

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { response?: { status?: number }; status?: number };
  return value.response?.status === 404 || value.status === 404;
}

function horizonErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const value = error as {
      response?: { data?: { extras?: { result_codes?: unknown }; title?: string } };
      message?: unknown;
    };

    const resultCodes = value.response?.data?.extras?.result_codes;
    if (resultCodes) return `${fallback}: ${JSON.stringify(resultCodes)}`;

    const title = value.response?.data?.title;
    if (title) return title;

    if (typeof value.message === 'string') return value.message;
  }

  return fallback;
}

/** Fetches the native XLM balance for an account from Horizon testnet. */
export async function fetchXlmBalance(address: string): Promise<string> {
  try {
    const account = await server.loadAccount(address);
    const native = account.balances.find((balance) => balance.asset_type === 'native');
    return native ? native.balance : '0';
  } catch (error: unknown) {
    if (isNotFoundError(error)) return '0';
    throw new Error(horizonErrorMessage(error, 'Failed to fetch XLM balance.'));
  }
}

/** Builds an unsigned XLM payment transaction and returns it as XDR. */
export async function buildPaymentXdr(from: string, to: string, amount: string): Promise<string> {
  try {
    const account = await server.loadAccount(from);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: to,
          asset: Asset.native(),
          amount,
        })
      )
      .setTimeout(30)
      .build();

    return transaction.toXDR();
  } catch (error: unknown) {
    throw new Error(horizonErrorMessage(error, 'Failed to build payment transaction.'));
  }
}

/** Submits a signed transaction XDR to Horizon testnet. */
export async function submitSignedTx(signedXdr: string): Promise<{ hash: string }> {
  try {
    const transaction = TransactionBuilder.fromXDR(signedXdr, STELLAR_TESTNET_PASSPHRASE);
    const result = await server.submitTransaction(transaction);
    return { hash: result.hash };
  } catch (error: unknown) {
    throw new Error(horizonErrorMessage(error, 'Transaction submission failed.'));
  }
}
