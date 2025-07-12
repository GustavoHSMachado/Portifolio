<?php

    include 'conexao.php';

    if ($_SERVER["REQUEST_METHOD"] == "POST") {

        $username = $_POST["username"];
        $password = $_POST["password"];

        $stmt = $conn -> prepare("SELECT id, login, admin From CADASTRO WHERE login = ? AND senha = ?");
        $stmt -> bind_param("ss", $username, $password,);
        $stmt -> execute();
        $stmt -> store_result();

        if ($stmt -> num_rows > 0) {
            $stmt -> bind_result($id, $username, $admin);
            $stmt -> fetch();

            session_start();
            $_SESSION["username"] = $username;

            if($admin == 1){

                header("Location: pageAdmin.php");

            } else {

                session_start();
                header("Location: pageUser.php");

            }

            exit();
            
        } else {

            $_SESSION["error_message"] = "Usuário ou Senha Incorretos.";
            header("Location: loginError.php");

        }

        $stmt -> close();
        
    }

    $conn -> close();

?>