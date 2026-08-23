-- Remove o vídeo de apresentação do perfil.
--
-- A seção que exibia o vídeo saiu da home em 23/08/2026, a pedido do dono. As
-- colunas ficaram para trás alimentando dois campos no painel que não
-- apareciam em lugar nenhum — pior que dado inútil, é dado que confunde quem
-- edita: preencher ali não produzia efeito visível.
--
-- Os valores anteriores, se alguém precisar recuperar do histórico do Git:
--   intro_video_id      = 'FtnZdJjeWJ4'
--   intro_video_caption = 'Um pouco sobre mim, em vídeo.'

ALTER TABLE profile
    DROP COLUMN intro_video_caption,
    DROP COLUMN intro_video_id;

-- ROLLBACK: ALTER TABLE profile ADD COLUMN intro_video_id VARCHAR(32) NULL AFTER resume_path, ADD COLUMN intro_video_caption VARCHAR(255) NULL AFTER intro_video_id;
