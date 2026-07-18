import { EyeOff, FileLock2, Globe2, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/shared/Container';

const privacy = [
  {
    icon: EyeOff,
    title: 'Hidden payment linkage',
    text: 'Shielded withdrawals reduce direct linkage between payroll funding and recipient withdrawal timing.',
  },
  {
    icon: Lock,
    title: 'Encrypted payroll access',
    text: 'Verification payloads use AES256 encryption and token hashes use SHA256.',
  },
  {
    icon: KeyRound,
    title: 'Audit scoped reports',
    text: 'Auditors only access approved payroll reports through employer provided audit keys.',
  },
  {
    icon: Globe2,
    title: 'Public metadata only',
    text: 'Public verification can show roots, status, and proof metadata without exposing salaries.',
  },
  {
    icon: FileLock2,
    title: 'Private commitments',
    text: 'Recipient notes use commitments, secrets, nullifiers, and Merkle proof data.',
  },
  {
    icon: ShieldCheck,
    title: 'Selective disclosure',
    text: 'Employers, recipients, auditors, and public viewers see different data surfaces.',
  },
];

export function ProofAndPrivacy() {
  return (
    <section className="relative overflow-hidden bg-white px-4 py-28 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(16,185,129,0.12),transparent_32%)]" />

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-[0.26em] text-emerald-600 uppercase">
            Privacy guarantees
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Verification without turning payroll into public information.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            ZetaPay keeps salary ownership, private witness data, secrets, nullifiers, and employee
            scoped payroll details out of public views.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {privacy.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7 transition duration-300 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/70"
              >
                <div className="mb-6 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
