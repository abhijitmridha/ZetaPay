import Link from 'next/link';
import { Container } from '@/components/shared/Container';
import { ArrowRight, Building2, FileCheck2, Globe2, ReceiptText } from 'lucide-react';
import { ROUTES } from '@/config';

const personas = [
  {
    icon: Building2,
    title: 'Employer',
    label: 'Creates and funds payroll',
    href: ROUTES.auth.root,
    action: 'Open employer portal',
    text: 'Creates enterprises, employees, payroll batches, confidential payroll, shielded pool payroll, audit keys, verification links, deposits, and transaction records.',
    items: ['Batch payroll', 'XLM or USDC', 'Audit keys', 'Deposit records'],
  },
  {
    icon: ReceiptText,
    title: 'Recipient',
    label: 'Views or withdraws payment',
    href: ROUTES.auth.root,
    action: 'Open employee portal',
    text: 'Employees, contractors, consultants, freelancers, and vendors can view their payment details or withdraw from the shielded pool when ready.',
    items: ['Payment history', 'Commitment', 'Proof details', 'Withdrawal status'],
  },
  {
    icon: FileCheck2,
    title: 'Auditor',
    label: 'Verifies approved payroll',
    href: ROUTES.auth.root,
    action: 'Open auditor portal',
    text: 'Auditors authenticate, enter employer provided audit keys, inspect approved payroll reports, verify records, and generate audit logs.',
    items: ['Audit key', 'Payroll report', 'Record inspection', 'Audit logs'],
  },
  {
    icon: Globe2,
    title: 'Public verifier',
    label: 'Sees metadata only',
    text: 'Public verification exposes proof metadata, roots, status, and commitment information without revealing salaries, identities, or private payroll records.',
    items: ['Batch root', 'Metadata', 'Status', 'No salaries'],
  },
];

export function Personas() {
  return (
    <section className="relative overflow-hidden bg-white py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.12),transparent_32%)]" />

      <Container>
        <div className="max-w-3xl">
          <p className="text-sm font-bold tracking-[0.26em] text-emerald-600 uppercase">
            Access model
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Four roles, one payroll system, different disclosure boundaries.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            ZetaPay separates payroll creation, recipient access, auditor verification, and public
            metadata so no participant receives more information than needed.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {personas.map((persona) => {
            const Icon = persona.icon;

            return (
              <div
                key={persona.title}
                className="group rounded-[2rem] border border-slate-200 bg-slate-50 p-6 transition duration-300 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/70"
              >
                <div className="flex flex-col gap-6 sm:flex-row">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white transition group-hover:scale-105">
                    <Icon className="h-7 w-7" />
                  </div>

                  <div>
                    <p className="text-sm font-bold tracking-[0.18em] text-emerald-600 uppercase">
                      {persona.label}
                    </p>
                    <h3 className="mt-2 text-2xl font-extrabold text-slate-950">{persona.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{persona.text}</p>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      {persona.items.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    {persona.href && persona.action ? (
                      <Link
                        href={persona.href}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-600"
                      >
                        {persona.action}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
