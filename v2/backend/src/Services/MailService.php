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

    private function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}
