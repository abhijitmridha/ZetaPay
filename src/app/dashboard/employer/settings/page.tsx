'use client';

import { useCallback, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { Building2, CheckCircle2, Globe, Layers3, Save, Shield, WalletCards } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';

type SettlementMode = 'confidential_payroll' | 'shielded_pool';

type SettingsState = {
  companyName: string;
  companyEmail: string;
  defaultCurrency: string;
  taxRegion: string;
  payFrequency: string;
  autoProcess: boolean;
  requireApproval: boolean;
  defaultSettlementMode: SettlementMode;
  useFixedDenominations: boolean;
};

const defaultSettings: SettingsState = {
  companyName: '',
  companyEmail: '',
  defaultCurrency: 'USDC',
  taxRegion: 'US',
  payFrequency: 'monthly',
  autoProcess: false,
  requireApproval: true,
  defaultSettlementMode: 'confidential_payroll',
  useFixedDenominations: true,
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    const enterpriseId = Cookies.get('enterpriseId');

    if (!enterpriseId) {
      setError('Enterprise session not found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/settings?enterpriseId=${enterpriseId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to load settings');
      }

      setSettings({
        companyName: data.companyName || '',
        companyEmail: data.companyEmail || '',
        defaultCurrency: data.defaultCurrency || 'USDC',
        taxRegion: data.taxRegion || 'US',
        payFrequency: data.payFrequency || 'monthly',
        autoProcess: Boolean(data.autoProcess),
        requireApproval: data.requireApproval !== undefined ? Boolean(data.requireApproval) : true,
        defaultSettlementMode:
          data.defaultSettlementMode === 'shielded_pool' ? 'shielded_pool' : 'confidential_payroll',
        useFixedDenominations: data.useFixedDenominations !== false,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const enterpriseId = Cookies.get('enterpriseId');

      if (!enterpriseId) {
        throw new Error('Enterprise session not found');
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enterpriseId: Number.parseInt(enterpriseId, 10), ...settings }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || body.message || 'Failed to save settings');
      }

      setMessage('Settings saved successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void fetchSettings();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchSettings]);

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
        title="Settings"
        description="Manage company profile, payroll defaults, and shielded pool preferences."
      />

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Company
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name">
              <input
                type="text"
                value={settings.companyName}
                onChange={(event) => setSettings({ ...settings, companyName: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder="Your Company"
              />
            </Field>

            <Field label="Company Email">
              <input
                type="email"
                value={settings.companyEmail}
                onChange={(event) => setSettings({ ...settings, companyEmail: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                placeholder="hr@company.com"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Globe className="h-5 w-5 text-emerald-600" />
            Payroll
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default Currency">
              <select
                value={settings.defaultCurrency}
                onChange={(event) =>
                  setSettings({ ...settings, defaultCurrency: event.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              >
                <option value="USDC">USDC</option>
                <option value="XLM">XLM</option>
              </select>
            </Field>

            <Field label="Tax Region">
              <select
                value={settings.taxRegion}
                onChange={(event) => setSettings({ ...settings, taxRegion: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              >
                <option value="US">United States</option>
                <option value="EU">Europe</option>
                <option value="UK">United Kingdom</option>
              </select>
            </Field>

            <Field label="Pay Frequency">
              <select
                value={settings.payFrequency}
                onChange={(event) => setSettings({ ...settings, payFrequency: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="biweekly">Biweekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </Field>

            <Field label="Auto Process">
              <select
                value={settings.autoProcess ? 'true' : 'false'}
                onChange={(event) =>
                  setSettings({ ...settings, autoProcess: event.target.value === 'true' })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              >
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <WalletCards className="h-5 w-5 text-emerald-600" />
            Settlement
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default Settlement Mode">
              <select
                value={settings.defaultSettlementMode}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    defaultSettlementMode: event.target.value as SettlementMode,
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              >
                <option value="confidential_payroll">Confidential Payroll</option>
                <option value="shielded_pool">Shielded Payroll Pool</option>
              </select>
            </Field>

            <ToggleCard
              icon={<Layers3 className="h-4 w-4 text-emerald-600" />}
              title="Fixed Denominations"
              description="Split shielded pool deposits into standard note sizes for better privacy."
              checked={settings.useFixedDenominations}
              onChange={(checked) => setSettings({ ...settings, useFixedDenominations: checked })}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Shield className="h-5 w-5 text-emerald-600" />
            Security
          </h3>

          <ToggleCard
            title="Require Approval"
            description="Require admin approval before payroll execution."
            checked={settings.requireApproval}
            onChange={(checked) => setSettings({ ...settings, requireApproval: checked })}
          />
        </section>

        <Button
          onClick={handleSave}
          loading={saving}
          icon={<Save className="h-4 w-4" />}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ToggleCard({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-medium text-slate-900">
            {icon}
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <Switch checked={checked} onChange={onChange} />
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <div className="peer h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-emerald-600 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
    </label>
  );
}
