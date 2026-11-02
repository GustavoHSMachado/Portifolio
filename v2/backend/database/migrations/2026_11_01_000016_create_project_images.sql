-- Fotos dos projetos: o arquivo fica em disco, aqui fica só o caminho.
--
-- Imagem em BLOB entraria em todo mysqldump, faria o PHP carregar o arquivo
-- inteiro na memória a cada exibição e tiraria a imagem do alcance do cache do
-- navegador — uma captura de tela passaria a custar uma consulta por visita.
-- Guardar o caminho devolve o arquivo ao servidor web, que é quem sabe servir
-- estático com cache e requisição condicional.
--
-- Tabela própria, e não uma coluna em projects, porque um projeto mostra mais
-- de uma tela: a lista, o detalhe, o antes e o depois. Com coluna, a segunda
-- foto exigiria uma migração nova.
--
-- O caminho é relativo à raiz pública da API (uploads/projetos/xxx.webp) e
-- nunca absoluto: trocar o domínio ou a pasta de instalação não deve exigir um
-- UPDATE em cima dos dados. Quem monta a URL completa é o presenter, a partir
-- de APP_URL.
--
-- `alt` é NOT NULL de propósito. Imagem sem descrição é imagem que não existe
-- para quem usa leitor de tela, e deixar o campo opcional garante que ele
-- ficaria vazio na maioria das vezes.
--
-- ON DELETE CASCADE porque a foto não tem vida própria: excluído o projeto, a
-- linha vai junto. O arquivo em disco é removido pelo serviço antes do DELETE —
-- o banco não alcança o sistema de arquivos.

CREATE TABLE project_images (
    id         BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    project_id BIGINT UNSIGNED   NOT NULL,
    path       VARCHAR(255)      NOT NULL,
    alt        VARCHAR(160)      NOT NULL,
    position   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- Dois registros não podem apontar para o mesmo arquivo: a remoção de um
    -- apagaria o arquivo que o outro ainda exibe.
    UNIQUE KEY uq_project_images_path (path),
    KEY idx_project_images_project (project_id, position),
    CONSTRAINT fk_project_images_project FOREIGN KEY (project_id)
        REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE project_images;
