<?php

    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\SMTP;
    use PHPMailer\PHPMailer\Exception;

    require 'vendor/phpmailer/phpmailer/src/Exception.php';
    require 'vendor/phpmailer/phpmailer/src/PHPMailer.php';
    require 'vendor/phpmailer/phpmailer/src/SMTP.php';

    // Configurações do servidor de e-mail
    $mail = new PHPMailer(true); // Passando 'true' para ativar exceções

    $mail -> isSMTP();
    $mail -> Host = 'smtp.gmail.com';
    $mail -> SMTPAuth = true;
    $mail -> Username = 'gustavo.hsmachado@gmail.com';
    $mail -> Password = 'rgom qlrs hzrs sftp';
    $mail -> SMTPSecure = 'tls';
    $mail -> Port = 587;

    // Configurações do e-mail
    $mail -> setFrom('gustavo.hsmachado@gmail.com', 'Gustavo');
    $mail->addAddress('destinatario@example.com', 'Nome do Destinatário');
    $mail->Subject = 'Assunto do E-mail';
    $mail->Body = 'Conteúdo do E-mail em HTML';
    $mail->AltBody = 'Conteúdo do E-mail em texto sem formatação';
    $mail -> isHTML(true);



?>