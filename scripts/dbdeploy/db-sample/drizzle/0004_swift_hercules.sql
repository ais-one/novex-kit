CREATE TABLE "comms_outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"channel" varchar(50) NOT NULL,
	"config_label" varchar(100),
	"recipient" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_comms_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"label" varchar(100) NOT NULL,
	"channel" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"credentials" text NOT NULL,
	"sender_identity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_comms_config_tenant_id_channel_label_unique" UNIQUE("tenant_id","channel","label")
);
--> statement-breakpoint
DROP TABLE IF EXISTS "audit_log" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "fga_config" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "hard_delete_log" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "permissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "role_permissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "roles" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tenants" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "user_tenant_roles" CASCADE;--> statement-breakpoint
CREATE INDEX "idx_comms_outbox_status_scheduled" ON "comms_outbox" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_comms_outbox_tenant" ON "comms_outbox" USING btree ("tenant_id");