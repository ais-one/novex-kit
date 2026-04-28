CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"table_name" text NOT NULL,
	"operation" text NOT NULL,
	"app_user_id" text,
	"tenant_id" text,
	"session_id" text,
	"transaction_id" uuid,
	"db_user" text DEFAULT session_user NOT NULL,
	"ip_addr" "inet" DEFAULT inet_client_addr(),
	"app_name" text DEFAULT current_setting('application_name', true),
	"old_data" jsonb,
	"new_data" jsonb,
	"changed_fields" text[]
);
--> statement-breakpoint
CREATE TABLE "award" (
	"code" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "country" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"code" varchar(255),
	"icc" varchar(255),
	"updated" timestamp
);
--> statement-breakpoint
CREATE TABLE "fga_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" varchar(64) NOT NULL,
	"auth_model_id" varchar(64) NOT NULL,
	"label" varchar(80) DEFAULT 'default' NOT NULL,
	"api_url" varchar(255) DEFAULT 'http://127.0.0.1:8080' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hard_delete_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"deleted_by" text NOT NULL,
	"reason" text NOT NULL,
	"deleted_data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_tenant_id_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE "state" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_name" varchar(255),
	"code" varchar(255),
	"name" varchar(255),
	CONSTRAINT "state_country_name_code_unique" UNIQUE("country_name","code")
);
--> statement-breakpoint
CREATE TABLE "student" (
	"id" serial PRIMARY KEY NOT NULL,
	"firstName" varchar(255),
	"lastName" varchar(255),
	"avatar" varchar(255) DEFAULT '',
	"kyc" varchar(255) DEFAULT '',
	"awards" varchar(255) DEFAULT '',
	"sex" varchar(255),
	"age" integer,
	"gpa" numeric,
	"birthDate" date,
	"birthTime" time,
	"country" varchar(255),
	"state" varchar(255),
	"dateTimeTz" timestamp,
	"secret" varchar(255),
	"remarks" varchar(255),
	"updated_by" varchar(255),
	"updated_at" timestamp,
	CONSTRAINT "student_firstName_lastName_unique" UNIQUE("firstName","lastName")
);
--> statement-breakpoint
CREATE TABLE "student_subject" (
	"studentId" integer NOT NULL,
	"subjectCode" varchar(255) NOT NULL,
	"gradeFinal" varchar(255),
	"gradeDate" timestamp,
	CONSTRAINT "student_subject_studentId_subjectCode_pk" PRIMARY KEY("studentId","subjectCode")
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"code" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"passingGrade" integer
);
--> statement-breakpoint
CREATE TABLE "t4t_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user" varchar(255),
	"timestamp" timestamp,
	"db_name" varchar(255),
	"table_name" varchar(255),
	"op" varchar(255),
	"where_cols" varchar(255),
	"where_vals" varchar(255),
	"cols_changed" varchar(255),
	"prev_values" text,
	"new_values" text
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"plan" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_tenant_roles" (
	"user_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "user_tenant_roles_user_id_tenant_id_role_id_pk" PRIMARY KEY("user_id","tenant_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"roles" varchar(255),
	"tenant_id" integer,
	"username" varchar(255),
	"email" varchar(255) NOT NULL,
	"githubId" integer,
	"password" varchar(255),
	"salt" varchar(255),
	"role" varchar(255),
	"retryLimit" integer,
	"retryCount" integer,
	"retryReset" integer,
	"gaKey" varchar(32),
	"pnToken" varchar(255) DEFAULT '',
	"revoked" varchar(255) DEFAULT '',
	"refreshToken" varchar(255) DEFAULT '',
	"sms" varchar(255),
	"smsLastSent" timestamp,
	"smsOtpPin" varchar(6),
	"smsVerified" integer,
	"telegramId" varchar(255),
	"telegramUsername" varchar(255),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subject" ADD CONSTRAINT "student_subject_studentId_student_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subject" ADD CONSTRAINT "student_subject_subjectCode_subject_code_fk" FOREIGN KEY ("subjectCode") REFERENCES "public"."subject"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_student_subject_student" ON "student_subject" USING btree ("studentId");--> statement-breakpoint
CREATE INDEX "idx_t4t_audit_logs" ON "t4t_audit_logs" USING btree ("timestamp","db_name","op");--> statement-breakpoint
CREATE INDEX "idx_user_tenant_roles_lookup" ON "user_tenant_roles" USING btree ("user_id","tenant_id");