#!/usr/bin/env bash
#
# Backup do banco antes de qualquer migração.
#
# Roda NO SERVIDOR, por stdin do ssh. Existe para honrar a regra do projeto
# ("nunca rodar migração em produção sem backup") num fluxo onde ninguém
# está olhando: deploy automático e "pedir autorização" não convivem, então
# o que substitui a autorização é a rede embaixo.
#
# As credenciais saem do .env que já está no servidor. Duplicá-las nos
# secrets do GitHub seria mais um lugar de onde vazar, para nenhum ganho.
set -euo pipefail

CAMINHO="${1:?caminho da instalação não informado}"
cd "$CAMINHO"

if [ ! -f .env ]; then
  echo "::error::Não há .env em $CAMINHO — sem ele não há como abrir o banco."
  exit 1
fi

set -a
# shellcheck disable=SC1091  # o .env só existe no servidor, não há o que seguir aqui
. ./.env
set +a

: "${DB_DATABASE:?DB_DATABASE ausente no .env}"
: "${DB_USERNAME:?DB_USERNAME ausente no .env}"
: "${DB_PASSWORD:?DB_PASSWORD ausente no .env}"

DESTINO="$HOME/backups-deploy"
mkdir -p "$DESTINO"
ARQUIVO="$DESTINO/antes-do-deploy-$(date +%Y%m%d-%H%M%S).sql"

# --no-tablespaces porque usuário de hospedagem compartilhada não costuma
# ter o privilégio PROCESS, e sem a flag o mysqldump falha por isso.
mysqldump --no-tablespaces \
  -h "${DB_HOST:-localhost}" \
  -u "$DB_USERNAME" \
  -p"$DB_PASSWORD" \
  "$DB_DATABASE" > "$ARQUIVO"

gzip -f "$ARQUIVO"

echo "Backup gravado: ${ARQUIVO}.gz ($(du -h "${ARQUIVO}.gz" | cut -f1))"

# Mantém os 10 mais recentes. Backup que enche a conta de hospedagem deixa
# de ser backup e vira incidente.
#
# shellcheck disable=SC2012  # o nome é gerado acima, com timestamp e sem
# espaço nem caractere especial, então `ls -t` é previsível e evita depender
# do -printf, que é do find do GNU e pode não existir na hospedagem.
ls -1t "$DESTINO"/antes-do-deploy-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

GUARDADOS="$(find "$DESTINO" -maxdepth 1 -name 'antes-do-deploy-*.sql.gz' | wc -l)"
echo "Backups guardados: $GUARDADOS"
