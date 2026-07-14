CREATE TABLE "iam"."comms_outbox" (
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
ALTER TABLE "iam"."comms_outbox" ADD CONSTRAINT "comms_outbox_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comms_outbox_status_scheduled" ON "iam"."comms_outbox" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_comms_outbox_tenant" ON "iam"."comms_outbox" USING btree ("tenant_id");