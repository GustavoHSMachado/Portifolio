#!/usr/bin/env bash
#
# Traz o código novo e refaz o autoload.
#
# Roda NO SERVIDOR, por stdin do ssh. Recebe o caminho da instalação e o
# commit exato que o CI aprovou — e não "a master", porque entre o fim da
# esteira e este passo alguém pode ter empurrado outra coisa. Deploy aplica
# o que foi testado, não o que estiver mais novo.
set -euo pipefail

CAMINHO="${1:?caminho da instalação não informado}"
ALVO="${2:?commit alvo não informado}"

cd "$CAMINHO"

ANTERIOR="$(git rev-parse HEAD)"
echo "Antes:  $ANTERIOR"
echo "Alvo:   $ALVO"

if [ "$ANTERIOR" = "$ALVO" ]; then
  echo "O servidor já está neste commit. Nada a trazer."
else
  git fetch origin master

  # --ff-only recusa divergência em vez de inventar um merge em produção.
  # Se falhar aqui, há commit no servidor que não está no repositório.
  git merge --ff-only "$ALVO"

  echo "Depois: $(git rev-parse HEAD)"
fi

# Só reinstala dependência quando composer.lock mudou de verdade: um
# composer install a cada deploy custa minutos e não muda nada.
if [ -f composer.json ]; then
  if [ "$ANTERIOR" = "$ALVO" ] || git diff --quiet "$ANTERIOR" "$ALVO" -- composer.lock; then
    echo "composer.lock inalterado — pulando a instalação de dependências."
  else
    echo "composer.lock mudou — reinstalando dependências de produção."
    composer install --no-dev --optimize-autoloader --no-interaction --no-progress
  fi
fi

echo
echo "Para desfazer este deploy:"
echo "  git -C $CAMINHO reset --hard $ANTERIOR"
