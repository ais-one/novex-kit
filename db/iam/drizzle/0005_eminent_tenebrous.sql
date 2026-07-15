ALTER TABLE "iam"."users" ADD COLUMN "password" varchar(255);--> statement-breakpoint
ALTER TABLE "iam"."users" ADD COLUMN "salt" varchar(255);