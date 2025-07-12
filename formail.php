<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require 'vendor/phpmailer/phpmailer/src/Exception.php';
require 'vendor/phpmailer/phpmailer/src/PHPMailer.php';
require 'vendor/phpmailer/phpmailer/src/SMTP.php';

require 'vendor/autoload.php';

// Inclua o arquivo de conexão com o banco de dados
require 'conexao.php';

// Verifica se o formulário foi enviado
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Obtém o endereço de e-mail do formulário
    $email = $_POST['email'];
    
    // Inicializa a variável de erro e status
    $erro = "";
    $status = true;
    
    // Verifica se o e-mail está vazio
    if (empty($email)) {
        $erro = "O e-mail está vazio.<br />";
        $status = false;
    } else {
        // Verifica se o formato do e-mail é válido
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $erro = "O e-mail inserido não é válido.<br />";
            $status = false;
        } else {
            // Verifica se o e-mail existe no banco de dados
            $query = "SELECT * FROM CADASTRO WHERE email = '$email'";
            $result = $conn->query($query);

            if ($result->num_rows == 0) {
                // O e-mail não foi encontrado no banco de dados
                $erro = "O e-mail fornecido não está registrado.<br />";
                $status = false;
            }
        }
    }
    
    // Se todas as verificações passarem, envia o e-mail usando o PHPMailer
    if ($status) {
        try {
            // Configurações do e-mail já foram feitas em configEmail.php
            // Criando um novo objeto PHPMailer
            $mail = new PHPMailer(true); // Passando 'true' para ativar exceções

            $mail -> isSMTP();
            $mail -> Host = 'smtp.gmail.com';
            $mail -> SMTPAuth = true;
            $mail -> Username = 'gustavo.hsmachado@gmail.com';
            $mail -> Password = 'rgom qlrs hzrs sftp';
            $mail -> SMTPSecure = 'tls';
            $mail -> Port = 587;
            
            // Configurações do e-mail
            $mail->setFrom('gustavo.hsmachado@gmail.com', 'Gustavo');
            $mail->addAddress($email); // Adiciona o endereço de e-mail do destinatário
            $mail->Subject = 'Recuperar Senha';
            $linkResetPassword = 'http://127.0.0.1/site/resetPassword.php?email='.$email;
            $mail->Body = 'Olá, use o link para criar uma nova senha: <a href="' . $linkResetPassword . '">Clique aqui</a>';
            $mail->isHTML(true);
            
            // Envia o e-mail
            $mail->send();
            
            echo "E-mail enviado com sucesso!";
            die();

            /*header("Location: login.php");
            exit;*/

        } catch (Exception $e) {
            echo "Falha ao enviar o e-mail: {$mail->ErrorInfo}";
        }
    } else {
        // Exibe mensagens de erro
        echo $erro;
    }
}
?>
