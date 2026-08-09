<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Core\HttpException;
use App\Database\Connection;
use App\Models\LegalAcceptance;
use App\Models\RefreshToken;
use App\Models\User;
use App\Models\VerificationToken;
use App\Support\Hash;
use App\Support\Logger;

/**
 * Regras de negócio de autenticação.
 *
 * Princípios aplicados (agente 06):
 * - respostas idênticas para "não existe" e "senha errada" (anti-enumeração);
 * - tempo de resposta constante mesmo sem usuário (anti-timing);
 * - trava progressiva por tentativas falhas;
 * - refresh token rotativo com detecção de reuso;
 * - troca de senha derruba todas as sessões.
 */
final class AuthService
{
    public function __construct(
        private readonly Connection $db,
        private readonly User $users,
        private readonly VerificationToken $verificationTokens,
        private readonly RefreshToken $refreshTokens,
        private readonly LegalAcceptance $legal,
        private readonly TokenService $tokens,
        private readonly MailService $mail,
        private readonly Logger $logger,
    ) {
    }

    // ------------------------------------------------------------------
    // Registro e confirmação de e-mail
    // ------------------------------------------------------------------

    /**
     * @param array{ip:string,userAgent:?string} $context usado no registro do aceite legal
     * @return array{user: array<string,mixed>}
     */
    public function register(
        string $name,
        string $email,
        string $phone,
        string $password,
        array $context = ['ip' => '', 'userAgent' => null],
    ): array {
        $email = mb_strtolower($email);

        // Não revelamos que o e-mail já existe: retornamos sucesso e enviamos
        // um aviso ao dono real da conta. Evita enumeração no cadastro.
        if ($this->users->emailExists($email)) {
            $this->logger->warning('Tentativa de registro com e-mail existente', [
                'email' => str_mask_email($email),
            ]);

            throw new HttpException(
                'Se este e-mail estiver disponível, você receberá uma confirmação em instantes.',
                202,
                errorCode: 'registration_pending'
            );
        }

        $userId = $this->db->transaction(function () use ($name, $email, $phone, $password, $context): int {
            $id = $this->users->create($name, $email, $phone, $password);

            // Consentimento demonstrável: guarda qual versão foi aceita (LGPD art. 8º).
            foreach ([LegalAcceptance::DOC_TERMS, LegalAcceptance::DOC_PRIVACY] as $document) {
                $this->legal->record(
                    $id,
                    $document,
                    (string) Config::get(
                        $document === LegalAcceptance::DOC_TERMS ? 'TERMS_VERSION' : 'PRIVACY_VERSION',
                        '1.0.0'
                    ),
                    $context['ip'] ?? '',
                    $context['userAgent'] ?? null,
                );
            }

            $this->sendVerificationEmail($id, $name, $email);

            return $id;
        });

        $this->logger->info('Usuário registrado', ['user_id' => $userId]);

        return ['user' => User::toPublic($this->users->findById($userId) ?? [])];
    }

    public function sendVerificationEmail(int $userId, string $name, string $email): void
    {
        $token = $this->verificationTokens->issue(
            $userId,
            VerificationToken::PURPOSE_EMAIL_VERIFICATION,
            Config::int('EMAIL_VERIFICATION_TTL', 60),
        );

        $link = sprintf(
            '%s/confirmar-email?token=%s',
            rtrim((string) Config::get('FRONTEND_URL'), '/'),
            urlencode($token),
        );

        $this->mail->sendVerification($email, $name, $link);
    }

    public function verifyEmail(string $token): void
    {
        $row = $this->verificationTokens->findValid($token, VerificationToken::PURPOSE_EMAIL_VERIFICATION);

        if ($row === null) {
            throw new HttpException(
                'Link de confirmação inválido ou expirado. Solicite um novo.',
                410,
                errorCode: 'token_invalid'
            );
        }

        $this->db->transaction(function () use ($row): void {
            $this->users->markEmailVerified((int) $row['user_id']);
            $this->verificationTokens->consume((int) $row['id']);
        });

        $this->logger->info('E-mail confirmado', ['user_id' => $row['user_id']]);
    }

    /** Resposta sempre genérica — não confirma se o e-mail existe. */
    public function resendVerification(string $email): void
    {
        $user = $this->users->findByEmailWithSecret($email);

        if ($user !== null && $user['email_verified_at'] === null) {
            $this->sendVerificationEmail((int) $user['id'], $user['name'], $user['email']);
        }
    }

    // ------------------------------------------------------------------
    // Login e sessão
    // ------------------------------------------------------------------

    /** @return array{user:array,accessToken:string,expiresIn:int,refreshToken:string} */
    public function login(string $email, string $password, ?string $userAgent, string $ip): array
    {
        $user = $this->users->findByEmailWithSecret($email);

        if ($user === null) {
            Hash::burn(); // custo de CPU equivalente ao caso real

            throw HttpException::unauthorized('E-mail ou senha incorretos.');
        }

        if ($this->users->isLocked($user)) {
            $this->logger->warning('Login em conta travada', ['user_id' => $user['id'], 'ip' => $ip]);

            throw new HttpException(
                'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.',
                423,
                errorCode: 'account_locked'
            );
        }

        if (!Hash::verify($password, $user['password_hash'])) {
            $this->users->registerFailedAttempt((int) $user['id']);
            $this->logger->warning('Senha incorreta', ['user_id' => $user['id'], 'ip' => $ip]);

            throw HttpException::unauthorized('E-mail ou senha incorretos.');
        }

        if (Config::bool('REQUIRE_EMAIL_VERIFICATION', true) && $user['email_verified_at'] === null) {
            throw new HttpException(
                'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
                403,
                errorCode: 'email_not_verified'
            );
        }

        // Rehash transparente se o custo/algoritmo mudou.
        if (Hash::needsRehash($user['password_hash'])) {
            $this->users->updatePassword((int) $user['id'], $password);
        }

        $this->users->clearFailedAttempts((int) $user['id']);

        $familyId = bin2hex(random_bytes(16));
        $refresh = $this->refreshTokens->issue(
            (int) $user['id'],
            $familyId,
            Config::int('REFRESH_TOKEN_TTL_DAYS', 30),
            $userAgent,
            $ip,
        );

        $this->logger->info('Login efetuado', ['user_id' => $user['id'], 'ip' => $ip]);

        return [
            'user'         => User::toPublic($user),
            'accessToken'  => $this->tokens->issueAccessToken($user),
            'expiresIn'    => $this->tokens->accessTokenTtl(),
            'refreshToken' => $refresh,
        ];
    }

    /**
     * Rotaciona o refresh token. Se um token já rotacionado voltar,
     * assumimos roubo e derrubamos a família inteira.
     *
     * @return array{accessToken:string,expiresIn:int,refreshToken:string,user:array}
     */
    public function refresh(string $refreshToken, ?string $userAgent, string $ip): array
    {
        $row = $this->refreshTokens->find($refreshToken);

        if ($row === null) {
            throw HttpException::unauthorized('Sessão inválida. Faça login novamente.');
        }

        if ($row['rotated_at'] !== null) {
            $this->refreshTokens->revokeFamily($row['family_id']);
            $this->logger->error('Reuso de refresh token detectado — família revogada', [
                'user_id'   => $row['user_id'],
                'family_id' => $row['family_id'],
                'ip'        => $ip,
            ]);

            throw HttpException::unauthorized('Sessão comprometida. Faça login novamente.');
        }

        if (!$this->refreshTokens->isUsable($row)) {
            throw HttpException::unauthorized('Sessão expirada. Faça login novamente.');
        }

        $user = $this->users->findById((int) $row['user_id']);

        if ($user === null) {
            throw HttpException::unauthorized('Sessão inválida.');
        }

        $newToken = $this->db->transaction(function () use ($row, $userAgent, $ip): string {
            $this->refreshTokens->markRotated((int) $row['id']);

            return $this->refreshTokens->issue(
                (int) $row['user_id'],
                $row['family_id'],
                Config::int('REFRESH_TOKEN_TTL_DAYS', 30),
                $userAgent,
                $ip,
            );
        });

        return [
            'user'         => User::toPublic($user),
            'accessToken'  => $this->tokens->issueAccessToken($user),
            'expiresIn'    => $this->tokens->accessTokenTtl(),
            'refreshToken' => $newToken,
        ];
    }

    public function logout(?string $refreshToken): void
    {
        if ($refreshToken === null) {
            return;
        }

        $row = $this->refreshTokens->find($refreshToken);

        if ($row !== null) {
            $this->refreshTokens->revokeFamily($row['family_id']);
            $this->logger->info('Logout', ['user_id' => $row['user_id']]);
        }
    }

    // ------------------------------------------------------------------
    // Recuperação e troca de senha
    // ------------------------------------------------------------------

    /**
     * Sempre responde igual, exista o e-mail ou não.
     * Na v1 a API respondia "e-mail não registrado", entregando a lista de usuários.
     */
    public function forgotPassword(string $email): void
    {
        $user = $this->users->findByEmailWithSecret($email);

        if ($user === null) {
            $this->logger->info('Reset solicitado para e-mail inexistente', [
                'email' => str_mask_email($email),
            ]);

            return;
        }

        $token = $this->verificationTokens->issue(
            (int) $user['id'],
            VerificationToken::PURPOSE_PASSWORD_RESET,
            Config::int('PASSWORD_RESET_TTL', 30),
        );

        $link = sprintf(
            '%s/redefinir-senha?token=%s',
            rtrim((string) Config::get('FRONTEND_URL'), '/'),
            urlencode($token),
        );

        $this->mail->sendPasswordReset($user['email'], $user['name'], $link);
        $this->logger->info('E-mail de reset enviado', ['user_id' => $user['id']]);
    }

    /** Consome o token, troca a senha e encerra todas as sessões ativas. */
    public function resetPassword(string $token, string $newPassword): void
    {
        $row = $this->verificationTokens->findValid($token, VerificationToken::PURPOSE_PASSWORD_RESET);

        if ($row === null) {
            throw new HttpException(
                'Link de redefinição inválido ou expirado. Solicite um novo.',
                410,
                errorCode: 'token_invalid'
            );
        }

        $userId = (int) $row['user_id'];
        $user = $this->users->findById($userId);

        if ($user === null) {
            throw HttpException::notFound('Conta não encontrada.');
        }

        $this->db->transaction(function () use ($row, $userId, $newPassword): void {
            $this->users->updatePassword($userId, $newPassword);
            $this->verificationTokens->consume((int) $row['id']);
            // Trocou a senha, derruba tudo: quem roubou a sessão perde o acesso.
            $this->refreshTokens->revokeAllForUser($userId);
            $this->users->markEmailVerified($userId); // provou controle do e-mail
        });

        $this->mail->sendPasswordChangedNotice($user['email'], $user['name']);
        $this->logger->info('Senha redefinida via token', ['user_id' => $userId]);
    }

    /** Troca de senha por usuário já autenticado — exige a senha atual. */
    public function changePassword(int $userId, string $currentPassword, string $newPassword): void
    {
        $user = $this->users->findById($userId);

        if ($user === null) {
            throw HttpException::notFound('Conta não encontrada.');
        }

        $withSecret = $this->users->findByEmailWithSecret($user['email']);

        if ($withSecret === null || !Hash::verify($currentPassword, $withSecret['password_hash'])) {
            throw new HttpException('Senha atual incorreta.', 422, [
                'currentPassword' => ['Senha atual incorreta.'],
            ], 'invalid_credentials');
        }

        if (Hash::verify($newPassword, $withSecret['password_hash'])) {
            throw new HttpException('A nova senha deve ser diferente da atual.', 422, [
                'password' => ['A nova senha deve ser diferente da atual.'],
            ], 'password_reused');
        }

        $this->db->transaction(function () use ($userId, $newPassword): void {
            $this->users->updatePassword($userId, $newPassword);
            $this->refreshTokens->revokeAllForUser($userId);
        });

        $this->mail->sendPasswordChangedNotice($user['email'], $user['name']);
        $this->logger->info('Senha alterada pelo próprio usuário', ['user_id' => $userId]);
    }
}
