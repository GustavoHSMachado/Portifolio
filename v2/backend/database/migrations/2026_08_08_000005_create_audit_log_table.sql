-- Trilha de auditoria de eventos sensíveis (login, troca de senha, mudança de papel).
-- Substitui a tabela registros_acesso da v1, que só guardava IP e URL.

CREATE TABLE audit_log (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED NULL,
    event      VARCHAR(60)     NOT NULL,
    request_id CHAR(32)        NULL,
    ip_address VARCHAR(45)     NULL,
    user_agent VARCHAR(255)    NULL,
    metadata   JSON            NULL,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_user (user_id),
    KEY idx_audit_event (event),
    KEY idx_audit_created (created_at),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE audit_log;
