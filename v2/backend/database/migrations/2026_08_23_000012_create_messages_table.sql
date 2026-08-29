-- Mensagens de sugestão ou dúvida enviadas pelo site.
--
-- Guarda o IP e o agente do navegador porque um formulário público aberto é
-- alvo de robô, e sem esses campos não há como investigar um abuso depois. Os
-- dois são dado pessoal sob a LGPD: a política de privacidade já declara a
-- coleta, e o expurgo agendado (database/purge.php) apaga o que passa do prazo.
--
-- O status existe para o dono marcar o que já respondeu — uma caixa de entrada
-- sem isso vira uma lista que ninguém sabe onde parou.

CREATE TABLE messages (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name       VARCHAR(120)    NOT NULL,
    email      VARCHAR(190)    NOT NULL,
    subject    VARCHAR(150)    NULL,
    body       TEXT            NOT NULL,
    status     ENUM('nova','lida','respondida') NOT NULL DEFAULT 'nova',
    ip_address VARCHAR(45)     NULL,
    user_agent VARCHAR(255)    NULL,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_messages_status_created (status, created_at),
    KEY idx_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE messages;
