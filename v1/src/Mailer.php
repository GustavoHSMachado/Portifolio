<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

/**
 * Envio de e-mail com credenciais vindas do .env.
 * Antes: senha de aplicativo do Gmail hardcoded em configEmail.php e formail.php.
 */
final class Mailer
{
    public static function send(string $to, string $subject, string $htmlBody, string $altBody = ''): bool
    {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->CharSet    = 'UTF-8';
            $mail->Host       = Env::get('MAIL_HOST', 'smtp.gmail.com');
            $mail->SMTPAuth   = true;
            $mail->Username   = (string) Env::get('MAIL_USER', '');
            $mail->Password   = (string) Env::get('MAIL_PASS', '');
            $mail->SMTPSecure = Env::get('MAIL_ENCRYPTION', 'tls');
            $mail->Port       = (int) Env::get('MAIL_PORT', '587');

            $mail->setFrom(
                (string) Env::get('MAIL_FROM', (string) Env::get('MAIL_USER', '')),
                (string) Env::get('MAIL_FROM_NAME', 'Portifolio')
            );
            $mail->addAddress($to);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body    = $htmlBody;
            $mail->AltBody = $altBody !== '' ? $altBody : strip_tags($htmlBody);

            return $mail->send();
        } catch (MailException $e) {
            // Nunca expor detalhes do SMTP ao usuário final (agente 10 - observabilidade).
            error_log('[MAIL] Falha ao enviar para ' . $to . ': ' . $mail->ErrorInfo);
            return false;
        }
    }
}
