-- A capa do cartão passa a ser uma foto própria, fora da galeria.
--
-- Até aqui a capa era a primeira foto da galeria (position 0), o que amarrava
-- duas decisões diferentes: qual imagem representa o projeto na vitrine e qual
-- é a primeira das telas. São escolhas distintas — a capa quer a tela mais
-- vendedora, a galeria quer ordem de leitura — e com uma coluna só era preciso
-- sacrificar uma para ter a outra.
--
-- A flag vive em project_images, e não como coluna em projects, para a capa
-- reaproveitar tudo que a foto já tem: o mesmo upload validado, o mesmo
-- armazenamento com nome sorteado, o mesmo `alt` obrigatório e a mesma remoção
-- que apaga o arquivo do disco. Uma coluna `cover_path` em projects duplicaria
-- esse caminho inteiro.
--
-- O limite de 8 continua valendo para a galeria; a capa é a nona, e é contada
-- à parte em ProjectImage::countForProject().
--
-- Não há índice único garantindo uma capa por projeto: o MySQL não tem índice
-- parcial, e um UNIQUE (project_id, is_cover) impediria duas fotos comuns no
-- mesmo projeto. Quem garante a unicidade é ProjectImage::marcarComoCapa(),
-- que desmarca as demais na mesma transação.

ALTER TABLE project_images
    ADD COLUMN is_cover TINYINT(1) NOT NULL DEFAULT 0 AFTER position,
    ADD KEY idx_project_images_cover (project_id, is_cover);

-- ROLLBACK: ALTER TABLE project_images DROP KEY idx_project_images_cover, DROP COLUMN is_cover;
