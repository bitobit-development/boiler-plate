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
- `npx tsx scripts/verify-online-cart-schema.ts` - Verify online cart schema (Phase 1)

### Testing Scripts
- `npx tsx scripts/test-international-sms.ts` - Test SMS to international numbers (Clickatell API)
- `npx tsx scripts/test-pending-order-sms.ts` - Test pending order SMS notifications
- `npx tsx scripts/test-create-pending-order-with-sms.ts` - Integration test: Create pending order with SMS
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

## AI Agents Reference

### Strategy Division
- **Rotem** (`rotem-strategy`) - Project orchestrator for multi-agent coordination, task breakdown, and quality gates
- **Eyal** (`eyal-strategy`) - Technical architect for system design, technology evaluation, and strategic planning

### Design Division
- **Tal** (`tal-design`) - Frontend engineer for UI/UX, React components, responsive design, and accessibility

### Engineering Division
- **Adi** (`adi-fullstack`) - Fullstack engineer for complete features (database to UI integration)
- **Oren** (`oren-backend`) - Backend specialist for APIs, performance optimization, and security
- **Gal** (`gal-database`) - Database architect for schema design, query optimization, and data modeling

### Quality Division
- **Uri** (`uri-testing`) - Testing engineer for TDD, Jest, integration tests, and coverage analysis
- **Maya** (`maya-code-review`) - Code reviewer for quality, security, performance, and best practices

### Documentation Division
- **Yael** (`yael-technical-docs`) - Technical writer for user guides, architecture docs, and onboarding
- **Amit** (`amit-api-docs`) - API documentation specialist for OpenAPI/Swagger and endpoint references

### Tooling Division
- **Noam** (`noam-prompt-engineering`) - Prompt engineer for crafting and optimizing AI prompts

### Usage Patterns
- **Direct invocation**: "Tal, create a responsive product card component"
- **Multi-agent coordination**: "Rotem, build a user registration system"
- **Specific agent**: Use the agent name in your request

### Agent Selection Guide
- **UI work only** → Tal
- **Backend only** → Oren
- **Database design** → Gal
- **Full feature (UI + backend)** → Adi
- **Complex multi-agent project** → Rotem
- **Architecture decisions** → Eyal
- **Testing** → Uri (mandatory before completion)
- **Code review** → Maya
- **Documentation** → Yael (technical) or Amit (API)

## Important Notes
- Always use absolute paths in file operations
- Prefer editing existing files over creating new ones
- Don't create documentation unless explicitly requested
- Use shadcn MCP tool for UI components
- Product images must be 1792x1024 (landscape) for card layout
- All product images use clean white backgrounds (see `docs/dalle-prompt-templates.md`)
