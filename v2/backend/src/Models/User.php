<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;
use App\Support\Hash;

/**
 * Model de usuário. Toda escrita passa por aqui — nenhum controller monta SQL.
 * A senha nunca sai deste model em texto plano nem é serializada.
 */
final class User
{
    public const ROLE_USER = 'user';
    public const ROLE_ADMIN = 'admin';

    public function __construct(private readonly Connection $db)
    {
    }

    /** @return array<string,mixed>|null */
    public function findById(int $id): ?array
    {
        return $this->db->first(
            'SELECT id, name, email, phone, role, email_verified_at, created_at, updated_at
             FROM users WHERE id = ? AND deleted_at IS NULL',
            [$id]
        );
    }

    /**
     * Inclui o hash da senha — use somente no fluxo de autenticação.
     *
     * @return array<string, mixed>|null
     */
    public function findByEmailWithSecret(string $email): ?array
    {
        return $this->db->first(
            'SELECT id, name, email, phone, role, password_hash, email_verified_at,
                    failed_attempts, locked_until
             FROM users WHERE email = ? AND deleted_at IS NULL',
            [mb_strtolower($email)]
        );
    }

    /**
     * Sem filtro por deleted_at, e isso é intencional: ver softDelete(), que
     * anonimiza o e-mail ao excluir. Uma conta excluída não guarda mais o
     * endereço, então não há o que ignorar aqui — e filtrar seria pior, porque
     * deixaria passar um INSERT que a constraint UNIQUE recusaria depois.
     */
    public function emailExists(string $email): bool
    {
        return $this->db->first(
            'SELECT id FROM users WHERE email = ? LIMIT 1',
            [mb_strtolower($email)]
        ) !== null;
    }

    /**
     * Exclusão lógica que libera o e-mail para um novo cadastro.
     *
     * A tensão que isto resolve: uq_users_email é único na tabela inteira, e as
     * leituras filtram deleted_at IS NULL. Uma conta apenas marcada como
     * excluída sumiria da aplicação mas continuaria segurando o endereço para
     * sempre — a pessoa não conseguiria voltar com o mesmo e-mail, sem nenhuma
     * explicação visível na tela.
     *
     * As duas saídas usuais são um índice único composto com deleted_at, ou
     * anonimizar. O índice composto não funciona em MySQL: NULL nunca é igual a
     * NULL, então (email, NULL) se repetiria à vontade e a unicidade entre
     * contas ativas — que é a que importa — deixaria de valer.
     *
     * Anonimizar resolve os dois lados de uma vez. O endereço fica livre no
     * mesmo instante, e o registro deixa de guardar dado pessoal de quem pediu
     * para sair, que é o que a LGPD espera de uma exclusão a pedido do titular.
     * O que sobra é a linha com o id, preservando as chaves estrangeiras de
     * quem aponta para ela.
     *
     * O hash da senha permanece: não identifica ninguém e o login já é
     * impossível, porque findByEmailWithSecret ignora linhas excluídas.
     */
    public function softDelete(int $id): void
    {
        $this->db->run(
            "UPDATE users
                SET deleted_at = NOW(),
                    email      = CONCAT('excluido+', id, '@invalido.local'),
                    name       = 'Conta excluída',
                    phone      = NULL
              WHERE id = ? AND deleted_at IS NULL",
            [$id]
        );
    }

    public function create(string $name, string $email, string $phone, string $password): int
    {
        $this->db->run(
            'INSERT INTO users (name, email, phone, password_hash, role, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [$name, mb_strtolower($email), $phone, Hash::make($password), self::ROLE_USER]
        );

        return $this->db->lastInsertId();
    }

    public function updateProfile(int $id, string $name, string $phone): void
    {
        $this->db->run(
            'UPDATE users SET name = ?, phone = ?, updated_at = NOW() WHERE id = ?',
            [$name, $phone, $id]
        );
    }

    /** Troca a senha e invalida todas as sessões ativas do usuário. */
    public function updatePassword(int $id, string $newPassword): void
    {
        $this->db->run(
            'UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW()
             WHERE id = ?',
            [Hash::make($newPassword), $id]
        );
    }

    public function markEmailVerified(int $id): void
    {
        $this->db->run(
            'UPDATE users SET email_verified_at = NOW(), updated_at = NOW()
             WHERE id = ? AND email_verified_at IS NULL',
            [$id]
        );
    }

    /** Trava progressiva da conta após tentativas falhas (defesa contra força bruta). */
    public function registerFailedAttempt(int $id, int $threshold = 5, int $lockMinutes = 15): void
    {
        $this->db->run(
            'UPDATE users
                SET failed_attempts = failed_attempts + 1,
                    locked_until = CASE WHEN failed_attempts + 1 >= ?
                                        THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
                                        ELSE locked_until END
              WHERE id = ?',
            [$threshold, $lockMinutes, $id]
        );
    }

    public function clearFailedAttempts(int $id): void
    {
        $this->db->run(
            'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW()
             WHERE id = ?',
            [$id]
        );
    }

    /**
     * Bloqueio administrativo: a conta existe, mas ninguém entra nela.
     *
     * Reaproveita locked_until em vez de ganhar coluna própria porque o login
     * já consulta esse campo — nada no fluxo de autenticação precisa mudar para
     * a trava valer. O preço é representar "indefinido" com uma data distante,
     * que é o que releaseAccess desfaz.
     */
    public function blockAccess(int $id): void
    {
        $this->db->run(
            'UPDATE users
                SET locked_until = DATE_ADD(NOW(), INTERVAL 100 YEAR)
              WHERE id = ? AND deleted_at IS NULL',
            [$id]
        );
    }

    /**
     * Libera a conta, seja do bloqueio administrativo ou do automático por
     * tentativas erradas.
     *
     * Não é clearFailedAttempts: aquele marca last_login_at, porque nasceu para
     * o login bem-sucedido. Usá-lo aqui inventaria um acesso que não houve, e
     * quem lê o painel confiaria nessa data.
     */
    public function releaseAccess(int $id): void
    {
        $this->db->run(
            'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
            [$id]
        );
    }

    /** @param array<string, mixed> $user */
    public function isLocked(array $user): bool
    {
        return $user['locked_until'] !== null
            && new \DateTimeImmutable($user['locked_until']) > new \DateTimeImmutable();
    }

    /**
     * Remove campos sensíveis antes de devolver o usuário na API.
     *
     * @param array<string, mixed> $user
     * @return array<string, mixed>
     */
    public static function toPublic(array $user): array
    {
        return [
            'id'            => (int) $user['id'],
            'name'          => $user['name'],
            'email'         => $user['email'],
            'phone'         => $user['phone'] ?? null,
            'role'          => $user['role'],
            'emailVerified' => !empty($user['email_verified_at']),
            'createdAt'     => $user['created_at'] ?? null,
        ];
    }
}
