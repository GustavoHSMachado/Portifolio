#!/usr/bin/env bash
#
# Configura o repositório: branches, proteção da master e Actions.
# Rode DEPOIS de criar-issues.sh.
#
#   bash v2/scripts/configurar-repo.sh

set -euo pipefail

command -v gh >/dev/null 2>&1 || { echo "❌ Instale o GitHub CLI: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "❌ Rode: gh auth login"; exit 1; }

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=$(echo "$REPO" | cut -d/ -f1)
NAME=$(echo "$REPO" | cut -d/ -f2)

echo "📦 Repositório: $REPO"
echo

# ------------------------------------------------------------------
# 1. Branch dev
# ------------------------------------------------------------------
echo "🌿 Branch dev"
if git show-ref --verify --quiet refs/heads/dev; then
  echo "  · já existe localmente"
else
  git branch dev 2>/dev/null && echo "  ✓ criada localmente" || true
fi

git push -u origin dev 2>/dev/null && echo "  ✓ enviada para o remoto" || echo "  · já existe no remoto"
echo

# ------------------------------------------------------------------
# 2. Proteção da master
# ------------------------------------------------------------------
echo "🔒 Proteção da branch master"
echo "   Exigindo: quality-gate verde, 1 aprovação, sem force push."

if gh api -X PUT "repos/$OWNER/$NAME/branches/master/protection" \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=Quality Gate" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews[required_approving_review_count]=1" \
  -f "required_pull_request_reviews[dismiss_stale_reviews]=true" \
  -f "restrictions=" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false" \
  -F "required_conversation_resolution=true" \
  >/dev/null 2>&1
then
  echo "  ✓ proteção aplicada"
else
  echo "  ⚠️  não foi possível aplicar automaticamente."
  echo "     Repositórios públicos no plano gratuito suportam isso;"
  echo "     privados exigem GitHub Pro/Team."
  echo "     Configure manualmente em:"
  echo "     https://github.com/$REPO/settings/branches"
fi
echo

# ------------------------------------------------------------------
# 3. Segurança
# ------------------------------------------------------------------
echo "🛡️  Recursos de segurança"
gh api -X PATCH "repos/$OWNER/$NAME" \
  -F "security_and_analysis[secret_scanning][status]=enabled" \
  -F "security_and_analysis[secret_scanning_push_protection][status]=enabled" \
  >/dev/null 2>&1 && echo "  ✓ secret scanning ativado" \
                  || echo "  ⚠️  ative manualmente em Settings → Code security"

gh api -X PUT "repos/$OWNER/$NAME/vulnerability-alerts" >/dev/null 2>&1 \
  && echo "  ✓ Dependabot alerts ativado" || echo "  ⚠️  ative manualmente"
echo

# ------------------------------------------------------------------
# 4. Secrets pendentes
# ------------------------------------------------------------------
echo "🔑 Secrets que você precisa cadastrar manualmente:"
echo "   gh secret set CODECOV_TOKEN            # https://codecov.io"
echo "   gh secret set LHCI_GITHUB_APP_TOKEN    # opcional, Lighthouse CI"
echo "   gh secret set SENTRY_DSN               # opcional, Sentry"
echo

echo "✅ Concluído."
echo "   Confira em: https://github.com/$REPO/settings/branches"
