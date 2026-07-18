import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PayrollPeopleToolbar({
  query,
  allVisibleSelected,
  onQueryChange,
  onToggleVisible,
  onClearSelected,
}: {
  query: string;
  allVisibleSelected: boolean;
  onQueryChange: (value: string) => void;
  onToggleVisible: () => void;
  onClearSelected: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <label className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={onToggleVisible}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        Select visible
      </label>

      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search people by name, email, or wallet"
          className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pr-4 pl-11 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      <Button variant="outline" type="button" onClick={onClearSelected}>
        Clear
      </Button>
    </div>
  );
}
