import { Eye, LockKeyhole, Network, ShieldCheck, Wallet } from 'lucide-react';
import { Container } from '@/components/shared/Container';

const risks = [
  'Employee identity exposure',
  'Salary amount visibility',
  'Wallet graph correlation',
  'Payment timing leakage',
];

const protections = [
  'Private employee verification',
  'Merkle based payroll commitments',
  'Scoped audit key access',
  'Public metadata without employee salaries',
];

export function EnterpriseProblem() {
  return (
    <section className="relative overflow-hidden bg-white py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_32%)]" />

      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-sm font-bold tracking-[0.26em] text-emerald-600 uppercase">
              Why it matters
            </p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              Payroll should not reveal the entire payment graph.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Enterprise payroll contains sensitive salary records, employee identities, audit
              evidence, and settlement activity. ZetaPay separates those views so each participant
              receives only the information required for their role.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:col-span-7">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7">
              <div className="mb-6 inline-flex rounded-2xl bg-rose-100 p-3 text-rose-700">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-950">Traditional exposure</h3>
              <div className="mt-6 space-y-3">
                {risks.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-7">
              <div className="mb-6 inline-flex rounded-2xl bg-emerald-600 p-3 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-950">ZetaPay separation</h3>
              <div className="mt-6 space-y-3">
                {protections.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            [
              Network,
              'Batch first',
              'Payroll records are grouped into batches with shared proof metadata.',
            ],
            [
              LockKeyhole,
              'Private by role',
              'Employer, employee, auditor, and public views are intentionally separated.',
            ],
            [
              Wallet,
              'Settlement aware',
              'The product includes Stellar based payroll settlement and withdrawal flows.',
            ],
          ].map(([Icon, title, text]) => (
            <div
              key={title as string}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60"
            >
              <div className="mb-5 w-fit rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950">{title as string}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{text as string}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
