<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Support\Logger;
use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

/**
 * Envio de e-mail transacional. Credenciais sempre do .env.
 * Falha de envio nunca quebra o fluxo do usuário — é logada e seguimos.
 */
final class MailService
{
    public function __construct(private readonly Logger $logger)
    {
    }

    public function sendVerification(string $to, string $name, string $link): bool
    {
        return $this->send(
            $to,
            'Confirme seu e-mail',
            $this->layout(
                'Confirme seu e-mail',
                "Olá, {$this->esc($name)}.",
                'Falta um passo para ativar sua conta. O link abaixo expira em '
                . Config::int('EMAIL_VERIFICATION_TTL', 60) . ' minutos.',
                $link,
                'Confirmar e-mail'
            )
        );
    }

    public function sendPasswordReset(string $to, string $name, string $link): bool
    {
        return $this->send(
            $to,
            'Redefinição de senha',
            $this->layout(
                'Redefinir senha',
                "Olá, {$this->esc($name)}.",
                'Recebemos um pedido para redefinir sua senha. O link abaixo expira em '
                . Config::int('PASSWORD_RESET_TTL', 30)
                . ' minutos e só pode ser usado uma vez. Se não foi você, ignore este e-mail — sua senha continua a mesma.',
                $link,
                'Criar nova senha'
            )
        );
    }

    /**
     * Avisa o dono que chegou mensagem pelo site.
     *
     * O conteúdo escrito por terceiro passa por esc() antes de entrar no HTML:
     * é texto de origem desconhecida indo para um documento, e sem escapar
     * bastaria alguém enviar marcação no corpo para que ela fosse interpretada
     * no cliente de e-mail de quem lê.
     */
    public function sendContactNotice(
        string $to,
        string $fromName,
        string $fromEmail,
        ?string $subject,
        string $body,
    ): bool {
        $assunto = $subject === null || trim($subject) === ''
            ? 'Sugestão, dúvida ou orçamento'
            : trim($subject);

        /*
         * O sufixo "- portifolio" entra no assunto para o e-mail ser
         * reconhecível e filtrável na caixa de entrada: quem recebe mensagem de
         * várias origens precisa saber de onde veio antes de abrir, e uma regra
         * de filtro por esse sufixo separa tudo o que chega pelo site.
         *
         * O assunto vem de quem escreveu, então passa por esc() como o resto —
         * cabeçalho de e-mail com conteúdo de terceiro é vetor de injeção de
         * cabeçalho, e o PHPMailer já recusa quebra de linha aqui.
         */
        return $this->send(
            $to,
            sprintf('%s - portifolio', $this->esc($assunto)),
            $this->layout(
                'Nova mensagem pelo site',
                sprintf('De %s (%s)', $this->esc($fromName), $this->esc($fromEmail)),
                sprintf(
                    'Assunto: %s<br><br>%s',
                    $this->esc($assunto),
                    nl2br($this->esc($body)),
                ),
                rtrim((string) Config::get('FRONTEND_URL'), '/') . '/admin',
                'Abrir o painel'
            )
        );
    }

    /** Código do segundo fator do login. */
    public function sendLoginCode(string $to, string $name, string $code, int $ttlMinutes): bool
    {
        return $this->send(
            $to,
            'Seu código de acesso',
            $this->codeLayout(
                'Seu código de acesso',
                "Olá, {$this->esc($name)}.",
                'Use o código abaixo para concluir a entrada. Ele expira em '
                . $ttlMinutes . ' minutos e só vale uma vez. Se não foi você que tentou entrar, '
                . 'ignore este e-mail e troque sua senha — alguém acertou a senha da sua conta.',
                $code
            )
        );
    }

    /** Código para redefinir a senha esquecida. */
    public function sendPasswordResetCode(string $to, string $name, string $code, int $ttlMinutes): bool
    {
        return $this->send(
            $to,
            'Código para redefinir sua senha',
            $this->codeLayout(
                'Redefinir senha',
                "Olá, {$this->esc($name)}.",
                'Recebemos um pedido para redefinir sua senha. Use o código abaixo, que expira em '
                . $ttlMinutes . ' minutos e só vale uma vez. Se não foi você, ignore este e-mail — '
                . 'sua senha continua a mesma.',
                $code
            )
        );
    }

    /** Código para confirmar a troca de senha de quem já está autenticado. */
    public function sendPasswordChangeCode(string $to, string $name, string $code, int $ttlMinutes): bool
    {
        return $this->send(
            $to,
            'Confirme a troca de senha',
            $this->codeLayout(
                'Confirme a troca de senha',
                "Olá, {$this->esc($name)}.",
                'Para concluir a troca de senha, informe o código abaixo na tela. Ele expira em '
                . $ttlMinutes . ' minutos. Se não foi você, ignore este e-mail e revise seus acessos.',
                $code
            )
        );
    }

    public function sendPasswordChangedNotice(string $to, string $name): bool
    {
        return $this->send(
            $to,
            'Sua senha foi alterada',
            $this->layout(
                'Senha alterada',
                "Olá, {$this->esc($name)}.",
                'A senha da sua conta acabou de ser alterada e todas as sessões ativas foram encerradas. '
                . 'Se não foi você, redefina a senha imediatamente e entre em contato.',
                Config::get('FRONTEND_URL', '') . '/recuperar-senha',
                'Não fui eu'
            )
        );
    }

    private function send(string $to, string $subject, string $html): bool
    {
        // Em dev, sem SMTP configurado, grava o e-mail em arquivo em vez de enviar.
        if (Config::get('MAIL_DRIVER', 'smtp') === 'log') {
            $path = base_path('storage/logs/mail-' . date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.html');
            file_put_contents($path, "<!-- Para: {$to} | Assunto: {$subject} -->\n" . $html);
            $this->logger->info('E-mail gravado em disco (MAIL_DRIVER=log)', ['file' => basename($path)]);

            return true;
        }

        /*
         * Endereço de domínio reservado nunca sai por SMTP autenticado.
         *
         * A suíte E2E cadastra contas em @portifolio.local e cada rodada gera
         * dezenas de mensagens. Contra o Mailpit isso é inofensivo — ele existe
         * para capturá-las. Contra um servidor de verdade, viram outras tantas
         * devoluções, e provedor nenhum tolera isso por muito tempo: a punição
         * é a reputação do remetente cair ou a conta ser suspensa.
         *
         * A condição é a autenticação, e não o nome do ambiente. Servidor de
         * captura local não pede usuário; quando há um configurado, do outro
         * lado existe alguém para se incomodar com a devolução. Assim a mesma
         * configuração serve local e produção, que é como o dono do projeto
         * pediu, sem que os testes cheguem a sair da máquina.
         *
         * Os domínios vêm das RFCs 2606 e 6761, que os reservam justamente para
         * teste e documentação: nenhum deles é entregável em lugar nenhum.
         */
        if ($this->isSmtpAutenticado() && $this->isDominioReservado($to)) {
            $this->logger->info('E-mail para domínio reservado não foi enviado', [
                'para'    => str_mask_email($to),
                'assunto' => $subject,
            ]);

            return true;
        }

        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->CharSet = PHPMailer::CHARSET_UTF8;
            $mail->Host = (string) Config::get('MAIL_HOST');
            $mail->Port = Config::int('MAIL_PORT', 587);
            $mail->Timeout = 10;

            // Servidores de captura locais (Mailpit, MailHog) não têm auth nem TLS.
            // Só habilitamos autenticação quando há credencial configurada.
            $username = (string) Config::get('MAIL_USERNAME', '');
            $encryption = (string) Config::get('MAIL_ENCRYPTION', 'tls');

            if ($username !== '') {
                $mail->SMTPAuth = true;
                $mail->Username = $username;
                $mail->Password = (string) Config::get('MAIL_PASSWORD', '');
            } else {
                $mail->SMTPAuth = false;
            }

            if ($encryption !== '') {
                $mail->SMTPSecure = $encryption;
            } else {
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            }

            $mail->setFrom(
                (string) Config::get('MAIL_FROM_ADDRESS'),
                (string) Config::get('MAIL_FROM_NAME', 'Portifólio')
            );
            $mail->addAddress($to);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = $html;
            $mail->AltBody = strip_tags(preg_replace('/<br\s*\/?>/i', "\n", $html) ?? '');

            return $mail->send();
        } catch (MailException) {
            // ErrorInfo pode conter host e usuário; nunca vai para o cliente.
            $this->logger->error('Falha no envio de e-mail', [
                'to'      => str_mask_email($to),
                'subject' => $subject,
                'error'   => $mail->ErrorInfo,
            ]);

            return false;
        }
    }

    /** Template inline — clientes de e-mail não carregam CSS externo de forma confiável. */
    private function layout(string $title, string $greeting, string $body, string $link, string $cta): string
    {
        $safeLink = $this->esc($link);

        return <<<HTML
        <!DOCTYPE html>
        <html lang="pt-BR"><head><meta charset="utf-8"><title>{$title}</title></head>
        <body style="margin:0;padding:32px 16px;background:#0b0b0f;font-family:'Open Sans',Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#14141b;border-radius:16px;overflow:hidden;">
            <tr><td style="padding:40px 40px 8px;">
              <h1 style="margin:0 0 24px;font-size:22px;line-height:1.3;color:#f5f5f7;font-weight:600;">{$title}</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#c9c9d1;">{$greeting}</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#9a9aa5;">{$body}</p>
              <a href="{$safeLink}" style="display:inline-block;padding:14px 28px;background:#e8503a;color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">{$cta}</a>
            </td></tr>
            <tr><td style="padding:24px 40px 40px;">
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b6b76;border-top:1px solid #26262f;padding-top:20px;">
                Se o botão não funcionar, copie e cole este endereço no navegador:<br>
                <span style="color:#8a8a95;word-break:break-all;">{$safeLink}</span>
              </p>
            </td></tr>
          </table>
        </body></html>
        HTML;
    }

    /**
     * Variante do layout para código digitado, sem botão.
     *
     * O código vai espaçado e em fonte monoespaçada porque será lido da tela e
     * digitado à mão: em fonte proporcional, 0 e O, 1 e l se confundem. Não há
     * link nenhum aqui — um e-mail de segundo fator que traz botão para clicar
     * ensina exatamente o hábito que o phishing explora.
     */
    private function codeLayout(string $title, string $greeting, string $body, string $code): string
    {
        $safeCode = $this->esc($code);

        return <<<HTML
        <!DOCTYPE html>
        <html lang="pt-BR"><head><meta charset="utf-8"><title>{$title}</title></head>
        <body style="margin:0;padding:32px 16px;background:#0b0b0f;font-family:'Open Sans',Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#14141b;border-radius:16px;overflow:hidden;">
            <tr><td style="padding:40px 40px 8px;">
              <h1 style="margin:0 0 24px;font-size:22px;line-height:1.3;color:#f5f5f7;font-weight:600;">{$title}</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#c9c9d1;">{$greeting}</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#9a9aa5;">{$body}</p>
              <p style="margin:0;padding:20px 24px;background:#08080c;border:1px solid #26262f;border-radius:12px;text-align:center;font-family:'Courier New',Courier,monospace;font-size:32px;letter-spacing:10px;color:#f5f5f7;font-weight:700;">{$safeCode}</p>
            </td></tr>
            <tr><td style="padding:24px 40px 40px;">
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b6b76;border-top:1px solid #26262f;padding-top:20px;">
                Ninguém da nossa parte vai pedir este código por telefone, mensagem ou e-mail.
              </p>
            </td></tr>
          </table>
        </body></html>
        HTML;
    }

    /** Há credencial de SMTP configurada? Servidor de captura local não pede. */
    private function isSmtpAutenticado(): bool
    {
        return trim((string) Config::get('MAIL_USERNAME', '')) !== '';
    }

    /**
     * O endereço é de um domínio reservado para teste?
     *
     * RFC 2606 e RFC 6761. Nenhum deles resolve na internet: uma mensagem para
     * lá só pode virar devolução.
     */
    private function isDominioReservado(string $email): bool
    {
        $arroba = strrchr($email, '@');

        if ($arroba === false) {
            return false;
        }

        $dominio = mb_strtolower(substr($arroba, 1));

        foreach (['.local', '.localhost', '.test', '.invalid', '.example'] as $sufixo) {
            if (str_ends_with($dominio, $sufixo)) {
                return true;
            }
        }

        return in_array($dominio, ['example.com', 'example.net', 'example.org'], true);
    }

    private function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}
