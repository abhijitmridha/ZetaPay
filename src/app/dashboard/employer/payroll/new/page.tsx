'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';

import { API, ROUTES } from '@/config';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Person, mapApiRecordToPerson } from '@/types/person';
import { BalanceData } from '@/types/payroll';

import { PayrollRunHeader } from '@/components/dashboard/payroll/run-builder/PayrollRunHeader';
import { PayrollPeriodFields } from '@/components/dashboard/payroll/run-builder/PayrollPeriodFields';
import { PayrollPeopleToolbar } from '@/components/dashboard/payroll/run-builder/PayrollPeopleToolbar';
import { PayrollTypeFilters } from '@/components/dashboard/payroll/run-builder/PayrollTypeFilters';
import { PayrollPeopleList } from '@/components/dashboard/payroll/run-builder/PayrollPeopleList';
import { PayrollSummaryCard } from '@/components/dashboard/payroll/run-builder/PayrollSummaryCard';
import { PayrollNextStepsCard } from '@/components/dashboard/payroll/run-builder/PayrollNextStepsCard';
import { PayrollWalletFundingCard } from '@/components/dashboard/payroll/run-builder/PayrollWalletFundingCard';
import {
  PayrollMode,
  PayrollSettlementModeCard,
} from '@/components/dashboard/payroll/run-builder/PayrollSettlementModeCard';
import {
  PayrollDraftItem,
  SelectedPayrollPerson,
  TypeFilter,
} from '@/components/dashboard/payroll/run-builder/types';

type ApiRecord = {
  id: string | number;
  fullName?: string | null;
  name?: string | null;
  walletAddress?: string | null;
  wallet?: string | null;
  email?: string | null;
  type?: string | null;
  title?: string | null;
  salary?: string | number | null;
  preferredCurrency?: string | null;
  status?: string | null;
  verified?: boolean | null;
  createdAt?: string | null;
};

export default function NewPayrollRunPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<Record<string, PayrollDraftItem>>({});
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [periodStart, setPeriodStart] = useState('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState('2026-01-31');
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [payrollMode, setPayrollMode] = useState<PayrollMode>('confidential_payroll');

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    setBalanceError(null);

    try {
      const wallet = Cookies.get('zetaWallet') || null;
      setWalletAddress(wallet);

      const response = await fetch(API.stellar.balance);

      if (response.status === 401) {
        const data = await response.json();
        setBalance(null);
        setBalanceError(data.message || 'Please connect your wallet to view balance');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();
      setBalance(data);
    } catch {
      setBalance(null);
      setBalanceError('Unable to load wallet balance');
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const fetchPeople = useCallback(async () => {
    const enterpriseId = Cookies.get('enterpriseId');

    if (!enterpriseId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API.employees.byEnterprise(parseInt(enterpriseId, 10)));

      if (!response.ok) {
        throw new Error('Failed to fetch people');
      }

      const data: ApiRecord[] = await response.json();
      const mapped = data.map((record) => mapApiRecordToPerson(record));

      setPeople(mapped);

      const initialItems = mapped.reduce<Record<string, PayrollDraftItem>>((acc, person) => {
        acc[person.id] = {
          personId: person.id,
          amount: person.salary ? String(person.salary) : '',
          currency: person.preferredCurrency || 'USDC',
          selected: false,
        };

        return acc;
      }, {});

      setItems(initialItems);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      await Promise.all([fetchPeople(), fetchBalance()]);
    }

    load();
  }, [fetchPeople, fetchBalance]);

  const filteredPeople = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return people.filter((person) => {
      const matchesType = typeFilter === 'all' || person.type === typeFilter;

      const matchesQuery =
        !normalized ||
        person.name.toLowerCase().includes(normalized) ||
        person.email.toLowerCase().includes(normalized) ||
        person.wallet.toLowerCase().includes(normalized);

      return matchesType && matchesQuery;
    });
  }, [people, query, typeFilter]);

  const selectedItems = useMemo(() => {
    return Object.values(items).filter((item) => item.selected && Number(item.amount) > 0);
  }, [items]);

  const selectedPeople = useMemo(() => {
    return selectedItems
      .map((item) => {
        const person = people.find((candidate) => candidate.id === item.personId);
        return person ? { person, item } : null;
      })
      .filter(Boolean) as SelectedPayrollPerson[];
  }, [people, selectedItems]);

  const totals = useMemo(() => {
    const totalXlm = selectedItems
      .filter((item) => item.currency === 'XLM')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const totalUsdc = selectedItems
      .filter((item) => item.currency === 'USDC')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      selectedCount: selectedItems.length,
      totalXlm,
      totalUsdc,
    };
  }, [selectedItems]);

  const batchCount = Math.max(1, Math.ceil(totals.selectedCount / 128));

  const warnings = useMemo(() => {
    return {
      missingWalletCount: selectedPeople.filter(({ person }) => !person.wallet).length,
      missingEmailCount: selectedPeople.filter(({ person }) => !person.email).length,
      invalidAmountCount: Object.values(items).filter(
        (item) => item.selected && Number(item.amount || 0) <= 0
      ).length,
    };
  }, [items, selectedPeople]);

  const allVisibleSelected =
    filteredPeople.length > 0 && filteredPeople.every((person) => items[person.id]?.selected);

  const canContinue =
    totals.selectedCount > 0 &&
    warnings.missingWalletCount === 0 &&
    warnings.invalidAmountCount === 0;

  const availableXlm = balance ? Number(balance.xlm || 0) : 0;
  const availableUsdc = balance ? Number(balance.usdc || 0) : 0;

  const hasEnoughBalance =
    balance && availableXlm >= totals.totalXlm && availableUsdc >= totals.totalUsdc;

  const canReviewPayroll = canContinue && Boolean(hasEnoughBalance);

  function togglePerson(person: Person) {
    setItems((prev) => {
      const current = prev[person.id];

      return {
        ...prev,
        [person.id]: {
          personId: person.id,
          amount: current?.amount || (person.salary ? String(person.salary) : ''),
          currency: current?.currency || person.preferredCurrency || 'USDC',
          selected: !current?.selected,
        },
      };
    });
  }

  function updateAmount(personId: string, amount: string) {
    setItems((prev) => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        amount,
      },
    }));
  }

  function toggleVisiblePeople() {
    setItems((prev) => {
      const next = { ...prev };
      const shouldSelect = !allVisibleSelected;

      for (const person of filteredPeople) {
        next[person.id] = {
          personId: person.id,
          amount: next[person.id]?.amount || (person.salary ? String(person.salary) : ''),
          currency: next[person.id]?.currency || person.preferredCurrency || 'USDC',
          selected: shouldSelect,
        };
      }

      return next;
    });
  }

  function clearSelectedPeople() {
    setItems((prev) => {
      const next = { ...prev };

      for (const key of Object.keys(next)) {
        next[key] = {
          ...next[key],
          selected: false,
        };
      }

      return next;
    });
  }

  function continueToReview() {
    const payload = {
      periodStart,
      periodEnd,
      payrollMode,
      items: selectedPeople.map(({ person, item }) => ({
        personId: item.personId,
        name: person.name,
        email: person.email,
        wallet: person.wallet,
        type: person.type,
        amount: item.amount,
        currency: item.currency,
        defaultCurrency: person.preferredCurrency,
        currencyOverridden: item.currency !== person.preferredCurrency,
      })),
      totals: {
        xlm: totals.totalXlm,
        usdc: totals.totalUsdc,
        payeeCount: totals.selectedCount,
        batchCount,
      },
    };

    sessionStorage.setItem('zetapayPayrollDraft', JSON.stringify(payload));
    window.location.href = `${ROUTES.employer.root}/payroll/review`;
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Payroll Run"
        description="Select payees, confirm currencies, and prepare a private ZK verified payroll batch."
        backLink={{ href: ROUTES.employer.root, label: 'Back to Dashboard' }}
      >
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          128 payees per ZK proof
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
          <PayrollRunHeader selectedCount={totals.selectedCount} batchCount={batchCount} />

          <PayrollSettlementModeCard payrollMode={payrollMode} onChange={setPayrollMode} />

          <CardContent className="space-y-5 p-6">
            <PayrollPeriodFields
              periodStart={periodStart}
              periodEnd={periodEnd}
              onPeriodStartChange={setPeriodStart}
              onPeriodEndChange={setPeriodEnd}
            />

            <PayrollPeopleToolbar
              query={query}
              allVisibleSelected={allVisibleSelected}
              onQueryChange={setQuery}
              onToggleVisible={toggleVisiblePeople}
              onClearSelected={clearSelectedPeople}
            />

            <PayrollTypeFilters activeType={typeFilter} onChange={setTypeFilter} />

            <PayrollPeopleList
              people={filteredPeople}
              items={items}
              onTogglePerson={togglePerson}
              onAmountChange={updateAmount}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <PayrollWalletFundingCard
            balance={balance}
            loading={balanceLoading}
            error={balanceError}
            walletAddress={walletAddress}
            requiredXlm={totals.totalXlm}
            requiredUsdc={totals.totalUsdc}
            onRefresh={fetchBalance}
          />

          <PayrollSummaryCard
            totals={totals}
            warnings={warnings}
            periodStart={periodStart}
            periodEnd={periodEnd}
            payrollMode={payrollMode}
            canContinue={canReviewPayroll}
            onContinue={continueToReview}
          />

          <PayrollNextStepsCard payrollMode={payrollMode} />
        </div>
      </div>
    </div>
  );
}
