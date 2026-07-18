'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Coins,
  EyeOff,
  Fingerprint,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/shared/Container';
import { ROUTES } from '@/config';

const rails = [
  ['Batch size', '128 recipients'],
  ['Assets', 'XLM and USDC'],
  ['Proofs', 'Groth16'],
  ['Curve', 'BN254'],
  ['Hashing', 'Poseidon'],
  ['Contracts', 'Soroban'],
];

const recipientRows = [
  ['0x8A91', 'encrypted note', 'ready'],
  ['0x3F20', 'shielded pool', 'withdrawable'],
  ['0xB772', 'confidential', 'settled'],
  ['0x4C19', 'proof linked', 'verified'],
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-slate-950 px-4 py-24 text-white sm:px-6 sm:py-28 lg:px-8 lg:py-32"
    >
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.32),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(45,212,191,0.18),transparent_28%),linear-gradient(to_bottom,#020617,#0f172a_48%,#020617)]" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,#000_34%,transparent_76%)] bg-[size:4rem_4rem]" />
      <div className="absolute top-20 left-1/2 -z-10 h-[42rem] w-[42rem] -translate-x-1/2 animate-pulse rounded-full border border-emerald-300/10 bg-emerald-300/5 blur-sm" />
      <div className="absolute top-28 right-0 -z-10 hidden h-80 w-80 rounded-full bg-teal-300/20 blur-3xl lg:block" />
      <div className="absolute bottom-10 left-0 -z-10 hidden h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl lg:block" />

      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <div
            className="lg:col-span-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(26px)',
              transition: 'all 900ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200 shadow-2xl shadow-emerald-950/20">
              <Sparkles className="h-4 w-4" />
              Private enterprise payroll on Stellar
            </div>

            <h1 className="mt-7 max-w-5xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              Enterprise payroll with confidential settlement and shielded pool withdrawals.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              ZetaPay lets enterprises fund payroll batches for up to 128 recipients in XLM or USDC,
              using confidential encrypted payroll for direct settlement or shielded pool payroll
              for private delayed withdrawals, powered by Soroban, Groth16, BN254, Poseidon, Merkle
              roots, nullifiers, and scoped audit keys.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link href={ROUTES.auth.root}>
                <Button
                  size="lg"
                  className="group rounded-2xl bg-emerald-400 px-7 py-4 font-bold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-300"
                  icon={
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  }
                >
                  Open employer portal
                </Button>
              </Link>

              <Link
                href={ROUTES.auth.root}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-7 py-4 font-bold text-white backdrop-blur transition hover:border-emerald-300/40 hover:bg-white/10"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Open auditor portal
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              {rails.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur"
                >
                  <p className="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-2 font-mono text-sm font-extrabold text-emerald-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="lg:col-span-5"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : 'translateY(26px) scale(0.98)',
              transition: 'all 1000ms cubic-bezier(0.22, 1, 0.36, 1) 160ms',
            }}
          >
            <div className="relative mx-auto max-w-xl">
              <div className="absolute inset-0 animate-pulse rounded-[2.5rem] bg-emerald-400/20 blur-3xl" />
              <div className="absolute -inset-6 rounded-[3rem] border border-emerald-300/10" />

              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl">
                <div className="absolute top-8 right-8 h-32 w-32 rounded-full bg-emerald-300/10 blur-2xl" />

                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-300" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-xs text-emerald-300">
                    payroll batch live
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {[
                    [Building2, 'Employer', 'fund batch'],
                    [Network, 'Soroban', 'verify state'],
                    [Wallet, 'Recipient', 'view or withdraw'],
                  ].map(([Icon, title, text]) => (
                    <div
                      key={title as string}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="mb-4 w-fit rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="font-bold">{title as string}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{text as string}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="font-bold">Recipient note table</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Private notes generated from one payroll batch
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-300 p-3 text-slate-950">
                      <Fingerprint className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {recipientRows.map(([id, mode, status], index) => (
                      <div
                        key={id}
                        className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-950/70 p-3 font-mono text-xs"
                        style={{
                          animation: `pulse 2.8s ease-in-out ${index * 180}ms infinite`,
                        }}
                      >
                        <span className="text-slate-500">{id}</span>
                        <span className="text-emerald-200">{mode}</span>
                        <span className="text-right text-slate-300">{status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                      <GitBranch className="h-5 w-5 text-emerald-300" />
                      <BadgeCheck className="h-5 w-5 text-emerald-300" />
                    </div>
                    <p className="mt-5 text-sm text-slate-400">Root status</p>
                    <p className="mt-1 font-mono text-xl font-bold">accepted</p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                      <EyeOff className="h-5 w-5 text-emerald-300" />
                      <Coins className="h-5 w-5 text-emerald-300" />
                    </div>
                    <p className="mt-5 text-sm text-slate-400">Settlement assets</p>
                    <p className="mt-1 font-mono text-xl font-bold">XLM USDC</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  <LockKeyhole className="h-4 w-4 text-emerald-300" />
                  Public metadata does not expose salaries, identities, secrets, or withdrawal
                  linkage.
                </div>

                <KeyRound className="pointer-events-none absolute right-9 bottom-9 h-8 w-8 text-emerald-300/20" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
