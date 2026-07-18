import {
  Binary,
  Coins,
  Database,
  Fingerprint,
  GitBranch,
  Hash,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Container } from '@/components/shared/Container';

const proofLayer = [
  {
    icon: ShieldCheck,
    title: 'Groth16 zkSNARKs',
    text: 'Payroll and withdrawal proofs are generated and verified with Groth16 so private witness data does not become public payroll data.',
  },
  {
    icon: Network,
    title: 'BN254 curve',
    text: 'The proof system uses BN254 for efficient zkSNARK verification inside the protocol flow.',
  },
  {
    icon: Hash,
    title: 'Poseidon hashing',
    text: 'Poseidon is used for ZK friendly commitments, Merkle roots, nullifier hashes, and public proof inputs.',
  },
  {
    icon: GitBranch,
    title: 'Merkle inclusion proofs',
    text: 'Each payroll note belongs to a Merkle tree with a root, path, index, and accepted root verification.',
  },
  {
    icon: Fingerprint,
    title: 'Commitments and nullifiers',
    text: 'Recipient notes include commitments, secrets, nullifiers, and nullifier hashes to prove ownership and prevent double withdrawals.',
  },
  {
    icon: Binary,
    title: 'Witness generation',
    text: 'Private salary and note data is transformed into proof witnesses while public inputs keep verification possible.',
  },
];

const contractFunctions = ['fund_payroll()', 'withdraw_with_proof()', 'verify()', 'transfer()'];

const contractStorage = [
  'Note storage',
  'AcceptedRoot storage',
  'Withdrawal storage',
  'Nullifier storage',
  'Deposit counter',
  'Withdrawal counter',
];

const settlement = [
  {
    icon: Coins,
    title: 'XLM and USDC',
    text: 'Batches can be funded with Stellar native XLM or USDC.',
  },
  {
    icon: Wallet,
    title: 'Shielded pool withdrawals',
    text: 'Recipients can withdraw later from the shared pool using a valid proof.',
  },
  {
    icon: LockKeyhole,
    title: 'Confidential payroll',
    text: 'Enterprises can settle encrypted payroll directly for known recipients.',
  },
  {
    icon: KeyRound,
    title: 'Auditor access',
    text: 'Employers issue audit keys so auditors can verify approved payroll reports.',
  },
];

export function ProtocolArchitecture() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-4 py-28 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.24),transparent_32%),radial-gradient(circle_at_86%_78%,rgba(20,184,166,0.16),transparent_34%),linear-gradient(to_bottom,#020617,#0f172a_48%,#020617)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,#000_42%,transparent_78%)] bg-[size:3.5rem_3.5rem]" />
      <div className="absolute top-24 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />

      <Container className="relative z-10 max-w-[1600px]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.26em] text-emerald-300 uppercase">
            Protocol architecture
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Groth16 payroll proofs, Soroban settlement, and shielded pool withdrawals.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            ZetaPay combines confidential payroll, shielded pool payroll, XLM and USDC settlement,
            Merkle note commitments, nullifier protection, and auditor verification into one batch
            payroll protocol.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="sticky top-24 overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
              <div className="absolute top-0 right-0 h-72 w-72 translate-x-24 -translate-y-24 rounded-full bg-emerald-300/10 blur-3xl" />

              <div className="relative">
                <div className="mb-6 inline-flex rounded-2xl bg-emerald-300 p-3 text-slate-950">
                  <Network className="h-6 w-6" />
                </div>

                <h3 className="text-3xl font-black">On chain payroll state</h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  Soroban stores the state needed for funding payroll batches, accepting Merkle
                  roots, verifying withdrawal proofs, recording withdrawals, and blocking reused
                  nullifiers.``
                </p>

                <div className="mt-7 grid gap-3">
                  {contractFunctions.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-4 font-mono text-sm font-bold text-emerald-200"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-7 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl bg-white/[0.06] p-3 text-emerald-300">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black">Stored contract data</h4>
                      <p className="text-xs text-slate-500">Soroban state records</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {contractStorage.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:col-span-8">
            <div className="grid gap-5 md:grid-cols-2">
              {proofLayer.map((layer) => {
                const Icon = layer.icon;

                return (
                  <div
                    key={layer.title}
                    className="group rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl shadow-slate-950/20 backdrop-blur transition duration-300 hover:bg-white/[0.08]"
                  >
                    <div className="mb-6 inline-flex rounded-2xl bg-emerald-300/10 p-3 text-emerald-300 transition group-hover:bg-emerald-300 group-hover:text-slate-950">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="text-xl font-black">{layer.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{layer.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-[2.25rem] border border-emerald-300/20 bg-emerald-300/10 p-6 shadow-2xl shadow-slate-950/20">
              <div className="grid gap-5 md:grid-cols-4">
                {settlement.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title} className="rounded-3xl bg-slate-950/70 p-5">
                      <Icon className="h-6 w-6 text-emerald-300" />
                      <h3 className="mt-4 font-black">{item.title}</h3>
                      <p className="mt-2 text-xs leading-6 text-slate-400">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.05] p-6">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="font-mono text-xs font-bold tracking-[0.18em] text-emerald-300 uppercase">
                    Batch input
                  </p>
                  <h3 className="mt-3 text-2xl font-black">Up to 128 recipients</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    Payroll is funded as a batch, not as one manual payment per person.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="font-mono text-xs font-bold tracking-[0.18em] text-emerald-300 uppercase">
                    Private note
                  </p>
                  <h3 className="mt-3 text-2xl font-black">Commitment and secret</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    Each recipient receives scoped payment data connected to proof and withdrawal
                    state.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="font-mono text-xs font-bold tracking-[0.18em] text-emerald-300 uppercase">
                    Output
                  </p>
                  <h3 className="mt-3 text-2xl font-black">View or withdraw</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    Recipients can inspect payment details or withdraw from the shielded pool with a
                    valid proof.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
