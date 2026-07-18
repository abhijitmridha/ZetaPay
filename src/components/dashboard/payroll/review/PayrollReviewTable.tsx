import { AlertTriangle, CheckCircle2, Mail, Wallet } from 'lucide-react';
import { getTypeLabel } from '@/types/person';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PayrollReviewItem } from './types';

export function PayrollReviewTable({ items }: { items: PayrollReviewItem[] }) {
  return (
    <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
      <CardHeader className="border-b border-slate-100">
        <CardTitle>Payees</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.personId}
              className="grid gap-4 p-4 lg:grid-cols-[1fr_150px_150px_120px] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{item.name}</p>

                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {getTypeLabel(item.type)}
                  </span>

                  {item.currencyOverridden && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Currency changed
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:gap-4">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {item.email || 'No email'}
                  </span>

                  <span className="flex min-w-0 items-center gap-1 font-mono">
                    <Wallet className="h-3 w-3" />
                    <span className="truncate">{item.wallet || 'No wallet'}</span>
                  </span>
                </div>
              </div>

              <div className="lg:text-right">
                <p className="text-xs text-slate-400">Amount</p>
                <p className="font-semibold text-slate-900">
                  {Number(item.amount).toLocaleString()}
                </p>
              </div>

              <div className="lg:text-right">
                <p className="text-xs text-slate-400">Currency</p>
                <CurrencyBadge currency={item.currency} />
              </div>

              <div className="lg:text-right">
                <p className="text-xs text-slate-400">Status</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CurrencyBadge({ currency }: { currency: string }) {
  return (
    <span
      className={
        currency === 'XLM'
          ? 'inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700'
          : 'inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
      }
    >
      {currency}
    </span>
  );
}
