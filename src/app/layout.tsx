import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/shared/Navbar';
import { EMPLOYER, AUDITOR } from '@/config';

export const metadata: Metadata = {
  title: {
    default: 'ZetaPay | Verified Payroll on Stellar',
    template: '%s | ZetaPay',
  },

  description:
    'ZetaPay is a payroll verification platform built on Stellar and Soroban, enabling verified payroll settlements, shielded payments, and zero knowledge proof based verification.',

  keywords: [
    'ZetaPay',
    'Verified Payroll',
    'Payroll Verification',
    'Stellar',
    'Soroban',
    'Zero Knowledge Proofs',
    'Groth16',
    'Shielded Payments',
    'Blockchain Payroll',
    'Merkle Trees',
    'Cryptography',
  ],

  icons: {
    icon: [
      {
        url: '/favicon.ico',
      },
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  manifest: '/site.webmanifest',
};

type UserInfo = {
  label: string;
  icon: 'Wallet' | 'User';
  type: string;
} | null;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get('zetaRole')?.value;
  const auditorSession = cookieStore.get('auditorSession')?.value;
  const wallet = cookieStore.get('zetaWallet')?.value;

  let userInfo: UserInfo = null;

  if (role === EMPLOYER && wallet) {
    userInfo = {
      label: `${wallet.slice(0, 8)} ... ${wallet.slice(-8)}`,
      icon: 'Wallet',
      type: EMPLOYER,
    };
  } else if (role === AUDITOR && auditorSession) {
    try {
      const session = JSON.parse(decodeURIComponent(auditorSession));
      userInfo = {
        label: session.email || 'auditor@company.com',
        icon: 'User',
        type: AUDITOR,
      };
    } catch {
      userInfo = {
        label: AUDITOR,
        icon: 'User',
        type: AUDITOR,
      };
    }
  }

  return (
    <html lang="en">
      <body className="bg-slate-950" suppressHydrationWarning>
        <Providers>
          <Navbar initialUserInfo={userInfo} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
