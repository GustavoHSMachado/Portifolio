<?php
include 'conexao.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'];
    $novaSenha = $_POST['newSenha'];
    $confirmNovaSenha = $_POST['confirmNewSenha'];

    
    // Verifica se as senhas coincidem
    if ($novaSenha === $confirmNovaSenha) {

        // Atualiza a senha no banco de dados usando prepared statements para prevenir SQL Injection
        $stmt = $conn->prepare("UPDATE CADASTRO SET senha = ? WHERE email = ?");
        $stmt->bind_param("ss", $novaSenha, $email);

        if ($stmt->execute()) {
            echo "Senha alterada com sucesso.";

            // Redirecionamento para a página de login
            header("Location: login.php");
            exit; // Termina o script após redirecionar
            
        } else {
            echo "Erro ao alterar a senha.";
        }

        // Fecha a instrução
        $stmt->close();
    } else {
        echo "As senhas não coincidem. Por favor, tente novamente.";
    }
}

// Fecha a conexão com o banco de dados
$conn->close();
?>