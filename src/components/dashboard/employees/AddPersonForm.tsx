'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Wallet, Mail, User, Shield, Users, DollarSign, Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ROUTES } from '@/config';
import Cookies from 'js-cookie';
import type { PersonType, PersonFormData, AddPersonFormProps } from '@/types/person';
import { TYPE_LABELS, TYPE_DESCRIPTIONS } from '@/types/person';

export function AddPersonForm({
  onSuccess,
  onCancel,
  initialData,
  isEditing = false,
}: AddPersonFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PersonFormData>({
    fullName: initialData?.fullName || '',
    email: initialData?.email || '',
    walletAddress: initialData?.walletAddress || '',
    type: initialData?.type || 'employee',
    title: initialData?.title || '',
    salary: initialData?.salary || 0,
    preferredCurrency: initialData?.preferredCurrency || 'USDC',
    taxFilingStatus: initialData?.taxFilingStatus || 'single',
    allowances: initialData?.allowances || 0,
    additionalWithholding: initialData?.additionalWithholding || 0,
    isExempt: initialData?.isExempt || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const enterpriseId = Cookies.get('enterpriseId');
      if (!enterpriseId) {
        setError('No enterprise found. Please reconnect your wallet.');
        setIsLoading(false);
        return;
      }

      const cleanWallet = formData.walletAddress.trim();
      if (!cleanWallet.startsWith('G') || cleanWallet.length < 56) {
        setError('Invalid Stellar wallet address. Must start with G and be 56 characters.');
        setIsLoading(false);
        return;
      }

      const url =
        isEditing && initialData?.id ? `/api/employees/${initialData.id}` : '/api/employees';

      const method = isEditing && initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: cleanWallet,
          email: formData.email,
          fullName: formData.fullName,
          classification: formData.type,
          title: formData.title,
          salary: formData.salary,
          preferredCurrency: formData.preferredCurrency,
          taxFilingStatus: formData.taxFilingStatus,
          allowances: formData.allowances,
          additionalWithholding: formData.additionalWithholding,
          isExempt: formData.isExempt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save person');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(ROUTES.employer.employees);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect with Freighter';
      setError(errorMessage || 'Failed to save person');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitleLabel = () => {
    switch (formData.type) {
      case 'employee':
        return 'Department';
      case 'freelancer':
        return 'Project Name';
      case 'contractor':
      case 'vendor':
      case 'consultant':
        return 'Company Name';
      default:
        return 'Title';
    }
  };

  const getTitlePlaceholder = () => {
    switch (formData.type) {
      case 'employee':
        return 'e.g., Engineering';
      case 'freelancer':
        return 'e.g., Website Redesign';
      case 'contractor':
      case 'vendor':
      case 'consultant':
        return 'e.g., ABC Consulting';
      default:
        return 'Enter title';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? 'Edit Person' : 'Add Person'}
        description={
          isEditing ? 'Update person details' : 'Add an employee, freelancer, contractor, or vendor'
        }
        backLink={
          onCancel ? undefined : { href: ROUTES.employer.employees, label: 'Back to People' }
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <div className="relative mt-1">
                <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Stellar Wallet Address
              </label>
              <div className="relative mt-1">
                <Wallet className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.walletAddress}
                  onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="G..."
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Stellar address starting with G, 56 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Salary</label>
              <div className="relative mt-1">
                <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="5000.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Preferred Payout Currency
              </label>
              <div className="relative mt-1">
                <Coins className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  required
                  value={formData.preferredCurrency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredCurrency: e.target.value as 'XLM' | 'USDC',
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                >
                  <option value="USDC">USDC</option>
                  <option value="XLM">XLM</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Used as the default currency when creating payroll runs.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Type</label>
              <div className="relative mt-1">
                <Users className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PersonType })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xs text-slate-500">{TYPE_DESCRIPTIONS[formData.type]}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">{getTitleLabel()}</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder={getTitlePlaceholder()}
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-700">Verification Required</p>
                <p className="text-xs text-yellow-600">
                  New people will need to verify their wallet before receiving payments.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" loading={isLoading} icon={<UserPlus className="h-4 w-4" />}>
            {isEditing ? 'Update Person' : 'Add Person'}
          </Button>
          <Button variant="outline" type="button" onClick={onCancel || (() => router.back())}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
