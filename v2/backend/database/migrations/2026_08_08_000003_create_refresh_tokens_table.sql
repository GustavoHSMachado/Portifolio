-- Refresh tokens rotativos com família, para detecção de reuso.
-- family_id agrupa a cadeia de rotações de um mesmo dispositivo/sessão.

CREATE TABLE refresh_tokens (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NOT NULL,
    family_id  CHAR(32)        NOT NULL,
    token_hash CHAR(64)        NOT NULL,
    user_agent VARCHAR(255)    NULL,
    ip_address VARCHAR(45)     NULL,
    expires_at DATETIME        NOT NULL,
    rotated_at DATETIME        NULL,
    revoked_at DATETIME        NULL,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rt_token_hash (token_hash),
    KEY idx_rt_family (family_id),
    KEY idx_rt_user (user_id),
    KEY idx_rt_expires (expires_at),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE refresh_tokens;
