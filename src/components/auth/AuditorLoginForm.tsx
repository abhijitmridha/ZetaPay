'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import Cookies from 'js-cookie';

import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AUDITOR, AUTH, ROUTES } from '@/config';
import { useWallet } from '@/app/providers';

export default function AuditorLoginForm() {
  const router = useRouter();
  const { refreshUser } = useWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (!data.user) {
        throw new Error('Unable to sign in');
      }

      Cookies.set('zetaRole', AUDITOR, { expires: 7, path: '/' });
      Cookies.set(
        'auditorSession',
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.fullName || data.user.email,
          loggedInAt: new Date().toISOString(),
        }),
        { expires: 7, path: '/' }
      );

      refreshUser(data.user.email || email);
      router.push(ROUTES.auditor.root);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <button
          type="button"
          onClick={() => router.push(AUTH)}
          className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <Shield className="h-7 w-7 text-emerald-600" />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">Auditor Login</h1>
          <p className="mt-2 text-slate-500">Sign in to verify payroll reports</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="auditor@company.com"
                className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-200 py-2.5 pr-12 pl-10 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            icon={<Shield className="h-4 w-4" />}
          >
            Login
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push(ROUTES.auth.auditorSignup)}
              className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Don’t have an account? Sign up
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            Audit keys are entered after login from the auditor dashboard
          </p>
        </form>
      </div>
    </div>
  );
}
