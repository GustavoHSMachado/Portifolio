-- Histórico de senhas, para impedir reaproveitamento.
--
-- Guarda o hash, e não a senha: a comparação é feita com password_verify contra
-- cada entrada, porque Argon2id usa sal aleatório e dois hashes da mesma senha
-- nunca são iguais. Comparar string com string não funcionaria aqui — e é
-- justamente esse sal que impede alguém, de posse do banco, de descobrir que
-- duas contas usam a mesma senha.
--
-- A senha em vigor também entra na tabela. Assim uma única verificação cobre
-- "igual à atual" e "igual a uma antiga", sem dois caminhos de código.

CREATE TABLE password_history (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       BIGINT UNSIGNED NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ph_user_created (user_id, created_at),
    CONSTRAINT fk_ph_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE password_history;
