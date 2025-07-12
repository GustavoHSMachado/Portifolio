<?php

    session_start();
    
    include 'conexao.php';

    if ($_SERVER["REQUEST_METHOD"] == "POST") {

        $name = $_POST["name"];
        $tel = $_POST["tel"];
        $email = $_POST["email"];
        $username = $_POST["username"];
        $password = $_POST["password"];

        if (!is_numeric($tel)) {
            $_SESSION["error_message"] = "O campo Telefone deve conter apenas números.";
            header("Location: registerError.php");
            exit();
        }

        //Aqui está vereificando se já exixte o usuario
        $checkUserStmt = $conn -> prepare("SELECT id FROM CADASTRO WHERE login = ?");
        $checkUserStmt -> bind_param("s", $username);
        $checkUserStmt -> execute();
        $checkUserStmt -> store_result();

        if ($checkUSerStmt -> num_rows > 0) {

            $_SESSION["error_message"] = "Usuário já cadastrado.";
            header("Location: registerError.php");
            exit();

        }

        $insertStmt = $conn -> prepare("INSERT INTO CADASTRO (nome, tel, email, login, senha, admin) VALUES (?, ?, ?, ?, ?, 0)");
        $insertStmt -> bind_param("sssss", $name, $tel, $email, $username, $password);

        if ($insertStmt -> execute()) {

            session_start();
            $_SESSION["username"] = $username;

            header("Location: pageUser.php");

        } else {

            session_start();
            $_SESSION["error_message"] = "Erro ao cadastrar o usuário.";

            header("Location: registerError.php");

        }

        $insertStmt -> close();
        $checkUerStmt -> close();

    }

    $conn -> close();

?>