import { cookies } from 'next/headers';
import { EMPLOYER } from '@/config';
import { stellarServer } from './horizon';

export async function initializeEmployerSession(publicKey: string): Promise<boolean> {
  try {
    await stellarServer.loadAccount(publicKey);

    const cookieStore = await cookies();

    cookieStore.set('zetaWallet', publicKey, {
      expires: 7,
      path: '/',
      httpOnly: true,
      secure: true,
    });
    cookieStore.set('zetaRole', EMPLOYER, { expires: 7, path: '/', httpOnly: true, secure: true });

    return true;
  } catch (error) {
    console.error('Server session authorization rejected:', error);
    return false;
  }
}
