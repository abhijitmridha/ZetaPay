import { AlertTriangle, CalendarDays, Coins, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PayrollTotals, PayrollWarnings } from './types';
import { PayrollMode } from './PayrollSettlementModeCard';

export function PayrollSummaryCard({
  totals,
  warnings,
  periodStart,
  periodEnd,
  payrollMode,
  canContinue,
  onContinue,
}: {
  totals: PayrollTotals;
  warnings: PayrollWarnings;
  periodStart: string;
  periodEnd: string;
  payrollMode: PayrollMode;
  canContinue: boolean;
  onContinue: () => void;
}) {
  const hasWarnings =
    warnings.missingWalletCount > 0 ||
    warnings.missingEmailCount > 0 ||
    warnings.invalidAmountCount > 0;

  const modeLabel =
    payrollMode === 'shielded_pool' ? 'Shielded payroll pool' : 'Confidential payroll';

  const nextStepText =
    payrollMode === 'shielded_pool'
      ? 'Review this payroll, then fund the shielded pool and save withdrawal proof records.'
      : 'Review this payroll, then generate commitments, Merkle paths, and the payroll proof.';

  return (
    <Card className="border-0 bg-white shadow-xl shadow-slate-200/50 lg:sticky lg:top-24">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900">Payroll summary</h3>

        <div className="mt-5 space-y-4">
          <SummaryRow
            icon={<Users className="h-4 w-4" />}
            label="Selected payees"
            value={`${totals.selectedCount}`}
          />
          <SummaryRow
            icon={<Coins className="h-4 w-4" />}
            label="Total XLM"
            value={`${totals.totalXlm.toLocaleString()} XLM`}
          />
          <SummaryRow
            icon={<Coins className="h-4 w-4" />}
            label="Total USDC"
            value={`${totals.totalUsdc.toLocaleString()} USDC`}
          />
          <SummaryRow
            icon={<CalendarDays className="h-4 w-4" />}
            label="Period"
            value={`${periodStart} to ${periodEnd}`}
          />
          <SummaryRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Settlement"
            value={modeLabel}
          />
        </div>

        {hasWarnings && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">Needs attention</p>
                <div className="mt-2 space-y-1 text-sm text-amber-700">
                  {warnings.missingWalletCount > 0 && (
                    <p>{warnings.missingWalletCount} selected payee missing wallet</p>
                  )}
                  {warnings.missingEmailCount > 0 && (
                    <p>{warnings.missingEmailCount} selected payee missing email</p>
                  )}
                  {warnings.invalidAmountCount > 0 && (
                    <p>{warnings.invalidAmountCount} selected payee has invalid amount</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900">Next step</p>
              <p className="mt-1 text-sm text-emerald-700">{nextStepText}</p>
            </div>
          </div>
        </div>

        <Button
          disabled={!canContinue}
          onClick={onContinue}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Continue to Review
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
