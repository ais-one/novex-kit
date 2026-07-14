CREATE SCHEMA IF NOT EXISTS "iam";
--> statement-breakpoint
CREATE TABLE "iam"."auth_audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"actor_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"channel" varchar(20),
	"provider" varchar(80),
	"session_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" json DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."fga_config" (
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
CREATE TABLE "iam"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50),
	"email" varchar(255),
	"email_verified_at" timestamp with time zone,
	"phone" varchar(20),
	"phone_verified_at" timestamp with time zone,
	"display_name" varchar(100),
	"avatar_url" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" varchar(50),
	"metadata" json DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "iam"."permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "iam"."role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"permissions" json DEFAULT '[]' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "iam"."rsa_signing_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid" varchar(64) NOT NULL,
	"algorithm" varchar(10) DEFAULT 'RS256' NOT NULL,
	"key_use" varchar(5) DEFAULT 'sig' NOT NULL,
	"public_key_pem" text NOT NULL,
	"private_key_encrypted" text NOT NULL,
	"key_size_bits" integer DEFAULT 2048 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "rsa_signing_keys_kid_unique" UNIQUE("kid")
);
--> statement-breakpoint
CREATE TABLE "iam"."tenant_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_roles_tenant_id_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE "iam"."tenants" (
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
CREATE TABLE "iam"."user_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_type" varchar(20) DEFAULT 'password' NOT NULL,
	"credential_hash" text NOT NULL,
	"must_change" boolean DEFAULT false NOT NULL,
	"last_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_credentials_user_id_credential_type_unique" UNIQUE("user_id","credential_type")
);
--> statement-breakpoint
CREATE TABLE "iam"."user_federated_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"provider_email" varchar(255),
	"provider_display_name" varchar(100),
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"scopes" json DEFAULT '[]' NOT NULL,
	"metadata" json DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_federated_identities_provider_provider_user_id_unique" UNIQUE("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."user_mfa_recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."user_mfa_totp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(100),
	"secret_encrypted" text NOT NULL,
	"algorithm" varchar(10) DEFAULT 'SHA1' NOT NULL,
	"digits" integer DEFAULT 6 NOT NULL,
	"period" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."user_otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"channel" varchar(10) NOT NULL,
	"recipient" text NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"ip_address" varchar(45),
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "user_roles_user_id_role_id_unique" UNIQUE("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "iam"."user_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"signing_key_id" uuid NOT NULL,
	"refresh_token_hash" text,
	"refresh_expires_at" timestamp with time zone,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_id" varchar(64),
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" varchar(30)
);
--> statement-breakpoint
CREATE TABLE "iam"."user_tenant_roles" (
	"user_id" uuid NOT NULL,
	"tenant_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "user_tenant_roles_user_id_tenant_id_role_id_pk" PRIMARY KEY("user_id","tenant_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "iam"."auth_audit_log" ADD CONSTRAINT "auth_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."auth_audit_log" ADD CONSTRAINT "auth_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "iam"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."auth_audit_log" ADD CONSTRAINT "auth_audit_log_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "iam"."user_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_tenant_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."tenant_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "iam"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."tenant_roles" ADD CONSTRAINT "tenant_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_federated_identities" ADD CONSTRAINT "user_federated_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_mfa_recovery_codes" ADD CONSTRAINT "user_mfa_recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_mfa_totp" ADD CONSTRAINT "user_mfa_totp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_otp_challenges" ADD CONSTRAINT "user_otp_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "iam"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_sessions" ADD CONSTRAINT "user_sessions_signing_key_id_rsa_signing_keys_id_fk" FOREIGN KEY ("signing_key_id") REFERENCES "iam"."rsa_signing_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_role_id_tenant_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."tenant_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_iam_audit_user_created" ON "iam"."auth_audit_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_iam_audit_event_created" ON "iam"."auth_audit_log" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_iam_audit_created" ON "iam"."auth_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_iam_users_status" ON "iam"."users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_iam_signing_keys_active" ON "iam"."rsa_signing_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_iam_federated_user" ON "iam"."user_federated_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_iam_recovery_codes_user" ON "iam"."user_mfa_recovery_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_iam_user_mfa_totp_user" ON "iam"."user_mfa_totp" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_iam_otp_challenges_expires" ON "iam"."user_otp_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_iam_user_roles_user" ON "iam"."user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_iam_sessions_user" ON "iam"."user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_iam_sessions_expires" ON "iam"."user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_tenant_roles_lookup" ON "iam"."user_tenant_roles" USING btree ("user_id","tenant_id");