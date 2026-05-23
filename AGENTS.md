# AGENTS.md — saleor-storefront

# Operating manual for AI agents working on this repository.

## What This Repo Is

Consumer-facing storefront for the Saleor e-commerce platform.

- **Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, urql, pnpm
- **Data**: Saleor GraphQL API (`NEXT_PUBLIC_SALEOR_API_URL`)
- **Payments**: Stripe + Adyen (configured per Saleor channel)

## Dependencies on Other Repos

| Dependency      | Repo                        | Why                                                      |
| --------------- | --------------------------- | -------------------------------------------------------- |
| Saleor API      | `saleor-platform` (sibling) | All product/order/checkout data                          |
| ERP integration | custom backend              | `src/app/api/erp/` receives webhooks from ERP            |
| ECPay callbacks | custom backend              | Not handled here — handled by `api-core` in main project |

## Scope Boundaries

### IN SCOPE

- `src/app/` — Next.js pages and API routes
- `src/checkout/` — checkout components and hooks
- `src/lib/` — shared utilities
- `.graphql` files — GraphQL operation definitions
- `tailwind.config.ts`, `postcss.config.cjs` — styling config

### OUT OF SCOPE — never modify

- `src/generated/` — run `pnpm generate` to regenerate
- `node_modules/` — never edit
- Saleor platform code (`saleor-platform` repo)

### FORBIDDEN

- Never hardcode API URLs — use env vars
- Never store auth tokens outside of `@saleor/auth-sdk` mechanisms
- Never bypass the urql client setup — all GraphQL calls go through it
- Never commit `.env.local` or any file containing secret values

## Key API Contracts

### ERP Webhook Endpoints (server-side, `src/app/api/erp/`)

All require `X-ERP-Secret: <ERP_WEBHOOK_SECRET>` header.

- `POST /api/erp/inventory` — sync inventory update from ERP
- `POST /api/erp/orders` — sync order status from ERP
- `POST /api/erp/webhook` — generic ERP event

### Saleor GraphQL (via urql)

- Endpoint: `NEXT_PUBLIC_SALEOR_API_URL`
- Auth header injected automatically by `@saleor/auth-sdk`
- All operations typed via generated hooks in `src/generated/`

## How Other Agents Should Call This Service

This is a frontend — it doesn't expose a REST API for agent consumption.
For product/order data, call the **Saleor GraphQL API** directly at `NEXT_PUBLIC_SALEOR_API_URL`.

## Channel System

Saleor uses "channels" (e.g. `default-channel`) to segment products/pricing/currencies.

- All storefront routes are prefixed with `[channel]`
- Every GraphQL query that touches products/orders must include `channel` input
- Default channel slug: `default-channel` (configured in Saleor dashboard)
