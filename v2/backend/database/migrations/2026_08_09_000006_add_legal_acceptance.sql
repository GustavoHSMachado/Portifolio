-- Registro de aceite dos documentos legais (LGPD, art. 8º: consentimento
-- comprovável). Guardamos QUAL versão foi aceita, QUANDO e de qual IP —
-- sem isso o consentimento não é demonstrável.

CREATE TABLE legal_acceptances (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     BIGINT UNSIGNED NOT NULL,
    document    ENUM('terms','privacy') NOT NULL,
    version     VARCHAR(20)     NOT NULL,
    ip_address  VARCHAR(45)     NULL,
    user_agent  VARCHAR(255)    NULL,
    accepted_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_legal_user_doc_version (user_id, document, version),
    KEY idx_legal_user (user_id),
    CONSTRAINT fk_legal_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE legal_acceptances;
