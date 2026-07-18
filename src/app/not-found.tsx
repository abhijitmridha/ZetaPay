'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Home, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      {/* Background effects - adjusted for dark theme */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-96 w-96 animate-pulse rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-96 w-96 animate-pulse rounded-full bg-emerald-500/10 blur-3xl delay-1000" />
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div
        className={`transform text-center transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Main 404 text - lighter color for dark background */}
        <h1 className="text-[120px] leading-none font-black tracking-tighter text-white/90 sm:text-[160px] md:text-[200px]">
          4
          <span className="relative inline-block">
            0
            <span className="absolute inset-0 animate-pulse text-emerald-400 mix-blend-screen">
              0
            </span>
          </span>
          4
        </h1>

        <div className="mt-6 space-y-3">
          {/* Badge with better contrast */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-300 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-emerald-400" />
            Page Not Found
          </div>

          {/* Heading with better contrast */}
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Oops! You&apos;ve wandered off course
          </h2>

          {/* Description with better visibility */}
          <p className="mx-auto max-w-md text-slate-300">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get
            you back on track.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/">
            <Button
              size="lg"
              icon={<Home className="h-4 w-4" />}
              className="bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/40"
            >
              Go Home
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => window.history.back()}
            className="border-white/20 text-white transition-all hover:border-white/30 hover:bg-white/10"
          >
            Go Back
          </Button>
        </div>

        {/* Footer with better visibility */}
        <div className="mt-16 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text font-medium text-transparent">
            ZetaPay
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Privacy-first payroll</span>
        </div>
      </div>
    </div>
  );
}
