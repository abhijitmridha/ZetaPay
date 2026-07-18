CREATE TYPE "public"."audit_action" AS ENUM('view_payroll', 'export_data', 'download_report', 'key_generated', 'key_revoked');--> statement-breakpoint
CREATE TYPE "public"."audit_status" AS ENUM('pending', 'verified', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive', 'terminated', 'on_leave');--> statement-breakpoint
CREATE TYPE "public"."payroll_status" AS ENUM('draft', 'pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('employee', 'freelancer', 'contractor', 'vendor', 'consultant');--> statement-breakpoint
CREATE TYPE "public"."tax_filing_status" AS ENUM('single', 'married_joint', 'married_separate', 'head_of_household', 'qualifying_widow');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('employer', 'auditor', 'admin');--> statement-breakpoint
CREATE TABLE "audit_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"enterprise_id" integer NOT NULL,
	"payroll_run_id" integer,
	"generated_by" varchar(56) NOT NULL,
	"generated_by_user_id" integer,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"revoked_at" timestamp with time zone,
	"revoked_by" varchar(56),
	"revocation_reason" text,
	"last_accessed_at" timestamp with time zone,
	"access_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"audit_key" varchar(64) NOT NULL,
	"payroll_run_id" integer,
	"enterprise_id" integer,
	"action" "audit_action" NOT NULL,
	"status" "audit_status" DEFAULT 'pending',
	"ip_address" varchar(45),
	"user_agent" text,
	"location" varchar(100),
	"decrypted_data_hash" varchar(64),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"wallet_address" varchar(56) NOT NULL,
	"email" varchar(255),
	"full_name" varchar(200) NOT NULL,
	"type" "person_type" DEFAULT 'employee',
	"status" "employee_status" DEFAULT 'active',
	"title" varchar(255),
	"salary" numeric(20, 7) DEFAULT '0',
	"preferred_currency" varchar(10) DEFAULT 'USDC',
	"tax_filing_status" "tax_filing_status" DEFAULT 'single',
	"allowances" integer DEFAULT 0,
	"additional_withholding" numeric(10, 2) DEFAULT '0',
	"is_exempt" boolean DEFAULT false,
	"encrypted_personal_info" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprises" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(56) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"company_email" varchar(255),
	"company_phone" varchar(20),
	"tax_id" varchar(50),
	"country" varchar(2) DEFAULT 'US',
	"state" varchar(2),
	"city" varchar(100),
	"postal_code" varchar(20),
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enterprises_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "payroll_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_run_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"payout_currency" varchar(10) DEFAULT 'USDC',
	"gross_salary" numeric(20, 7) NOT NULL,
	"net_salary" numeric(20, 7) NOT NULL,
	"tax_withheld" numeric(20, 7) NOT NULL,
	"federal_tax" numeric(20, 7) DEFAULT '0' NOT NULL,
	"state_tax" numeric(20, 7) DEFAULT '0' NOT NULL,
	"local_tax" numeric(20, 7) DEFAULT '0' NOT NULL,
	"social_security" numeric(20, 7) DEFAULT '0' NOT NULL,
	"medicare" numeric(20, 7) DEFAULT '0' NOT NULL,
	"deductions" numeric(20, 7) DEFAULT '0' NOT NULL,
	"bonuses" numeric(20, 7) DEFAULT '0' NOT NULL,
	"commissions" numeric(20, 7) DEFAULT '0' NOT NULL,
	"reimbursements" numeric(20, 7) DEFAULT '0' NOT NULL,
	"batch_index" integer,
	"payee_index" integer,
	"salt" text,
	"commitment" text,
	"merkle_path" jsonb,
	"path_indices" jsonb,
	"encrypted_metadata" text,
	"tx_hash" varchar(64),
	"status" "payroll_status" DEFAULT 'pending',
	"processed_at" timestamp with time zone,
	"payment_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"run_date" timestamp with time zone DEFAULT now() NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"total_gross" numeric(20, 7) DEFAULT '0' NOT NULL,
	"total_net" numeric(20, 7) DEFAULT '0' NOT NULL,
	"total_tax_withheld" numeric(20, 7) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(20, 7) DEFAULT '0' NOT NULL,
	"total_xlm" numeric(20, 7) DEFAULT '0' NOT NULL,
	"total_usdc" numeric(20, 7) DEFAULT '0' NOT NULL,
	"payee_count" integer DEFAULT 0,
	"batch_size" integer DEFAULT 128,
	"batch_count" integer DEFAULT 1,
	"batch_root" text,
	"payroll_run_hash" text,
	"contract_batch_id" integer,
	"tx_hash" varchar(64),
	"audit_key" varchar(64) NOT NULL,
	"public_verification_token_hash" varchar(64),
	"public_verification_payload" text,
	"public_verification_token_created_at" timestamp with time zone,
	"audit_key_salt" varchar(64),
	"proof_hash" varchar(64),
	"proof_public_inputs" jsonb,
	"status" "payroll_status" DEFAULT 'draft',
	"processed_by" varchar(56),
	"processed_at" timestamp with time zone,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_runs_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "payroll_runs_audit_key_unique" UNIQUE("audit_key"),
	CONSTRAINT "payroll_runs_public_verification_token_hash_unique" UNIQUE("public_verification_token_hash")
);
--> statement-breakpoint
CREATE TABLE "payroll_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"default_currency" varchar(10) DEFAULT 'USDC',
	"default_tax_filing_status" "tax_filing_status" DEFAULT 'single',
	"tax_region" varchar(2) DEFAULT 'US',
	"pay_frequency" varchar(20) DEFAULT 'monthly',
	"auto_process" boolean DEFAULT false,
	"auto_process_day" integer,
	"require_approval" boolean DEFAULT true,
	"max_amount_per_payment" numeric(20, 7),
	"allowed_wallets" jsonb DEFAULT '[]'::jsonb,
	"notifications_email" jsonb DEFAULT '[]'::jsonb,
	"webhook_url" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_settings_enterprise_id_unique" UNIQUE("enterprise_id")
);
--> statement-breakpoint
CREATE TABLE "payroll_verification_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"encrypted_payload" text NOT NULL,
	"link_type" varchar(20) DEFAULT 'employee' NOT NULL,
	"enterprise_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"payroll_run_id" integer NOT NULL,
	"payroll_employee_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_verification_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "transaction_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tx_hash" varchar(64) NOT NULL,
	"enterprise_id" integer,
	"payroll_run_id" integer,
	"payroll_employee_id" integer,
	"from_address" varchar(56) NOT NULL,
	"to_address" varchar(56) NOT NULL,
	"amount" numeric(20, 7) NOT NULL,
	"currency" varchar(10) DEFAULT 'USDC',
	"memo" text,
	"status" varchar(20) DEFAULT 'pending',
	"stellar_ledger" integer,
	"stellar_created_at" timestamp with time zone,
	"fee" numeric(20, 7) DEFAULT '0',
	"operation_index" integer,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_logs_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'auditor',
	"wallet_address" varchar(56),
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "zk_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_run_id" integer NOT NULL,
	"proof_hash" varchar(64) NOT NULL,
	"proof_data" text NOT NULL,
	"public_inputs" jsonb NOT NULL,
	"verifying_key_hash" varchar(64),
	"is_valid" boolean DEFAULT false,
	"verified_at" timestamp with time zone,
	"verification_error" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expired_at" timestamp with time zone,
	CONSTRAINT "zk_proofs_proof_hash_unique" UNIQUE("proof_hash")
);
--> statement-breakpoint
ALTER TABLE "audit_keys" ADD CONSTRAINT "audit_keys_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_keys" ADD CONSTRAINT "audit_keys_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_keys" ADD CONSTRAINT "audit_keys_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payroll_employees" ADD CONSTRAINT "payroll_employees_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payroll_employees" ADD CONSTRAINT "payroll_employees_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payroll_verification_links" ADD CONSTRAINT "payroll_verification_links_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payroll_verification_links" ADD CONSTRAINT "payroll_verification_links_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payroll_verification_links" ADD CONSTRAINT "payroll_verification_links_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payroll_verification_links" ADD CONSTRAINT "payroll_verification_links_payroll_employee_id_payroll_employees_id_fk" FOREIGN KEY ("payroll_employee_id") REFERENCES "public"."payroll_employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_payroll_employee_id_payroll_employees_id_fk" FOREIGN KEY ("payroll_employee_id") REFERENCES "public"."payroll_employees"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "zk_proofs" ADD CONSTRAINT "zk_proofs_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_audit_keys_hash" ON "audit_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_audit_keys_enterprise" ON "audit_keys" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_audit_keys_payroll" ON "audit_keys" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_audit_keys_active" ON "audit_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_audit_keys_expires" ON "audit_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_audit_keys_enterprise_active" ON "audit_keys" USING btree ("enterprise_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_key" ON "audit_logs" USING btree ("audit_key");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_payroll" ON "audit_logs" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_enterprise" ON "audit_logs" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_status" ON "audit_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_date" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_key_action" ON "audit_logs" USING btree ("audit_key","action");--> statement-breakpoint
CREATE INDEX "idx_employees_enterprise" ON "employees" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_employees_wallet" ON "employees" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_employees_email" ON "employees" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_employees_type" ON "employees" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_employees_status" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_employees_preferred_currency" ON "employees" USING btree ("preferred_currency");--> statement-breakpoint
CREATE INDEX "idx_employees_enterprise_status" ON "employees" USING btree ("enterprise_id","status");--> statement-breakpoint
CREATE INDEX "idx_enterprises_wallet" ON "enterprises" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_enterprises_company" ON "enterprises" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_enterprises_country" ON "enterprises" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_enterprises_active" ON "enterprises" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_payroll_employees_payroll" ON "payroll_employees" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_employees_employee" ON "payroll_employees" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_employees_status" ON "payroll_employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_employees_tx" ON "payroll_employees" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "idx_payroll_employees_payout_currency" ON "payroll_employees" USING btree ("payout_currency");--> statement-breakpoint
CREATE INDEX "idx_payroll_employees_commitment" ON "payroll_employees" USING btree ("commitment");--> statement-breakpoint
CREATE INDEX "idx_payroll_employees_payment_verified_at" ON "payroll_employees" USING btree ("payment_verified_at");--> statement-breakpoint
CREATE INDEX "idx_payroll_employees_batch_payee" ON "payroll_employees" USING btree ("payroll_run_id","batch_index","payee_index");--> statement-breakpoint
CREATE INDEX "idx_payroll_employee_composite" ON "payroll_employees" USING btree ("payroll_run_id","employee_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_enterprise" ON "payroll_runs" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_date" ON "payroll_runs" USING btree ("run_date");--> statement-breakpoint
CREATE INDEX "idx_payroll_period" ON "payroll_runs" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_payroll_status" ON "payroll_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_tx" ON "payroll_runs" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "idx_payroll_audit_key" ON "payroll_runs" USING btree ("audit_key");--> statement-breakpoint
CREATE INDEX "idx_payroll_batch_root" ON "payroll_runs" USING btree ("batch_root");--> statement-breakpoint
CREATE INDEX "idx_payroll_run_hash" ON "payroll_runs" USING btree ("payroll_run_hash");--> statement-breakpoint
CREATE INDEX "idx_payroll_enterprise_status" ON "payroll_runs" USING btree ("enterprise_id","status");--> statement-breakpoint
CREATE INDEX "idx_payroll_public_verification_token_hash" ON "payroll_runs" USING btree ("public_verification_token_hash");--> statement-breakpoint
CREATE INDEX "idx_settings_enterprise" ON "payroll_settings" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_verification_links_token_hash" ON "payroll_verification_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_payroll_verification_links_link_type" ON "payroll_verification_links" USING btree ("link_type");--> statement-breakpoint
CREATE INDEX "idx_payroll_verification_links_enterprise" ON "payroll_verification_links" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_verification_links_employee" ON "payroll_verification_links" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_verification_links_payroll_run" ON "payroll_verification_links" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_verification_links_payroll_employee" ON "payroll_verification_links" USING btree ("payroll_employee_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_verification_links_expires" ON "payroll_verification_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_tx" ON "transaction_logs" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "idx_transactions_enterprise" ON "transaction_logs" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_payroll" ON "transaction_logs" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_payroll_employee" ON "transaction_logs" USING btree ("payroll_employee_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_from" ON "transaction_logs" USING btree ("from_address");--> statement-breakpoint
CREATE INDEX "idx_transactions_to" ON "transaction_logs" USING btree ("to_address");--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transaction_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transaction_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_from_to" ON "transaction_logs" USING btree ("from_address","to_address");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_enterprise" ON "users" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "idx_zk_proofs_payroll" ON "zk_proofs" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_zk_proofs_hash" ON "zk_proofs" USING btree ("proof_hash");--> statement-breakpoint
CREATE INDEX "idx_zk_proofs_valid" ON "zk_proofs" USING btree ("is_valid");--> statement-breakpoint
CREATE INDEX "idx_zk_proofs_generated" ON "zk_proofs" USING btree ("generated_at");