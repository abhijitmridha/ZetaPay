import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { walletAddress, role } = await request.json();
  return NextResponse.json({ success: true, walletAddress, role });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet');
  return NextResponse.json({ role: null, walletAddress });
}
