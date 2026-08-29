-- ==========================================================================
--  Retrato do banco `portifolio` — 2026-08-29
--
--  Gerado com mysqldump a partir do banco em execucao (MySQL 8.0.46), no
--  estado em que ele estava nesta data. Serve como referencia do schema que
--  as 15 migrations produzem quando aplicadas em ordem, e como ponto de
--  partida para subir um ambiente com o conteudo do site ja preenchido.
--
--  O que este arquivo tem:
--    - a estrutura completa das 15 tabelas (CREATE TABLE, indices, chaves
--      estrangeiras), sem excecao;
--    - os dados das tabelas de conteudo: migrations, profile, experiences,
--      education, skills, projects, site_settings.
--
--  O que este arquivo NAO tem, e por que:
--    users, password_history, refresh_tokens, verification_tokens,
--    audit_log, rate_limits, messages e legal_acceptances entram aqui so
--    com a estrutura. O conteudo delas e dado pessoal e material de
--    credencial — e-mail, hash de senha, tokens de sessao, enderecos IP —,
--    e este repositorio e publico. Para recriar o administrador em um
--    ambiente novo, use database/create-admin.php.
--
--  Como restaurar:
--    docker exec -i portifolio-db mysql -uroot -proot < <este arquivo>
--
--  A fonte da verdade do schema continua sendo database/migrations/. Este
--  retrato e complementar: se as duas coisas divergirem, a migration manda.
-- ==========================================================================

-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: portifolio
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `portifolio`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `portifolio` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `portifolio`;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `event` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_id` char(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_event` (`event`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2452 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `education`
--

DROP TABLE IF EXISTS `education`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `education` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `course` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `institution` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` enum('tecnico','graduacao','pos_graduacao','mestrado','doutorado','curso') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('concluido','em_andamento') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'concluido',
  `completed_at` date DEFAULT NULL,
  `position` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_education_position` (`position`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `experiences`
--

DROP TABLE IF EXISTS `experiences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `experiences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `started_at` date NOT NULL,
  `ended_at` date DEFAULT NULL,
  `position` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_experiences_started` (`started_at`),
  KEY `idx_experiences_position` (`position`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legal_acceptances`
--

DROP TABLE IF EXISTS `legal_acceptances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legal_acceptances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `document` enum('terms','privacy') COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accepted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_legal_user_doc_version` (`user_id`,`document`,`version`),
  KEY `idx_legal_user` (`user_id`),
  CONSTRAINT `fk_legal_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2011 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('nova','lida','respondida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'nova',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_status_created` (`status`,`created_at`),
  KEY `idx_messages_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL,
  `batch` int unsigned NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_migrations_filename` (`filename`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_history`
--

DROP TABLE IF EXISTS `password_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ph_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_ph_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=905 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `profile`
--

DROP TABLE IF EXISTS `profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile` (
  `id` tinyint unsigned NOT NULL DEFAULT '1',
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `headline` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `objective` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linkedin_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resume_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_profile_singleton` CHECK ((`id` = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `problem` text COLLATE utf8mb4_unicode_ci,
  `decisions` text COLLATE utf8mb4_unicode_ci,
  `result` text COLLATE utf8mb4_unicode_ci,
  `stack` json DEFAULT NULL,
  `repository_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `demo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published` tinyint(1) NOT NULL DEFAULT '0',
  `position` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_slug` (`slug`),
  KEY `idx_projects_published` (`published`,`position`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rate_limits`
--

DROP TABLE IF EXISTS `rate_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_limits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bucket_key` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `window_start` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rl_bucket` (`bucket_key`),
  KEY `idx_rl_window` (`window_start`)
) ENGINE=InnoDB AUTO_INCREMENT=210 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `family_id` char(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `rotated_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rt_token_hash` (`token_hash`),
  KEY `idx_rt_family` (`family_id`),
  KEY `idx_rt_user` (`user_id`),
  KEY `idx_rt_expires` (`expires_at`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=605 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `site_settings`
--

DROP TABLE IF EXISTS `site_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_settings` (
  `setting_key` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` varchar(400) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `skills`
--

DROP TABLE IF EXISTS `skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skills` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `evidence` varchar(400) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_skills_name` (`name`),
  KEY `idx_skills_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `email_verified_at` datetime DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  `failed_attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=1014 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `verification_tokens`
--

DROP TABLE IF EXISTS `verification_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `purpose` enum('email_verification','password_reset','login_2fa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vt_token_hash` (`token_hash`),
  UNIQUE KEY `uq_vt_user_purpose` (`user_id`,`purpose`),
  KEY `idx_vt_expires` (`expires_at`),
  CONSTRAINT `fk_vt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1883 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'portifolio'
--

--
-- Dumping routines for database 'portifolio'
--
--
-- Dados das tabelas de conteudo
--

--
-- Dados da tabela `migrations`
--

INSERT INTO `migrations` VALUES (7,'2026_08_08_000001_create_users_table.sql',1,'2026-08-09 22:14:44');
INSERT INTO `migrations` VALUES (8,'2026_08_08_000002_create_verification_tokens_table.sql',1,'2026-08-09 22:14:44');
INSERT INTO `migrations` VALUES (9,'2026_08_08_000003_create_refresh_tokens_table.sql',1,'2026-08-09 22:14:44');
INSERT INTO `migrations` VALUES (10,'2026_08_08_000004_create_rate_limits_table.sql',1,'2026-08-09 22:14:44');
INSERT INTO `migrations` VALUES (11,'2026_08_08_000005_create_audit_log_table.sql',1,'2026-08-09 22:14:44');
INSERT INTO `migrations` VALUES (12,'2026_08_09_000006_add_legal_acceptance.sql',1,'2026-08-09 22:14:44');
INSERT INTO `migrations` VALUES (13,'2026_08_16_000007_create_content_tables.sql',2,'2026-08-16 18:21:07');
INSERT INTO `migrations` VALUES (14,'2026_08_16_000008_seed_content.sql',2,'2026-08-16 18:21:07');
INSERT INTO `migrations` VALUES (15,'2026_08_16_000009_add_intro_video_to_profile.sql',3,'2026-08-16 18:33:50');
INSERT INTO `migrations` VALUES (16,'2026_08_22_000010_add_login_2fa_purpose.sql',4,'2026-08-23 01:44:45');
INSERT INTO `migrations` VALUES (17,'2026_08_22_000011_create_password_history.sql',5,'2026-08-23 02:33:49');
INSERT INTO `migrations` VALUES (18,'2026_08_23_000012_create_messages_table.sql',6,'2026-08-23 13:33:55');
INSERT INTO `migrations` VALUES (19,'2026_08_23_000013_widen_skill_evidence.sql',7,'2026-08-23 14:01:38');
INSERT INTO `migrations` VALUES (20,'2026_08_23_000014_remove_intro_video.sql',8,'2026-08-23 17:47:47');
INSERT INTO `migrations` VALUES (21,'2026_08_23_000015_create_site_settings.sql',9,'2026-08-23 20:39:06');

--
-- Dados da tabela `profile`
--

INSERT INTO `profile` VALUES (1,'Gustavo Henrique Santos Machado','Gustavo Henrique','Analista de Sistemas · Pós-graduado em Engenharia de Dados','Análise de sistemas, dados e desenvolvimento back-end','Atuação como Analista de Sistemas Júnior, Desenvolvedor Júnior, Analista de Dados Júnior ou Product Owner Júnior.','Profissional de Tecnologia da Informação com experiência prática em análise de sistemas, suporte técnico e investigação de bugs em ambiente produtivo. Atuação direta com consultas SQL, análise de inconsistências e apoio ao time de desenvolvimento na resolução de problemas. Experiência em levantamento e refinamento de requisitos, gestão de backlog e condução de cerimônias ágeis, atuando como ponte entre áreas de negócio e time de desenvolvimento.','Ibirité','MG',NULL,'https://github.com/GustavoHSMachado','https://www.linkedin.com/in/gustavo-henrique-santos-machado-22379440/','https://wa.me/5531986585208',NULL,'2026-08-23 03:16:01');

--
-- Dados da tabela `experiences`
--

INSERT INTO `experiences` VALUES (1,'CDC Bank','Analista de Suporte a Cliente JR II','Análise e investigação de bugs em ambiente produtivo, com execução de consultas SQL para identificação de inconsistências em dados. Apoio contínuo ao time de desenvolvimento na correção de falhas, além de atendimento técnico voltado à resolução de incidentes críticos. Experiência em sistemas financeiros e transacionais.','2025-03-01',NULL,1,'2026-08-16 18:21:07','2026-08-16 18:21:07');
INSERT INTO `experiences` VALUES (2,'Gráfica Olib Impressões','Auxiliar de Acabamento Digital','Fechamento de artes para impressão, preparo e organização de material, produção e acabamento final dos produtos da gráfica. Responsável pela comunicação com parceiros e pelo estoque de acabamento e matéria-prima.','2020-03-01','2025-02-28',2,'2026-08-16 18:21:07','2026-08-16 18:21:07');
INSERT INTO `experiences` VALUES (3,'Infolíder Informática','Técnico em Manutenção de Micros I','Montagem e manutenção de computadores e redes, venda de peças e produtos de informática, e atendimento ao cliente presencial e remoto.','2013-03-01','2019-03-31',3,'2026-08-16 18:21:07','2026-08-16 18:21:07');
INSERT INTO `experiences` VALUES (4,'Imagem Stúdio Gráfico & Personalizações','Web Designer','Criação de websites, layouts e bancos de dados, com HTML, CSS e PHP.','2012-01-01','2013-03-31',4,'2026-08-16 18:21:07','2026-08-16 18:21:07');

--
-- Dados da tabela `education`
--

INSERT INTO `education` VALUES (1,'Engenharia de Software','Faculdade Pitágoras','pos_graduacao','em_andamento','2026-12-01',1,'2026-08-16 18:21:07','2026-08-16 18:21:07');
INSERT INTO `education` VALUES (2,'Engenharia de Dados','Faculdade Pitágoras','pos_graduacao','concluido','2026-08-01',2,'2026-08-16 18:21:07','2026-08-23 03:16:01');
INSERT INTO `education` VALUES (3,'Sistemas de Informação','Faculdade Pitágoras','graduacao','concluido','2025-12-01',3,'2026-08-16 18:21:07','2026-08-16 18:21:07');
INSERT INTO `education` VALUES (4,'Técnico em Informática','Polimig - Escola Politécnica de Minas Gerais','tecnico','concluido','2012-09-01',4,'2026-08-16 18:21:07','2026-08-16 18:21:07');

--
-- Dados da tabela `skills`
--

INSERT INTO `skills` VALUES (1,'PHP','Linguagens','Reconstruí este site do zero em PHP 8.3: MVC próprio com injeção de dependências, JWT com refresh rotativo e detecção de reuso, e suíte no PHPUnit. Antes disso, sites em PHP na Imagem Stúdio Gráfico.',1,'2026-08-16 18:21:07','2026-08-23 01:07:21');
INSERT INTO `skills` VALUES (2,'SQL / MySQL','Dados','No CDC Bank, escrevo consultas para rastrear inconsistências de dados em produção, em sistemas financeiros e transacionais. Aqui, modelei o schema deste site e as migrações que o versionam.',2,'2026-08-16 18:21:07','2026-08-23 01:07:21');
INSERT INTO `skills` VALUES (3,'Java','Linguagens','Base no técnico da POLIMIG e na graduação em Sistemas de Informação, aplicada a aplicativos. Leio e entendo código e preparo o ambiente. Não atuo com Java para web, como Spring — é o próximo da minha lista de estudo.',3,'2026-08-16 18:21:07','2026-08-23 01:29:57');
INSERT INTO `skills` VALUES (4,'HTML','Front-end','As telas deste site são escritas à mão com marcação semântica: um <main> por rota, títulos em hierarquia e rótulos ligados aos campos. É o que faz o leitor de tela e o atalho de pular conteúdo funcionarem.',4,'2026-08-16 18:21:07','2026-08-23 01:07:21');
INSERT INTO `skills` VALUES (5,'CSS','Front-end','O design deste site sai de tokens: cor, espaço e movimento em variáveis, sem valor mágico em componente. Layout responsivo de 320px ao monitor grande, sem esconder conteúdo em nenhum tamanho.',5,'2026-08-16 18:21:07','2026-08-23 01:07:21');
INSERT INTO `skills` VALUES (6,'APIs REST','Arquitetura','No CDC Bank atendo parceiros que consomem nossas APIs e investigo o que falha do lado deles. Aqui construí uma: 26 rotas atrás de um pipeline de autenticação, rate limit, CORS e tratamento de erro.',6,'2026-08-16 18:21:07','2026-08-23 01:30:39');
INSERT INTO `skills` VALUES (7,'Banco de dados relacional','Dados','Modelei este site em 9 migrações versionadas com rollback: chaves estrangeiras em cascata, índices guiados por consulta real e exclusão lógica que devolve o e-mail para uso.',7,'2026-08-16 18:21:07','2026-08-23 01:07:21');
INSERT INTO `skills` VALUES (8,'Git','Ferramentas','Histórico em Conventional Commits, com a mensagem explicando o defeito que o commit corrige e não a lista de arquivos. Trabalho isolado da branch de produção até estar validado.',8,'2026-08-16 18:21:07','2026-08-23 01:07:21');
INSERT INTO `skills` VALUES (9,'Jira','Ferramentas','No CDC Bank é onde o backlog acontece: abro e acompanho as demandas do time de desenvolvimento e atendo as que chegam de parceiros que consomem nossas APIs.',9,'2026-08-16 18:21:07','2026-08-23 01:29:57');
INSERT INTO `skills` VALUES (10,'Scrum','Processo','No CDC Bank, participo do refinamento de requisitos e da condução de cerimônias ágeis, atuando como ponte entre as áreas de negócio e o time de desenvolvimento.',10,'2026-08-16 18:21:07','2026-08-23 01:07:21');
INSERT INTO `skills` VALUES (11,'Debugging e análise de erros','Processo','É o meu dia a dia no CDC Bank: reproduzir o bug relatado em produção, achar a inconsistência no dado e apoiar o time na correção. Neste projeto, cada defeito encontrado está descrito no commit que o corrige.',11,'2026-08-16 18:21:07','2026-08-23 01:07:21');
INSERT INTO `skills` VALUES (13,'Kanban','Processo','No CDC Bank o trabalho do time corre em quadro: cada demanda avança de etapa até a entrega. É por ele que acompanho o que abri e o que os parceiros das nossas APIs reportaram.',12,'2026-08-23 13:53:23','2026-08-23 14:14:31');
INSERT INTO `skills` VALUES (14,'Claude Code','Ferramentas','Construo sistemas e soluções e configuro ambientes de desenvolvimento e produção com IA no fluxo de trabalho: defino o escopo do que precisa existir, assumo os trade-offs e reviso tudo o que entra em produção. A ferramenta acelera a entrega; o critério continua sendo meu.',13,'2026-08-23 13:53:23','2026-08-23 14:01:50');

--
-- Dados da tabela `projects`
--

INSERT INTO `projects` VALUES (1,'portifolio-v2','Portfólio v2 - reconstrução com auditoria de segurança','Reconstrução completa de um portfólio em PHP procedural, a partir de uma auditoria que encontrou 22 falhas de segurança.','A primeira versão guardava senhas em texto plano e tinha um fluxo de redefinição que permitia assumir qualquer conta sabendo apenas o e-mail. A auditoria levantou 22 achados, 5 deles críticos, incluindo SQL Injection e um painel administrativo acessível por qualquer usuário autenticado.','Corrigir no lugar preservaria a arquitetura que permitiu as falhas, então a v2 foi construída do zero, aproveitando apenas o conteúdo textual e a tipografia. No back-end, MVC próprio em PHP 8.3 com roteador, pipeline de middleware e container de injeção de dependência. Autenticação por JWT com refresh rotativo e detecção de reuso por família, senhas em Argon2id e rate limit persistido no banco. No front, Next.js com TypeScript estrito e um design system em tokens.','Nove verificações de qualidade bloqueiam o merge, e 96 testes automatizados cobrem unidade, integração e ponta a ponta. A própria suíte encontrou defeitos reais durante a construção, entre eles um migrador que marcava migrações como aplicadas sem aplicá-las e um login que respondia com sucesso e devolvia o usuário para a tela de entrada.','[\"PHP 8.3\", \"MySQL 8\", \"Next.js 14\", \"TypeScript\", \"Docker\", \"PHPUnit\", \"Playwright\"]','https://github.com/GustavoHSMachado/Portifolio',NULL,1,1,'2026-08-16 18:21:07','2026-08-16 18:21:07');

--
-- Dados da tabela `site_settings`
--


/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-29 23:35:22
