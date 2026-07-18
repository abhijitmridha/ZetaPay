import { CheckCircle2 } from 'lucide-react';
import { Container } from '@/components/shared/Container';

const groups = [
  {
    title: 'Payroll product',
    items: [
      'Employer portal',
      'Recipient portal',
      'Auditor portal',
      'Payroll dashboard',
      'Payroll history',
      'Transaction history',
      'Audit logs',
      'Audit keys',
      'Verification links',
    ],
  },
  {
    title: 'Payroll modes',
    items: [
      'Confidential payroll',
      'Shielded payroll',
      'Batch payroll',
      '128 recipient batches',
      'XLM payroll',
      'USDC payroll',
      'Deposit records',
      'Withdrawal records',
      'Recipient payment view',
    ],
  },
  {
    title: 'Zero knowledge',
    items: [
      'Groth16',
      'BN254',
      'Poseidon hashing',
      'Merkle tree',
      'Merkle inclusion proofs',
      'Commitment scheme',
      'Public inputs',
      'Witness generation',
      'zkSNARK verification',
    ],
  },
  {
    title: 'Shielded pool',
    items: [
      'Shared liquidity pool',
      'Anonymous note commitments',
      'Deposit commitments',
      'Withdrawal proofs',
      'Delayed withdrawals',
      'Root acceptance',
      'Nullifiers',
      'Nullifier hashes',
      'Withdrawal hash',
    ],
  },
  {
    title: 'Smart contracts',
    items: [
      'Soroban contracts',
      'fund_payroll()',
      'withdraw_with_proof()',
      'verify()',
      'transfer()',
      'Note storage',
      'AcceptedRoot storage',
      'Nullifier storage',
      'Deposit counter',
    ],
  },
  {
    title: 'Application stack',
    items: [
      'Next.js App Router',
      'TypeScript',
      'Drizzle ORM',
      'PostgreSQL',
      'API Routes',
      'Cookie authentication',
      'Tailwind CSS',
      'Lucide Icons',
      'Freighter Wallet',
    ],
  },
];

export function BuiltCoverage() {
  return (
    <section className="relative overflow-hidden bg-slate-50 px-4 py-28 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.14),transparent_30%)]" />

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.26em] text-emerald-600 uppercase">
            Built coverage
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Full product, protocol, privacy, and settlement coverage.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            The landing page presents what is actually implemented across payroll, contracts,
            proofs, shielded pools, auditing, and recipient access.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.title}
              className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-600 p-3 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-black text-slate-950">{group.title}</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
