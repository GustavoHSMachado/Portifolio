<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\HttpException;
use App\Core\Request;
use App\Core\Response;
use App\Models\AuditLog;
use App\Models\SiteSettings;

/**
 * Aparência e textos da home, editáveis pelo painel.
 *
 * A validação aqui é mais estrita do que a dos outros campos do painel, e o
 * motivo é a cor: ela termina dentro de uma folha de estilo, o que faz dela o
 * único valor editável que o navegador executa em vez de apenas exibir. Texto
 * mal preenchido deixa a home feia; CSS mal preenchido deixa a home enganosa —
 * dá para reposicionar elementos sobre a tela e montar um clique falso.
 *
 * Por isso a cor passa por uma regra de forma única (#rrggbb) e os textos por
 * limite de tamanho, com as chaves restritas à allowlist do SiteSettings.
 */
final class SettingsController
{
    public function __construct(
        private readonly SiteSettings $settings,
        private readonly AuditLog $audit,
    ) {
    }

    /** O conjunto completo, com os padrões preenchendo o que não foi salvo. */
    public function index(Request $request): Response
    {
        return Response::ok(['settings' => $this->settings->all()]);
    }

    public function update(Request $request): Response
    {
        $erros = [];
        $valores = [];

        // Percorre a allowlist, e não o que veio: chave desconhecida não chega
        // a ser lida, então o corpo da requisição não decide o que existe.
        foreach (SiteSettings::PADROES as $chave => $_padrao) {
            $valor = $request->input($chave);

            if ($valor === null) {
                continue; // não veio nesta requisição — mantém o que está salvo
            }

            if (!is_string($valor)) {
                $erros[$chave][] = 'Valor inválido.';
                continue;
            }

            $valor = trim($valor);

            if ($chave === SiteSettings::COR_DESTAQUE) {
                // Vazio aqui significa "volte ao padrão", e não cor inválida.
                if ($valor !== '' && !SiteSettings::corValida($valor)) {
                    $erros[$chave][] = 'Use uma cor no formato #rrggbb, como #5aa9ff.';
                    continue;
                }
            } elseif (mb_strlen($valor) > SiteSettings::TAMANHO_MAXIMO) {
                $erros[$chave][] = sprintf(
                    'Use no máximo %d caracteres.',
                    SiteSettings::TAMANHO_MAXIMO
                );
                continue;
            }

            $valores[$chave] = $valor;
        }

        if ($erros !== []) {
            throw HttpException::validation($erros);
        }

        if ($valores === []) {
            throw HttpException::validation([
                'settings' => ['Nenhum ajuste conhecido foi enviado.'],
            ]);
        }

        $tocadas = $this->settings->save($valores);

        $this->audit->record(
            AuditLog::AJUSTES_SALVOS,
            $request->userId(),
            $request->ip,
            $request->header('user-agent'),
            ['chaves' => $tocadas],
        );

        return Response::ok(
            ['settings' => $this->settings->all()],
            'Ajustes salvos.'
        );
    }
}
