import { loadEnvConfig } from '@next/env';

import { buildInitializePayrollXdr } from '../../src/lib/zetapay/contracts/payroll';

loadEnvConfig(process.cwd());

function main() {
  const employer = process.argv[2];

  if (!employer) {
    throw new Error('Usage: tsx scripts/initialize.ts G_EMPLOYER_WALLET_ADDRESS');
  }

  const xdr = buildInitializePayrollXdr({ employer });

  console.log(xdr);
}

main();
