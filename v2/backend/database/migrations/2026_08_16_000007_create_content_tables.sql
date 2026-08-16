-- Conteúdo do portfólio: perfil, formação, experiência, habilidades e projetos.
--
-- Vive no banco, e não em módulo versionado, porque a área administrativa
-- precisa editar sem exigir deploy. A alternativa — dado no código e tela de
-- edição — teria duas fontes para a mesma informação, que uma hora divergem
-- sem ninguém saber qual manda.
--
-- Nada aqui guarda dado pessoal sensível: endereço, CEP e data de nascimento
-- ficaram deliberadamente de fora. Cidade e estado bastam para sinalizar
-- região em vaga presencial ou híbrida.

-- Linha única. O CHECK impede um segundo perfil aparecer por engano e a
-- aplicação passar a exibir um ou outro conforme a ordem da consulta.
CREATE TABLE profile (
    id           TINYINT UNSIGNED NOT NULL DEFAULT 1,
    full_name    VARCHAR(120)  NOT NULL,
    short_name   VARCHAR(60)   NOT NULL,
    role         VARCHAR(120)  NOT NULL,
    headline     VARCHAR(160)  NOT NULL,
    objective    VARCHAR(255)  NULL,
    summary      TEXT          NOT NULL,
    city         VARCHAR(80)   NULL,
    state        CHAR(2)       NULL,
    website_url  VARCHAR(255)  NULL,
    github_url   VARCHAR(255)  NULL,
    linkedin_url VARCHAR(255)  NULL,
    whatsapp_url VARCHAR(255)  NULL,
    resume_path  VARCHAR(255)  NULL,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT ck_profile_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- completed_at guarda o dia 1 do mês: currículo tem precisão de mês, e fingir
-- precisão de dia produziria data inventada.
CREATE TABLE education (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    course       VARCHAR(160) NOT NULL,
    institution  VARCHAR(160) NOT NULL,
    level        ENUM('tecnico','graduacao','pos_graduacao','mestrado','doutorado','curso') NOT NULL,
    status       ENUM('concluido','em_andamento') NOT NULL DEFAULT 'concluido',
    completed_at DATE         NULL,
    position     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_education_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ended_at nulo significa emprego atual. Um booleano "is_current" separado
-- permitiria dois registros atuais divergentes da data — a ausência de fim é
-- a própria informação.
CREATE TABLE experiences (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company     VARCHAR(160) NOT NULL,
    role        VARCHAR(160) NOT NULL,
    description TEXT         NOT NULL,
    started_at  DATE         NOT NULL,
    ended_at    DATE         NULL,
    position    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_experiences_started (started_at),
    KEY idx_experiences_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- evidence é onde a habilidade deixa de ser autodeclarada: "onde isto foi
-- usado". Nível sozinho não é verificável por quem lê.
CREATE TABLE skills (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(80)  NOT NULL,
    category   VARCHAR(60)  NOT NULL,
    evidence   VARCHAR(255) NULL,
    position   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_skills_name (name),
    KEY idx_skills_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projeto como estudo de caso, não como card: problema, decisões e resultado
-- são o que diferencia portfólio de lista de repositórios.
CREATE TABLE projects (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug           VARCHAR(120) NOT NULL,
    title          VARCHAR(160) NOT NULL,
    summary        VARCHAR(255) NOT NULL,
    problem        TEXT         NULL,
    decisions      TEXT         NULL,
    result         TEXT         NULL,
    stack          JSON         NULL,
    repository_url VARCHAR(255) NULL,
    demo_url       VARCHAR(255) NULL,
    published      TINYINT(1)   NOT NULL DEFAULT 0,
    position       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_projects_slug (slug),
    KEY idx_projects_published (published, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK
-- DROP TABLE IF EXISTS projects;
-- DROP TABLE IF EXISTS skills;
-- DROP TABLE IF EXISTS experiences;
-- DROP TABLE IF EXISTS education;
-- DROP TABLE IF EXISTS profile;
