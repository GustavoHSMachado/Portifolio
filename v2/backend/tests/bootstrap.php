<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';

// Os testes não leem .env — a configuração vem do bloco <php> do phpunit.xml.
date_default_timezone_set('UTC');
