-- Vídeo de apresentação, resgatado da área autenticada da v1.
--
-- Era o único conteúdo profissional da v1 sem equivalente na v2: ficava na
-- seção Currículo do pageUser.php, atrás do login, e teria se perdido na
-- migração.
--
-- Guardamos apenas o identificador do vídeo, não a URL de embed inteira. O
-- embed do YouTube carrega scripts de rastreamento e pesa no orçamento de
-- performance, então a decisão de como exibir — thumbnail com carregamento
-- sob demanda, link externo ou iframe direto — fica com o front, e pode mudar
-- sem tocar no banco.

ALTER TABLE profile
    ADD COLUMN intro_video_id      VARCHAR(32)  NULL AFTER resume_path,
    ADD COLUMN intro_video_caption VARCHAR(255) NULL AFTER intro_video_id;

UPDATE profile
   SET intro_video_id = 'FtnZdJjeWJ4',
       intro_video_caption = 'Um pouco sobre mim, em vídeo.'
 WHERE id = 1;

-- ROLLBACK
-- ALTER TABLE profile DROP COLUMN intro_video_caption, DROP COLUMN intro_video_id;
