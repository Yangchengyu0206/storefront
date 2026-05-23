# ARCHITECTURE.md — storefront/src/app/

Next.js 15 App Router pages and API routes.

## Directory Structure

```
src/app/
  [channel]/          ← Dynamic segment; channel slug in every URL
    (main)/           ← Route group (no URL segment)
      products/[slug]/    Product detail
      categories/[slug]/  Category listing
      collections/[slug]/ Collection listing
      cart/               Shopping cart
      login/              Auth
      orders/             Order history
      search/             Search results
      pages/[slug]/       CMS pages
  checkout/           ← No [channel] — uses query param instead
  api/
    erp/              ← ERP webhook receivers (server-side only)
      inventory/      POST — inventory sync
      orders/         POST — order status sync
      webhook/        POST — generic event
    draft/
      disable/        GET — disable Next.js draft mode
  page.tsx            ← Root redirect to [channel]
  layout.tsx          ← Root layout (providers, fonts)
```

## Key Patterns

### Channel-aware pages

Every page under `[channel]/` receives `params: { channel: string }`.
Always pass to Saleor GraphQL queries:

```typescript
export default async function ProductsPage({ params }: { params: { channel: string } }) {
	const products = await fetchProducts({ channel: params.channel });
}
```

### Server vs Client Components

- Default: Server Component (no `"use client"`)
- Use `"use client"` for: payment UI, interactive forms, hooks, browser APIs
- Checkout pages are mostly client components (payment SDK requirement)

### ERP Routes Auth Pattern

```typescript
// All src/app/api/erp/* routes:
const secret = req.headers.get("X-ERP-Secret");
if (secret !== process.env.ERP_WEBHOOK_SECRET) {
	return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

## Checkout Caveat

`src/app/checkout/` is separate from `src/checkout/` (components directory).

- `src/app/checkout/` — Next.js page (the route)
- `src/checkout/` — reusable checkout components, hooks, GraphQL ops
