import { CalendarDays, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { PayrollReviewDraft } from './types';

export function PayrollReviewHeader({ draft }: { draft: PayrollReviewDraft }) {
  return (
    <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%)]" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
              <ShieldCheck className="h-4 w-4" />
              Ready for private payroll proof
            </div>

            <h2 className="mt-4 text-2xl font-bold">Review payroll run</h2>

            <p className="mt-1 max-w-2xl text-sm text-emerald-50/80">
              Confirm payees, totals, wallets, and ZK batch count before generating proof material.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HeaderStat
              icon={<Users className="h-4 w-4" />}
              label="Payees"
              value={`${draft.totals.payeeCount}`}
            />

            <HeaderStat
              icon={<CalendarDays className="h-4 w-4" />}
              label="Period"
              value={`${draft.periodStart} → ${draft.periodEnd}`}
            />
          </div>
        </div>
      </div>

      <CardContent className="grid gap-4 p-6 md:grid-cols-4">
        <Metric label="Total XLM" value={`${draft.totals.xlm.toLocaleString()} XLM`} />
        <Metric label="Total USDC" value={`${draft.totals.usdc.toLocaleString()} USDC`} />
        <Metric label="ZK batches" value={`${draft.totals.batchCount}`} />
        <Metric label="Batch size" value="128 payees per proof" />
      </CardContent>
    </Card>
  );
}

function HeaderStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm text-emerald-50/75">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
