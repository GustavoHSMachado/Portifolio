-- Usuários. Substitui a tabela CADASTRO da v1.
-- Mudanças em relação à v1: senha em hash, e-mail único, verificação de e-mail,
-- trava por tentativas falhas, soft delete e timestamps.

CREATE TABLE users (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name                VARCHAR(120)    NOT NULL,
    email               VARCHAR(190)    NOT NULL,
    phone               VARCHAR(20)     NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    role                ENUM('user','admin') NOT NULL DEFAULT 'user',
    email_verified_at   DATETIME        NULL,
    password_changed_at DATETIME        NULL,
    failed_attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until        DATETIME        NULL,
    last_login_at       DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role),
    KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE users;
