<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Config;
use App\Core\Request;
use App\Core\Response;
use App\Models\Message;
use App\Services\MailService;
use App\Support\Logger;
use App\Support\Validator;

/**
 * Recebe sugestões e dúvidas do formulário público.
 *
 * Um formulário aberto na internet recebe robô no primeiro dia. Três barreiras,
 * cada uma cobrindo o que a outra deixa passar:
 *
 *   - rate limit por IP, no middleware, que limita o volume;
 *   - campo-armadilha, invisível para gente e irresistível para robô que
 *     preenche tudo o que encontra;
 *   - tamanho mínimo de mensagem, que descarta o "oi" de teste automatizado.
 *
 * Nenhuma delas para um humano determinado, e não precisam: o objetivo é o
 * volume automatizado, não o visitante mal-intencionado — para esse, o que vale
 * é o dono poder apagar e bloquear depois.
 */
final class MessageController
{
    public function __construct(
        private readonly Message $messages,
        private readonly MailService $mail,
        private readonly Logger $logger,
    ) {
    }

    public function store(Request $request): Response
    {
        /*
         * O campo-armadilha se chama "website" porque é um nome que preenchedor
         * automático de formulário reconhece. Gente nunca o vê: ele fica fora da
         * tela e marcado como escondido para leitores de tela.
         *
         * A resposta a um robô é a mesma de sucesso, de propósito. Dizer "você
         * parece um robô" ensina quem está do outro lado exatamente o que
         * ajustar na próxima tentativa.
         */
        if (trim((string) $request->string('website')) !== '') {
            $this->logger->info('Mensagem descartada pelo campo-armadilha', ['ip' => $request->ip]);

            return Response::ok(null, 'Mensagem enviada. Obrigado pelo contato!');
        }

        $data = Validator::make($request->body, [
            'name'    => 'required|min:2|max:120',
            'email'   => 'required|email|max:190',
            'subject' => 'max:150',
            'body'    => 'required|min:20|max:5000',
        ])->validated();

        $id = $this->messages->create(
            $data['name'],
            $data['email'],
            $data['subject'] ?? null,
            $data['body'],
            $request->ip,
            $request->header('user-agent'),
        );

        $this->logger->info('Mensagem recebida', ['message_id' => $id]);

        /*
         * A notificação sai depois de gravar, e a falha dela nao desfaz o
         * recebimento: a mensagem ja esta no banco e aparece no painel. Perder
         * o e-mail de aviso e um incomodo; perder a mensagem de quem escreveu e
         * um defeito.
         */
        $destino = (string) Config::get('ADMIN_EMAIL', '');

        if ($destino !== '') {
            try {
                $this->mail->sendContactNotice(
                    $destino,
                    $data['name'],
                    $data['email'],
                    $data['subject'] ?? null,
                    $data['body'],
                );
            } catch (\Throwable $e) {
                $this->logger->error('Falha ao notificar mensagem nova', [
                    'message_id' => $id,
                    'erro'       => $e->getMessage(),
                ]);
            }
        }

        return Response::ok(null, 'Mensagem enviada. Obrigado pelo contato!');
    }

    /** Caixa de entrada do painel administrativo. */
    public function index(Request $request): Response
    {
        return Response::ok(['messages' => $this->messages->recent()]);
    }

    public function markRead(Request $request): Response
    {
        $this->messages->markRead((int) $request->attribute('id'));

        return Response::ok(null, 'Mensagem marcada como lida.');
    }
}
