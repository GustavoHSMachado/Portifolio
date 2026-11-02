#!/usr/bin/env bash
#
# Aplica as migrações pendentes.
#
# Roda NO SERVIDOR, por stdin do ssh, sempre depois do backup. O migrador
# é idempotente: lê a tabela `migrations` e aplica só o que falta, então
# rodar a cada deploy não repete nada.
#
# O --status antes serve ao registro: quando algo der errado semanas
# depois, o log do job mostra exatamente o que este deploy aplicou.
set -euo pipefail

CAMINHO="${1:?caminho da instalação não informado}"
cd "$CAMINHO"

echo "=== situação antes ==="
php database/migrate.php --status

PENDENTES="$(php database/migrate.php --status | grep -c '^  \[ \]' || true)"

if [ "${PENDENTES:-0}" -eq 0 ]; then
  echo "Nenhuma migração pendente."
  exit 0
fi

echo
echo "=== aplicando $PENDENTES migração(ões) ==="
php database/migrate.php

echo
echo "=== situação depois ==="
php database/migrate.php --status
