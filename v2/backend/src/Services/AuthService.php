<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Core\HttpException;
use App\Database\Connection;
use App\Models\LegalAcceptance;
use App\Models\PasswordHistory;
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
        private readonly PasswordHistory $passwordHistory,
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

        $result = $this->db->transaction(function () use ($name, $email, $phone, $password, $context): array {
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

            // A primeira senha também entra no histórico: é ela que "senha
            // repetida" precisa reconhecer na primeira troca.
            $this->passwordHistory->recordCurrent($id);

            return ['id' => $id, 'token' => $this->issueVerificationToken($id)];
        });

        $userId = $result['id'];

        /*
         * O e-mail sai depois do commit, de propósito.
         *
         * Dentro da transação ele criava dois problemas. O SMTP é rede: uma entrega
         * lenta segurava a transação aberta, com as linhas travadas, pelo tempo que
         * o servidor de e-mail levasse. E a mensagem carrega um link para um token
         * que só passa a existir no commit — quem clicasse rápido demais podia
         * receber "link inválido" para um token legítimo.
         *
         * A contrapartida é que uma falha no envio agora deixa a conta criada sem
         * e-mail entregue. É o lado certo para errar: a pessoa pede o reenvio pela
         * tela, enquanto o caminho anterior desfazia um cadastro que já era válido.
         * É o mesmo desenho de resetPassword e changePassword.
         */
        $this->mail->sendVerification($email, $name, $this->verificationLink($result['token']));

        $this->logger->info('Usuário registrado', ['user_id' => $userId]);

        return ['user' => User::toPublic($this->users->findById($userId) ?? [])];
    }

    /** Reenvio: emite um token novo e entrega na hora, fora de qualquer transação. */
    public function sendVerificationEmail(int $userId, string $name, string $email): void
    {
        $link = $this->verificationLink($this->issueVerificationToken($userId));

        $this->mail->sendVerification($email, $name, $link);
    }

    /** Só grava o token. Separado do envio para poder rodar dentro da transação. */
    private function issueVerificationToken(int $userId): string
    {
        return $this->verificationTokens->issue(
            $userId,
            VerificationToken::PURPOSE_EMAIL_VERIFICATION,
            Config::int('EMAIL_VERIFICATION_TTL', 60),
        );
    }

    private function verificationLink(string $token): string
    {
        return sprintf(
            '%s/confirmar-email?token=%s',
            rtrim((string) Config::get('FRONTEND_URL'), '/'),
            urlencode($token),
        );
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

    /**
     * Primeiro passo do login: confere a senha e envia o código do segundo fator.
     *
     * Nenhum token de sessão sai daqui. Senha correta apenas habilita o segundo
     * passo — quem descobrir a senha ainda precisa da caixa de entrada.
     *
     * @return array{challenge: string, expiresIn: int}
     */
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

        $ttl  = Config::int('LOGIN_2FA_TTL', 10);
        $code = $this->verificationTokens->issueCode(
            (int) $user['id'],
            VerificationToken::PURPOSE_LOGIN_2FA,
            $ttl,
        );

        $this->mail->sendLoginCode($user['email'], $user['name'], $code, $ttl);

        $this->logger->info('Senha conferida, código de acesso enviado', [
            'user_id' => $user['id'],
            'ip'      => $ip,
        ]);

        return [
            'challenge' => 'login_2fa',
            'expiresIn' => $ttl * 60,
        ];
    }

    /**
     * Segundo passo do login: valida o código e abre a sessão.
     *
     * A resposta é a mesma para código errado, expirado ou inexistente. Separar
     * os casos contaria a quem está tentando se aquela conta tem um código em
     * aberto — e, portanto, se a senha que ele usou no primeiro passo estava
     * certa.
     *
     * @return array{user: array<string, mixed>, accessToken: string, expiresIn: int, refreshToken: string}
     */
    public function verifyLoginCode(
        string $email,
        string $code,
        ?string $userAgent,
        string $ip,
    ): array {
        $user = $this->users->findByEmailWithSecret($email);

        if ($user === null) {
            throw HttpException::unauthorized('Código inválido ou expirado. Entre novamente.');
        }

        $row = $this->verificationTokens->findValidCode(
            (int) $user['id'],
            $code,
            VerificationToken::PURPOSE_LOGIN_2FA,
        );

        if ($row === null) {
            $this->logger->warning('Código de acesso recusado', [
                'user_id' => $user['id'],
                'ip'      => $ip,
            ]);

            throw HttpException::unauthorized('Código inválido ou expirado. Entre novamente.');
        }

        $familyId = bin2hex(random_bytes(16));

        $refresh = $this->db->transaction(function () use ($row, $user, $familyId, $userAgent, $ip): string {
            $this->verificationTokens->consume((int) $row['id']);

            return $this->refreshTokens->issue(
                (int) $user['id'],
                $familyId,
                Config::int('REFRESH_TOKEN_TTL_DAYS', 30),
                $userAgent,
                $ip,
            );
        });

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
     * @return array{accessToken: string, expiresIn: int, refreshToken: string, user: array<string, mixed>}
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

        $ttl  = Config::int('PASSWORD_RESET_TTL', 15);
        $code = $this->verificationTokens->issueCode(
            (int) $user['id'],
            VerificationToken::PURPOSE_PASSWORD_RESET,
            $ttl,
        );

        $this->mail->sendPasswordResetCode($user['email'], $user['name'], $code, $ttl);
        $this->logger->info('Código de reset enviado', ['user_id' => $user['id']]);
    }

    /** Consome o código, troca a senha e encerra todas as sessões ativas. */
    public function resetPassword(string $email, string $code, string $newPassword): void
    {
        $user = $this->users->findByEmailWithSecret($email);

        $row = $user === null
            ? null
            : $this->verificationTokens->findValidCode(
                (int) $user['id'],
                $code,
                VerificationToken::PURPOSE_PASSWORD_RESET,
            );

        if ($user === null || $row === null) {
            throw new HttpException(
                'Código inválido ou expirado. Solicite um novo.',
                410,
                errorCode: 'token_invalid'
            );
        }

        $userId = (int) $user['id'];

        $this->guardPasswordReuse($userId, $newPassword);

        $this->db->transaction(function () use ($row, $userId, $newPassword): void {
            $this->users->updatePassword($userId, $newPassword);
            $this->passwordHistory->recordCurrent($userId);
            $this->verificationTokens->consume((int) $row['id']);
            // Trocou a senha, derruba tudo: quem roubou a sessão perde o acesso.
            $this->refreshTokens->revokeAllForUser($userId);
            $this->users->markEmailVerified($userId); // provou controle do e-mail
        });

        $this->mail->sendPasswordChangedNotice($user['email'], $user['name']);
        $this->logger->info('Senha redefinida via token', ['user_id' => $userId]);
    }

    /**
     * Recusa uma senha que a conta já usou.
     *
     * Vale para a troca e para a recuperação, e cobre também a senha em vigor,
     * que está no histórico. O 422 sai antes de qualquer escrita: a pessoa
     * corrige e tenta de novo sem que o código de confirmação seja consumido.
     */
    private function guardPasswordReuse(int $userId, string $newPassword): void
    {
        if (!$this->passwordHistory->wasUsed($userId, $newPassword)) {
            return;
        }

        $mensagem = sprintf(
            'Esta senha já foi usada nesta conta. Escolha uma diferente das últimas %d.',
            $this->passwordHistory->size(),
        );

        throw new HttpException($mensagem, 422, [
            'password' => [$mensagem],
        ], 'password_reused');
    }

    /**
     * Primeiro passo da troca de senha: confere a senha atual e envia o código.
     *
     * O propósito reaproveitado é o password_reset, e não um terceiro valor no
     * enum: os dois fluxos provam a mesma coisa — controle da caixa de entrada
     * antes de mudar a senha. A consequência é que pedir "esqueci a senha" e
     * "trocar senha" ao mesmo tempo deixa valendo só o código mais recente, o
     * que é o comportamento razoável de qualquer forma.
     */
    public function requestPasswordChange(int $userId, string $currentPassword): int
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

        $ttl  = Config::int('PASSWORD_RESET_TTL', 15);
        $code = $this->verificationTokens->issueCode(
            $userId,
            VerificationToken::PURPOSE_PASSWORD_RESET,
            $ttl,
        );

        $this->mail->sendPasswordChangeCode($user['email'], $user['name'], $code, $ttl);
        $this->logger->info('Código de troca de senha enviado', ['user_id' => $userId]);

        return $ttl * 60;
    }

    /** Segundo passo: valida o código e aplica a senha nova. */
    public function changePassword(int $userId, string $code, string $newPassword): void
    {
        $user = $this->users->findById($userId);

        if ($user === null) {
            throw HttpException::notFound('Conta não encontrada.');
        }

        $withSecret = $this->users->findByEmailWithSecret($user['email']);

        if ($withSecret === null) {
            throw HttpException::notFound('Conta não encontrada.');
        }

        $row = $this->verificationTokens->findValidCode(
            $userId,
            $code,
            VerificationToken::PURPOSE_PASSWORD_RESET,
        );

        if ($row === null) {
            throw new HttpException(
                'Código inválido ou expirado. Peça um novo.',
                410,
                errorCode: 'token_invalid'
            );
        }

        $this->guardPasswordReuse($userId, $newPassword);

        $this->db->transaction(function () use ($row, $userId, $newPassword): void {
            $this->users->updatePassword($userId, $newPassword);
            $this->passwordHistory->recordCurrent($userId);
            $this->verificationTokens->consume((int) $row['id']);
            $this->refreshTokens->revokeAllForUser($userId);
        });

        $this->mail->sendPasswordChangedNotice($user['email'], $user['name']);
        $this->logger->info('Senha alterada pelo próprio usuário', ['user_id' => $userId]);
    }
}
