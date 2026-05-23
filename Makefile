# Makefile — saleor-storefront

.PHONY: help dev build generate lint typecheck check

help:
	@echo ""
	@echo "  dev        Start dev server (pnpm dev, includes codegen)"
	@echo "  build      Production build"
	@echo "  generate   Regenerate GraphQL types from Saleor schema"
	@echo "  lint       ESLint with auto-fix"
	@echo "  typecheck  TypeScript type check"
	@echo "  check      Run init.sh environment checks"
	@echo ""

dev:
	pnpm dev

build:
	pnpm build

generate:
	pnpm generate

lint:
	pnpm lint

typecheck:
	npx tsc --noEmit

check:
	@bash init.sh
