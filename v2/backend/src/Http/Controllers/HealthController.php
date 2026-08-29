<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Config;
use App\Core\Request;
use App\Core\Response;
use App\Database\Connection;

/**
 * Health checks para o orquestrador e para o monitoramento externo.
 * /health é raso (liveness); /health/ready toca o banco (readiness).
 */
final class HealthController
{
    public function __construct(private readonly Connection $db)
    {
    }

    public function live(Request $request): Response
    {
        return Response::ok([
            'status'  => 'ok',
            'service' => Config::get('APP_NAME', 'portifolio-api'),
            'version' => Config::get('APP_VERSION', 'dev'),
            'time'    => gmdate('c'),
        ]);
    }

    public function ready(Request $request): Response
    {
        $start = hrtime(true);

        try {
            $this->db->run('SELECT 1');
            $latencyMs = round((hrtime(true) - $start) / 1e6, 2);
        } catch (\Throwable) {
            return Response::json([
                'status' => 'degraded',
                'checks' => ['database' => 'down'],
            ], 503);
        }

        return Response::ok([
            'status'    => 'ok',
            'checks'    => ['database' => 'up'],
            'latencyMs' => $latencyMs,
        ]);
    }
}
