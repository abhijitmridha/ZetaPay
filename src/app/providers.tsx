'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

import { AUDITOR, EMPLOYEE, EMPLOYER } from '@/config';

interface WalletContextType {
  walletAddress: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  disconnect: () => void;
  refreshUser: (walletOrEmail?: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }

  return context;
}

function getInitialWalletAddress(): string | null {
  if (typeof window === 'undefined') return null;

  const savedRole = Cookies.get('zetaRole');
  const savedWallet = Cookies.get('zetaWallet');
  const savedAuditorSession = Cookies.get('auditorSession');

  if (savedWallet && (savedRole === EMPLOYER || savedRole === EMPLOYEE)) {
    return savedWallet;
  }

  if (savedAuditorSession && savedRole === AUDITOR) {
    try {
      const session = JSON.parse(decodeURIComponent(savedAuditorSession));
      return session.email || 'auditor@company.com';
    } catch {
      return 'auditor@company.com';
    }
  }

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [walletAddress, setWalletAddress] = useState<string | null>(() =>
    getInitialWalletAddress()
  );

  const [isConnecting] = useState(false);

  function disconnect() {
    setWalletAddress(null);

    Cookies.remove('zetaRole', { path: '/' });
    Cookies.remove('zetaWallet', { path: '/' });
    Cookies.remove('enterpriseId', { path: '/' });
    Cookies.remove('employeeId', { path: '/' });
    Cookies.remove('auditorSession', { path: '/' });

    router.push('/');
    router.refresh();
  }

  function refreshUser(walletOrEmail?: string) {
    setWalletAddress(walletOrEmail || getInitialWalletAddress());
  }

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnecting,
        isConnected: Boolean(walletAddress),
        disconnect,
        refreshUser,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
