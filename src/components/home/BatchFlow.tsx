'use client';

import { useEffect, useRef, useState } from 'react';
import { Container } from '@/components/shared/Container';
import {
  Building2,
  Coins,
  Fingerprint,
  GitBranch,
  KeyRound,
  Network,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

const steps = [
  {
    icon: Building2,
    title: 'Employer prepares batch',
    text: 'Payroll recipients are grouped into one batch with asset, amount, role, and access metadata.',
  },
  {
    icon: Coins,
    title: 'XLM or USDC funded',
    text: 'The employer funds payroll in supported Stellar assets.',
  },
  {
    icon: Fingerprint,
    title: 'Notes generated',
    text: 'Each recipient receives a private note with commitment, secret, nullifier, and proof data.',
  },
  {
    icon: GitBranch,
    title: 'Merkle root accepted',
    text: 'The batch root is stored and accepted for later verification and withdrawal.',
  },
  {
    icon: ShieldCheck,
    title: 'Groth16 proof verified',
    text: 'Public inputs verify the proof without revealing private witness data.',
  },
  {
    icon: Wallet,
    title: 'Recipient views or withdraws',
    text: 'Recipients can inspect their payment or withdraw from the shielded pool.',
  },
];

export function BatchFlow() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((current) => (current + 1) % steps.length);
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.18 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  const activeStep = steps[active];
  const ActiveIcon = activeStep.icon;

  return (
    <section ref={ref} className="relative overflow-hidden bg-white px-4 py-28 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.12),transparent_30%)]" />

      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-sm font-bold tracking-[0.26em] text-emerald-600 uppercase">
              Batch flow
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              A complete path from payroll funding to private withdrawal.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              ZetaPay connects payroll batching, asset funding, encrypted notes, Merkle roots,
              Groth16 verification, Soroban settlement, and recipient controlled access.
            </p>

            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-300">Active operation</p>
                  <h3 className="mt-1 text-2xl font-black">{activeStep.title}</h3>
                </div>
                <div className="rounded-2xl bg-emerald-300 p-3 text-slate-950">
                  <ActiveIcon className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-300">{activeStep.text}</p>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  key={active}
                  className="h-full rounded-full bg-emerald-300"
                  style={{
                    animation: 'flowWidth 2400ms linear forwards',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative mx-auto max-w-3xl">
              <div className="absolute top-1/2 left-1/2 hidden h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-100 lg:block" />
              <div className="absolute top-1/2 left-1/2 hidden h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200 lg:block" />
              <div className="absolute top-1/2 left-1/2 hidden h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100 blur-2xl lg:block" />

              <div className="relative grid gap-4 sm:grid-cols-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = active === index;

                  return (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => setActive(index)}
                      className={`group relative overflow-hidden rounded-[2rem] border p-6 text-left transition duration-500 ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 shadow-2xl shadow-emerald-100'
                          : 'border-slate-200 bg-white shadow-xl shadow-slate-100 hover:translate-y-[-4px]'
                      }`}
                      style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'translateY(0)' : 'translateY(24px)',
                        transition: `all 700ms cubic-bezier(0.22, 1, 0.36, 1) ${index * 80}ms`,
                      }}
                    >
                      <div className="absolute top-0 right-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-emerald-200/40 blur-2xl" />

                      <div className="relative flex items-start gap-4">
                        <div
                          className={`rounded-2xl p-3 transition ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-mono text-xs font-bold text-slate-400">
                            {String(index + 1).padStart(2, '0')}
                          </p>
                          <h3 className="mt-1 text-lg font-black text-slate-950">{step.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="relative mt-5 rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    [Network, 'Soroban', 'contract execution'],
                    [KeyRound, 'Audit key', 'scoped verification'],
                    [Wallet, 'Recipient', 'view or withdraw'],
                  ].map(([Icon, title, text]) => (
                    <div
                      key={title as string}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                    >
                      <Icon className="h-6 w-6 text-emerald-300" />
                      <h3 className="mt-4 font-bold">{title as string}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{text as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
