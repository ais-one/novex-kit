-- Remove RBAC/FGA tables from db-sample.
-- These tables have been moved to db-iam (migration 0002_rbac_fga).
-- Drop in FK-safe order: junction tables first, then leaf tables, then root tables.

DROP TABLE IF EXISTS "user_tenant_roles";
--> statement-breakpoint
DROP TABLE IF EXISTS "role_permissions";
--> statement-breakpoint
DROP TABLE IF EXISTS "roles";
--> statement-breakpoint
DROP TABLE IF EXISTS "permissions";
--> statement-breakpoint
DROP TABLE IF EXISTS "tenants";
--> statement-breakpoint
DROP TABLE IF EXISTS "fga_config";
