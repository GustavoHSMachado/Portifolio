-- Tokens de uso único: confirmação de e-mail e redefinição de senha.
-- Guardamos apenas o SHA-256 — um dump do banco não permite usar os tokens.

CREATE TABLE verification_tokens (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NOT NULL,
    purpose    ENUM('email_verification','password_reset') NOT NULL,
    token_hash CHAR(64)        NOT NULL,
    expires_at DATETIME        NOT NULL,
    used_at    DATETIME        NULL,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vt_token_hash (token_hash),
    UNIQUE KEY uq_vt_user_purpose (user_id, purpose),
    KEY idx_vt_expires (expires_at),
    CONSTRAINT fk_vt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE verification_tokens;
