import { CheckCircle2 } from 'lucide-react';
import { Person, getTypeLabel } from '@/types/person';
import { PayrollDraftItem } from './types';

export function PayrollPersonRow({
  person,
  item,
  onToggle,
  onAmountChange,
}: {
  person: Person;
  item: PayrollDraftItem;
  onToggle: () => void;
  onAmountChange: (amount: string) => void;
}) {
  const selected = Boolean(item?.selected);
  const rowCurrency = person.preferredCurrency || 'USDC';

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        selected
          ? 'border-emerald-300 bg-emerald-50/40'
          : 'border-slate-200 bg-white hover:border-emerald-200'
      }`}
    >
      <div className="grid gap-4 xl:grid-cols-[44px_1fr_170px_120px] xl:items-center">
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-200 bg-white text-slate-300'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{person.name}</p>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 capitalize">
              {getTypeLabel(person.type)}
            </span>

            <span
              className={
                rowCurrency === 'XLM'
                  ? 'rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'
                  : 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
              }
            >
              Pays in {rowCurrency}
            </span>
          </div>

          <p className="mt-1 truncate text-sm text-slate-500">{person.email || 'No email'}</p>
          <p className="mt-1 truncate font-mono text-xs text-slate-400">
            {person.wallet || 'No wallet address'}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item?.amount ?? ''}
            onChange={(event) => onAmountChange(event.target.value)}
            onFocus={() => {
              if (!selected) onToggle();
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Currency</label>
          <div
            className={
              rowCurrency === 'XLM'
                ? 'rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700'
                : 'rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700'
            }
          >
            {rowCurrency}
          </div>
        </div>
      </div>
    </div>
  );
}
