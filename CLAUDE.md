# CLAUDE.md — saleor-storefront

Saleor storefront: Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS + urql (GraphQL).
Consumer-facing e-commerce UI connected to a Saleor API instance.

## Development

```bash
# Install
pnpm install

# Dev server (also runs GraphQL codegen first)
pnpm dev          # http://localhost:3000

# Build
pnpm build

# Regenerate GraphQL types (run after modifying .graphql files or Saleor schema changes)
pnpm generate

# Lint + fix
pnpm lint

# Type check
npx tsc --noEmit
```

**Saleor API** must be running at `NEXT_PUBLIC_SALEOR_API_URL` (default: `http://localhost:8000/graphql/`).
Use `saleor-platform` (sibling repo) to run the full Saleor stack locally via Docker Compose.

## Architecture

### App Router Structure (`src/app/`)

```
src/app/
  [channel]/              # channel-aware routes (e.g. /default-channel/...)
    (main)/
      cart/               # Shopping cart
      categories/[slug]/  # Category listing
      collections/[slug]/ # Collection listing
      login/              # Auth
      orders/             # Order history
      products/[slug]/    # Product detail
      search/             # Search results
      pages/[slug]/       # CMS pages
  checkout/               # Checkout flow (standalone page)
  api/
    draft/disable/        # Draft mode API
    erp/                  # ERP integration webhooks
      inventory/          # Inventory sync from ERP
      orders/             # Order sync from ERP
      webhook/            # Generic ERP webhook
  actions/                # Server Actions
```

### Key Directories

| Path                        | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `src/checkout/`             | Checkout components, hooks, GraphQL queries |
| `src/checkout/graphql/`     | Checkout GraphQL operations                 |
| `src/app/[channel]/(main)/` | Main storefront pages                       |
| `src/lib/`                  | Shared utilities and API helpers            |

### GraphQL

- Client: **urql** (not Apollo)
- Codegen config: `.graphqlrc.ts` → generates typed hooks to `src/generated/`
- **Never edit generated files** — run `pnpm generate` instead
- All GraphQL operations defined as `.graphql` files alongside components

### Auth

- `@saleor/auth-sdk` handles JWT tokens and refresh
- Auth state: stored in localStorage/cookies via auth SDK
- Channel is part of every authenticated operation

### Payments

- Stripe: `@stripe/react-stripe-js` + `@stripe/stripe-js`
- Adyen: `@adyen/adyen-web` + `@adyen/api-library`
- Payment provider determined by Saleor channel config

## Key Invariants

- Every page under `[channel]/` receives the channel slug as a route parameter — always pass it to GraphQL queries
- `src/app/api/erp/` endpoints expect `X-ERP-Secret` header — match value in env
- Checkout page is at `/checkout` (not under `[channel]`) — uses query params for channel
- `pnpm generate` must be run whenever `.graphql` files change or Saleor schema updates

## Design System (read before touching any visual code)

Rebuilt against the `taste-skill` / `redesign-skill` rulebooks in
`.claude/skills/`. Tokens live in `tailwind.config.ts` + `src/app/globals.css`.

**Whose brand is this?** The storefront carries the **merchant's** identity, not
the platform's. `NEXT_PUBLIC_SELLER_NAME` is the single source of the store name
(logo, `<title>`, checkout heading, footer copyright, checkout error page) and is
currently `ananaofficial`. Never hardcode a store name in a component, and never
put "YangTech" here — that is the ops dashboard's brand, not the shop's.

**Locks:**

| Lock   | Rule                                                                                                                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colour | One accent (`accent`, a deep evergreen) and one neutral family (`ink`). Both are CSS variables in `globals.css`, so a new merchant is re-themed by editing ~12 values. Do not use Tailwind's stock `neutral` / `gray` / `blue` / `teal` / `indigo` — they were all swept out. |
| Shape  | `rounded-control` 6px · `rounded-card` 12px · `rounded-sheet` 16px · `rounded-full`.                                                                                                                                                                                          |
| Shadow | `shadow-card` / `shadow-lift` / `shadow-sheet`, all tinted to `--ink-950`. No `rgba(0,0,0,…)`.                                                                                                                                                                                |
| Type   | Geist + Geist Mono via `next/font` (CSS vars `--font-sans` / `--font-mono`), CJK falls through to the platform face. Prices and quantities take the `.tabular` class.                                                                                                         |
| States | Route segments have shaped skeletons, not spinners: `ProductListSkeleton` for grids, `products/[slug]/loading.tsx` for the detail page. The home page renders a real empty state instead of `return null`.                                                                    |
| A11y   | `:focus-visible` ring is global; every interactive component keeps it (do not add `outline-none` without a `focus-visible:` replacement). `(main)/layout.tsx` carries the skip link and `<main id="main">`.                                                                   |

The vendor's logo is gone from the checkout 404 page and `SaleorLogo.tsx` is
deleted. Remaining `Saleor` strings in `src/` are SDK identifiers, env var names
and codegen output — those stay (see "Do NOT" below).

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8000/graphql/
NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3000
SALEOR_APP_TOKEN=          # Saleor app token for server-side calls
ERP_WEBHOOK_SECRET=        # Secret for ERP integration endpoints
STRIPE_SECRET_KEY=         # Stripe server-side key
NEXT_PUBLIC_STRIPE_PK=     # Stripe publishable key
```

## Do NOT

- Edit files under `src/generated/` — auto-generated by codegen
- Import server-only modules in client components (Next.js will error)
- Use `pages/` router — this project is 100% App Router
- Call Saleor API directly from client without going through urql client setup
- Rename the vendor out of code identifiers (`@saleor/auth-sdk` imports, `NEXT_PUBLIC_SALEOR_API_URL`, `saleorApiUrl`, generated `src/gql/`). De-branding is a **user-visible-surface** job only; renaming these breaks the build for zero customer benefit
