-- Ajustes da home editáveis pelo painel: a cor de destaque e os textos das seções.
--
-- Chave-valor, e não uma coluna por ajuste, porque a lista cresce a cada texto
-- que sai do código — e cada crescimento seria uma migração nova, um ALTER TABLE
-- e uma coluna a mais no SELECT. Aqui, adicionar um texto é inserir uma linha.
--
-- O preço dessa flexibilidade é que o banco não valida mais nada: para ele tudo
-- é VARCHAR. Quem valida é o servidor, no SettingsController, e ali a validação
-- é estrita justamente porque a cor termina dentro de uma folha de estilo — cor
-- é o único valor daqui que o navegador executa, e não apenas exibe.
--
-- A tabela nasce vazia de propósito. Sem linha, a home usa o que está no código,
-- que continua sendo o padrão de referência: o azul medido em 8:1 e os títulos
-- escritos com o resto do texto. Salvar é que passa a valer por cima.

CREATE TABLE site_settings (
    setting_key   VARCHAR(60)  NOT NULL,
    setting_value VARCHAR(400) NOT NULL,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE site_settings;
