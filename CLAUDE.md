# CLAUDE.md - Essential Project Guide

## Project Context
- **Type**: Cannabis industry e-commerce platform (Next.js 15.5.4 + Drizzle ORM)
- **Admin Access**: admin@biggbuzz.com / admin123
- **Shop User Access**: foodtruck@biggbuzz.com / Tsitsi2025!! (POS Kiosk only)
- **Database**: PostgreSQL (connection in .env.local)
- **Port**: Always use 3000 (run `npx kill-port 3000` if blocked)

## Essential Commands

### Development
- `npm run dev` - Start dev server (port 3000)
- `npm run build` - Production build
- `npm start` - Start production server

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - TDD watch mode
- `npm run test:coverage` - Coverage report

### Product Management
- `npm run products:generate-images` - Generate AI product images (DALL-E 3)
- `npm run products:verify-images` - Verify all product images exist
- `npx tsx scripts/seed-products.ts` - Seed product database
- `npm run products:check` - Check product data integrity
- `npx tsx scripts/check-product-prices.ts` - Check product pricing
- `npx tsx scripts/check-products.ts` - Verify product data
- `npx tsx scripts/update-product-prices.ts` - Update product prices
- `npx tsx scripts/update-inventory.ts` - Update inventory levels

### Database & Seeding
- `npx tsx src/lib/db/seed.ts` - Seed admin user & sample data
- `npx tsx scripts/seed-admin-user.ts` - Seed admin user only
- `npx tsx scripts/seed-shop-user.ts` - Seed shop/POS user

### Testing Scripts
- `npx tsx scripts/test-international-sms.ts` - Test SMS to international numbers (Clickatell API)
- `npx tsx scripts/test-admin-orders.ts` - Test admin orders functionality
- `npx tsx scripts/test-orders-page.ts` - Test orders page
- `npx tsx scripts/test-pos-order.ts` - Test POS order creation
- `npx tsx scripts/test-product-actions.ts` - Test product actions
- `npx tsx scripts/test-products-api.ts` - Test products API
- `npx tsx scripts/test-stock-levels.ts` - Test stock levels

### Session & Auth Management
- `npx tsx scripts/check-admin-sessions.ts` - Check admin sessions
- `npx tsx scripts/check-sessions.ts` - Check all sessions
- `npx tsx scripts/clear-admin-session.ts` - Clear admin session
- `npx tsx scripts/clear-all-sessions.ts` - Clear all sessions
- `npx tsx scripts/cleanup-sessions.ts` - Cleanup old sessions
- `npx tsx scripts/check-haim-otp.ts` - Check OTP for test user
- `npx tsx scripts/get-haim-otp-code.ts` - Get OTP code for test user

### Audit & Debugging
- `npx tsx scripts/check-audit-logs.ts` - Check audit logs
- `npx tsx scripts/apply-audit-indexes.ts` - Apply audit indexes

### Subscriber Management
- `npx tsx scripts/create-demo-registration.ts` - Create demo registration
- `npx tsx scripts/find-israeli-subscribers.ts` - Find Israeli subscribers
- `npx tsx scripts/fix-malformed-phone-numbers.ts` - Fix phone number format

## Tech Stack
- **Framework**: Next.js 15.5.4 (App Router) + React 19.1.0
- **Database**: PostgreSQL via Drizzle ORM
- **Styling**: Tailwind CSS v4 + shadcn/ui (New York style)
- **UI**: shadcn/ui components + Lucide icons
- **Testing**: Jest + React Testing Library
- **AI**: OpenAI API (DALL-E 3 for product images)
- **Build**: Turbopack (experimental)
- **TypeScript**: Strict mode, path aliases (@/*)

## Key Directories
```
src/
├── app/              # Next.js App Router pages & layouts
├── components/       # React components (shadcn/ui)
├── lib/              # Utilities, DB, integrations
└── server/           # Server Actions

scripts/              # Management scripts
├── generate-product-images.ts    # AI image generation
├── verify-images.ts              # Image verification
└── seed-products.ts              # Product seeding

public/images/products/           # AI-generated product images (1792x1024)
```

## AI Agents Quick Reference
- **Rotem** (Strategy) - Architecture & technical planning
- **Tal** (Frontend) - React components, UI/UX, Tailwind CSS
- **Adi** (Fullstack) - APIs, Server Actions, database operations
- **Uri** (Testing) - TDD, unit/integration tests
- **Noam** (Prompts) - AI prompt engineering
- **Yael** (Docs) - Technical documentation

**Usage**: `@agent-[name]` or "Hey [Name], [task]"
**Example**: "Tal, create a responsive product card component"

## Important Notes
- Always use absolute paths in file operations
- Prefer editing existing files over creating new ones
- Don't create documentation unless explicitly requested
- Use shadcn MCP tool for UI components
- Product images must be 1792x1024 (landscape) for card layout
- All product images use clean white backgrounds (see `docs/dalle-prompt-templates.md`)
