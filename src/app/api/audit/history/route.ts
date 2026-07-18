import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';

type AuditorSession = {
  id?: string;
  email?: string;
  name?: string;
  fullName?: string;
};

function readAuditorSession(value?: string) {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value)) as AuditorSession;
  } catch {
    try {
      return JSON.parse(value) as AuditorSession;
    } catch {
      return null;
    }
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('zetaRole')?.value;
    const auditorSession = readAuditorSession(cookieStore.get('auditorSession')?.value);

    if (role !== 'auditor' || !auditorSession?.email) {
      return NextResponse.json({ error: 'Unauthorized auditor session' }, { status: 401 });
    }

    const records = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'view_payroll'))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100)
      .execute();

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Failed to fetch audit history:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch audit history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
