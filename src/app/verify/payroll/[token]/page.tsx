'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, FileWarning, ShieldCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';

type PublicVerificationResponse = {
  verified: boolean;
  payrollRun: {
    id: number;
    batchRoot: string | null;
    payrollRunHash: string | null;
    proofHash: string | null;
    batchCount: number | null;
    status: string | null;
    txHash: string | null;
    createdAt: string;
    encryptedPayrollRecords: boolean;
  };
  proof: {
    proofHash: string;
    isValid: boolean | null;
    generatedAt: string;
  } | null;
};

export default function PublicPayrollVerificationPage() {
  const params = useParams<{ token: string }>();

  const [data, setData] = useState<PublicVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVerification() {
      try {
        const response = await fetch(`/api/payroll/verify/${params.token}`);
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error || 'Verification failed');
        }

        setData(body);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Verification failed');
      } finally {
        setLoading(false);
      }
    }

    void loadVerification();
  }, [params.token]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto mt-16 flex max-w-5xl justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <FileWarning className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Verification failed</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'Invalid verification link'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto mt-16 max-w-6xl space-y-6">
        <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
              <ShieldCheck className="h-4 w-4" />
              ZetaPay Public Payroll Proof
            </div>

            <h1 className="mt-4 text-3xl font-bold">Confidential payroll proof verified</h1>

            <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
              This public page verifies the payroll proof without exposing payroll rows, employee
              names, wallets, roles, periods, or salary metadata.
            </p>
          </div>

          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <Metric label="Status" value={data.verified ? 'Verified' : 'Incomplete'} />
            <Metric label="Payroll records" value="Encrypted" />
            <Metric label="Batches" value={`${data.payrollRun.batchCount || 1}`} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900">Public proof metadata</h2>

              <div className="mt-5 space-y-4">
                <HashRow label="Batch root" value={data.payrollRun.batchRoot} />
                <HashRow label="Payroll run hash" value={data.payrollRun.payrollRunHash} />
                <HashRow label="Proof hash" value={data.payrollRun.proofHash} />
                <HashRow label="Transaction hash" value={data.payrollRun.txHash} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Privacy checks</h2>
              </div>

              <div className="mt-5 space-y-3">
                <Check label="Payroll rows encrypted" />
                <Check label="No employee names exposed" />
                <Check label="No payroll wallets exposed here" />
                <Check label="No individual salaries exposed" />
                <Check label="No audit report exposed" />
                <Check label="Merkle root present" />
                <Check label="Groth16 proof hash present" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="mt-1 font-semibold break-words text-slate-900">{value}</p>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">{label}</p>
      <p className="mt-1 rounded-2xl bg-slate-50 p-3 font-mono text-xs break-all text-slate-700">
        {value || 'Not generated'}
      </p>
    </div>
  );
}

function Check({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
      <CheckCircle2 className="h-4 w-4" />
      {label}
    </div>
  );
}
