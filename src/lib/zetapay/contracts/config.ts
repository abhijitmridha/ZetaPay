export const zetapayConfig = {
  network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet',
  rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC || 'https://soroban-testnet.stellar.org',

  verifierContractId: process.env.ZETAPAY_VERIFIER_CONTRACT_ID!,
  payrollContractId: process.env.ZETAPAY_PAYROLL_CONTRACT_ID!,
  poolContractId: process.env.ZETAPAY_POOL_CONTRACT_ID!,

  xlmTokenContract: process.env.NEXT_PUBLIC_XLM_TOKEN_CONTRACT!,
  usdcTokenContract: process.env.NEXT_PUBLIC_USDC_TOKEN_CONTRACT!,
};

export function validateConfig() {
  const required = [
    'ZETAPAY_VERIFIER_CONTRACT_ID',
    'ZETAPAY_PAYROLL_CONTRACT_ID',
    'ZETAPAY_POOL_CONTRACT_ID',
    'NEXT_PUBLIC_XLM_TOKEN_CONTRACT',
    'NEXT_PUBLIC_USDC_TOKEN_CONTRACT',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing environment variables:\n${missing.join('\n')}`);
  }
}
