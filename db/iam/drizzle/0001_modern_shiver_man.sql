CREATE TABLE "iam"."tenant_comms_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"channel" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"credentials" text NOT NULL,
	"sender_identity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_comms_config_tenant_id_channel_provider_unique" UNIQUE("tenant_id","channel","provider")
);
--> statement-breakpoint
ALTER TABLE "iam"."tenant_comms_config" ADD CONSTRAINT "tenant_comms_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint