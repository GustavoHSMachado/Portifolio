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
 * definido, que a conta seja uma das nomeadas ali.
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
            $esperados = $this->enderecosAdministrativos();

            if ($esperados === []) {
                return $next($req);
            }

            $user = $this->users->findById((int) $req->attribute('user_id'));

            if ($user === null || !in_array(mb_strtolower((string) $user['email']), $esperados, true)) {
                throw HttpException::forbidden('Você não tem permissão para acessar este recurso.');
            }

            return $next($req);
        });
    }

    /**
     * A allowlist de endereços administrativos, em minúsculas.
     *
     * ADMIN_EMAIL aceita mais de um endereço, separados por vírgula. Em
     * produção é um só, e o comportamento é exatamente o de antes. A lista
     * existe porque o ambiente local precisa de um segundo endereço em domínio
     * reservado: o segundo fator do login vai por e-mail, e sem isso a área
     * administrativa não teria como ser exercitada pela suíte E2E — o código
     * sairia para uma caixa real em vez de cair no Mailpit.
     *
     * A propriedade que importa não muda: a lista vive no arquivo do servidor,
     * fora do alcance de quem escreva na coluna `role` do banco. Um endereço a
     * mais no arquivo continua sendo uma decisão de quem administra o servidor.
     *
     * @return list<string>
     */
    private function enderecosAdministrativos(): array
    {
        return array_values(array_map(
            static fn (string $email): string => mb_strtolower($email),
            Config::list('ADMIN_EMAIL'),
        ));
    }
}
