import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  const { buildInitializeShieldedPoolXdr } = await import('../../src/lib/zetapay/contracts/pool');

  const admin = process.argv[2];

  if (!admin) {
    throw new Error('Usage: tsx scripts/contracts/initialize-pool.ts G_ADMIN_WALLET_ADDRESS');
  }

  const xdr = await buildInitializeShieldedPoolXdr({
    admin,
  });

  console.log(xdr);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
