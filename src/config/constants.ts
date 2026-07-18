export const DASHBOARD = '/dashboard';
export const AUTH = '/auth';
export const EMPLOYER = 'employer';
export const AUDITOR = 'auditor';

export const CONTRACTOR = 'contractor';
export const CONSULTANT = 'consultant';
export const FREELANCER = 'freelancer';
export const VENDOR = 'vendor';
export const EMPLOYEE = 'employee';

export const ROUTES = {
  auth: {
    root: AUTH,
    employerConnect: `${AUTH}/${EMPLOYER}/connect`,
    employeeConnect: `${AUTH}/${EMPLOYEE}/connect`,
    auditorLogin: `${AUTH}/${AUDITOR}/login`,
    auditorSignup: `${AUTH}/${AUDITOR}/signup`,
  },
  employer: {
    root: `${DASHBOARD}/${EMPLOYER}`,
    employees: `${DASHBOARD}/${EMPLOYER}/employees`,
    addEmployee: `${DASHBOARD}/${EMPLOYER}/employees/add`,
    employeePayroll: (id: number) => `${DASHBOARD}/${EMPLOYER}/employees/${id}/payroll`,
    employeePayrollRun: (id: string, runId: number) =>
      `${DASHBOARD}/${EMPLOYER}/employees/${id}/payroll/${runId}`,
    payroll: `${DASHBOARD}/${EMPLOYER}/payroll`,
    payrollNew: `${DASHBOARD}/${EMPLOYER}/payroll/new`,
    payrollReview: `${DASHBOARD}/${EMPLOYER}/payroll/review`,
    payrollDetails: (id: string) => `${DASHBOARD}/${EMPLOYER}/payroll/${id}`,
    history: `${DASHBOARD}/${EMPLOYER}/history`,
    settings: `${DASHBOARD}/${EMPLOYER}/settings`,
  },
  auditor: {
    root: `${DASHBOARD}/${AUDITOR}`,
    verify: `${DASHBOARD}/${AUDITOR}/verify`,
    reports: `${DASHBOARD}/${AUDITOR}/reports`,
    history: `${DASHBOARD}/${AUDITOR}/history`,
  },
  employee: {
    root: `${DASHBOARD}/${EMPLOYEE}`,
    payroll: `${DASHBOARD}/${EMPLOYEE}/payroll`,
  },
} as const;

export const API = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  },
  payroll: {
    root: '/api/payroll',
    execute: '/api/payroll/execute',
    list: (enterpriseId: number | string) => `/api/payroll?enterpriseId=${enterpriseId}`,
  },
  employees: {
    root: '/api/employees',
    detail: (id: string) => `/api/employees/${id}`,
    payroll: (id: string) => `/api/employees/${id}/payroll`,
    byEnterprise: (enterpriseId: number) => `/api/employees?enterpriseId=${enterpriseId}`,
  },
  audit: {
    verify: '/api/audit/verify',
    reports: '/api/audit/reports',
    history: '/api/audit/history',
  },
  stellar: {
    balance: '/api/stellar/balance',
  },
  zk: {
    generate: '/api/zk/generate',
    verify: '/api/zk/verify',
  },
  employee: {
    dashboard: '/api/employee/dashboard',
    payroll: '/api/employee/payroll',
    withdrawPrepare: '/api/employee/withdraw/prepare',
    withdrawSubmit: '/api/employee/withdraw/submit',
  },
} as const;
