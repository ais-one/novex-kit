-- =============================================================================
-- Identity & User Management Schema (PostgreSQL)
-- =============================================================================
-- Tables:
--   users                    Core user identity
--   user_credentials         Password / credential storage
--   user_mfa_totp            TOTP authenticator (Google Authenticator, Authy)
--   user_mfa_recovery_codes  Backup codes for TOTP
--   user_otp_challenges      Ephemeral SMS / email PIN challenges
--   user_federated_identities OAuth2 / OIDC / SAML provider links
--   user_sessions            JWT session tracking (JTI-based revocation)
--   rsa_signing_keys         RSA key pairs for JWT signing with rotation
--   roles                    RBAC role definitions
--   user_roles               User ↔ role assignments
--   auth_audit_log           Immutable audit trail
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigger function to auto-update updated_at columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. Core user identity
-- =============================================================================

CREATE TABLE users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username            VARCHAR(50) UNIQUE,                          -- optional; omit if email-only auth
  email               VARCHAR(255) UNIQUE,
  email_verified_at   TIMESTAMPTZ,
  phone               VARCHAR(20) UNIQUE,                          -- E.164 format e.g. +6591234567
  phone_verified_at   TIMESTAMPTZ,
  display_name        VARCHAR(100),
  avatar_url          TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'active', 'suspended', 'deleted')),
  locale              VARCHAR(10) NOT NULL DEFAULT 'en',
  timezone            VARCHAR(50),
  metadata            JSONB       NOT NULL DEFAULT '{}',           -- app-specific profile fields
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ                                  -- soft delete
);

CREATE INDEX idx_users_email          ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone          ON users (phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status         ON users (status);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 2. Password / credential storage
--    One row per user (or per credential type if supporting passkeys in future).
--    Store only the hash (argon2id recommended; bcrypt acceptable).
-- =============================================================================

CREATE TABLE user_credentials (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  credential_type     VARCHAR(20) NOT NULL DEFAULT 'password'
                        CHECK (credential_type IN ('password', 'passkey')),
  credential_hash     TEXT        NOT NULL,                        -- argon2id / bcrypt output
  must_change         BOOLEAN     NOT NULL DEFAULT FALSE,          -- force reset on next login
  last_changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, credential_type)
);

CREATE TRIGGER trg_user_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 3. TOTP authenticator (Google Authenticator, Authy, etc.)
--    secret_encrypted must be encrypted at the application layer before storage.
-- =============================================================================

CREATE TABLE user_mfa_totp (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label               VARCHAR(100),                                -- shown in authenticator app
  secret_encrypted    TEXT        NOT NULL,                        -- app-layer encrypted base32 secret
  algorithm           VARCHAR(10) NOT NULL DEFAULT 'SHA1'
                        CHECK (algorithm IN ('SHA1', 'SHA256', 'SHA512')),
  digits              SMALLINT    NOT NULL DEFAULT 6
                        CHECK (digits IN (6, 8)),
  period              SMALLINT    NOT NULL DEFAULT 30,             -- seconds
  is_active           BOOLEAN     NOT NULL DEFAULT FALSE,          -- false until first verify
  verified_at         TIMESTAMPTZ,                                 -- set when user confirms first code
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_mfa_totp_user   ON user_mfa_totp (user_id);

-- =============================================================================
-- 4. TOTP recovery / backup codes
--    Generated as a set at TOTP setup; each is single-use.
--    Store only hashed codes (bcrypt/argon2).
-- =============================================================================

CREATE TABLE user_mfa_recovery_codes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code_hash           TEXT        NOT NULL,                        -- hashed backup code
  used_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recovery_codes_user  ON user_mfa_recovery_codes (user_id) WHERE used_at IS NULL;

-- =============================================================================
-- 5. Ephemeral OTP / PIN challenges  (SMS and email)
--    Short-lived rows; a cron job or TTL policy should purge expired rows.
--    Store only the hash of the PIN, never the plaintext.
-- =============================================================================

CREATE TABLE user_otp_challenges (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        REFERENCES users (id) ON DELETE CASCADE, -- nullable for pre-signup flows
  channel             VARCHAR(10) NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient           TEXT        NOT NULL,                        -- phone (E.164) or email address
  purpose             VARCHAR(30) NOT NULL
                        CHECK (purpose IN (
                          'login', 'register', 'verify_email', 'verify_phone',
                          'password_reset', 'mfa', 'transaction'
                        )),
  code_hash           TEXT        NOT NULL,                        -- hashed PIN (never store plaintext)
  attempts            SMALLINT    NOT NULL DEFAULT 0,
  max_attempts        SMALLINT    NOT NULL DEFAULT 5,
  ip_address          INET,
  expires_at          TIMESTAMPTZ NOT NULL,
  used_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_user_purpose     ON user_otp_challenges (user_id, purpose) WHERE used_at IS NULL;
CREATE INDEX idx_otp_expires          ON user_otp_challenges (expires_at);        -- for purge jobs

-- =============================================================================
-- 6. Federated identities  (OAuth2 / OIDC / SAML)
--    provider examples: 'google', 'github', 'microsoft', 'apple',
--                       'saml:urn:entity-id', 'oidc:my-corp-idp'
--    Tokens should be encrypted at the application layer before storage.
-- =============================================================================

CREATE TABLE user_federated_identities (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider                  VARCHAR(80) NOT NULL,                  -- identity provider key
  provider_user_id          VARCHAR(255) NOT NULL,                 -- stable ID from provider
  provider_email            VARCHAR(255),
  provider_display_name     VARCHAR(100),
  access_token_encrypted    TEXT,                                  -- optional; encrypted at app layer
  refresh_token_encrypted   TEXT,                                  -- optional; encrypted at app layer
  token_expires_at          TIMESTAMPTZ,
  scopes                    TEXT[]      NOT NULL DEFAULT '{}',     -- granted OAuth scopes
  metadata                  JSONB       NOT NULL DEFAULT '{}',     -- raw provider claims / profile
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_fed_user             ON user_federated_identities (user_id);
CREATE INDEX idx_fed_provider_email   ON user_federated_identities (provider, provider_email);

CREATE TRIGGER trg_fed_identities_updated_at
  BEFORE UPDATE ON user_federated_identities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 7. RSA signing keys  (JWT key rotation)
--    Tokens carry a `kid` header pointing to the key used to sign them.
--    Multiple keys may be "active" during rotation overlap.
--    private_key_encrypted must be encrypted at the application layer.
--    Expose public keys via a /.well-known/jwks.json endpoint.
-- =============================================================================

CREATE TABLE rsa_signing_keys (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kid                   VARCHAR(64) UNIQUE NOT NULL,               -- key ID used in JWT `kid` header
  algorithm             VARCHAR(10) NOT NULL DEFAULT 'RS256'
                          CHECK (algorithm IN ('RS256', 'RS384', 'RS512')),
  key_use               VARCHAR(5)  NOT NULL DEFAULT 'sig'
                          CHECK (key_use IN ('sig', 'enc')),
  public_key_pem        TEXT        NOT NULL,                      -- PEM, safe to expose in JWKS
  private_key_encrypted TEXT        NOT NULL,                      -- app-layer encrypted PEM
  key_size_bits         SMALLINT    NOT NULL DEFAULT 2048
                          CHECK (key_size_bits IN (2048, 3072, 4096)),
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,         -- used to sign new tokens
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_from            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until           TIMESTAMPTZ,                               -- stop signing new tokens after this
  rotated_at            TIMESTAMPTZ,                               -- when a newer key took over
  revoked_at            TIMESTAMPTZ                                -- hard revocation (all tokens invalid)
);

CREATE INDEX idx_rsa_keys_active      ON rsa_signing_keys (is_active) WHERE revoked_at IS NULL;

-- =============================================================================
-- 8. User sessions  (tracks every issued JWT for revocation via JTI)
--    id == JTI (JWT ID claim).  On token verification, look up this row to
--    confirm it has not been revoked.  Refresh tokens enable silent re-auth.
-- =============================================================================

CREATE TABLE user_sessions (
  id                    UUID        PRIMARY KEY,                   -- this IS the JTI claim
  user_id               UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  signing_key_id        UUID        NOT NULL REFERENCES rsa_signing_keys (id),
  -- Refresh token (optional — omit for short-lived stateless tokens)
  refresh_token_hash    TEXT,                                      -- hashed; never store plaintext
  refresh_expires_at    TIMESTAMPTZ,
  -- Client / device fingerprint
  ip_address            INET,
  user_agent            TEXT,
  device_id             VARCHAR(64),                               -- client-supplied stable device ID
  -- Lifecycle
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  last_active_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at            TIMESTAMPTZ,
  revoke_reason         VARCHAR(30)
                          CHECK (revoke_reason IN (
                            'logout', 'admin', 'password_change', 'mfa_change',
                            'suspicious', 'expired'
                          ))
);

CREATE INDEX idx_sessions_user        ON user_sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_expires     ON user_sessions (expires_at);  -- for purge jobs
CREATE INDEX idx_sessions_refresh     ON user_sessions (refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;

-- =============================================================================
-- 9. Roles  (RBAC)
--    permissions is a JSON array of "resource:action" strings,
--    e.g. ["users:read", "orders:write", "admin:*"]
-- =============================================================================

CREATE TABLE roles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(50) UNIQUE NOT NULL,
  description   TEXT,
  permissions   JSONB       NOT NULL DEFAULT '[]',
  is_system     BOOLEAN     NOT NULL DEFAULT FALSE,                -- prevent accidental deletion
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed default roles
INSERT INTO roles (name, description, permissions, is_system) VALUES
  ('superadmin', 'Full access',           '["*:*"]',            TRUE),
  ('admin',      'Administrative access', '["admin:*"]',        TRUE),
  ('user',       'Standard user',         '["profile:read", "profile:write"]', TRUE);

-- =============================================================================
-- 10. User ↔ role assignments
-- =============================================================================

CREATE TABLE user_roles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id       UUID        NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
  granted_by    UUID        REFERENCES users (id) ON DELETE SET NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,                                       -- null = permanent
  UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user      ON user_roles (user_id) WHERE expires_at IS NULL OR expires_at > NOW();

-- =============================================================================
-- 11. Auth audit log  (append-only; do NOT update or delete rows)
--    event_type examples:
--      auth.login.success      auth.login.failed       auth.logout
--      auth.mfa.success        auth.mfa.failed         auth.mfa.enrolled
--      auth.otp.sent           auth.otp.verified       auth.otp.failed
--      auth.federation.linked  auth.federation.login   auth.federation.unlinked
--      auth.password.changed   auth.password.reset
--      auth.token.revoked      auth.session.revoked
--      auth.account.suspended  auth.account.deleted
-- =============================================================================

CREATE TABLE auth_audit_log (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        REFERENCES users (id) ON DELETE SET NULL,
  actor_id      UUID        REFERENCES users (id) ON DELETE SET NULL,  -- admin acting on user
  event_type    VARCHAR(50) NOT NULL,
  channel       VARCHAR(20)
                  CHECK (channel IN ('password', 'totp', 'sms', 'email', 'oauth', 'saml', 'system')),
  provider      VARCHAR(80),                                       -- for federation events
  session_id    UUID        REFERENCES user_sessions (id) ON DELETE SET NULL,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',                 -- event-specific details
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user           ON auth_audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_event          ON auth_audit_log (event_type, created_at DESC);
CREATE INDEX idx_audit_created        ON auth_audit_log (created_at DESC);           -- time-range queries
