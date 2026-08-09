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
            'Se este e-mail estiver cadastrado, você receberá um link de redefinição em instantes.'
        );
    }

    public function resetPassword(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'token'    => 'required|hex|between:64,64',
            'password' => 'required|password|confirmed',
        ])->validated();

        $this->auth->resetPassword($data['token'], $data['password']);

        return Response::ok(null, 'Senha redefinida. Faça login com a nova senha.')
            ->withCookie(self::REFRESH_COOKIE, '', time() - 3600);
    }

    public function changePassword(Request $request): Response
    {
        $data = Validator::make($request->body, [
            'currentPassword' => 'required|max:128',
            'password'        => 'required|password|confirmed',
        ])->validated();

        $this->auth->changePassword(
            (int) $request->userId(),
            $data['currentPassword'],
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
