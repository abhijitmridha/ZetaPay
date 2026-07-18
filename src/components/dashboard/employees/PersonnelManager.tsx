'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, UserPlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { API, ROUTES } from '@/config';
import { PersonStats } from './PersonStats';
import { PersonTable } from './PersonTable';
import Cookies from 'js-cookie';
import {
  PersonnelManagerProps,
  Person,
  PersonType,
  TYPE_LABELS,
  mapApiRecordToPerson,
} from '@/types/person';

export function PersonnelManager({
  initialData = [],
  addPersonRoute = ROUTES.employer.addEmployee,
}: PersonnelManagerProps) {
  const [people, setPeople] = useState<Person[]>(() => (initialData.length > 0 ? initialData : []));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PersonType>('all');

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    const enterpriseId = Cookies.get('enterpriseId');
    if (!enterpriseId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API.employees.byEnterprise(parseInt(enterpriseId)));
      const data = await response.json();
      const mappedData: Person[] = data.map(mapApiRecordToPerson);
      setPeople(mappedData);
    } catch (error) {
      console.error('Error fetching people:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  };

  useEffect(() => {
    if (initialData.length > 0) return;

    let isMounted = true;

    const triggerFetch = async () => {
      await Promise.resolve();
      if (isMounted) {
        await fetchPeople();
      }
    };

    triggerFetch();

    return () => {
      isMounted = false;
    };
  }, [initialData.length, fetchPeople]);

  const filteredPeople = people.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Manage employees, freelancers, contractors, and vendors"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={fetchPeople}
              loading={loading}
            >
              Refresh
            </Button>
            <Link href={addPersonRoute}>
              <Button icon={<UserPlus className="h-4 w-4" />}>Add Person</Button>
            </Link>
          </div>
        }
      />

      <PersonStats people={people} />

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-slate-200 py-2 pr-4 pl-9 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', ...(Object.keys(TYPE_LABELS) as PersonType[])].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type as typeof typeFilter)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'all' ? 'All' : TYPE_LABELS[type as PersonType]}
            </button>
          ))}
        </div>
      </div>

      {filteredPeople.length > 0 ? (
        <PersonTable people={filteredPeople} onDelete={handleDelete} />
      ) : (
        <EmptyState
          icon={<div className="text-3xl">👥</div>}
          title="No people found"
          description="Add employees, freelancers, or contractors to get started"
          action={
            <Link href={addPersonRoute}>
              <Button icon={<UserPlus className="h-4 w-4" />}>Add Person</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
