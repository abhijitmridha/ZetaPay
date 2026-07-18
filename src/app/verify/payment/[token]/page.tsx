'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, FileWarning, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

type EmployeePaymentVerificationResponse = {
  verified: boolean;
  verification: {
    verified: boolean;
    reason: string | null;
    merkleRoot: string | null;
  };
  payment: {
    companyName: string;
    payrollRunId: number;
    periodStart?: string;
    periodEnd?: string;
    batchRoot: string | null;
    payrollRunHash: string | null;
    proofHash: string | null;
    payrollStatus: string | null;
    payrollEmployeeId: number;
    amount?: string;
    atomicAmount?: string;
    currency?: string;
    employeeType?: string;
    walletAddress?: string;
    paymentStatus: string | null;
    commitment?: string;
    merkleRoot?: string | null;
    txHash: string | null;
    expiresAt: string;
    usedAt: string | null;
    paymentVerifiedAt: string | null;
    source: string;
  };
};

export default function EmployeePaymentVerificationPage() {
  const params = useParams<{ token: string }>();

  const [data, setData] = useState<EmployeePaymentVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVerification = useCallback(async () => {
    try {
      const response = await fetch(`/api/payment/verify/${params.token}`);
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
  }, [params.token]);

  async function confirmVerification() {
    setConfirming(true);
    setError(null);

    try {
      const response = await fetch(`/api/payment/verify/${params.token}`, {
        method: 'POST',
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'Could not confirm verification');
      }

      await loadVerification();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Could not confirm');
    } finally {
      setConfirming(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadVerification();
    });
  }, [loadVerification]);

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

  const payment = data.payment;
  const alreadyConfirmed = Boolean(payment.usedAt || payment.paymentVerifiedAt);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto mt-16 max-w-6xl space-y-6">
        <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-200/50">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm text-emerald-50">
              <ShieldCheck className="h-4 w-4" />
              ZetaPay Encrypted Employee Note
            </div>

            <h1 className="mt-4 text-3xl font-bold">Your payment note is verified</h1>

            <p className="mt-2 max-w-2xl text-sm text-emerald-50/80">
              This private link decrypts only your employee note and verifies it against the
              committed payroll root.
            </p>
          </div>

          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <Metric label="Company" value={payment.companyName} />
            <Metric label="Record source" value="Encrypted note" />
            <Metric label="Status" value={data.verified ? 'Verified' : 'Incomplete'} />
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <Metric
              label="Amount"
              value={`${payment.amount || '0'} ${payment.currency || 'USDC'}`}
            />
            <Metric
              label="Period"
              value={
                payment.periodStart && payment.periodEnd
                  ? `${new Date(payment.periodStart).toLocaleDateString()} to ${new Date(
                      payment.periodEnd
                    ).toLocaleDateString()}`
                  : 'Encrypted'
              }
            />
            <Metric label="Payment status" value={payment.paymentStatus || 'pending'} />
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">Decrypted employee note</h2>

            <div className="mt-5 space-y-4">
              <HashRow label="Recipient wallet from encrypted note" value={payment.walletAddress} />
              <HashRow label="Employee type from encrypted note" value={payment.employeeType} />
              <HashRow label="Your commitment" value={payment.commitment} />
              <HashRow label="Recomputed Merkle root" value={payment.merkleRoot} />
              <HashRow label="Payroll batch root" value={payment.batchRoot} />
              <HashRow label="Payroll run hash" value={payment.payrollRunHash} />
              <HashRow label="Proof hash" value={payment.proofHash} />
              <HashRow label="Transaction hash" value={payment.txHash} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Cryptographic checks</h2>
            </div>

            <div className="mt-5 space-y-3">
              <Check label="Encrypted employee note decrypted" checked />
              <Check
                label="Commitment found in encrypted payroll commitment list"
                checked={data.verification.verified}
              />
              <Check
                label="Merkle root matches payroll batch root"
                checked={data.verification.verified}
              />
              <Check label="Groth16 proof hash present" checked={Boolean(payment.proofHash)} />
            </div>

            {!data.verification.verified && data.verification.reason && (
              <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">
                {data.verification.reason}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Verification receipt</h2>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {alreadyConfirmed
                    ? 'You have already confirmed this payment verification.'
                    : 'Confirm that you viewed and verified this encrypted payment note.'}
                </p>
              </div>

              <Button
                disabled={alreadyConfirmed || confirming}
                onClick={confirmVerification}
                className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {alreadyConfirmed ? 'Confirmed' : confirming ? 'Confirming...' : 'Confirm payment'}
              </Button>
            </div>
          </CardContent>
        </Card>
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
        {value || 'Not available'}
      </p>
    </div>
  );
}

function Check({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${
        checked ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      <CheckCircle2 className="h-4 w-4" />
      {label}
    </div>
  );
}
