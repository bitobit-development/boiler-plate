# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` - Starts Next.js development server with Turbopack
- **Build**: `npm run build` - Creates production build with Turbopack
- **Production**: `npm start` - Starts production server
- **Lint**: `npm run lint` - Runs ESLint (basic command, may need configuration)

## Testing Commands

- **Run Tests**: `npm test` - Runs Jest test suite
- **Watch Tests**: `npm run test:watch` - Runs tests in watch mode for development
- **Test Coverage**: `npm run test:coverage` - Runs tests with coverage reports
- **CI Tests**: `npm run test:ci` - Runs tests in CI mode (no watch, with coverage)
- **TDD Mode**: `npm run test:tdd` - Runs tests in TDD mode with verbose output
- **Integration Tests**: `npm run test:integration` - Runs integration tests only
- **Unit Tests**: `npm run test:unit` - Runs specific unit tests for core modules

Note: Always terminate any running processes on port 3000 before starting development server.

## Architecture Overview

This is a Next.js 15.5.4 application with the App Router architecture:

### Tech Stack
- **Framework**: Next.js 15.5.4 with React 19.1.0
- **Build Tool**: Turbopack (experimental)
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **UI Components**: shadcn/ui configured (New York style)
- **Icons**: Lucide React
- **Fonts**: Geist Sans and Geist Mono
- **TypeScript**: Strict mode enabled
- **Testing**: Jest with ts-jest preset, custom TDD configuration

### Project Structure
```
src/
├── app/                 # App Router pages and layouts
│   ├── layout.tsx      # Root layout with fonts and metadata
│   ├── page.tsx        # Home page component
│   └── globals.css     # Global Tailwind styles
└── lib/
    └── utils.ts        # Utility functions (cn helper for class merging)

.claude/                 # Claude Code configuration and sub-agents
└── agents/             # Specialized AI agents with Israeli names
    ├── tooling/noam/   # Noam - Prompt Engineering Agent
    │   ├── agent.json
    │   ├── system-prompt.md
    │   ├── guidelines.md
    │   ├── examples.md
    │   └── templates/  # 8 prompt templates
    ├── design/tal/     # Tal - Senior Front-End Engineer (Design-focused)
    │   ├── agent.json
    │   ├── system-prompt.md
    │   ├── guidelines.md
    │   ├── examples.md
    │   └── patterns/   # 6 design patterns
    ├── engineering/adi/ # Adi - Fullstack Engineer
    │   ├── agent.json
    │   ├── system-prompt.md
    │   ├── guidelines.md
    │   ├── examples.md
    │   └── patterns/   # 8 fullstack patterns
    └── quality/uri/    # Uri - Testing Engineer
        ├── agent.json
        ├── system-prompt.md
        ├── guidelines.md
        ├── examples.md
        └── patterns/   # 6 testing patterns
```

### Key Configuration
- **TypeScript**: Strict mode, ES2017 target, path aliases (`@/*` → `./src/*`)
- **ESLint**: Next.js core-web-vitals and TypeScript presets
- **shadcn/ui**: Configured with aliases for `@/components`, `@/lib`, `@/ui`, `@/hooks`
- **Tailwind**: CSS variables enabled, neutral base color
- **Jest**: Configured for TDD with custom matchers, test timeouts, and watch plugins

### Development Notes
- Uses App Router (not Pages Router)
- Components should follow shadcn/ui patterns and use the `cn()` utility from `@/lib/utils`
- Path aliases are configured for clean imports
- Turbopack is enabled for faster development builds
- Test-driven development setup with custom Jest matchers and utilities
- Tests are organized by module with dedicated integration test suite

## Claude Code Agents

This project uses specialized AI agents with Israeli names for easy invocation. Each agent has a specific focus area and expertise.

### All Available Agents

#### 🎯 Strategy
- **Eyal** - `.claude/agents/strategy/eyal/` - Architectural planning and technical strategy
- **Rotem** - `.claude/agents/strategy/rotem/` - Strategic planning and technical decisions

#### 🎨 Design
- **Tal** - `.claude/agents/design/tal/` - Senior Front-End Engineer (UI/UX, React components, Tailwind, accessibility)

#### ⚙️ Engineering
- **Adi** - `.claude/agents/engineering/adi/` - Fullstack Engineer (APIs, Server Actions, end-to-end features)
- **Oren** - `.claude/agents/engineering/oren/` - Backend Services Engineer (microservices, specialized backend)
- **Gal** - `.claude/agents/engineering/gal/` - Engineering specialist

#### 💾 Data
- **Gal** - `.claude/agents/data/gal/` - Database architecture and data modeling

#### 🧪 Quality
- **Uri** - `.claude/agents/quality/uri/` - Testing Engineer (TDD, test automation, coverage)
- **Maya** - `.claude/agents/quality/maya/` - Code review and quality assurance

#### 📚 Documentation
- **Yael** - `.claude/agents/documentation/yael/` - Technical writing and documentation
- **Amit** - `.claude/agents/documentation/amit/` - API documentation specialist

#### 🔧 Tooling
- **Noam** - `.claude/agents/tooling/noam/` - Prompt engineering and optimization

### Key Agents Detail

#### 🎨 **Tal** - Senior Front-End Engineer
**What Tal does:**
- React/Next.js component design and implementation
- Responsive, mobile-first layouts
- WCAG 2.1 AA accessibility compliance
- Tailwind CSS styling (exclusively)
- shadcn/ui integration
- Animations and micro-interactions
- TypeScript type-safe components

**What Tal does NOT do:**
- Backend APIs or Server Actions
- Database operations
- Business logic
- Authentication/authorization

**Example**: "Tal, design a responsive registration form with validation and accessibility"

#### ⚙️ **Adi** - Fullstack Engineer
**What Adi does:**
- Payload CMS collections, hooks, and endpoints
- MongoDB schema design and operations
- Next.js Server Actions and API Routes
- REST and GraphQL APIs
- Multi-platform support (Next.js, React Native, Remix.js)
- Third-party API integrations
- Authentication and authorization
- End-to-end TypeScript type safety
- Payment processing integrations

**What Adi does NOT do:**
- Pure UI design/styling (Tal handles this)
- Testing (Uri handles this)
- Documentation (Yael and Amit handle this)

**Tech Stack:**
- Backend: Payload CMS, MongoDB, Node.js, Express
- Frontend: Next.js 15, React Native, Remix.js
- APIs: REST, GraphQL, Webhooks
- Validation: Zod, Mongoose schemas

**Example**: "Adi, build a user registration system with email verification and database storage"

#### 🧪 **Uri** - Testing Engineer
**What Uri does:**
- Unit tests (functions, utilities, business logic)
- Integration tests (APIs, Server Actions, database operations)
- Component tests (React components with user interactions)
- TDD workflow guidance (Red-Green-Refactor cycle)
- Test coverage analysis and gap identification
- Mocking strategies (MSW for HTTP, Jest mocks)
- Test organization and structure

**What Uri does NOT do:**
- Writing application code (only tests)
- Code review (Maya handles this)
- Documentation (Yael and Amit handle this)

**Testing Philosophy:**
- Test-Driven Development (strict TDD enforcement)
- 80% minimum coverage target (100% for critical paths)
- AAA pattern (Arrange-Act-Assert)
- Minimal, smart mocking (mock at boundaries, test real implementations)
- Fast execution (< 30s unit tests, < 2min integration tests)

**Tech Stack:**
- Test Runner: Jest 29+
- Component Testing: React Testing Library
- API Testing: Supertest, MSW (Mock Service Worker)
- Database Testing: MongoDB Memory Server
- E2E: Playwright (when needed)

**Example**: "Uri, test the registration Server Action with TDD approach"

### Agent Documentation

See `.claude/agents/README.md` for complete agent directory and invocation guide.

### Typical Workflow

1. **Strategy**: Eyal/Rotem plan architecture and technical approach
2. **Data Design**: Gal designs database schema and data models
3. **UI Design**: Tal designs and implements components
4. **Backend**: Adi/Oren build APIs, Server Actions, and integrations
5. **Testing**: Uri writes comprehensive test coverage
6. **Quality**: Maya reviews code quality
7. **Documentation**: Yael/Amit create technical and API documentation
8. **Optimization**: Noam optimizes AI prompts and workflows

## Project Context
This appears to be a fresh Next.js boilerplate with shadcn/ui integration, ready for cannabis industry registration application development based on user requirements.