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

tests/                   # Jest test suite
├── setup.ts            # Custom test setup with TDD utilities
├── *.test.ts           # Unit tests for specific modules
└── integration.test.ts # Integration tests
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

## Project Context
This appears to be a fresh Next.js boilerplate with shadcn/ui integration, ready for cannabis industry registration application development based on user requirements.