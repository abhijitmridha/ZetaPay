import { Users } from 'lucide-react';
import { Person } from '@/types/person';
import { PayrollDraftItem } from './types';
import { PayrollPersonRow } from './PayrollPersonRow';

export function PayrollPeopleList({
  people,
  items,
  onTogglePerson,
  onAmountChange,
}: {
  people: Person[];
  items: Record<string, PayrollDraftItem>;
  onTogglePerson: (person: Person) => void;
  onAmountChange: (personId: string, amount: string) => void;
}) {
  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">No people found</p>
        <p className="mt-1 text-sm text-slate-400">
          Add people first, then come back to create payroll.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-2">
      {people.map((person) => (
        <PayrollPersonRow
          key={person.id}
          person={person}
          item={items[person.id]}
          onToggle={() => onTogglePerson(person)}
          onAmountChange={(amount) => onAmountChange(person.id, amount)}
        />
      ))}
    </div>
  );
}
