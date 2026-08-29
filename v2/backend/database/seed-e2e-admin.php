<?php

declare(strict_types=1);

/**
 * Semeia a conta administradora que a suíte E2E usa.
 *
 *   docker compose exec -T api php database/seed-e2e-admin.php
 *
 * Por que existe: a área administrativa ficou sem cobertura E2E até 29/08/2026,
 * e o obstáculo era o segundo fator. `ADMIN_EMAIL` amarra o painel a um endereço,
 * e no ambiente local esse endereço é real — o código de 7 dígitos sairia por
 * SMTP para uma caixa de verdade em vez de cair no Mailpit, e nenhum teste
 * automatizado conseguiria lê-lo.
 *
 * A saída foi `ADMIN_EMAIL` aceitar lista (ver RequireAdmin) e o ambiente local
 * incluir este endereço em domínio reservado, que o MailService desvia para a
 * captura. Este script cria a conta correspondente.
 *
 * Idempotente: rodar de novo apenas redefine a senha e garante o papel.
 *
 * A senha é fixa e está escrita aqui de propósito — é credencial de teste, de
 * uma conta que só existe em domínio reservado, num banco de desenvolvimento.
 * Ela nunca vale em produção porque a trava abaixo recusa rodar lá, e porque
 * `docker-compose.prod.yml` não inclui este endereço em ADMIN_EMAIL.
 */

use App\Core\Config;
use App\Database\Connection;
use App\Support\Hash;

require_once dirname(__DIR__) . '/vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit("Este script só roda via CLI.\n");
}

Config::boot(dirname(__DIR__));

/*
 * A trava é a mesma ideia do purge.php --test-data: um script que cria
 * administrador não pode existir em produção, e depender de alguém lembrar de
 * não rodá-lo não é uma trava.
 */
if (Config::isProduction()) {
    fwrite(STDERR, "Recusado: este script não roda com APP_ENV=production.\n");
    exit(1);
}

const EMAIL = 'admin@portifolio.local';
const SENHA = 'AdminE2E#2026';
const NOME = 'Administrador E2E';

$permitidos = array_map('mb_strtolower', Config::list('ADMIN_EMAIL'));

if ($permitidos !== [] && !in_array(EMAIL, $permitidos, true)) {
    fwrite(STDERR, sprintf(
        "Recusado: %s não está em ADMIN_EMAIL.\n"
        . "  ADMIN_EMAIL atual: %s\n"
        . "  Sem isso o RequireAdmin barraria a conta e os testes falhariam com 403.\n"
        . "  Acrescente o endereço à lista (separada por vírgula) e suba a API de novo.\n",
        EMAIL,
        implode(', ', $permitidos),
    ));
    exit(1);
}

$db = new Connection();

$existente = $db->first('SELECT id FROM users WHERE email = ? LIMIT 1', [EMAIL]);

if ($existente === null) {
    $db->run(
        "INSERT INTO users (name, email, phone, password_hash, role, email_verified_at)
         VALUES (?, ?, ?, ?, 'admin', NOW())",
        [NOME, EMAIL, '11999999999', Hash::make(SENHA)]
    );

    printf("Conta administradora de teste criada: %s\n", EMAIL);
} else {
    $db->run(
        "UPDATE users
            SET password_hash = ?, role = 'admin', email_verified_at = NOW(),
                locked_until = NULL, failed_attempts = 0, deleted_at = NULL
          WHERE id = ?",
        [Hash::make(SENHA), $existente['id']]
    );

    printf("Conta administradora de teste redefinida: %s\n", EMAIL);
}

/*
 * O histórico de senhas recusa senha repetida, e a suíte redefine sempre a
 * mesma. Sem limpar, uma segunda execução gravaria um histórico que faria
 * qualquer teste de troca de senha desta conta falhar por 422.
 */
$id = (int) ($existente['id'] ?? $db->lastInsertId());
$db->run('DELETE FROM password_history WHERE user_id = ?', [$id]);
$db->run('DELETE FROM refresh_tokens WHERE user_id = ?', [$id]);
$db->run('DELETE FROM verification_tokens WHERE user_id = ?', [$id]);

echo '  senha: ' . SENHA . PHP_EOL;
echo "  Removida junto com as demais contas @portifolio.local por:\n";
echo "    php database/purge.php --test-data\n";
