import { PERSON_TYPES, PersonType, getTypeLabel } from '@/types/person';
import { TypeFilter } from './types';

export function PayrollTypeFilters({
  activeType,
  onChange,
}: {
  activeType: TypeFilter;
  onChange: (type: TypeFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <FilterChip active={activeType === 'all'} label="All" onClick={() => onChange('all')} />

      {PERSON_TYPES.map((type: PersonType) => (
        <FilterChip
          key={type}
          active={activeType === type}
          label={getTypeLabel(type)}
          onClick={() => onChange(type)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm'
          : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
      }
    >
      {label}
    </button>
  );
}
