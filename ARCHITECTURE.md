# ARCHITECTURE.md — saleor-storefront

## Overview

Next.js 15 App Router consumer storefront connected to Saleor e-commerce platform.

```
Browser
  └─ Next.js App Router (:3000)
       ├─ urql (GraphQL) → Saleor API (:8000, saleor-platform)
       ├─ @saleor/auth-sdk → handles JWT tokens
       └─ API routes → ERP webhooks (inventory/orders/webhook)
```

## Routing Architecture

```
src/app/
  [channel]/          ← channel slug (e.g. "default-channel") in every route
    (main)/
      products/[slug]
      categories/[slug]
      collections/[slug]
      cart/
      login/
      orders/
      search/
      pages/[slug]
  checkout/            ← no channel prefix; channel via query param
  api/
    erp/              ← server-side webhook receivers
      inventory/
      orders/
      webhook/
    draft/disable/    ← Next.js draft mode
```

## Data Layer

### GraphQL (urql + codegen)

- All Saleor data fetched via GraphQL
- Client configured in `src/lib/` with urql
- Auth token injected by `@saleor/auth-sdk` exchange
- Operations: `.graphql` files → `pnpm generate` → `src/generated/`

### Channel System

Every Saleor data query is scoped to a channel:

- URL param `[channel]` → passed to GraphQL `channel:` input
- Determines currency, pricing, available products
- Default: `default-channel`

### Auth Flow

```
User login → @saleor/auth-sdk tokenCreate mutation
  → JWT stored via auth SDK
  → Saleor API authenticates subsequent requests
  → Refresh handled automatically
```

## Payment Integration

Two payment providers, configured per channel in Saleor dashboard:

- **Stripe**: `@stripe/react-stripe-js` + PaymentIntent flow
- **Adyen**: `@adyen/adyen-web` drop-in component

Payment initialization is a Saleor GraphQL mutation; the provider-specific UI renders after Saleor confirms the payment session.

## ERP Integration (`src/app/api/erp/`)

Server-side API routes that receive inventory and order updates from an external ERP:

- Authenticated via `X-ERP-Secret` header (env var `ERP_WEBHOOK_SECRET`)
- These are Next.js Route Handlers (not pages)

## Key Invariants

1. **`src/generated/` is always machine-generated** — run `pnpm generate`, never hand-edit
2. **Every Saleor data fetch requires a channel** — missing channel causes empty results, not an error
3. **Checkout is at `/checkout` (no `[channel]`)** — uses query string for channel context
4. **`pnpm generate` must run before `pnpm dev`** — the predev hook handles this automatically
5. **urql is the only GraphQL client** — do not add Apollo or fetch-based GQL calls
