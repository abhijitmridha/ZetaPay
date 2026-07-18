import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PersonnelManager } from '@/components/dashboard/employees/PersonnelManager';
import { ROUTES } from '@/config';
import { inferPersonTypeFromRecord } from '@/types/person';
import type { Person } from '@/types/person';

function mapRecordToPerson(record: typeof employees.$inferSelect): Person {
  const inferredType = inferPersonTypeFromRecord(record);

  return {
    id: String(record.id),
    name: record.fullName || 'Anonymous Record',
    wallet: record.walletAddress,
    email: record.email || 'no-email@company.com',
    type: inferredType,
    title: record.title || undefined,
    salary: record.salary ? parseFloat(String(record.salary)) : 0,
    preferredCurrency: record.preferredCurrency === 'XLM' ? 'XLM' : 'USDC',
    verified: record.status === 'active',
    createdAt: record.createdAt
      ? new Date(record.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

export default async function EmployerEmployeesPage() {
  const cookieStore = await cookies();
  const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

  if (!enterpriseIdStr) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Security Alert:</p>
        <p>
          No valid workspace session active. Please authenticate your corporate wallet to continue.
        </p>
      </div>
    );
  }

  const enterpriseId = parseInt(enterpriseIdStr, 10);
  if (isNaN(enterpriseId)) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Context Error:</p>
        <p>Malformed configuration parsing identifiers detected.</p>
      </div>
    );
  }

  const dbRecords = await db
    .select()
    .from(employees)
    .where(eq(employees.enterpriseId, enterpriseId))
    .execute();

  const serializedPersonnel: Person[] = dbRecords.map(mapRecordToPerson);

  return (
    <PersonnelManager
      initialData={serializedPersonnel}
      addPersonRoute={ROUTES.employer.addEmployee}
    />
  );
}
