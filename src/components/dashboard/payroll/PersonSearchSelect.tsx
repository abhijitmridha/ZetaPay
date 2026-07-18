'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Users, Check, X, Wallet, Mail, ChevronDown } from 'lucide-react';
import { Person } from '@/types/person';

interface PersonSearchSelectProps {
  people: Person[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PersonSearchSelect({
  people,
  selectedId,
  onSelect,
  placeholder = 'Search for a person...',
  disabled = false,
}: PersonSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPerson = people.find((p) => p.id === selectedId);

  const filteredPeople = people.filter(
    (person) =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.wallet?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback(
    (person: Person) => {
      onSelect(person.id);
      setIsOpen(false);
      setSearchQuery('');
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredPeople.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        const person = filteredPeople[highlightedIndex];
        if (person) {
          handleSelect(person);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredPeople, highlightedIndex, handleSelect]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('');
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (!disabled && !selectedPerson) {
      setIsOpen(true);
      setSearchQuery('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(true);
    if (!value && selectedPerson) {
      onSelect('');
    }
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const truncateWallet = (address: string) => {
    if (!address) return '';
    if (address.length < 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatWalletDisplay = (address: string) => {
    if (!address) return 'No wallet set';
    return truncateWallet(address);
  };

  const className = (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(' ');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={className(
          'relative flex items-center rounded-lg border border-slate-200 bg-white transition-all',
          'focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20',
          disabled && 'cursor-not-allowed bg-slate-50',
          isOpen && 'border-emerald-500 ring-2 ring-emerald-500/20'
        )}
      >
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : selectedPerson?.name || ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          placeholder={placeholder}
          disabled={disabled}
          className={className(
            'flex-1 bg-transparent py-2.5 pr-10 pl-10 text-sm outline-none',
            disabled && 'cursor-not-allowed'
          )}
        />

        {selectedPerson && !isOpen ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown
            className={className(
              'pointer-events-none absolute right-3 h-4 w-4 text-slate-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <div className="rounded-full bg-slate-50 p-3">
                <Users className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">No results found</p>
                <p className="text-xs text-slate-400">Try adjusting your search</p>
              </div>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {filteredPeople.map((person, index) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleSelect(person)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={className(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-all duration-150',
                    index === highlightedIndex && 'bg-emerald-50/80',
                    person.id === selectedId && 'bg-emerald-50/50',
                    'hover:bg-emerald-50/80'
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-sm font-semibold text-emerald-700">
                    {person.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{person.name}</span>
                      {person.id === selectedId && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <Check className="h-2.5 w-2.5" />
                          Selected
                        </span>
                      )}
                      {person.verified && (
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {person.email}
                      </span>

                      {person.wallet && (
                        <span className="flex items-center gap-1 font-mono" title={person.wallet}>
                          <Wallet className="h-3 w-3" />
                          {formatWalletDisplay(person.wallet)}
                        </span>
                      )}

                      {person.type && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 capitalize">
                          {person.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {person.salary && person.salary > 0 && (
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-slate-700">
                        ${person.salary.toLocaleString()}
                      </span>
                      <div className="text-[10px] text-slate-400">/ month</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-400">
            {filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'} found
          </div>
        </div>
      )}
    </div>
  );
}
