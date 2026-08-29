<?php
declare(strict_types=1);

/**
 * REMOVIDO — este arquivo continha a senha de aplicativo do Gmail em texto plano
 * e foi versionado no repositório público.
 *
 * AÇÃO NECESSÁRIA: revogue a senha de aplicativo antiga em
 * https://myaccount.google.com/apppasswords e gere uma nova, colocando-a no .env
 * (variável MAIL_PASS). O segredo antigo continua exposto no histórico do Git.
 *
 * A configuração de e-mail agora está em src/Mailer.php, lendo do .env.
 */

require_once __DIR__ . '/bootstrap.php';

trigger_error('configEmail.php está deprecado. Use Mailer::send().', E_USER_DEPRECATED);
