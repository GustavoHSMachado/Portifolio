#!/usr/bin/env bash
#
# Aplica as migrações pendentes.
#
# Roda NO SERVIDOR, por stdin do ssh, sempre depois do backup. O migrador
# é idempotente: lê a tabela `migrations` e aplica só o que falta, então
# rodar a cada deploy não repete nada.
#
# Usa o PHP 8.3 explicitamente. O `php` do shell é 8.2.35 e o composer.json
# exige >= 8.3 — com o binário padrão, código que usa recurso de 8.3
# quebraria aqui e em lugar nenhum mais, que é o pior tipo de defeito.
#
# O --status antes e depois serve ao registro: quando algo der errado
# semanas adiante, o log do job mostra exatamente o que este deploy aplicou.
set -euo pipefail

CAMINHO="${1:?caminho da instalação não informado}"
PHP="/opt/alt/php83/usr/bin/php"

cd "$CAMINHO"

echo "=== situação antes ==="
"$PHP" database/migrate.php --status

PENDENTES="$("$PHP" database/migrate.php --status | grep -c '^  \[ \]' || true)"

if [ "${PENDENTES:-0}" -eq 0 ]; then
  echo "Nenhuma migração pendente."
  exit 0
fi

echo
echo "=== aplicando $PENDENTES migração(ões) ==="
"$PHP" database/migrate.php

echo
echo "=== situação depois ==="
"$PHP" database/migrate.php --status
