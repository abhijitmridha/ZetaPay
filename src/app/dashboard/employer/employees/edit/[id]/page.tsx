import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AddPersonForm } from '@/components/dashboard/employees/AddPersonForm';
import { ROUTES, API, EMPLOYEE } from '@/config';

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

  if (!enterpriseIdStr) {
    redirect(ROUTES.auth.root);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}${API.employees.detail(id)}`, {
    headers: { Cookie: cookieStore.toString() },
  });

  if (!response.ok) {
    notFound();
  }

  const employee = await response.json();

  const initialData = {
    id: String(employee.id),
    fullName: employee.fullName || '',
    email: employee.email || '',
    walletAddress: employee.walletAddress,
    type: employee.type || EMPLOYEE,
    title: employee.title || '',
    salary: parseFloat(employee.salary || '0'),
    preferredCurrency: employee.preferredCurrency || 'USDC',
    taxFilingStatus: employee.taxFilingStatus || 'single',
    allowances: employee.allowances || 0,
    additionalWithholding: parseFloat(employee.additionalWithholding || '0'),
    isExempt: employee.isExempt || false,
  };

  return <AddPersonForm initialData={initialData} isEditing={true} />;
}
