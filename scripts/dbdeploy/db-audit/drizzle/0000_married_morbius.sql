CREATE SCHEMA IF NOT EXISTS "audit";

CREATE TABLE "audit"."audit_log" (
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
CREATE TABLE "audit"."hard_delete_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"deleted_by" text NOT NULL,
	"reason" text NOT NULL,
	"deleted_data" jsonb NOT NULL
);
