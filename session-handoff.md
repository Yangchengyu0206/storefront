# Session Handoff — saleor-storefront

# 每個 session 結束時更新此檔。下一個 agent 從這裡開始。

## Last Session Summary (2026-05-23)

### What Was Done

- 建立完整 harness 文件（CLAUDE.md, AGENTS.md, ARCHITECTURE.md, feature_list.json, docs/）

### State of the Codebase

- No active development work in progress
- Harness files added but not committed yet

---

## Handoff to Next Agent

### First Thing to Do

1. Run `bash init.sh` to verify environment
2. Ensure saleor-platform is running (`docker compose up -d` in saleor-platform/)
3. Check `docs/exec-plans/tech-debt-tracker.md` for any open issues

### Prerequisites Before Working

- saleor-platform stack must be running (Saleor API at :8000)
- `.env.local` must have `NEXT_PUBLIC_SALEOR_API_URL` set
- Run `pnpm install` if node_modules missing
- Run `pnpm generate` if any .graphql files were changed

### Context Not in Code

- Every Saleor data query requires `channel` parameter — missing it returns empty results silently
- `src/generated/` is always machine-generated — never edit, always `pnpm generate`
- Checkout page is at `/checkout` (no channel prefix) — different from all other pages

---

## Template for Next Handoff

```
## Last Session Summary (YYYY-MM-DD)
### What Was Done
- ...
### State of the Codebase
- Any uncommitted changes?

## Handoff to Next Agent
### First Thing to Do
### What Was Left Incomplete
### Context Not in Code
```
