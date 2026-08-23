<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Config;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Services\AuthService;
use App\Support\Validator;

/**
 * Controllers são finos: validam a entrada, delegam ao Service e formatam a saída.
 * Nenhuma regra de negócio e nenhuma query moram aqui.
 */
final class AuthController
{
    private const REFRESH_COOKIE = 'portifolio_refresh';

    public function __construct(private readonly AuthService $auth)
    {
    }

    public function register(Request $request): Response
    {
        /*
         * Cadastro público aberto por padrão desde 23/08/2026.
         *
         * Ele foi fechado por um dia, quando a única conta necessária era a do
         * dono. Os projetos passaram a exigir sessão para serem lidos, e a porta
         * teve de reabrir: sem cadastro, ninguém além do dono veria trabalho
         * nenhum — nem quem o site existe para convencer.
         *
         * A troca é consciente e cobra um preço: o site volta a guardar nome,
         * e-mail, telefone e IP de terceiros, o que é dado pessoal sob a LGPD.
         * O aceite versionado dos termos (legal_acceptances) e o expurgo
         * agendado existem justamente para esse caso.
         *
         * A chave continua no código para poder fechar de novo sem deploy.
         */
        if (!Config::bool('REGISTRATION_ENABLED', true)) {
            throw new HttpException(
                'O cadastro está fechado neste site.',
                403,
                errorCode: 'registration_closed'
            );
        }

        $data = Validator::make($request->body, [
            'name'     => 'required|min:3|max:120',
            'email'    => 'required|email|max:190',
            'phone'    => 'required|digits|between:10,13',
            'password' => 'required|password|confirmed',
        ])->validated();

        // Aceite obrigatório e explícito — nunca pré-marcado no front.
        if ($request->input('acceptedTerms') !== true) {
            throw HttpException::validation([
                'acceptedTerms' => ['É necessário aceitar os Termos de Uso e a Política de Privacidade.'],
            ]);
        }

        $result = $this->auth->register(
            $data['name'],
            $data['email'],
            $data['phone'],
            $data['password'],
            ['ip' => $request->ip, 'userAgent' => $request->header('user-agent')],
        );

        return Response::created(
            $result,
            'Conta criada. Enviamos um link de confirmação para o seu e-mail.'
        );
    }

    public function verifyEmail(Request $request): Response
    {
        $data = Validator::make($request->body + $request->query, [
            'token' => 'required|hex|between:64,64',
        ])->validated();

        $this->auth->verifyEmail($data['token']);

        return Response::ok(null, 'E-mail confirmado com sucesso. Você já pode entrar.');
    }

    public function resendVerification(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'email' => 'required|email|max:190',
        ])->validated();

        $this->auth->resendVerification($data['email']);

        return Response::ok(null, 'Se a conta existir e ainda não estiver confirmada, um novo link foi enviado.');
    }

    public function login(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'email'    => 'required|email|max:190',
            'password' => 'required|max:128',
        ])->validated();

        $result = $this->auth->login(
            $data['email'],
            $data['password'],
            $request->header('user-agent'),
            $request->ip,
        );

        // Nenhum token aqui: a sessão só nasce no segundo passo.
        return Response::ok($result, 'Enviamos um código para o seu e-mail.');
    }

    /** Segundo passo do login: o código recebido por e-mail. */
    public function verifyLoginCode(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'email' => 'required|email|max:190',
            'code'  => 'required|digits:7',
        ])->validated();

        $result = $this->auth->verifyLoginCode(
            $data['email'],
            $data['code'],
            $request->header('user-agent'),
            $request->ip,
        );

        return $this->withRefreshCookie(
            Response::ok([
                'user'        => $result['user'],
                'accessToken' => $result['accessToken'],
                'expiresIn'   => $result['expiresIn'],
            ], 'Login realizado.'),
            $result['refreshToken'],
        );
    }

    public function refresh(Request $request): Response
    {
        // Cookie httpOnly é a fonte principal; o body é fallback para clientes nativos.
        $token = $request->cookie(self::REFRESH_COOKIE) ?? $request->string('refreshToken');

        $result = $this->auth->refresh($token, $request->header('user-agent'), $request->ip);

        return $this->withRefreshCookie(
            Response::ok([
                'user'        => $result['user'],
                'accessToken' => $result['accessToken'],
                'expiresIn'   => $result['expiresIn'],
            ]),
            $result['refreshToken'],
        );
    }

    public function logout(Request $request): Response
    {
        $this->auth->logout($request->cookie(self::REFRESH_COOKIE) ?? $request->string('refreshToken'));

        return Response::ok(null, 'Sessão encerrada.')
            ->withCookie(self::REFRESH_COOKIE, '', time() - 3600);
    }

    public function forgotPassword(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'email' => 'required|email|max:190',
        ])->validated();

        $this->auth->forgotPassword($data['email']);

        // Sempre 200 com a mesma mensagem — não revela se o e-mail existe.
        return Response::ok(
            null,
            'Se este e-mail estiver cadastrado, você receberá um código de redefinição em instantes.'
        );
    }

    public function resetPassword(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'email'    => 'required|email|max:190',
            'code'     => 'required|digits:7',
            'password' => 'required|password|confirmed',
        ])->validated();

        $this->auth->resetPassword($data['email'], $data['code'], $data['password']);

        return Response::ok(null, 'Senha redefinida. Faça login com a nova senha.')
            ->withCookie(self::REFRESH_COOKIE, '', time() - 3600);
    }

    /** Primeiro passo da troca de senha: confere a atual e dispara o código. */
    public function requestPasswordChange(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'currentPassword' => 'required|max:128',
        ])->validated();

        $expiresIn = $this->auth->requestPasswordChange(
            (int) $request->userId(),
            $data['currentPassword'],
        );

        return Response::ok(
            ['challenge' => 'password_change', 'expiresIn' => $expiresIn],
            'Enviamos um código para o seu e-mail.'
        );
    }

    public function changePassword(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'code'     => 'required|digits:7',
            'password' => 'required|password|confirmed',
        ])->validated();

        $this->auth->changePassword(
            (int) $request->userId(),
            $data['code'],
            $data['password'],
        );

        return Response::ok(null, 'Senha alterada. Entre novamente com a nova senha.')
            ->withCookie(self::REFRESH_COOKIE, '', time() - 3600);
    }

    private function withRefreshCookie(Response $response, string $token): Response
    {
        return $response->withCookie(
            self::REFRESH_COOKIE,
            $token,
            time() + Config::int('REFRESH_TOKEN_TTL_DAYS', 30) * 86400,
            httpOnly: true,
            sameSite: Config::get('APP_ENV') === 'local' ? 'Lax' : 'Strict',
        );
    }
}
