# FRONTEND.md — saleor-storefront

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind CSS 3 + Headless UI
- **Data**: urql 4 (GraphQL client) + @saleor/auth-sdk
- **Forms**: Formik + Yup validation
- **Payments**: Stripe + Adyen drop-in
- **Package manager**: pnpm 9

## Component Architecture

```
src/
  app/
    [channel]/(main)/    ← Page components (server + client)
    checkout/            ← Checkout page (client-heavy)
    api/                 ← Route Handlers (server-side only)
  checkout/
    components/          ← Checkout UI components
    hooks/               ← Checkout custom hooks
    graphql/             ← Checkout GraphQL operations
  lib/                   ← Shared utilities, urql setup
  generated/             ← Codegen output (DO NOT EDIT)
```

## GraphQL Development Workflow

1. Write operation in `.graphql` file next to component
2. Run `pnpm generate`
3. Import typed hook from `src/generated/`

```typescript
// Example generated usage:
import { useProductListQuery } from "@/generated";

const [{ data, fetching }] = useProductListQuery({
	variables: { channel: params.channel, first: 20 },
});
```

## Server vs Client Components

Next.js 15 defaults to Server Components. Rules:

- **Server**: data fetching, SEO-sensitive content, static layouts
- **Client** (`"use client"`): interactivity, hooks, browser APIs, payment UI

Checkout is client-heavy due to payment provider SDKs.
Product listing and detail pages should be server components where possible.

## Styling

Tailwind CSS 3. No CSS modules or styled-components.
Config: `tailwind.config.ts`
Custom classes: add to Tailwind config, not inline styles.

## Auth Pattern

```typescript
import { useAuthState } from "@saleor/auth-sdk/react";

const { authenticated, user } = useAuthState();
// Redirect to login if not authenticated
```

Server-side token validation via `@saleor/auth-sdk` server utilities.

## Channel Handling

Every page under `[channel]/` receives `params.channel` automatically.
Pass it to all Saleor queries:

```typescript
// ❌ Wrong — missing channel
const [{ data }] = useProductsQuery({ variables: { first: 10 } });

// ✓ Correct
const [{ data }] = useProductsQuery({
	variables: { first: 10, channel: params.channel },
});
```

## ERP Webhook Routes (src/app/api/erp/)

These are Next.js Route Handlers, server-side only.
All require `X-ERP-Secret` header validation:

```typescript
// Pattern used in all erp routes:
const secret = request.headers.get("X-ERP-Secret");
if (secret !== process.env.ERP_WEBHOOK_SECRET) {
	return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```
