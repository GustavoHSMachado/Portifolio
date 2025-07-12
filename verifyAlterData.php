<?php
session_start();

if (!isset($_SESSION["username"]) || empty($_SESSION["username"])) {
    // Redirecionar o usuário para a página de login se não houver nome de usuário na sessão
    header("Location: login.php");
    exit(); // Terminar o script para evitar execução adicional
}

include 'conexao.php';

// Verificar se o método da requisição é POST
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $name = $_POST["name"];
    $tel = $_POST["tel"];
    $password = $_POST["password"];
    $username = $_SESSION["username"]; // Obter o nome de usuário da sessão

    // Verificar se o telefone contém apenas números
    if (!is_numeric($tel)) {
        $_SESSION["error_message"] = "O campo Telefone deve conter apenas números.";
        header("Location: alterError.php");
        exit();
    }

    // Preparar a consulta SQL para atualizar os dados do usuário
    $updateStmt = $conn->prepare("UPDATE CADASTRO SET nome = ?, tel = ?, senha = ? WHERE login = ?");
    $updateStmt->bind_param("ssss", $name, $tel, $password, $username);

    // Executar a consulta SQL
    if ($updateStmt->execute()) {
        // Redirecionar para a página do usuário após a atualização bem-sucedida
        header("Location: pageUser.php");
        exit(); // Terminar o script após o redirecionamento
    } else {
        // Se houver erro na execução da consulta, exibir mensagem de erro e redirecionar para a página de erro
        $_SESSION["error_message"] = "Erro ao Alterar dados do usuário.";
        header("Location: alterError.php");
        exit(); // Terminar o script após o redirecionamento
    }

    // Fechar a instrução preparada e a conexão com o banco de dados
    $updateStmt->close();
    $conn->close();
} else {
    // Se o método da requisição não for POST, redirecionar para a página de erro
    $_SESSION["error_message"] = "Método de requisição inválido.";
    header("Location: alterError.php");
    exit(); // Terminar o script após o redirecionamento
}
?>