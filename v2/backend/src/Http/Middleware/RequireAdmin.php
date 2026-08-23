<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Core\Config;
use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Models\User;

/**
 * Acesso administrativo: exige papel de admin e, quando ADMIN_EMAIL está
 * definido, que seja aquela conta específica.
 *
 * A checagem de papel sozinha confia inteiramente numa coluna do banco. Isso
 * basta para o dia a dia, mas basta também para quem conseguir escrever nessa
 * coluna por qualquer caminho — uma injeção futura, um script mal escrito, um
 * dump restaurado errado. A segunda condição não vive no banco: está no .env do
 * servidor, e quem alterar a linha do usuário não alcança o arquivo.
 *
 * O e-mail vem do banco, e não das claims do token, de propósito. Assim a trava
 * vale contra o estado atual da conta — um token emitido antes de qualquer
 * mudança não carrega uma resposta velha.
 *
 * Sem ADMIN_EMAIL definido, o comportamento é o anterior: papel de admin basta.
 * É o que mantém a suíte de testes e um ambiente recém-clonado funcionando sem
 * configuração extra.
 */
final class RequireAdmin implements MiddlewareInterface
{
    public function __construct(private readonly User $users)
    {
    }

    public function handle(Request $request, callable $next): Response
    {
        $comPapel = new RequireRole('admin');

        return $comPapel->handle($request, function (Request $req) use ($next): Response {
            $esperado = mb_strtolower(trim((string) Config::get('ADMIN_EMAIL', '')));

            if ($esperado === '') {
                return $next($req);
            }

            $user = $this->users->findById((int) $req->attribute('user_id'));

            if ($user === null || mb_strtolower((string) $user['email']) !== $esperado) {
                throw HttpException::forbidden('Você não tem permissão para acessar este recurso.');
            }

            return $next($req);
        });
    }
}
