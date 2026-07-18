'use client';

import { Copy, Wallet, Mail, Briefcase, Calendar, BadgeCheck, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Person } from '@/types/person';
import { useState } from 'react';

interface PersonInfoCardProps {
  person: Person;
  onCopyWallet: (address: string) => void;
}

export function PersonInfoCard({ person, onCopyWallet }: PersonInfoCardProps) {
  const [copied, setCopied] = useState(false);

  const truncateWallet = (address: string) => {
    if (!address) return 'No wallet set';
    if (address.length < 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const handleCopy = () => {
    onCopyWallet(person.wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getTypeColor = (type?: string) => {
    const colors: Record<string, string> = {
      employee: 'from-blue-100 to-blue-200 text-blue-700',
      freelancer: 'from-purple-100 to-purple-200 text-purple-700',
      contractor: 'from-orange-100 to-orange-200 text-orange-700',
      vendor: 'from-green-100 to-green-200 text-green-700',
      consultant: 'from-pink-100 to-pink-200 text-pink-700',
    };
    return colors[type?.toLowerCase() || ''] || 'from-emerald-100 to-emerald-200 text-emerald-700';
  };

  const hasSalary = person.salary !== undefined && person.salary !== null && person.salary > 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />

      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-50/30 blur-2xl" />

      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold shadow-sm ${getTypeColor(person.type)}`}
            >
              {getInitials(person.name)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{person.name}</h3>
                {person.verified && <BadgeCheck className="h-5 w-5 text-emerald-500" />}
                <Badge
                  variant={person.verified ? 'success' : 'warning'}
                  className="text-[10px] tracking-wider uppercase"
                >
                  {person.verified ? 'Verified' : 'Pending'}
                </Badge>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {person.email}
                </span>

                {person.type && (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 capitalize">
                    <Briefcase className="h-3 w-3" />
                    {person.type}
                  </span>
                )}

                {person.title && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-slate-300">•</span>
                    {person.title}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {person.wallet && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50/80 px-4 py-3 transition-all group-hover:bg-slate-50">
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                Wallet Address
              </p>
              <div className="flex items-center gap-2">
                <code className="truncate font-mono text-sm text-slate-700">
                  {truncateWallet(person.wallet)}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-emerald-600"
                  title="Copy wallet address"
                >
                  {copied ? (
                    <span className="text-xs font-medium text-emerald-600">Copied!</span>
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="hidden sm:block">
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
                onClick={() =>
                  window.open(
                    `https://stellar.expert/explorer/public/account/${person.wallet}`,
                    '_blank'
                  )
                }
              >
                View
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {hasSalary ? (
              <div className="flex items-center gap-2 rounded-full bg-emerald-50/80 px-3 py-1">
                <span className="text-xs font-medium text-emerald-600">Salary</span>
                <span className="font-semibold text-slate-900">
                  ${person.salary?.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">/ mo</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-slate-50/80 px-3 py-1">
                <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Salary not set</span>
              </div>
            )}

            {person.createdAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                Joined{' '}
                {new Date(person.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
