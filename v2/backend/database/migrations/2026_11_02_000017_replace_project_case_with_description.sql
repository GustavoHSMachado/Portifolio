-- Os três campos do caso dão lugar a uma descrição única.
--
-- `problem`, `decisions` e `result` nasceram para forçar a estrutura que
-- separa portfólio de lista de repositórios: o que estava errado, o que se
-- decidiu, no que deu. A estrutura cumpriu o papel no projeto que ela
-- descrevia, mas obrigava a repartir em três um texto que nem todo projeto
-- tem em três partes — e campo que não se sabe preencher fica vazio.
--
-- Decisão do Gustavo em 02/11/2026, com a perda na mesa: o conteúdo dos três
-- campos **não** é migrado. Eram 1.094 caracteres no único projeto
-- cadastrado, e ele preferiu recomeçar o texto a herdar um emendado. O
-- backup de produção daquele dia guarda o original.
--
-- TEXT, e não VARCHAR, porque descrição de projeto cresce: `summary` já
-- cobre o resumo curto que aparece no cartão, e este campo é o texto longo
-- que fica atrás do clique.

ALTER TABLE projects
    ADD COLUMN description TEXT NULL AFTER summary,
    DROP COLUMN problem,
    DROP COLUMN decisions,
    DROP COLUMN result;

-- ROLLBACK: ALTER TABLE projects ADD COLUMN problem TEXT NULL AFTER summary, ADD COLUMN decisions TEXT NULL AFTER problem, ADD COLUMN result TEXT NULL AFTER decisions, DROP COLUMN description;
