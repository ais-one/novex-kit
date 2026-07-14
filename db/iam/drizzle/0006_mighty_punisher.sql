ALTER TABLE "iam"."users" ADD COLUMN "roles" varchar(255);--> statement-breakpoint
ALTER TABLE "iam"."users" ADD COLUMN "revoked" varchar(255) DEFAULT '';--> statement-breakpoint
ALTER TABLE "iam"."users" ADD COLUMN "gaKey" varchar(32);--> statement-breakpoint
ALTER TABLE "iam"."users" ADD COLUMN "githubId" integer;