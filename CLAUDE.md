# CLAUDE.md - Essential Project Guide

## Project Context
- **Type**: Cannabis industry e-commerce platform (Next.js 15.5.4 + Drizzle ORM)
- **Admin Access**: admin@biggbuzz.com / admin123
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

### Database
- `npx tsx src/lib/db/seed.ts` - Seed admin user & sample data

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
