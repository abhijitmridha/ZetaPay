export function PayrollPeriodFields({
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
}: {
  periodStart: string;
  periodEnd: string;
  onPeriodStartChange: (value: string) => void;
  onPeriodEndChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Period start</label>
        <input
          type="date"
          value={periodStart}
          onChange={(event) => onPeriodStartChange(event.target.value)}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Period end</label>
        <input
          type="date"
          value={periodEnd}
          onChange={(event) => onPeriodEndChange(event.target.value)}
          className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>
    </div>
  );
}
