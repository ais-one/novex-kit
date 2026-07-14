-- Remove audit tables from db-sample public schema.
-- These tables have been moved to db-audit (audit schema, migration 0000_audit_tables).
-- The audit_users trigger is also dropped since it wrote to audit_log (now in audit schema).

DROP TRIGGER IF EXISTS audit_users ON "users";
--> statement-breakpoint
DROP FUNCTION IF EXISTS audit_trigger_func();
--> statement-breakpoint
DROP FUNCTION IF EXISTS enforce_append_only();
--> statement-breakpoint
DROP TABLE IF EXISTS "audit_log";
--> statement-breakpoint
DROP TABLE IF EXISTS "hard_delete_log";
