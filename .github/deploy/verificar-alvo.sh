#!/usr/bin/env bash
#
# Conferência antes de tocar em qualquer coisa.
#
# Roda NO SERVIDOR, por stdin do ssh. Recebe o caminho da instalação e o
# "owner/repo" esperado, e recusa o deploy se o alvo não for exatamente o
# que se espera — pasta errada, instalação que não é clone do Git, ou clone
# apontando para outro repositório.
#
# A verificação existe porque um deploy automático que erra de pasta é pior
# que um deploy que não acontece.
set -euo pipefail

CAMINHO="${1:?caminho da instalação não informado}"
ESPERADO="${2:?repositório esperado não informado}"

if [ ! -d "$CAMINHO" ]; then
  echo "::error::A pasta $CAMINHO não existe no servidor."
  exit 1
fi

cd "$CAMINHO"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "::error::$CAMINHO não é um clone do Git."
  echo "A instalação atual foi feita por envio de pacote, então não há de onde dar pull."
  echo "Converta a pasta em clone antes de usar o deploy automático."
  exit 1
fi

URL_REMOTA="$(git remote get-url origin)"

case "$URL_REMOTA" in
  *"$ESPERADO"*) : ;;
  *)
    echo "::error::O clone em $CAMINHO aponta para $URL_REMOTA, e não para $ESPERADO."
    exit 1
    ;;
esac

# Arquivo editado à mão no servidor faria o merge --ff-only falhar mais
# adiante, com mensagem bem menos clara que esta.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "::error::Há alterações não commitadas no servidor:"
  git status --short --untracked-files=no
  echo "Resolva antes de automatizar: o deploy não sobrescreve trabalho de ninguém."
  exit 1
fi

echo "Alvo conferido."
echo "  pasta   : $CAMINHO"
echo "  clone de: $URL_REMOTA"
echo "  commit  : $(git rev-parse --short HEAD)"
echo "  git     : $(git --version | awk '{print $3}')"
echo "  php     : $(php -v 2>/dev/null | head -1 | awk '{print $2}')"
echo "  composer: $(composer --version 2>/dev/null | awk '{print $3}' || echo AUSENTE)"
