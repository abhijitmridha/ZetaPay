import { Lock } from 'lucide-react';

export function PayrollRunHeader({
  selectedCount,
  batchCount,
}: {
  selectedCount: number;
  batchCount: number;
}) {
  return (
    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-6 text-white">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
            <Lock className="h-4 w-4" />
            Private payroll generation
          </div>

          <h2 className="mt-4 text-2xl font-bold">Build a verified payroll batch</h2>
          <p className="mt-1 text-sm text-emerald-50/80">
            Default currencies come from each person profile. You can override them before review.
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 p-4 text-sm">
          <p className="text-emerald-50/70">ZK batching</p>
          <p className="mt-1 text-lg font-semibold">128 payees per proof</p>
          <p className="mt-1 text-xs text-emerald-50/70">
            {selectedCount} selected → {batchCount} batch{batchCount === 1 ? '' : 'es'}
          </p>
        </div>
      </div>
    </div>
  );
}
