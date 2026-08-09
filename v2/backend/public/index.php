<?php

declare(strict_types=1);

/**
 * Único entrypoint público da API.
 * Todo o restante (src/, database/, storage/, .env) fica fora do document root.
 */

use App\Core\App;

require_once dirname(__DIR__) . '/vendor/autoload.php';

// Erros nunca são exibidos ao cliente — o ErrorHandler formata a resposta.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

(new App(dirname(__DIR__)))->run();
