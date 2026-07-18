import { ShieldCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';

export type PayrollMode = 'confidential_payroll' | 'shielded_pool';

export function PayrollSettlementModeCard({
  payrollMode,
  onChange,
}: {
  payrollMode: PayrollMode;
  onChange: (mode: PayrollMode) => void;
}) {
  return (
    <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-md font-semibold text-slate-900">Settlement mode</p>
            <p className="mt-1 text-sm text-slate-500">Choose how this payroll should be paid.</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onChange('confidential_payroll')}
              className={`rounded-xl px-3 py-3 text-left transition ${
                payrollMode === 'confidential_payroll'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-white'
              }`}
            >
              <p className="text-md font-bold">Confidential</p>
              <p
                className={`mt-1 text-sm leading-4 ${
                  payrollMode === 'confidential_payroll' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Direct settlement with encrypted records.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onChange('shielded_pool')}
              className={`rounded-xl px-3 py-3 text-left transition ${
                payrollMode === 'shielded_pool'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-white'
              }`}
            >
              <p className="text-md font-bold">Shielded pool</p>
              <p
                className={`mt-1 text-sm leading-4 ${
                  payrollMode === 'shielded_pool' ? 'text-emerald-50' : 'text-slate-500'
                }`}
              >
                Fund pool now, withdraw later with proof.
              </p>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
