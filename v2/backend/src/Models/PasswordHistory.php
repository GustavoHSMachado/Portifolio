<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Config;
use App\Database\Connection;
use App\Support\Hash;

/**
 * Senhas já usadas, para impedir que voltem.
 *
 * O custo desta verificação é real e vale explicar. Argon2id é lento de
 * propósito — cerca de 200ms por comparação nesta máquina —, e como cada
 * entrada tem sal próprio, não há como comparar em lote: é uma chamada de
 * password_verify por senha guardada. Verificar dez significa dois segundos de
 * espera na troca de senha.
 *
 * Daí o limite. Guardar o histórico inteiro seria mais rigoroso, mas deixaria a
 * troca de senha cada vez mais lenta conforme a conta envelhece, e manteria
 * hashes antigos para sempre — material sensível guardado sem prazo, sem que
 * ninguém precise dele. As últimas cinco cobrem o caso real, que é a pessoa
 * alternando entre duas ou três senhas conhecidas.
 */
final class PasswordHistory
{
    public function __construct(private readonly Connection $db)
    {
    }

    /** Quantas senhas anteriores continuam bloqueadas. */
    public function size(): int
    {
        return max(1, Config::int('PASSWORD_HISTORY_SIZE', 5));
    }

    /**
     * A senha já foi usada por esta conta?
     *
     * Inclui a senha em vigor, que também é gravada aqui — uma verificação só
     * responde "igual à atual" e "igual a uma antiga".
     */
    public function wasUsed(int $userId, string $plainPassword): bool
    {
        $anteriores = $this->db->all(
            'SELECT password_hash FROM password_history
              WHERE user_id = ?
              ORDER BY created_at DESC, id DESC
              LIMIT ' . $this->size(),
            [$userId]
        );

        foreach ($anteriores as $linha) {
            if (Hash::verify($plainPassword, (string) $linha['password_hash'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Registra a senha que está em vigor na conta.
     *
     * Lê o hash do próprio users em vez de recebê-lo pronto: assim quem chama
     * não precisa carregar o hash por parâmetro só para guardá-lo, e não há
     * risco de gravar no histórico algo diferente do que ficou na conta.
     */
    public function recordCurrent(int $userId): void
    {
        $linha = $this->db->first('SELECT password_hash FROM users WHERE id = ?', [$userId]);

        if ($linha === null) {
            return;
        }

        $this->record($userId, (string) $linha['password_hash']);
    }

    /** Registra o hash recém-definido e descarta o que passou do limite. */
    public function record(int $userId, string $passwordHash): void
    {
        $this->db->run(
            'INSERT INTO password_history (user_id, password_hash, created_at) VALUES (?, ?, NOW())',
            [$userId, $passwordHash]
        );

        $this->prune($userId);
    }

    /**
     * Mantém apenas as N mais recentes.
     *
     * O DELETE usa uma subconsulta com os ids a preservar, e não um OFFSET
     * direto: o MySQL recusa LIMIT dentro de subconsulta com IN, e a camada
     * extra de SELECT é o contorno padrão para isso.
     */
    public function prune(int $userId): void
    {
        $this->db->run(
            'DELETE FROM password_history
              WHERE user_id = ?
                AND id NOT IN (
                    SELECT id FROM (
                        SELECT id FROM password_history
                         WHERE user_id = ?
                         ORDER BY created_at DESC, id DESC
                         LIMIT ' . $this->size() . '
                    ) AS manter
                )',
            [$userId, $userId]
        );
    }
}
