-- =============================================================================
-- Identity & User Management Schema (MySQL 8.0+)
-- =============================================================================
-- Notes on MySQL conversion:
--   - UUID columns use CHAR(36) with UUID() defaults for readability.
--   - JSONB and TEXT[] are mapped to JSON.
--   - INET is mapped to VARCHAR(45) to support IPv4 and IPv6 strings.
--   - Partial indexes from PostgreSQL are converted to regular indexes.
--   - updated_at uses ON UPDATE CURRENT_TIMESTAMP(6) instead of triggers.
-- =============================================================================

CREATE TABLE users (
  id                  CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  username            VARCHAR(50) UNIQUE,
  email               VARCHAR(255) UNIQUE,
  email_verified_at   DATETIME(6),
  phone               VARCHAR(20) UNIQUE,
  phone_verified_at   DATETIME(6),
  display_name        VARCHAR(100),
  avatar_url          TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  locale              VARCHAR(10) NOT NULL DEFAULT 'en',
  timezone            VARCHAR(50),
  metadata            JSON         NOT NULL,
  created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  deleted_at          DATETIME(6),
  CHECK (status IN ('pending', 'active', 'suspended', 'deleted')),
  CHECK (JSON_VALID(metadata))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_users_email          ON users (email);
CREATE INDEX idx_users_phone          ON users (phone);
CREATE INDEX idx_users_status         ON users (status);

-- =============================================================================
-- 2. Password / credential storage
-- =============================================================================

CREATE TABLE user_credentials (
  id                  CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id             CHAR(36)     NOT NULL,
  credential_type     VARCHAR(20)  NOT NULL DEFAULT 'password',
  credential_hash     TEXT         NOT NULL,
  must_change         BOOLEAN      NOT NULL DEFAULT FALSE,
  last_changed_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_user_credentials_user_type (user_id, credential_type),
  CONSTRAINT fk_user_credentials_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CHECK (credential_type IN ('password', 'passkey'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- 3. TOTP authenticator
-- =============================================================================

CREATE TABLE user_mfa_totp (
  id                  CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id             CHAR(36)     NOT NULL,
  label               VARCHAR(100),
  secret_encrypted    TEXT         NOT NULL,
  algorithm           VARCHAR(10)  NOT NULL DEFAULT 'SHA1',
  digits              SMALLINT     NOT NULL DEFAULT 6,
  period              SMALLINT     NOT NULL DEFAULT 30,
  is_active           BOOLEAN      NOT NULL DEFAULT FALSE,
  verified_at         DATETIME(6),
  created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_user_mfa_totp_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CHECK (algorithm IN ('SHA1', 'SHA256', 'SHA512')),
  CHECK (digits IN (6, 8))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_user_mfa_totp_user   ON user_mfa_totp (user_id);

-- =============================================================================
-- 4. TOTP recovery / backup codes
-- =============================================================================

CREATE TABLE user_mfa_recovery_codes (
  id                  CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id             CHAR(36)     NOT NULL,
  code_hash           TEXT         NOT NULL,
  used_at             DATETIME(6),
  created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_user_mfa_recovery_codes_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_recovery_codes_user  ON user_mfa_recovery_codes (user_id, used_at);

-- =============================================================================
-- 5. Ephemeral OTP / PIN challenges
-- =============================================================================

CREATE TABLE user_otp_challenges (
  id                  CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id             CHAR(36),
  channel             VARCHAR(10)  NOT NULL,
  recipient           TEXT         NOT NULL,
  purpose             VARCHAR(30)  NOT NULL,
  code_hash           TEXT         NOT NULL,
  attempts            SMALLINT     NOT NULL DEFAULT 0,
  max_attempts        SMALLINT     NOT NULL DEFAULT 5,
  ip_address          VARCHAR(45),
  expires_at          DATETIME(6)  NOT NULL,
  used_at             DATETIME(6),
  created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_user_otp_challenges_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CHECK (channel IN ('sms', 'email')),
  CHECK (purpose IN (
    'login', 'register', 'verify_email', 'verify_phone',
    'password_reset', 'mfa', 'transaction'
  ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_otp_user_purpose     ON user_otp_challenges (user_id, purpose, used_at);
CREATE INDEX idx_otp_expires          ON user_otp_challenges (expires_at);

-- =============================================================================
-- 6. Federated identities
-- =============================================================================

CREATE TABLE user_federated_identities (
  id                        CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id                   CHAR(36)     NOT NULL,
  provider                  VARCHAR(80)  NOT NULL,
  provider_user_id          VARCHAR(255) NOT NULL,
  provider_email            VARCHAR(255),
  provider_display_name     VARCHAR(100),
  access_token_encrypted    TEXT,
  refresh_token_encrypted   TEXT,
  token_expires_at          DATETIME(6),
  scopes                    JSON         NOT NULL,
  metadata                  JSON         NOT NULL,
  created_at                DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at                DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_federated_provider_user (provider, provider_user_id),
  CONSTRAINT fk_user_federated_identities_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CHECK (JSON_VALID(scopes)),
  CHECK (JSON_VALID(metadata))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_fed_user             ON user_federated_identities (user_id);
CREATE INDEX idx_fed_provider_email   ON user_federated_identities (provider, provider_email);

-- =============================================================================
-- 7. RSA signing keys
-- =============================================================================

CREATE TABLE rsa_signing_keys (
  id                    CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  kid                   VARCHAR(64)  UNIQUE NOT NULL,
  algorithm             VARCHAR(10)  NOT NULL DEFAULT 'RS256',
  key_use               VARCHAR(5)   NOT NULL DEFAULT 'sig',
  public_key_pem        TEXT         NOT NULL,
  private_key_encrypted TEXT         NOT NULL,
  key_size_bits         SMALLINT     NOT NULL DEFAULT 2048,
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  valid_from            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  valid_until           DATETIME(6),
  rotated_at            DATETIME(6),
  revoked_at            DATETIME(6),
  CHECK (algorithm IN ('RS256', 'RS384', 'RS512')),
  CHECK (key_use IN ('sig', 'enc')),
  CHECK (key_size_bits IN (2048, 3072, 4096))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_rsa_keys_active      ON rsa_signing_keys (is_active, revoked_at);

-- =============================================================================
-- 8. User sessions
-- =============================================================================

CREATE TABLE user_sessions (
  id                    CHAR(36)     PRIMARY KEY,
  user_id               CHAR(36)     NOT NULL,
  signing_key_id        CHAR(36)     NOT NULL,
  refresh_token_hash    TEXT,
  refresh_expires_at    DATETIME(6),
  ip_address            VARCHAR(45),
  user_agent            TEXT,
  device_id             VARCHAR(64),
  issued_at             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at            DATETIME(6)  NOT NULL,
  last_active_at        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  revoked_at            DATETIME(6),
  revoke_reason         VARCHAR(30),
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_sessions_signing_key
    FOREIGN KEY (signing_key_id) REFERENCES rsa_signing_keys (id),
  CHECK (revoke_reason IN (
    'logout', 'admin', 'password_change', 'mfa_change',
    'suspicious', 'expired'
  ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_sessions_user        ON user_sessions (user_id, revoked_at);
CREATE INDEX idx_sessions_expires     ON user_sessions (expires_at);
CREATE INDEX idx_sessions_refresh     ON user_sessions (refresh_token_hash(255));

-- =============================================================================
-- 9. Roles
-- =============================================================================

CREATE TABLE roles (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(50)  UNIQUE NOT NULL,
  description   TEXT,
  permissions   JSON         NOT NULL,
  is_system     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CHECK (JSON_VALID(permissions))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO roles (name, description, permissions, is_system) VALUES
  ('superadmin', 'Full access',           JSON_ARRAY('*:*'), TRUE),
  ('admin',      'Administrative access', JSON_ARRAY('admin:*'), TRUE),
  ('user',       'Standard user',         JSON_ARRAY('profile:read', 'profile:write'), TRUE);

-- =============================================================================
-- 10. User ↔ role assignments
-- =============================================================================

CREATE TABLE user_roles (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id       CHAR(36)     NOT NULL,
  role_id       CHAR(36)     NOT NULL,
  granted_by    CHAR(36),
  granted_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at    DATETIME(6),
  UNIQUE KEY uq_user_roles_user_role (user_id, role_id),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_granted_by
    FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_user_roles_user      ON user_roles (user_id, expires_at);

-- =============================================================================
-- 11. Auth audit log
-- =============================================================================

CREATE TABLE auth_audit_log (
  id            BIGINT       PRIMARY KEY AUTO_INCREMENT,
  user_id       CHAR(36),
  actor_id      CHAR(36),
  event_type    VARCHAR(50)  NOT NULL,
  channel       VARCHAR(20),
  provider      VARCHAR(80),
  session_id    CHAR(36),
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  metadata      JSON         NOT NULL,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_auth_audit_log_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_auth_audit_log_actor
    FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_auth_audit_log_session
    FOREIGN KEY (session_id) REFERENCES user_sessions (id) ON DELETE SET NULL,
  CHECK (channel IN ('password', 'totp', 'sms', 'email', 'oauth', 'saml', 'system')),
  CHECK (JSON_VALID(metadata))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_audit_user           ON auth_audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_event          ON auth_audit_log (event_type, created_at DESC);
CREATE INDEX idx_audit_created        ON auth_audit_log (created_at DESC);