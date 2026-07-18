import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { EMPLOYER } from '@/config';
import { db } from '@/lib/db';
import { enterprises } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    const enterprise = await db
      .select({ id: enterprises.id })
      .from(enterprises)
      .where(eq(enterprises.walletAddress, walletAddress))
      .then((res) => res[0]);

    let enterpriseId: number;

    if (!enterprise) {
      const newCompany = await db
        .insert(enterprises)
        .values({
          walletAddress: walletAddress,
          companyName: 'ZetaPay Corporate Client',
          companyEmail: 'company@zetapay.com',
          country: 'EU',
          isActive: true,
        })
        .returning({ id: enterprises.id })
        .then((res) => res[0]);

      if (!newCompany) {
        throw new Error('Failed to insert new enterprise row into database.');
      }

      enterpriseId = newCompany.id;
    } else {
      enterpriseId = enterprise.id;
    }

    const cookieStore = await cookies();

    cookieStore.set('zetaWallet', walletAddress, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.set('zetaRole', EMPLOYER, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.set('enterpriseId', String(enterpriseId), {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    const response = NextResponse.json({ success: true, enterpriseId });
    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Master database query failure';

    console.error('Drizzle Session API Error Context:', error);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
