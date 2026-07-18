import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUDITOR, DASHBOARD, EMPLOYEE, EMPLOYER, ROUTES } from '@/config';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const role = request.cookies.get('zetaRole')?.value;

  if (!path.startsWith(DASHBOARD)) {
    return NextResponse.next();
  }

  if (!role) {
    const loginUrl = path.startsWith(ROUTES.auditor.root)
      ? ROUTES.auth.auditorLogin
      : path.startsWith(ROUTES.employee.root)
        ? ROUTES.auth.employeeConnect
        : ROUTES.auth.employerConnect;

    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  if (path.startsWith(ROUTES.employer.root) && role !== EMPLOYER) {
    return NextResponse.redirect(new URL(ROUTES.auth.employerConnect, request.url));
  }

  if (path.startsWith(ROUTES.employee.root) && role !== EMPLOYEE) {
    return NextResponse.redirect(new URL(ROUTES.auth.employeeConnect, request.url));
  }

  if (path.startsWith(ROUTES.auditor.root) && role !== AUDITOR) {
    return NextResponse.redirect(new URL(ROUTES.auth.auditorLogin, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
