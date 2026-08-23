<?php

declare(strict_types=1);

namespace App\Models;

use App\Database\Connection;

/**
 * Registro do que aconteceu no sistema.
 *
 * A tabela existia desde a primeira migração e nunca recebeu uma linha: o
 * projeto tinha auditoria de mentira — a estrutura pronta e ninguém escrevendo
 * nela. Agora os eventos que importam passam por aqui.
 *
 * O que **não** entra: senha, código de verificação, token de sessão, corpo de
 * mensagem. Um log de auditoria é lido por quem investiga um incidente, e um
 * log que guarda segredo transforma cada consulta numa nova exposição. O que
 * fica é quem, o quê, quando e de onde.
 */
final class AuditLog
{
    // Autenticação
    public const LOGIN_SENHA_OK = 'login.senha_conferida';
    public const LOGIN_SENHA_FALHOU = 'login.senha_incorreta';
    public const LOGIN_CONCLUIDO = 'login.concluido';
    public const LOGIN_CODIGO_FALHOU = 'login.codigo_incorreto';
    public const LOGOUT = 'logout';
    public const CONTA_BLOQUEADA = 'conta.bloqueada';

    // Conta
    public const CADASTRO = 'conta.cadastrada';
    public const EMAIL_CONFIRMADO = 'conta.email_confirmado';
    public const SENHA_REDEFINIDA = 'conta.senha_redefinida';
    public const SENHA_ALTERADA = 'conta.senha_alterada';
    public const RESET_SOLICITADO = 'conta.reset_solicitado';
    public const SESSAO_COMPROMETIDA = 'sessao.reuso_detectado';

    // Gestão de contas pelo painel. Nome distinto do bloqueio automático de
    // login: no painel a decisão é de uma pessoa, e é o que a auditoria precisa
    // separar quando alguém for perguntar por que a conta parou de funcionar.
    public const USUARIO_BLOQUEADO = 'usuario.bloqueado_pelo_admin';
    public const USUARIO_LIBERADO = 'usuario.liberado_pelo_admin';
    public const USUARIO_EXCLUIDO = 'usuario.excluido_pelo_admin';

    // Conteúdo e contato
    public const CONTEUDO_SALVO = 'conteudo.salvo';
    public const CONTEUDO_EXCLUIDO = 'conteudo.excluido';
    public const MENSAGEM_RECEBIDA = 'mensagem.recebida';

    public function __construct(private readonly Connection $db)
    {
    }

    /**
     * @param array<string,mixed>|null $metadata dados sem segredo, para contexto
     */
    public function record(
        string $event,
        ?int $userId = null,
        ?string $ip = null,
        ?string $userAgent = null,
        ?array $metadata = null,
        ?string $requestId = null,
    ): void {
        /*
         * Auditoria nunca derruba a operação que ela observa.
         *
         * Se gravar o registro falhar — banco cheio, tabela travada —, o login
         * ou a edição precisam seguir mesmo assim. O contrário significaria
         * que uma falha no que só observa impede o que realmente importa.
         */
        try {
            $this->db->run(
                'INSERT INTO audit_log (user_id, event, request_id, ip_address, user_agent, metadata, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [
                    $userId,
                    $event,
                    $requestId,
                    $ip,
                    $userAgent === null ? null : mb_substr($userAgent, 0, 255),
                    $metadata === null ? null : json_encode($metadata, JSON_UNESCAPED_UNICODE),
                ]
            );
        } catch (\Throwable) {
            // Silêncio proposital: ver o comentário acima.
        }
    }

    /**
     * Eventos mais recentes, com o nome de quem os provocou.
     *
     * @return list<array<string,mixed>>
     */
    public function recent(int $limit = 100, ?string $event = null): array
    {
        $sql = 'SELECT a.id, a.event, a.ip_address, a.user_agent, a.metadata, a.created_at,
                       a.user_id, u.name AS user_name, u.email AS user_email
                  FROM audit_log a
                  LEFT JOIN users u ON u.id = a.user_id';

        $params = [];

        if ($event !== null && $event !== '') {
            $sql .= ' WHERE a.event = ?';
            $params[] = $event;
        }

        $sql .= ' ORDER BY a.created_at DESC, a.id DESC LIMIT ' . max(1, min($limit, 500));

        return $this->db->all($sql, $params);
    }

    /** @return list<array<string,mixed>> quantos eventos de cada tipo */
    public function summary(int $days = 30): array
    {
        return $this->db->all(
            'SELECT event, COUNT(*) AS total, MAX(created_at) AS ultimo
               FROM audit_log
              WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
              GROUP BY event
              ORDER BY total DESC',
            [$days]
        );
    }

    /**
     * Housekeeping — chamado por database/purge.php.
     *
     * Auditoria guardada para sempre vira o próprio risco que deveria mitigar:
     * um histórico de IPs e horários de acesso de cada pessoa, sem prazo.
     */
    public function purgeOld(int $days = 180): int
    {
        return $this->db->run(
            'DELETE FROM audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [$days]
        )->rowCount();
    }
}
