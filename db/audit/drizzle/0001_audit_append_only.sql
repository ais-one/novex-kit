-- enforce_append_only: prevents UPDATE/DELETE on append-only audit tables
CREATE OR REPLACE FUNCTION enforce_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only — % is not permitted',
    TG_TABLE_NAME, TG_OP;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "audit"."audit_log"
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();
--> statement-breakpoint

CREATE TRIGGER hard_delete_log_append_only
  BEFORE UPDATE OR DELETE ON "audit"."hard_delete_log"
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();
