'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield, User, UserPlus } from 'lucide-react';
import Cookies from 'js-cookie';

import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AUDITOR, AUTH, ROUTES } from '@/config';
import { useWallet } from '@/app/providers';

export default function AuditorSignupForm() {
  const router = useRouter();
  const { refreshUser } = useWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setError(null);
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            fullName: formData.fullName,
            role: AUDITOR,
          },
        },
      });

      if (signupError) {
        throw new Error(signupError.message);
      }

      if (!data.user) {
        throw new Error('Unable to create account');
      }

      Cookies.set('zetaRole', AUDITOR, { expires: 7, path: '/' });
      Cookies.set(
        'auditorSession',
        JSON.stringify({
          id: data.user.id,
          fullName: formData.fullName,
          email: data.user.email || formData.email,
          loggedInAt: new Date().toISOString(),
        }),
        { expires: 7, path: '/' }
      );

      refreshUser(data.user.email || formData.email);
      router.push(ROUTES.auditor.root);
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Signup failed');
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
            <UserPlus className="h-7 w-7 text-emerald-600" />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">Auditor Sign Up</h1>
          <p className="mt-2 text-slate-500">Create your auditor account</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full Name</label>
            <div className="relative mt-1">
              <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Jane Doe"
                className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
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

          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="w-full rounded-xl border border-slate-200 py-2.5 pr-12 pl-10 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            Create Account
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push(ROUTES.auth.auditorLogin)}
              className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Already have an account? Log in
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            Audit keys are verified after account login
          </p>
        </form>
      </div>
    </div>
  );
}
