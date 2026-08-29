-- Migração para a versão refatorada.
-- ATENÇÃO: faça backup antes de rodar (agente 05 - DBA: mudança destrutiva exige rollback).
--   mysqldump -u root -p site > backup_site_antes_migracao.sql

-- 1) password_hash() com bcrypt gera 60 chars; PASSWORD_DEFAULT pode crescer. 255 é o seguro.
ALTER TABLE CADASTRO MODIFY senha VARCHAR(255) NOT NULL;

-- 2) Unicidade de login e e-mail (a checagem em PHP não era confiável).
--    Se falhar, existem duplicatas — resolva-as antes:
--    SELECT login, COUNT(*) c FROM CADASTRO GROUP BY login HAVING c > 1;
ALTER TABLE CADASTRO ADD UNIQUE KEY uq_cadastro_login (login);
ALTER TABLE CADASTRO ADD UNIQUE KEY uq_cadastro_email (email);

-- 3) Tokens de redefinição de senha (uso único + expiração).
CREATE TABLE IF NOT EXISTS password_resets (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email      VARCHAR(190) NOT NULL,
    token_hash CHAR(64)     NOT NULL,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_reset_email (email),
    KEY idx_reset_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) Coluna de auditoria em registros_acesso, se ainda não existir.
-- ALTER TABLE registros_acesso ADD COLUMN criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ROLLBACK
-- DROP TABLE IF EXISTS password_resets;
-- ALTER TABLE CADASTRO DROP INDEX uq_cadastro_login;
-- ALTER TABLE CADASTRO DROP INDEX uq_cadastro_email;
