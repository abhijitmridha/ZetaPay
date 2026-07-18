import {
  BadgeCheck,
  Coins,
  EyeOff,
  Fingerprint,
  GitBranch,
  Network,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Container } from '@/components/shared/Container';

const items = [
  [BadgeCheck, '128 recipient batches'],
  [Coins, 'XLM and USDC'],
  [ShieldCheck, 'Groth16 proofs'],
  [Fingerprint, 'Poseidon commitments'],
  [GitBranch, 'Merkle roots'],
  [EyeOff, 'Shielded withdrawals'],
  [Network, 'Soroban contracts'],
  [Wallet, 'Freighter wallet'],
];

export function CapabilityStrip() {
  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-white py-6">
      <Container>
        {items.map(([Icon, label]) => (
          <div
            key={label as string}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700"
          >
            <Icon className="h-4 w-4 text-emerald-600" />
            {label as string}
          </div>
        ))}
      </Container>
    </section>
  );
}
