# Phase 1: Database Architecture Implementation
## Instructions for Gal (Database Architect)

### Immediate Objectives
You are tasked with designing and implementing the complete database architecture for the Bigg Buzz admin dashboard system. This is Phase 1 of our 5-phase implementation plan.

### Context
- **Project**: Cannabis registration system admin dashboard
- **Current Stack**: Next.js 15, PostgreSQL with Drizzle ORM
- **Timeline**: Days 1-7 of implementation
- **Dependencies**: This phase blocks all subsequent phases

### Deliverables Required

#### 1. Core Admin Database Schema
Design and implement the following tables with Drizzle ORM:

**Admin Users Table** (`admin_users`)
```typescript
// Required fields:
- id: UUID primary key
- email: Unique, indexed
- password_hash: Bcrypt hashed
- role: ENUM ('super_admin', 'admin', 'viewer')
- first_name: VARCHAR(100)
- last_name: VARCHAR(100)
- created_at: Timestamp
- updated_at: Timestamp
- last_login: Nullable timestamp
- is_active: Boolean default true
- two_factor_enabled: Boolean default false
- two_factor_secret: Nullable, encrypted
- ip_whitelist: Array of strings (JSONB)
- failed_login_attempts: Integer default 0
- locked_until: Nullable timestamp
```

**Admin Sessions Table** (`admin_sessions`)
```typescript
// Required fields:
- id: UUID primary key
- admin_user_id: Foreign key to admin_users
- token: Unique, indexed
- refresh_token: Unique, indexed
- expires_at: Timestamp
- refresh_expires_at: Timestamp
- ip_address: INET
- user_agent: TEXT
- created_at: Timestamp
- revoked_at: Nullable timestamp
- revoked_reason: Nullable VARCHAR
```

**Audit Logs Table** (`audit_logs`)
```typescript
// Required fields:
- id: UUID primary key
- admin_user_id: Foreign key to admin_users
- action: VARCHAR(100) // e.g., 'UPDATE_REGISTRATION', 'DELETE_USER'
- entity_type: VARCHAR(50) // e.g., 'registration', 'user'
- entity_id: UUID
- old_values: JSONB
- new_values: JSONB
- metadata: JSONB // Additional context
- ip_address: INET
- timestamp: Timestamp with timezone
- success: Boolean
- error_message: Nullable TEXT
```

#### 2. Enhanced Registration Tracking Tables

**Registration Analytics Table** (`registration_analytics`)
```typescript
// Daily aggregated metrics:
- id: UUID primary key
- date: DATE unique
- total_registrations: Integer
- completed_registrations: Integer
- pending_registrations: Integer
- failed_registrations: Integer
- average_completion_time: Interval
- conversion_rate: Decimal(5,2)
- unique_visitors: Integer
- by_source: JSONB // Traffic sources breakdown
- by_location: JSONB // Geographic breakdown
- created_at: Timestamp
- updated_at: Timestamp
```

**Registration Status History** (`registration_status_history`)
```typescript
// Track all status changes:
- id: UUID primary key
- registration_id: Foreign key
- previous_status: VARCHAR(50)
- new_status: VARCHAR(50)
- changed_by: Nullable foreign key to admin_users
- change_reason: TEXT
- automated: Boolean default false
- timestamp: Timestamp with timezone
```

#### 3. Database Security Implementation

**Row-Level Security Policies**
```sql
-- Implement RLS for all tables
-- Admin users can only see their own sessions
-- Audit logs are append-only
-- Super admins have full access
-- Regular admins have restricted access
-- Viewers have read-only access
```

**Field Encryption**
- Implement encryption for sensitive fields:
  - `two_factor_secret` in admin_users
  - `old_values` and `new_values` in audit_logs (if containing PII)
  - Any payment or sensitive registration data

**Indexes for Performance**
```sql
-- Create appropriate indexes:
- admin_users: email, role, is_active
- admin_sessions: token, admin_user_id, expires_at
- audit_logs: admin_user_id, entity_type, entity_id, timestamp
- registration_analytics: date, created_at
```

### Technical Requirements

#### Drizzle ORM Schema Files
Create the following structure:
```
src/lib/db/
├── schema/
│   ├── admin.ts         // Admin-related tables
│   ├── analytics.ts     // Analytics tables
│   ├── audit.ts         // Audit log tables
│   └── index.ts         // Export all schemas
├── migrations/
│   └── [timestamp]_admin_system.sql
└── seed/
    └── admin-seed.ts    // Initial admin user and test data
```

#### Migration Scripts
1. Create migration for all new tables
2. Include rollback procedures
3. Add seed data for development:
   - One super admin user
   - Two regular admin users
   - One viewer user
   - Sample audit logs
   - Sample analytics data

#### Type Safety
Generate TypeScript types for all tables:
```typescript
// Example type generation
export type AdminUser = InferModel<typeof adminUsers>;
export type NewAdminUser = InferModel<typeof adminUsers, 'insert'>;
export type AdminSession = InferModel<typeof adminSessions>;
// ... etc
```

### Integration Points

#### With Authentication System (Phase 2)
- Provide types for admin user queries
- Session validation functions
- Password hashing utilities
- Role checking helpers

#### With Frontend (Phase 3)
- Type-safe query builders
- Pagination utilities
- Filter/search helpers
- Aggregation queries for analytics

### Testing Requirements

Create test files for:
1. Schema validation
2. Migration up/down
3. RLS policies
4. Query performance
5. Data integrity constraints

### Documentation Requirements

Document the following:
1. ERD diagram of all tables and relationships
2. Index strategy and rationale
3. Security measures implemented
4. Query examples for common operations
5. Backup and recovery procedures

### Success Criteria

Your implementation will be considered complete when:
1. All tables are created with proper constraints
2. Migrations run successfully up and down
3. RLS policies are in place and tested
4. Seed data loads without errors
5. All TypeScript types are generated
6. Documentation is complete
7. Tests pass with >95% coverage

### Getting Started

1. Review the existing database setup in `drizzle.config.ts`
2. Check current tables in `src/lib/db/schema/`
3. Create new schema files for admin system
4. Generate and run migrations
5. Implement seed data
6. Write tests
7. Document your design decisions

### Questions to Address

Before starting, consider:
1. Should we use UUID or CUID2 for IDs?
2. What's the retention policy for audit logs?
3. How should we handle soft deletes vs hard deletes?
4. What's the backup strategy for admin data?
5. Should we implement data partitioning for large tables?

### Handoff to Phase 2

Upon completion, provide:
1. Complete schema files
2. Migration scripts
3. Type definitions
4. Query helper functions
5. Documentation
6. Test coverage report

---

**Phase Start**: Immediate
**Expected Completion**: 2-3 days
**Next Phase**: Authentication System (Adi)
**Questions**: Contact Rotem for clarification