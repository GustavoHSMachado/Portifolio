-- Executado apenas na primeira criação do volume.
--
-- Banco separado para os testes de integração, que rodam contra MySQL real e
-- dão TRUNCATE nas tabelas entre os casos. Sem um banco próprio, a suíte
-- apagaria os dados de desenvolvimento.
--
-- O nome precisa terminar em _test: DatabaseTestCase recusa rodar fora disso.
CREATE DATABASE IF NOT EXISTS portifolio_test
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
