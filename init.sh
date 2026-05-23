#!/usr/bin/env bash
# init.sh — Environment verification for saleor-storefront
# Run before starting a new session: bash init.sh

set -euo pipefail
PASS="✓" FAIL="✗" WARN="⚠"
ERRORS=0

check() { local label="$1" ok="$2" msg="${3:-}"
  if [[ "$ok" == "0" ]]; then echo "  $PASS $label"
  else echo "  $FAIL $label${msg:+ — $msg}"; ((ERRORS++)); fi
}
warn() { echo "  $WARN $1"; }

echo ""
echo "=== saleor-storefront init check ==="
echo ""

# ── 1. Working directory ────────────────────────────────────────────────────
echo "[1] Working directory"
[[ -f "package.json" ]] && grep -q "saleor-storefront" package.json \
  && check "Project root correct" 0 \
  || check "Must run from storefront root" 1

# ── 2. Environment variables ────────────────────────────────────────────────
echo ""
echo "[2] Environment variables (.env.local)"
ENV_FILE=".env.local"
if [[ -f "$ENV_FILE" ]]; then
  check ".env.local exists" 0
  for var in NEXT_PUBLIC_SALEOR_API_URL NEXT_PUBLIC_STOREFRONT_URL; do
    val=$(grep -E "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
    [[ -n "$val" ]] && check "$var is set" 0 || check "$var is set" 1 "required"
  done
  for var in SALEOR_APP_TOKEN ERP_WEBHOOK_SECRET; do
    val=$(grep -E "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
    [[ -n "$val" ]] && check "$var is set" 0 || warn "$var not set (needed for server-side ops)"
  done
else
  check ".env.local exists" 1 "create .env.local with NEXT_PUBLIC_SALEOR_API_URL"
fi

# ── 3. Dependencies ─────────────────────────────────────────────────────────
echo ""
echo "[3] Dependencies"
if [[ -d "node_modules" ]]; then
  check "node_modules exists" 0
else
  check "node_modules missing" 1 "run: pnpm install"
fi
command -v pnpm &>/dev/null && check "pnpm available" 0 || check "pnpm not found" 1 "install: npm i -g pnpm"

# ── 4. Saleor API reachability ──────────────────────────────────────────────
echo ""
echo "[4] Saleor API"
SALEOR_URL=""
[[ -f ".env.local" ]] && SALEOR_URL=$(grep -E "^NEXT_PUBLIC_SALEOR_API_URL=" .env.local 2>/dev/null | cut -d= -f2- || true)
SALEOR_URL="${SALEOR_URL:-http://localhost:8000/graphql/}"
if curl -sf --max-time 3 "$SALEOR_URL" -o /dev/null 2>/dev/null; then
  check "Saleor API reachable ($SALEOR_URL)" 0
else
  warn "Saleor API not reachable — start saleor-platform: docker compose up -d"
fi

# ── 5. Git status ───────────────────────────────────────────────────────────
echo ""
echo "[5] Git"
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
check "Branch: $branch" 0
uncommitted=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
[[ "$uncommitted" == "0" ]] && check "No uncommitted changes" 0 || warn "$uncommitted uncommitted file(s)"

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "======================================"
if [[ $ERRORS -eq 0 ]]; then
  echo "  $PASS All checks passed — ready to work"
  echo "  Start dev: pnpm dev"
else
  echo "  $FAIL $ERRORS critical issue(s) — fix before proceeding"
fi
echo "======================================"
echo ""
exit $ERRORS
