import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: process.env.npm_package_version ?? 'unknown',
    commit: process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
}
