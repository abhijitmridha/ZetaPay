import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { enterprises, payrollSettings } from '@/lib/db/schema';

type SettingsRequest = {
  enterpriseId?: number;
  companyName?: string;
  companyEmail?: string;
  defaultCurrency?: string;
  taxRegion?: string;
  payFrequency?: string;
  autoProcess?: boolean;
  requireApproval?: boolean;
  defaultSettlementMode?: 'confidential_payroll' | 'shielded_pool';
  useFixedDenominations?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeMetadata(current: unknown, next: Record<string, unknown>) {
  const base = isRecord(current) ? current : {};

  return {
    ...base,
    ...next,
  };
}

async function getSessionEnterpriseId() {
  const cookieStore = await cookies();
  const value = cookieStore.get('enterpriseId')?.value;

  if (!value) return null;

  const enterpriseId = Number.parseInt(value, 10);

  if (Number.isNaN(enterpriseId)) return null;

  return enterpriseId;
}

export async function GET(request: Request) {
  try {
    const sessionEnterpriseId = await getSessionEnterpriseId();

    if (!sessionEnterpriseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const enterpriseId = Number.parseInt(searchParams.get('enterpriseId') || '', 10);

    if (Number.isNaN(enterpriseId)) {
      return NextResponse.json({ error: 'Enterprise ID is required' }, { status: 400 });
    }

    if (enterpriseId !== sessionEnterpriseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [enterprise] = await db
      .select()
      .from(enterprises)
      .where(eq(enterprises.id, enterpriseId))
      .limit(1)
      .execute();

    if (!enterprise) {
      return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
    }

    const [settings] = await db
      .select()
      .from(payrollSettings)
      .where(eq(payrollSettings.enterpriseId, enterpriseId))
      .limit(1)
      .execute();

    const metadata = isRecord(settings?.metadata) ? settings.metadata : {};

    return NextResponse.json({
      companyName: enterprise.companyName,
      companyEmail: enterprise.companyEmail || '',
      defaultCurrency: settings?.defaultCurrency || 'USDC',
      taxRegion: settings?.taxRegion || 'US',
      payFrequency: settings?.payFrequency || 'monthly',
      autoProcess: settings?.autoProcess || false,
      requireApproval: settings?.requireApproval ?? true,
      defaultSettlementMode:
        metadata.defaultSettlementMode === 'shielded_pool'
          ? 'shielded_pool'
          : 'confidential_payroll',
      useFixedDenominations: metadata.useFixedDenominations !== false,
    });
  } catch (error) {
    console.error('Error loading settings:', error);

    return NextResponse.json(
      {
        error: 'Failed to load settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionEnterpriseId = await getSessionEnterpriseId();

    if (!sessionEnterpriseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SettingsRequest;
    const enterpriseId = Number(body.enterpriseId);

    if (!enterpriseId || Number.isNaN(enterpriseId)) {
      return NextResponse.json({ error: 'Enterprise ID is required' }, { status: 400 });
    }

    if (enterpriseId !== sessionEnterpriseId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [enterprise] = await db
      .select()
      .from(enterprises)
      .where(eq(enterprises.id, enterpriseId))
      .limit(1)
      .execute();

    if (!enterprise) {
      return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
    }

    await db
      .update(enterprises)
      .set({
        companyName: body.companyName?.trim() || enterprise.companyName,
        companyEmail: body.companyEmail?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(enterprises.id, enterpriseId))
      .execute();

    const [existingSettings] = await db
      .select()
      .from(payrollSettings)
      .where(eq(payrollSettings.enterpriseId, enterpriseId))
      .limit(1)
      .execute();

    const metadata = mergeMetadata(existingSettings?.metadata, {
      defaultSettlementMode: body.defaultSettlementMode || 'confidential_payroll',
      useFixedDenominations: body.useFixedDenominations !== false,
    });

    if (existingSettings) {
      const [updatedSettings] = await db
        .update(payrollSettings)
        .set({
          defaultCurrency: body.defaultCurrency || existingSettings.defaultCurrency,
          taxRegion: body.taxRegion || existingSettings.taxRegion,
          payFrequency: body.payFrequency || existingSettings.payFrequency,
          autoProcess: Boolean(body.autoProcess),
          requireApproval: body.requireApproval !== false,
          metadata,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(payrollSettings.id, existingSettings.id),
            eq(payrollSettings.enterpriseId, enterpriseId)
          )
        )
        .returning()
        .execute();

      return NextResponse.json({
        success: true,
        settings: updatedSettings,
      });
    }

    const [createdSettings] = await db
      .insert(payrollSettings)
      .values({
        enterpriseId,
        defaultCurrency: body.defaultCurrency || 'USDC',
        taxRegion: body.taxRegion || 'US',
        payFrequency: body.payFrequency || 'monthly',
        autoProcess: Boolean(body.autoProcess),
        requireApproval: body.requireApproval !== false,
        metadata,
      })
      .returning()
      .execute();

    return NextResponse.json(
      {
        success: true,
        settings: createdSettings,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving settings:', error);

    return NextResponse.json(
      {
        error: 'Failed to save settings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
