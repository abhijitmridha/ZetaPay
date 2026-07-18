'use client';

import Link from 'next/link';
import { ArrowRight, FileCheck2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/shared/Container';
import { ROUTES } from '@/config';

export function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-slate-950 py-36 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_38%),linear-gradient(to_bottom,#0f172a,#020617)]" />

      <div className="absolute top-0 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 animate-pulse rounded-full bg-emerald-300/15 blur-3xl" />

      <Container className="max-w-[1400px]">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.045] px-8 py-14 shadow-2xl backdrop-blur-xl sm:px-12 lg:px-20 lg:py-20">
          <div className="absolute top-0 right-0 h-80 w-80 translate-x-20 -translate-y-20 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-8 inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-5 py-2 text-sm font-bold text-emerald-200">
              <LockKeyhole className="h-4 w-4" />
              Confidential payroll • Shielded payroll • Enterprise settlement
            </div>

            <h2 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Deploy private enterprise payroll on Stellar.
            </h2>

            <p className="mx-auto mt-7 max-w-3xl text-lg leading-9 text-slate-300">
              Fund payroll for up to 128 recipients per batch using XLM or USDC. Choose confidential
              payroll for direct encrypted settlement or shielded payroll for private withdrawals
              from a shared pool. Employees receive scoped verification, auditors receive audit key
              access, and public verification reveals only cryptographic metadata.
            </p>

            <div className="mt-12 flex flex-wrap justify-center gap-5">
              <Link href={ROUTES.auth.root}>
                <Button
                  size="lg"
                  className="group rounded-2xl bg-emerald-400 px-9 py-4 font-bold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:bg-emerald-300"
                  icon={
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  }
                >
                  Open employer portal
                </Button>
              </Link>

              <Link
                href={ROUTES.auth.root}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-9 py-4 font-bold text-white transition hover:border-emerald-300/30 hover:bg-white/10"
              >
                <FileCheck2 className="h-4 w-4 text-emerald-300" />
                Open auditor portal
              </Link>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
                  Settlement
                </p>
                <p className="mt-3 text-lg font-black">Confidential and Shielded</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
                  Assets
                </p>
                <p className="mt-3 text-lg font-black">XLM and USDC</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
                  Proof System
                </p>
                <p className="mt-3 text-lg font-black">Groth16 • BN254 • Poseidon</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
