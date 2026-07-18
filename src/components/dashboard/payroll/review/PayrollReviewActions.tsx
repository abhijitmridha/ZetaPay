import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';

type PayrollMode = 'confidential_payroll' | 'shielded_pool';

export function PayrollReviewActions({
  canGenerate,
  generating,
  generated,
  payrollMode,
  onBack,
  onGenerate,
}: {
  canGenerate: boolean;
  generating: boolean;
  generated: boolean;
  payrollMode: PayrollMode;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const isShieldedPool = payrollMode === 'shielded_pool';

  const buttonText = generating
    ? 'Processing...'
    : generated
      ? 'Payroll completed'
      : isShieldedPool
        ? 'Deposit to Pool'
        : 'Generate ZK Payroll';

  const helperText = isShieldedPool
    ? 'This will prepare the shielded payroll data, ask Freighter to approve the pool deposit transaction, and save employee withdrawal records.'
    : 'This will generate the Groth16 proof, submit the payroll batch to Stellar, execute payouts, and save verification links for employees and auditors.';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" type="button" onClick={onBack} disabled={generating}>
          <ArrowLeft className="h-4 w-4" />
          Back to builder
        </Button>

        <Button
          type="button"
          disabled={!canGenerate || generating || generated}
          onClick={onGenerate}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}

          {buttonText}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">{helperText}</p>
    </div>
  );
}
