import { ArrowRight, EyeOff, LockKeyhole, TimerReset, Wallet } from 'lucide-react';
import { Container } from '@/components/shared/Container';

const modes = [
  {
    icon: LockKeyhole,
    title: 'Confidential encrypted payroll',
    label: 'Direct private settlement',
    text: 'For known recipients where the employer wants direct payroll settlement with encrypted payroll records, recipient scoped visibility, audit access, and transaction history.',
    steps: ['Create batch', 'Generate notes', 'Encrypt records', 'Settle payroll'],
  },
  {
    icon: EyeOff,
    title: 'Shielded pool payroll',
    label: 'Withdrawable private settlement',
    text: 'For employees, contractors, consultants, freelancers, vendors, and other recipients who should withdraw from a shared liquidity pool when ready.',
    steps: ['Fund pool', 'Accept root', 'Generate proof', 'Withdraw privately'],
  },
];

export function PayrollModes() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-4 py-28 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_32%),radial-gradient(circle_at_90%_80%,rgba(45,212,191,0.14),transparent_32%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,#000_42%,transparent_78%)] bg-[size:3.5rem_3.5rem]" />

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.26em] text-emerald-300 uppercase">
            Payroll modes
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            One product for direct confidential payroll and shielded pool withdrawals.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Enterprises choose how each batch settles. Known recipient payroll can be confidential.
            Withdrawable payroll can enter a shared shielded pool.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {modes.map((mode) => {
            const Icon = mode.icon;

            return (
              <div
                key={mode.title}
                className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-7 shadow-2xl shadow-slate-950/30 backdrop-blur"
              >
                <div className="absolute top-0 right-0 h-80 w-80 translate-x-24 -translate-y-24 rounded-full bg-emerald-300/10 blur-3xl" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-300 text-slate-950">
                      <Icon className="h-7 w-7" />
                    </div>

                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-bold tracking-[0.16em] text-emerald-200 uppercase">
                      {mode.label}
                    </span>
                  </div>

                  <h3 className="mt-7 text-3xl font-black">{mode.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{mode.text}</p>

                  <div className="mt-8 grid gap-3">
                    {mode.steps.map((step, index) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 font-mono text-xs font-black text-slate-950">
                          {index + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-200">{step}</span>
                        {index < mode.steps.length - 1 ? (
                          <ArrowRight className="ml-auto h-4 w-4 text-emerald-300" />
                        ) : (
                          <Wallet className="ml-auto h-4 w-4 text-emerald-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
            <TimerReset className="h-7 w-7 text-emerald-300" />
            <h3 className="mt-5 text-2xl font-black">Delayed withdrawals</h3>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Shielded recipients can withdraw later, which separates payroll funding from
              withdrawal timing.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
            <EyeOff className="h-7 w-7 text-emerald-300" />
            <h3 className="mt-5 text-2xl font-black">Shared anonymity set</h3>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              The shielded pool uses shared liquidity, accepted roots, nullifiers, withdrawal
              records, and proof based withdrawal.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
