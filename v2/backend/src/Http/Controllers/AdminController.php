<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Config;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Database\Connection;
use App\Models\AuditLog;
use App\Models\User;

/**
 * Painel de acompanhamento: quem tem conta e o que aconteceu no sistema.
 *
 * Aqui aparecem dados pessoais de terceiros — nome, e-mail, telefone, IP e
 * horário de acesso. Isso é legítimo: o dono do site é o controlador desses
 * dados e precisa deles para operar e investigar incidentes. Mas justifica
 * três cuidados que estão no código:
 *
 *   - a rota exige RequireAdmin, e o ADMIN_EMAIL restringe a uma conta;
 *   - o log guarda o que aconteceu, nunca o segredo envolvido — senha, código
 *     de verificação e token de sessão não passam por aqui;
 *   - há prazo: database/purge.php apaga registros antigos, porque histórico de
 *     IP e horário sem validade vira o próprio risco que a auditoria mitiga.
 */
final class AdminController
{
    public function __construct(
        private readonly Connection $db,
        private readonly AuditLog $audit,
        private readonly User $users,
    ) {
    }

    /** Contas cadastradas, da mais recente para a mais antiga. */
    public function users(Request $request): Response
    {
        $users = $this->db->all(
            'SELECT id, name, email, phone, role, email_verified_at, last_login_at,
                    failed_attempts, locked_until, created_at, deleted_at
               FROM users
              ORDER BY created_at DESC
              LIMIT 500'
        );

        return Response::ok([
            'users' => array_map(
                static fn (array $u): array => [
                    'id'            => (int) $u['id'],
                    'name'          => $u['name'],
                    'email'         => $u['email'],
                    'phone'         => $u['phone'],
                    'role'          => $u['role'],
                    'emailVerified' => $u['email_verified_at'] !== null,
                    'lastLoginAt'   => $u['last_login_at'],
                    'locked'        => $u['locked_until'] !== null,
                    'createdAt'     => $u['created_at'],
                    'deleted'       => $u['deleted_at'] !== null,
                ],
                $users
            ),
        ]);
    }

    /** Eventos do sistema, com filtro opcional por tipo. */
    public function auditLog(Request $request): Response
    {
        // string() devolve '' quando o parâmetro não veio — nunca null.
        $evento = $request->string('event');
        $limite = (int) $request->string('limit', '100');

        $eventos = $this->audit->recent($limite > 0 ? $limite : 100, $evento);

        return Response::ok([
            'events' => array_map(
                static fn (array $e): array => [
                    'id'        => (int) $e['id'],
                    'event'     => $e['event'],
                    'userId'    => $e['user_id'] === null ? null : (int) $e['user_id'],
                    'userName'  => $e['user_name'],
                    'userEmail' => $e['user_email'],
                    'ip'        => $e['ip_address'],
                    'userAgent' => $e['user_agent'],
                    'metadata'  => $e['metadata'] === null ? null : json_decode((string) $e['metadata'], true),
                    'createdAt' => $e['created_at'],
                ],
                $eventos
            ),
            'summary' => array_map(
                static fn (array $s): array => [
                    'event'  => $s['event'],
                    'total'  => (int) $s['total'],
                    'ultimo' => $s['ultimo'],
                ],
                $this->audit->summary()
            ),
        ]);
    }
    /** Impede a conta de entrar, sem apagar nada. */
    public function lockUser(Request $request): Response
    {
        $alvo = $this->alvoGerenciavel($request);

        $this->users->blockAccess($alvo);
        $this->registrar($request, AuditLog::USUARIO_BLOQUEADO, $alvo);

        return Response::ok(['id' => $alvo], 'Conta bloqueada.');
    }

    /** Libera a conta, do bloqueio manual ou do automático por senha errada. */
    public function unlockUser(Request $request): Response
    {
        $alvo = $this->alvoGerenciavel($request);

        $this->users->releaseAccess($alvo);
        $this->registrar($request, AuditLog::USUARIO_LIBERADO, $alvo);

        return Response::ok(['id' => $alvo], 'Conta liberada.');
    }

    /**
     * Exclusão em duas partes: a linha fica, os dados pessoais saem.
     *
     * Apagar a linha levaria junto o histórico que aponta para ela — os
     * registros de auditoria ficariam órfãos, e é justamente o histórico de uma
     * conta excluída que alguém vai querer consultar depois.
     */
    public function deleteUser(Request $request): Response
    {
        $alvo = $this->alvoGerenciavel($request);

        $this->users->softDelete($alvo);
        $this->registrar($request, AuditLog::USUARIO_EXCLUIDO, $alvo);

        return Response::ok(['id' => $alvo], 'Conta excluída.');
    }

    /**
     * Resolve o alvo da ação e recusa os dois casos que não podem acontecer.
     *
     * A própria conta está fora porque um clique errado tiraria o dono do
     * painel — e, com o ADMIN_EMAIL amarrando o acesso a um único endereço, não
     * haveria segunda conta para desfazer. A conta do ADMIN_EMAIL está fora
     * pelo mesmo motivo, mesmo que outra pessoa com papel de admin tente.
     */
    private function alvoGerenciavel(Request $request): int
    {
        $alvo = (int) $request->attribute('id');

        if ($alvo <= 0) {
            throw HttpException::notFound('Conta não encontrada.');
        }

        if ($alvo === $request->userId()) {
            throw HttpException::forbidden('Você não pode aplicar esta ação na sua própria conta.');
        }

        $user = $this->users->findById($alvo);

        if ($user === null) {
            throw HttpException::notFound('Conta não encontrada.');
        }

        $protegido = mb_strtolower(trim((string) Config::get('ADMIN_EMAIL', '')));

        if ($protegido !== '' && mb_strtolower((string) $user['email']) === $protegido) {
            throw HttpException::forbidden('A conta administradora do site não pode ser alterada por aqui.');
        }

        return $alvo;
    }

    /** Toda ação de gestão deixa rastro — inclusive de quem foi o alvo. */
    private function registrar(Request $request, string $evento, int $alvo): void
    {
        $this->audit->record(
            $evento,
            $request->userId(),
            $request->ip,
            $request->header('user-agent'),
            ['alvo' => $alvo],
        );
    }
}
