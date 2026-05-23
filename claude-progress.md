# Claude Progress — saleor-storefront

# Update this file at the start and end of every session.

## Current State (2026-05-23)

### Completed

- Full storefront with Next.js 15 App Router
- Product listing, categories, collections, search
- Product detail pages
- Shopping cart
- Checkout flow (Stripe + Adyen payments)
- Auth via @saleor/auth-sdk
- Order history
- CMS pages
- ERP integration webhook endpoints (`src/app/api/erp/`)
- GraphQL codegen configured (.graphqlrc.ts)

### Known Issues

- None tracked — add issues here as discovered

## Active Work

None — clean state.

## Next Steps

- Add items here when starting new work

## Environment Checklist

Before starting dev session, verify:

- [ ] saleor-platform running (`docker compose up` in saleor-platform/)
- [ ] `NEXT_PUBLIC_SALEOR_API_URL` set in `.env.local`
- [ ] `pnpm install` up to date
- [ ] `pnpm generate` run if any .graphql files changed

## Relationship to Other Projects

- **saleor-platform** (`c:\Users\CHENG\saleor-platform`): Saleor API + Dashboard + DB
- **full-stack-fastapi-new** (`c:\Users\CHENG\Desktop\full-stack-fastapi-new`): Admin dashboard, ECPay, AI Copilot
