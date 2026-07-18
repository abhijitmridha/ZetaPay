import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PayrollReviewValidation } from './types';

export function PayrollReviewValidationCard({
  validation,
}: {
  validation: PayrollReviewValidation;
}) {
  const ready = validation.hasPayees && validation.allWalletsValid && validation.allAmountsValid;

  return (
    <Card className="border-0 bg-white shadow-xl shadow-slate-200/50 lg:sticky lg:top-24">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-emerald-50 p-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <CardTitle className="text-base">Validation</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-6">
        <ValidationRow label="Payees selected" valid={validation.hasPayees} />
        <ValidationRow label="Wallets present" valid={validation.allWalletsValid} />
        <ValidationRow label="Amounts valid" valid={validation.allAmountsValid} />

        {validation.hasCurrencyOverrides && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">Currency override detected</p>
                <p className="mt-1 text-xs text-amber-700">
                  Review any currency changes carefully before proof generation.
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          className={
            ready
              ? 'rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700'
              : 'rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700'
          }
        >
          {ready
            ? 'Payroll is ready for proof generation'
            : 'Fix validation issues before continuing'}
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationRow({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
      <span className="text-sm text-slate-600">{label}</span>

      <span
        className={
          valid
            ? 'inline-flex items-center gap-1 text-sm font-medium text-emerald-600'
            : 'inline-flex items-center gap-1 text-sm font-medium text-red-600'
        }
      >
        <CheckCircle2 className="h-4 w-4" />
        {valid ? 'Passed' : 'Failed'}
      </span>
    </div>
  );
}
