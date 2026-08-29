-- Baseline do schema conforme o código atual.
-- Rode em um banco novo. Se o banco já existe, pule para 002.

CREATE TABLE IF NOT EXISTS CADASTRO (
    id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome   VARCHAR(120)  NOT NULL,
    tel    VARCHAR(20)   NOT NULL,
    email  VARCHAR(190)  NOT NULL,
    login  VARCHAR(60)   NOT NULL,
    senha  VARCHAR(255)  NOT NULL,
    admin  TINYINT(1)    NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cadastro_login (login),
    UNIQUE KEY uq_cadastro_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registros_acesso (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ip_address      VARCHAR(45)  NOT NULL,
    pagina_visitada VARCHAR(255) NOT NULL,
    criado_em       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_acesso_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
