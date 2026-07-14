ALTER TABLE "iam"."tenant_comms_config" DROP CONSTRAINT "tenant_comms_config_tenant_id_channel_provider_unique";--> statement-breakpoint
ALTER TABLE "iam"."tenant_comms_config" ADD COLUMN "label" varchar(100);--> statement-breakpoint
UPDATE "iam"."tenant_comms_config" SET "label" = "provider" WHERE "label" IS NULL;--> statement-breakpoint
ALTER TABLE "iam"."tenant_comms_config" ALTER COLUMN "label" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."tenant_comms_config" ADD CONSTRAINT "tenant_comms_config_tenant_id_channel_label_unique" UNIQUE("tenant_id","channel","label");