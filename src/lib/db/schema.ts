import {
  pgTable,
  serial,
  text,
  decimal,
  timestamp,
  integer,
  varchar,
  pgEnum,
  index,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const payrollStatusEnum = pgEnum('payroll_status', [
  'draft',
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export const employeeStatusEnum = pgEnum('employee_status', [
  'active',
  'inactive',
  'terminated',
  'on_leave',
]);

export const taxFilingStatusEnum = pgEnum('tax_filing_status', [
  'single',
  'married_joint',
  'married_separate',
  'head_of_household',
  'qualifying_widow',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'view_payroll',
  'export_data',
  'download_report',
  'key_generated',
  'key_revoked',
]);

export const personTypeEnum = pgEnum('person_type', [
  'employee',
  'freelancer',
  'contractor',
  'vendor',
  'consultant',
]);

export const userRoleEnum = pgEnum('user_role', ['employer', 'auditor', 'admin']);

export const auditStatusEnum = pgEnum('audit_status', ['pending', 'verified', 'failed', 'expired']);

export const enterprises = pgTable(
  'enterprises',
  {
    id: serial('id').primaryKey(),
    walletAddress: varchar('wallet_address', { length: 56 }).unique().notNull(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    companyEmail: varchar('company_email', { length: 255 }),
    companyPhone: varchar('company_phone', { length: 20 }),
    taxId: varchar('tax_id', { length: 50 }),
    country: varchar('country', { length: 2 }).default('US'),
    state: varchar('state', { length: 2 }),
    city: varchar('city', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    address: text('address'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    walletIdx: index('idx_enterprises_wallet').on(table.walletAddress),
    companyIdx: index('idx_enterprises_company').on(table.companyName),
    countryIdx: index('idx_enterprises_country').on(table.country),
    activeIdx: index('idx_enterprises_active').on(table.isActive),
  })
);

export const employees = pgTable(
  'employees',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .notNull()
      .references(() => enterprises.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    walletAddress: varchar('wallet_address', { length: 56 }).notNull(),
    email: varchar('email', { length: 255 }),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    type: personTypeEnum('type').default('employee'),
    status: employeeStatusEnum('status').default('active'),
    title: varchar('title', { length: 255 }),
    salary: decimal('salary', { precision: 20, scale: 7 }).default('0'),
    preferredCurrency: varchar('preferred_currency', { length: 10 }).default('USDC'),
    taxFilingStatus: taxFilingStatusEnum('tax_filing_status').default('single'),
    allowances: integer('allowances').default(0),
    additionalWithholding: decimal('additional_withholding', { precision: 10, scale: 2 }).default(
      '0'
    ),
    isExempt: boolean('is_exempt').default(false),
    encryptedPersonalInfo: text('encrypted_personal_info'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    enterpriseIdx: index('idx_employees_enterprise').on(table.enterpriseId),
    walletIdx: index('idx_employees_wallet').on(table.walletAddress),
    emailIdx: index('idx_employees_email').on(table.email),
    typeIdx: index('idx_employees_type').on(table.type),
    statusIdx: index('idx_employees_status').on(table.status),
    preferredCurrencyIdx: index('idx_employees_preferred_currency').on(table.preferredCurrency),
    enterpriseStatusIdx: index('idx_employees_enterprise_status').on(
      table.enterpriseId,
      table.status
    ),
  })
);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id').references(() => enterprises.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').default('auditor'),
    walletAddress: varchar('wallet_address', { length: 56 }),
    isActive: boolean('is_active').default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    roleIdx: index('idx_users_role').on(table.role),
    enterpriseIdx: index('idx_users_enterprise').on(table.enterpriseId),
  })
);

export const payrollRuns = pgTable(
  'payroll_runs',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .notNull()
      .references(() => enterprises.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    runDate: timestamp('run_date', { withTimezone: true }).defaultNow().notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    totalGross: decimal('total_gross', { precision: 20, scale: 7 }).notNull().default('0'),
    totalNet: decimal('total_net', { precision: 20, scale: 7 }).notNull().default('0'),
    totalTaxWithheld: decimal('total_tax_withheld', { precision: 20, scale: 7 })
      .notNull()
      .default('0'),
    totalDeductions: decimal('total_deductions', { precision: 20, scale: 7 })
      .notNull()
      .default('0'),

    totalXlm: decimal('total_xlm', { precision: 20, scale: 7 }).notNull().default('0'),
    totalUsdc: decimal('total_usdc', { precision: 20, scale: 7 }).notNull().default('0'),
    payeeCount: integer('payee_count').default(0),
    batchSize: integer('batch_size').default(128),
    batchCount: integer('batch_count').default(1),
    batchRoot: text('batch_root'),
    payrollRunHash: text('payroll_run_hash'),
    contractBatchId: integer('contract_batch_id'),

    txHash: varchar('tx_hash', { length: 64 }).unique(),
    auditKey: varchar('audit_key', { length: 64 }).unique().notNull(),

    publicVerificationTokenHash: varchar('public_verification_token_hash', {
      length: 64,
    }).unique(),
    publicVerificationPayload: text('public_verification_payload'),
    publicVerificationTokenCreatedAt: timestamp('public_verification_token_created_at', {
      withTimezone: true,
    }),

    auditKeySalt: varchar('audit_key_salt', { length: 64 }),
    proofHash: varchar('proof_hash', { length: 64 }),
    proofPublicInputs: jsonb('proof_public_inputs'),
    status: payrollStatusEnum('status').default('draft'),
    processedBy: varchar('processed_by', { length: 56 }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    enterpriseIdx: index('idx_payroll_enterprise').on(table.enterpriseId),
    dateIdx: index('idx_payroll_date').on(table.runDate),
    periodIdx: index('idx_payroll_period').on(table.periodStart, table.periodEnd),
    statusIdx: index('idx_payroll_status').on(table.status),
    txIdx: index('idx_payroll_tx').on(table.txHash),
    auditKeyIdx: index('idx_payroll_audit_key').on(table.auditKey),
    batchRootIdx: index('idx_payroll_batch_root').on(table.batchRoot),
    payrollRunHashIdx: index('idx_payroll_run_hash').on(table.payrollRunHash),
    enterpriseStatusIdx: index('idx_payroll_enterprise_status').on(
      table.enterpriseId,
      table.status
    ),
    publicVerificationTokenHashIdx: index('idx_payroll_public_verification_token_hash').on(
      table.publicVerificationTokenHash
    ),
  })
);

export const payrollEmployees = pgTable(
  'payroll_employees',
  {
    id: serial('id').primaryKey(),
    payrollRunId: integer('payroll_run_id')
      .notNull()
      .references(() => payrollRuns.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),

    payoutCurrency: varchar('payout_currency', { length: 10 }).default('USDC'),
    grossSalary: decimal('gross_salary', { precision: 20, scale: 7 }).notNull(),
    netSalary: decimal('net_salary', { precision: 20, scale: 7 }).notNull(),
    taxWithheld: decimal('tax_withheld', { precision: 20, scale: 7 }).notNull(),
    federalTax: decimal('federal_tax', { precision: 20, scale: 7 }).notNull().default('0'),
    stateTax: decimal('state_tax', { precision: 20, scale: 7 }).notNull().default('0'),
    localTax: decimal('local_tax', { precision: 20, scale: 7 }).notNull().default('0'),
    socialSecurity: decimal('social_security', { precision: 20, scale: 7 }).notNull().default('0'),
    medicare: decimal('medicare', { precision: 20, scale: 7 }).notNull().default('0'),
    deductions: decimal('deductions', { precision: 20, scale: 7 }).notNull().default('0'),
    bonuses: decimal('bonuses', { precision: 20, scale: 7 }).notNull().default('0'),
    commissions: decimal('commissions', { precision: 20, scale: 7 }).notNull().default('0'),
    reimbursements: decimal('reimbursements', { precision: 20, scale: 7 }).notNull().default('0'),

    batchIndex: integer('batch_index'),
    payeeIndex: integer('payee_index'),
    salt: text('salt'),
    commitment: text('commitment'),
    merklePath: jsonb('merkle_path'),
    pathIndices: jsonb('path_indices'),

    encryptedMetadata: text('encrypted_metadata'),
    txHash: varchar('tx_hash', { length: 64 }),
    status: payrollStatusEnum('status').default('pending'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    paymentVerifiedAt: timestamp('payment_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    payrollIdx: index('idx_payroll_employees_payroll').on(table.payrollRunId),
    employeeIdx: index('idx_payroll_employees_employee').on(table.employeeId),
    statusIdx: index('idx_payroll_employees_status').on(table.status),
    txIdx: index('idx_payroll_employees_tx').on(table.txHash),
    payoutCurrencyIdx: index('idx_payroll_employees_payout_currency').on(table.payoutCurrency),
    commitmentIdx: index('idx_payroll_employees_commitment').on(table.commitment),
    paymentVerifiedAtIdx: index('idx_payroll_employees_payment_verified_at').on(
      table.paymentVerifiedAt
    ),
    batchPayeeIdx: index('idx_payroll_employees_batch_payee').on(
      table.payrollRunId,
      table.batchIndex,
      table.payeeIndex
    ),
    payrollEmployeeIdx: index('idx_payroll_employee_composite').on(
      table.payrollRunId,
      table.employeeId
    ),
  })
);

export const payrollVerificationLinks = pgTable(
  'payroll_verification_links',
  {
    id: serial('id').primaryKey(),
    tokenHash: varchar('token_hash', { length: 64 }).unique().notNull(),
    encryptedPayload: text('encrypted_payload').notNull(),
    linkType: varchar('link_type', { length: 20 }).default('employee').notNull(),
    enterpriseId: integer('enterprise_id')
      .notNull()
      .references(() => enterprises.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    payrollRunId: integer('payroll_run_id')
      .notNull()
      .references(() => payrollRuns.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    payrollEmployeeId: integer('payroll_employee_id')
      .notNull()
      .references(() => payrollEmployees.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenHashIdx: index('idx_payroll_verification_links_token_hash').on(table.tokenHash),
    linkTypeIdx: index('idx_payroll_verification_links_link_type').on(table.linkType),
    enterpriseIdx: index('idx_payroll_verification_links_enterprise').on(table.enterpriseId),
    employeeIdx: index('idx_payroll_verification_links_employee').on(table.employeeId),
    payrollRunIdx: index('idx_payroll_verification_links_payroll_run').on(table.payrollRunId),
    payrollEmployeeIdx: index('idx_payroll_verification_links_payroll_employee').on(
      table.payrollEmployeeId
    ),
    expiresIdx: index('idx_payroll_verification_links_expires').on(table.expiresAt),
  })
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    auditKey: varchar('audit_key', { length: 64 }).notNull(),
    payrollRunId: integer('payroll_run_id').references(() => payrollRuns.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    enterpriseId: integer('enterprise_id').references(() => enterprises.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    action: auditActionEnum('action').notNull(),
    status: auditStatusEnum('status').default('pending'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    location: varchar('location', { length: 100 }),
    decryptedDataHash: varchar('decrypted_data_hash', { length: 64 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    auditKeyIdx: index('idx_audit_logs_key').on(table.auditKey),
    userIdIdx: index('idx_audit_logs_user').on(table.userId),
    payrollIdx: index('idx_audit_logs_payroll').on(table.payrollRunId),
    enterpriseIdx: index('idx_audit_logs_enterprise').on(table.enterpriseId),
    actionIdx: index('idx_audit_logs_action').on(table.action),
    statusIdx: index('idx_audit_logs_status').on(table.status),
    dateIdx: index('idx_audit_logs_date').on(table.createdAt),
    keyActionIdx: index('idx_audit_logs_key_action').on(table.auditKey, table.action),
  })
);

export const auditKeys = pgTable(
  'audit_keys',
  {
    id: serial('id').primaryKey(),
    keyHash: varchar('key_hash', { length: 64 }).unique().notNull(),
    enterpriseId: integer('enterprise_id')
      .notNull()
      .references(() => enterprises.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    payrollRunId: integer('payroll_run_id').references(() => payrollRuns.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    generatedBy: varchar('generated_by', { length: 56 }).notNull(),
    generatedByUserId: integer('generated_by_user_id').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: varchar('revoked_by', { length: 56 }),
    revocationReason: text('revocation_reason'),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
    accessCount: integer('access_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    keyHashIdx: index('idx_audit_keys_hash').on(table.keyHash),
    enterpriseIdx: index('idx_audit_keys_enterprise').on(table.enterpriseId),
    payrollIdx: index('idx_audit_keys_payroll').on(table.payrollRunId),
    activeIdx: index('idx_audit_keys_active').on(table.isActive),
    expiresIdx: index('idx_audit_keys_expires').on(table.expiresAt),
    enterpriseActiveIdx: index('idx_audit_keys_enterprise_active').on(
      table.enterpriseId,
      table.isActive
    ),
  })
);

export const zkProofs = pgTable(
  'zk_proofs',
  {
    id: serial('id').primaryKey(),
    payrollRunId: integer('payroll_run_id')
      .notNull()
      .references(() => payrollRuns.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    proofHash: varchar('proof_hash', { length: 64 }).unique().notNull(),
    proofData: text('proof_data').notNull(),
    publicInputs: jsonb('public_inputs').notNull(),
    verifyingKeyHash: varchar('verifying_key_hash', { length: 64 }),
    isValid: boolean('is_valid').default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verificationError: text('verification_error'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
  },
  (table) => ({
    payrollIdx: index('idx_zk_proofs_payroll').on(table.payrollRunId),
    proofHashIdx: index('idx_zk_proofs_hash').on(table.proofHash),
    validIdx: index('idx_zk_proofs_valid').on(table.isValid),
    generatedIdx: index('idx_zk_proofs_generated').on(table.generatedAt),
  })
);

export const payrollSettings = pgTable(
  'payroll_settings',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .unique()
      .notNull()
      .references(() => enterprises.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    defaultCurrency: varchar('default_currency', { length: 10 }).default('USDC'),
    defaultTaxFilingStatus: taxFilingStatusEnum('default_tax_filing_status').default('single'),
    taxRegion: varchar('tax_region', { length: 2 }).default('US'),
    payFrequency: varchar('pay_frequency', { length: 20 }).default('monthly'),
    autoProcess: boolean('auto_process').default(false),
    autoProcessDay: integer('auto_process_day'),
    requireApproval: boolean('require_approval').default(true),
    maxAmountPerPayment: decimal('max_amount_per_payment', { precision: 20, scale: 7 }),
    allowedWallets: jsonb('allowed_wallets').default([]),
    notificationsEmail: jsonb('notifications_email').default([]),
    webhookUrl: varchar('webhook_url', { length: 500 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    enterpriseIdx: index('idx_settings_enterprise').on(table.enterpriseId),
  })
);

export const transactionLogs = pgTable(
  'transaction_logs',
  {
    id: serial('id').primaryKey(),
    txHash: varchar('tx_hash', { length: 64 }).unique().notNull(),
    enterpriseId: integer('enterprise_id').references(() => enterprises.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    payrollRunId: integer('payroll_run_id').references(() => payrollRuns.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    payrollEmployeeId: integer('payroll_employee_id').references(() => payrollEmployees.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    fromAddress: varchar('from_address', { length: 56 }).notNull(),
    toAddress: varchar('to_address', { length: 56 }).notNull(),
    amount: decimal('amount', { precision: 20, scale: 7 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('USDC'),
    memo: text('memo'),
    status: varchar('status', { length: 20 }).default('pending'),
    stellarLedger: integer('stellar_ledger'),
    stellarCreatedAt: timestamp('stellar_created_at', { withTimezone: true }),
    fee: decimal('fee', { precision: 20, scale: 7 }).default('0'),
    operationIndex: integer('operation_index'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    txIdx: index('idx_transactions_tx').on(table.txHash),
    enterpriseIdx: index('idx_transactions_enterprise').on(table.enterpriseId),
    payrollIdx: index('idx_transactions_payroll').on(table.payrollRunId),
    payrollEmployeeIdx: index('idx_transactions_payroll_employee').on(table.payrollEmployeeId),
    fromIdx: index('idx_transactions_from').on(table.fromAddress),
    toIdx: index('idx_transactions_to').on(table.toAddress),
    statusIdx: index('idx_transactions_status').on(table.status),
    dateIdx: index('idx_transactions_date').on(table.createdAt),
    fromToIdx: index('idx_transactions_from_to').on(table.fromAddress, table.toAddress),
  })
);

export const enterprisesRelations = relations(enterprises, ({ many }) => ({
  employees: many(employees),
  users: many(users),
  payrollRuns: many(payrollRuns),
  payrollVerificationLinks: many(payrollVerificationLinks),
  auditLogs: many(auditLogs),
  auditKeys: many(auditKeys),
  transactionLogs: many(transactionLogs),
  payrollSettings: many(payrollSettings),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [employees.enterpriseId],
    references: [enterprises.id],
  }),
  payrollEntries: many(payrollEmployees),
  payrollVerificationLinks: many(payrollVerificationLinks),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [users.enterpriseId],
    references: [enterprises.id],
  }),
  auditLogs: many(auditLogs),
  generatedAuditKeys: many(auditKeys, {
    relationName: 'generated_by_user',
  }),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [payrollRuns.enterpriseId],
    references: [enterprises.id],
  }),
  employees: many(payrollEmployees),
  payrollVerificationLinks: many(payrollVerificationLinks),
  auditLogs: many(auditLogs),
  auditKeys: many(auditKeys),
  zkProofs: many(zkProofs),
  transactionLogs: many(transactionLogs),
}));

export const payrollEmployeesRelations = relations(payrollEmployees, ({ one, many }) => ({
  payrollRun: one(payrollRuns, {
    fields: [payrollEmployees.payrollRunId],
    references: [payrollRuns.id],
  }),
  employee: one(employees, {
    fields: [payrollEmployees.employeeId],
    references: [employees.id],
  }),
  payrollVerificationLinks: many(payrollVerificationLinks),
}));

export const payrollVerificationLinksRelations = relations(payrollVerificationLinks, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [payrollVerificationLinks.enterpriseId],
    references: [enterprises.id],
  }),
  employee: one(employees, {
    fields: [payrollVerificationLinks.employeeId],
    references: [employees.id],
  }),
  payrollRun: one(payrollRuns, {
    fields: [payrollVerificationLinks.payrollRunId],
    references: [payrollRuns.id],
  }),
  payrollEmployee: one(payrollEmployees, {
    fields: [payrollVerificationLinks.payrollEmployeeId],
    references: [payrollEmployees.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  enterprise: one(enterprises, {
    fields: [auditLogs.enterpriseId],
    references: [enterprises.id],
  }),
  payrollRun: one(payrollRuns, {
    fields: [auditLogs.payrollRunId],
    references: [payrollRuns.id],
  }),
}));

export const auditKeysRelations = relations(auditKeys, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [auditKeys.enterpriseId],
    references: [enterprises.id],
  }),
  payrollRun: one(payrollRuns, {
    fields: [auditKeys.payrollRunId],
    references: [payrollRuns.id],
  }),
  generatedByUser: one(users, {
    fields: [auditKeys.generatedByUserId],
    references: [users.id],
    relationName: 'generated_by_user',
  }),
}));

export const zkProofsRelations = relations(zkProofs, ({ one }) => ({
  payrollRun: one(payrollRuns, {
    fields: [zkProofs.payrollRunId],
    references: [payrollRuns.id],
  }),
}));

export const transactionLogsRelations = relations(transactionLogs, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [transactionLogs.enterpriseId],
    references: [enterprises.id],
  }),
  payrollRun: one(payrollRuns, {
    fields: [transactionLogs.payrollRunId],
    references: [payrollRuns.id],
  }),
  payrollEmployee: one(payrollEmployees, {
    fields: [transactionLogs.payrollEmployeeId],
    references: [payrollEmployees.id],
  }),
}));

export const payrollSettingsRelations = relations(payrollSettings, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [payrollSettings.enterpriseId],
    references: [enterprises.id],
  }),
}));
