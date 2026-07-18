import { Card, CardContent } from '@/components/ui/Card';
import { PayrollMode } from './PayrollSettlementModeCard';

export function PayrollNextStepsCard({ payrollMode }: { payrollMode: PayrollMode }) {
  const steps =
    payrollMode === 'shielded_pool'
      ? [
          'ZetaPay prepares one shielded note per selected payee.',
          'Employer funds are deposited into the pool contract.',
          'Withdrawal data is saved so each employee can claim privately.',
          'Employees withdraw later from the pool using their proof.',
        ]
      : [
          'ZetaPay prepares one encrypted payroll record per payee.',
          'The payroll batch is committed on chain.',
          'A Groth16 proof verifies totals without exposing salaries.',
          'Employees can later verify their own payment privately.',
        ];

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold text-slate-900">What happens next?</h3>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          {steps.map((step, index) => (
            <p key={step}>
              {index + 1}. {step}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
