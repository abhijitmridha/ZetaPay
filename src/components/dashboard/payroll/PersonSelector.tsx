'use client';

import { Users } from 'lucide-react';
import { Person } from '@/types/person';

interface PersonSelectorProps {
  people: Person[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}

export function PersonSelector({
  people,
  selectedId,
  onSelect,
  placeholder = 'Select a person...',
}: PersonSelectorProps) {
  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
        required
      >
        <option value="">{placeholder}</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name} - {person.email}
          </option>
        ))}
      </select>
      <Users className="pointer-events-none absolute top-3 right-3 h-4 w-4 text-slate-400" />
    </div>
  );
}
