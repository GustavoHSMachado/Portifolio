#!/usr/bin/env bash
#
# Conferência antes de tocar em qualquer coisa.
#
# Roda NO SERVIDOR, por stdin do ssh. Recebe o caminho da instalação e
# recusa o deploy se o alvo não for o que se espera. A verificação existe
# porque um deploy automático que erra de pasta é pior que um deploy que
# não acontece.
#
# A instalação NÃO é um clone do Git (verificado em 02/11/2026): o código
# chegou ali por envio de arquivos, e é assim que continua. Por isso a
# conferência olha a forma da pasta, e não o estado de um repositório.
set -euo pipefail

CAMINHO="${1:?caminho da instalação não informado}"

if [ ! -d "$CAMINHO" ]; then
  echo "::error::A pasta $CAMINHO não existe no servidor."
  exit 1
fi

cd "$CAMINHO"

# A marca de que estamos na instalação certa, e não numa pasta qualquer.
for esperado in composer.json src public_html; do
  if [ ! -e "$esperado" ]; then
    echo "::error::Não encontrei '$esperado' em $CAMINHO."
    echo "Esta não parece ser a instalação da API. Confira o secret HOSTINGER_API_PATH."
    exit 1
  fi
done

if ! grep -q '"name"' composer.json 2>/dev/null; then
  echo "::error::$CAMINHO/composer.json não parece um composer.json válido."
  exit 1
fi

if [ ! -f .env ]; then
  echo "::error::Não há .env em $CAMINHO. A API não sobe sem ele, e o deploy não o cria:"
  echo "configuração de produção não mora no repositório."
  exit 1
fi

# O PHP do shell é 8.2 e o projeto exige 8.3. O binário alternativo é o que
# as migrações vão usar; sem ele, o passo seguinte falharia de forma bem
# menos clara.
PHP83="/opt/alt/php83/usr/bin/php"
if [ ! -x "$PHP83" ]; then
  echo "::error::$PHP83 não existe ou não é executável."
  echo "O composer.json exige PHP >= 8.3 e o shell tem $(php -v | head -1 | awk '{print $2}')."
  exit 1
fi

echo "Alvo conferido."
echo "  pasta       : $CAMINHO"
echo "  php (shell) : $(php -v | head -1 | awk '{print $2}')"
echo "  php (deploy): $("$PHP83" -v | head -1 | awk '{print $2}')"
echo "  uploads     : $(find public_html/uploads -type f 2>/dev/null | wc -l) arquivo(s) — não serão tocados"
