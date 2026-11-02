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
#
# O .env é LIDO, nunca carregado com `source`. O formato que o phpdotenv
# aceita não é script de shell: em 02/11/2026 um `. ./.env` aqui morreu com
# "line 56: command not found", porque o shell tentou executar parte de um
# valor. Ler linha a linha nunca executa nada.
set -euo pipefail

CAMINHO="${1:?caminho da instalação não informado}"
cd "$CAMINHO"

if [ ! -f .env ]; then
  echo "::error::Não há .env em $CAMINHO — sem ele não há como abrir o banco."
  exit 1
fi

# Primeira ocorrência da chave, sem a chave, sem \r de arquivo salvo no
# Windows e sem as aspas das pontas quando existirem.
ler_env() {
  sed -n "s/^$1=//p" .env \
    | head -1 \
    | sed -e 's/\r$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

DB_NAME="$(ler_env DB_NAME)"
DB_USER="$(ler_env DB_USER)"
DB_PASS="$(ler_env DB_PASS)"
DB_HOST="$(ler_env DB_HOST)"

for obrigatoria in DB_NAME DB_USER DB_PASS; do
  if [ -z "${!obrigatoria}" ]; then
    echo "::error::$obrigatoria não encontrada no .env de $CAMINHO."
    exit 1
  fi
done

DESTINO="$HOME/backups-deploy"
mkdir -p "$DESTINO"
ARQUIVO="$DESTINO/antes-do-deploy-$(date +%Y%m%d-%H%M%S).sql"

# --no-tablespaces porque usuário de hospedagem compartilhada não costuma
# ter o privilégio PROCESS, e sem a flag o mysqldump falha por isso.
#
# A senha vai por --defaults-extra-file, e não na linha de comando: em
# servidor compartilhado, qualquer processo enxerga a lista de argumentos.
CONF="$(mktemp)"
trap 'rm -f "$CONF"' EXIT
chmod 600 "$CONF"
{
  echo "[client]"
  echo "user=$DB_USER"
  echo "password=$DB_PASS"
  echo "host=${DB_HOST:-localhost}"
} > "$CONF"

mysqldump --defaults-extra-file="$CONF" --no-tablespaces "$DB_NAME" > "$ARQUIVO"
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
