'use client';

import Link from 'next/link';
import { BadgeCheck, Briefcase, Copy, Edit, History, Mail, Trash2, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { PersonTypeBadge } from './PersonTypeBadge';
import { ROUTES } from '@/config';
import { PersonTableProps, Person } from '@/types/person';

const truncateWallet = (address: string) => {
  if (!address || address.length < 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

interface PersonTableWithDeleteProps extends PersonTableProps {
  onDelete?: (id: string) => void;
}

export function PersonTable({
  people,
  onRowClick,
  onDelete,
  emptyMessage = 'No people found',
}: PersonTableWithDeleteProps) {
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this person?')) return;

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete person');
      }

      onDelete?.(id);
    } catch (error) {
      console.error('Error deleting person:', error);
      alert('Failed to delete person');
    }
  };

  const copyWallet = async (wallet: string) => {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet);
  };

  const getCurrencyBadge = (currency?: string) => {
    const value = currency === 'XLM' ? 'XLM' : 'USDC';

    return (
      <span
        className={
          value === 'XLM'
            ? 'rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700'
            : 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
        }
      >
        {value}
      </span>
    );
  };

  const columns = [
    {
      key: 'name',
      header: 'Person',
      render: (item: Person) => (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-sm">
            {item.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-slate-900">{item.name}</p>
              {item.verified && <BadgeCheck className="h-4 w-4 text-emerald-500" />}
            </div>

            <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <Mail className="h-3 w-3" />
              <span className="truncate">{item.email || 'No email'}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: Person) => <PersonTypeBadge type={item.type} />,
    },
    {
      key: 'title',
      header: 'Role',
      render: (item: Person) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Briefcase className="h-4 w-4 text-slate-400" />
          <span>{item.title || 'Not set'}</span>
        </div>
      ),
    },
    {
      key: 'wallet',
      header: 'Wallet',
      render: (item: Person) => (
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Wallet className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate font-mono text-xs text-slate-600" title={item.wallet}>
              {item.wallet ? truncateWallet(item.wallet) : 'No wallet'}
            </span>
          </div>

          {item.wallet && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                copyWallet(item.wallet);
              }}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
              title="Copy wallet"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      render: (item: Person) => (
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <p className="font-semibold text-slate-900">
              {(item.salary || 0).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </p>
            {getCurrencyBadge(item.preferredCurrency)}
          </div>
          <p className="mt-1 text-xs text-slate-400">Default payroll</p>
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'verified',
      header: 'Status',
      render: (item: Person) => (
        <span
          className={
            item.verified
              ? 'inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'
              : 'inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700'
          }
        >
          <span
            className={
              item.verified
                ? 'h-1.5 w-1.5 rounded-full bg-emerald-500'
                : 'h-1.5 w-1.5 rounded-full bg-amber-500'
            }
          />
          {item.verified ? 'Active' : 'Pending'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (item: Person) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`${ROUTES.employer.employees}/${item.id}/payroll`}>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3 text-xs">
              <History className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">History</span>
            </Button>
          </Link>

          <Link href={`${ROUTES.employer.employees}/edit/${item.id}`}>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3 text-xs">
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(item.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <DataTable<Person>
        data={people}
        columns={columns}
        onRowClick={onRowClick}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
