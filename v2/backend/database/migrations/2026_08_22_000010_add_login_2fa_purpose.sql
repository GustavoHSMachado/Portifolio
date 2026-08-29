-- Segundo fator no login, e código numérico na recuperação de senha.
--
-- O enum de purpose ganha 'login_2fa'. A tabela já dá o que este fluxo precisa:
-- um registro ativo por usuário e propósito (uq_vt_user_purpose), expiração e
-- consumo em uso único.
--
-- attempts existe para o código de 7 dígitos. Um link de 64 caracteres não é
-- adivinhável na força bruta; 10 milhões de combinações são. Sem um contador,
-- o limite por IP não impede alguém de tentar de vários endereços contra a
-- mesma conta — o contador vive no código, não em quem tenta.

ALTER TABLE verification_tokens
    MODIFY COLUMN purpose ENUM('email_verification','password_reset','login_2fa') NOT NULL;

ALTER TABLE verification_tokens
    ADD COLUMN attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER token_hash;

-- ROLLBACK: ALTER TABLE verification_tokens DROP COLUMN attempts;
-- ROLLBACK: ALTER TABLE verification_tokens MODIFY COLUMN purpose ENUM('email_verification','password_reset') NOT NULL;
