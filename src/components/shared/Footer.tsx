import Link from 'next/link';
import Image from 'next/image';
import { Coins, Network, ShieldCheck, Sparkles } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { ROUTES } from '@/config';

const productLinks = [
  { label: 'Employer Portal', href: ROUTES.auth.root },
  { label: 'Auditor Portal', href: ROUTES.auth.root },
  { label: 'Recipient Access', href: ROUTES.auth.root },
  { label: 'Payroll Modes', href: '/#payroll-modes' },
];

const protocolLinks = [
  { label: 'Batch Payroll', href: '/#batch-flow' },
  { label: 'Protocol Architecture', href: '/#protocol-architecture' },
  { label: 'Proof And Privacy', href: '/#proof-and-privacy' },
  { label: 'Built Coverage', href: '/#built-coverage' },
];

const stackItems = ['Stellar', 'Soroban', 'Groth16', 'BN254', 'Poseidon', 'XLM', 'USDC'];

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-white/10 bg-slate-950 text-white">
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(20,184,166,0.12),transparent_34%),linear-gradient(to_bottom,#0f172a,#020617)]" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,#000_35%,transparent_75%)] bg-[size:3rem_3rem]" />
      <div className="absolute top-0 left-1/2 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />

      <Container className="relative z-10 max-w-[1500px]">
        <div className="py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Link href="/" className="inline-flex items-center gap-3">
                <Image src="/logo.svg" alt="ZetaPay" width={44} height={44} className="h-11 w-11" />

                <div className="flex flex-col leading-none">
                  <span className="text-2xl font-extrabold tracking-tight text-white">
                    Zeta<span className="text-emerald-400">Pay</span>
                  </span>

                  <span className="mt-1 text-[10px] font-semibold tracking-[0.32em] text-emerald-300 uppercase">
                    Private Payroll
                  </span>
                </div>
              </Link>

              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                Enterprise payroll settlement on Stellar with confidential payroll, shielded pool
                withdrawals, Groth16 proofs, Poseidon commitments, Soroban contracts, audit keys,
                and public metadata verification.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Badge icon={ShieldCheck} label="Selective disclosure" />
                <Badge icon={Coins} label="XLM and USDC" />
                <Badge icon={Network} label="Soroban settlement" />
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {stackItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-3 lg:col-span-7">
              <FooterColumn title="Product" links={productLinks} />
              <FooterColumn title="Protocol" links={protocolLinks} />

              <div>
                <h4 className="text-sm font-extrabold tracking-[0.18em] text-white uppercase">
                  Status
                </h4>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-300/10 p-2 text-emerald-300">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-bold text-white">Implemented product</p>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      Batch payroll, confidential settlement, shielded pool withdrawals, audit
                      verification, public metadata, XLM, USDC, Soroban, and Groth16 proof flows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 ZetaPay. Built for private enterprise payroll on Stellar.</p>
            <p>Powered by Stellar, Soroban, Groth16, BN254, Poseidon, and zero knowledge proofs.</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function Badge({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-bold text-emerald-200">
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: {
    label: string;
    href: string;
  }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-extrabold tracking-[0.18em] text-white uppercase">{title}</h4>

      <div className="mt-5 space-y-3">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="block text-sm font-semibold text-slate-400 transition hover:text-emerald-300"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
