#!/usr/bin/env bash
#
# Remove a senha de app do Gmail de todo o historico do repositorio.
#
# A senha nao e digitada em lugar nenhum: o script a le do proprio commit que a
# introduziu (aba029d) e a substitui por um marcador. Assim ela nao passa pelo
# historico do shell nem pela linha de comando de nenhum processo.
#
# Afeta 3 commits: aba029d, 97a4974 e e9483c1 (este ultimo e o HEAD da master,
# que ainda carrega a senha no conteudo atual).
#
# NAO faz push. A conferencia e o envio ficam por sua conta, no fim.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "==> Repositorio: $(pwd)"
echo "==> Branch atual: $(git branch --show-current)"
echo

if [ -n "$(git status --porcelain)" ]; then
  echo "ERRO: ha alteracoes nao commitadas. Resolva antes de reescrever o historico."
  exit 1
fi

# ------------------------------------------------------------------
# 1. Backup
# ------------------------------------------------------------------
BACKUP="../portifolio-backup-$(date +%Y%m%d-%H%M%S).bundle"
git bundle create "$BACKUP" --all >/dev/null 2>&1
echo "==> Backup completo em: $BACKUP"
echo "    (para restaurar: git clone $BACKUP repo-restaurado)"
echo

echo "==> SHAs antes da reescrita:"
git rev-parse dev master | sed 's/^/    /'
echo

# ------------------------------------------------------------------
# 2. Le a senha do commit antigo, sem exibi-la
# ------------------------------------------------------------------
SENHA_ANTIGA=$(git show aba029d:configEmail.php | sed -n "s/.*Password = '\([^']*\)'.*/\1/p")

if [ -z "$SENHA_ANTIGA" ]; then
  echo "ERRO: nao consegui ler a senha do commit aba029d. Nada foi alterado."
  exit 1
fi

export SENHA_ANTIGA
echo "==> Senha localizada (${#SENHA_ANTIGA} caracteres). Nao sera exibida."
echo

# ------------------------------------------------------------------
# 3. Reescreve
# ------------------------------------------------------------------
echo "==> Reescrevendo o historico. Isso leva alguns minutos."
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch --force --tree-filter '
  for f in configEmail.php formail.php v1/configEmail.php v1/formail.php; do
    if [ -f "$f" ]; then
      sed -i "s/${SENHA_ANTIGA}/SENHA-REMOVIDA-DO-HISTORICO/g" "$f"
    fi
  done
' --tag-name-filter cat -- --all

echo

# ------------------------------------------------------------------
# 4. Descarta as referencias antigas e recolhe o lixo
# ------------------------------------------------------------------
echo "==> Descartando as referencias originais..."
git for-each-ref --format='%(refname)' refs/original/ \
  | xargs -n 1 git update-ref -d 2>/dev/null || true

rm -rf .git/refs/original
git reflog expire --expire=now --all
git gc --prune=now --aggressive >/dev/null 2>&1
echo

# ------------------------------------------------------------------
# 5. Confere
# ------------------------------------------------------------------
echo "==> Conferindo se sobrou alguma ocorrencia..."
SOBROU=0
for c in $(git rev-list --all); do
  if git grep -q "$SENHA_ANTIGA" "$c" -- 2>/dev/null; then
    echo "    AINDA PRESENTE em $c"
    SOBROU=1
  fi
done

if [ "$SOBROU" -eq 0 ]; then
  echo "    Nenhuma ocorrencia em nenhum commit."
else
  echo
  echo "ERRO: a limpeza nao ficou completa. NAO faca push. Restaure do backup."
  exit 1
fi

echo
echo "==> SHAs depois da reescrita:"
git rev-parse dev master | sed 's/^/    /'
echo
echo "==> Pronto. Confira o resultado e, se estiver certo, envie com:"
echo
echo "    git push --force-with-lease origin dev"
echo "    git push --force-with-lease origin master"
echo
echo "    Depois, no GitHub: Settings > Branches, caso haja protecao de branch"
echo "    que recuse force-push, sera preciso suspende-la durante o envio."
