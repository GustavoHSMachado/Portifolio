<?php

    $host = "127.0.0.1";
    $dbname = "site";
    $username = "root";
    $password = "";

    $conn = new mysqli($host, $username, $password, $dbname);

        if ($conn -> connect_error){

            die("Conexão Falhou: " . $conn -> connect_error);

        }

?>