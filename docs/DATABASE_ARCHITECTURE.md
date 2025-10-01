# Admin Dashboard Database Architecture

## Overview

This document describes the complete database architecture for the cannabis industry admin dashboard system. The design prioritizes security, compliance, performance, and scalability.

## Technology Stack

- **Database**: PostgreSQL 14+
- **ORM**: Drizzle ORM
- **Security**: PBKDF2 password hashing, SHA-256 token hashing
- **Compliance**: Immutable audit logs, data encryption for PII

## Schema Structure

### 1. Admin Users & Roles (`admin_users`, `admin_roles`)

**Purpose**: Manage administrator accounts with role-based access control (RBAC).

**Key Features**:
- Password security with PBKDF2 hashing (100,000 iterations)
- Two-factor authentication support
- Account lockout after failed attempts
- Granular permissions system
- Compliance tracking (terms acceptance)

**Indexes**:
- `admin_users_email_idx`: Fast email lookups for authentication
- `admin_users_role_idx`: Filter users by role
- `admin_users_active_idx`: Query active users
- `admin_users_last_login_idx`: Sort by recent activity

### 2. Session Management (`admin_sessions`)

**Purpose**: Track and secure admin sessions with JWT-like token management.

**Key Features**:
- Dual token system (access + refresh tokens)
- SHA-256 token hashing for storage
- Device fingerprinting
- IP location tracking
- Session revocation support

**Indexes**:
- `admin_sessions_user_idx`: Find sessions by user
- `admin_sessions_token_hash_idx`: Token validation (unique)
- `admin_sessions_status_idx`: Filter active sessions
- `admin_sessions_expires_idx`: Cleanup expired sessions
- `admin_sessions_ip_idx`: Security monitoring by IP

### 3. Audit Logging (`audit_logs`, `security_events`)

**Purpose**: Immutable audit trail for compliance and security monitoring.

**Key Features**:
- Denormalized user data for immutability
- Risk level scoring (0-10 scale)
- Compliance and security flags
- Request context tracking
- Change diff tracking

**Indexes**:
- `audit_logs_admin_user_idx`: User activity history
- `audit_logs_action_idx`: Filter by action type
- `audit_logs_entity_idx`: Track entity changes
- `audit_logs_created_at_idx`: Time-based queries
- `audit_logs_compliance_idx`: Compliance reports
- `audit_logs_security_idx`: Security investigations
- `audit_logs_risk_level_idx`: High-risk activity monitoring

### 4. Registration Analytics (`subscribers`, `subscriber_analytics`)

**Purpose**: Track registrations with enhanced analytics and campaign attribution.

**Key Features**:
- Multi-channel verification (email, mobile)
- UTM campaign tracking
- Engagement scoring
- Geographic data
- Consent management
- Soft delete support

**Indexes**:
- `subscribers_email_idx`: Email uniqueness (unique)
- `subscribers_mobile_idx`: Mobile uniqueness (unique)
- `subscribers_status_idx`: Status filtering
- `subscribers_created_at_idx`: Recent registrations
- `subscribers_source_idx`: Source analysis
- `subscribers_country_idx`: Geographic queries

### 5. Status & History (`admin_action_history`, `system_status`, `data_change_history`)

**Purpose**: Monitor system health and track all data modifications.

**Key Features**:
- Service health monitoring
- Performance metrics
- Change tracking with before/after values
- Action duration tracking
- Alert level management

**Indexes**:
- `admin_action_history_user_idx`: User action tracking
- `system_status_service_idx`: Service lookups
- `data_change_table_record_idx`: Entity change history

## Security Implementation

### Password Security

```typescript
// PBKDF2 with 100,000 iterations
salt + SHA-512 hash storage
Minimum 12 characters
Complexity requirements enforced
Password history tracking
```

### Session Security

```typescript
Access Token: 15 minutes expiry
Refresh Token: 7 days expiry
Session Maximum: 30 days
Token Rotation on refresh
IP validation
Device fingerprinting
```

### Data Encryption

```typescript
Algorithm: AES-256-GCM
Key Derivation: PBKDF2
Fields: PII, sensitive data
At-rest encryption for backups
```

## Performance Optimization

### Indexing Strategy

1. **Primary Lookups**: Unique indexes on emails, usernames, tokens
2. **Foreign Keys**: Indexed for join performance
3. **Time-based Queries**: Indexed created_at/updated_at
4. **Status Filters**: Indexed enum fields
5. **Compound Indexes**: For complex query patterns

### Query Optimization

```sql
-- Example: Optimized subscriber query with multiple filters
SELECT * FROM subscribers
WHERE status = 'active'
  AND country = 'US'
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC
LIMIT 50;

-- Uses indexes: status_idx, country_idx, created_at_idx
```

### Partitioning Strategy (Future)

For tables exceeding 10M rows:
- `audit_logs`: Monthly partitions by created_at
- `subscribers`: Range partitions by created_at
- `subscriber_analytics`: Daily partitions by date

## Compliance Features

### Cannabis Industry Compliance

1. **Age Verification**: Mandatory age_verified flag
2. **Audit Trail**: Immutable logging of all actions
3. **Data Retention**: Configurable retention policies
4. **Consent Tracking**: Marketing and data processing consent
5. **Geographic Restrictions**: Country/state validation

### GDPR/CCPA Compliance

1. **Right to Access**: Data export functionality
2. **Right to Delete**: Soft delete with audit trail
3. **Consent Management**: Granular consent tracking
4. **Data Portability**: JSON/CSV export formats
5. **Breach Notification**: Security event tracking

## Migration Strategy

### Initial Setup

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:push

# Seed initial data
npm run db:seed
```

### Version Control

All migrations stored in `/drizzle` directory:
- Timestamp-based naming
- Atomic operations
- Rollback support
- Schema versioning

## Backup & Recovery

### Backup Strategy

```bash
# Daily backups
pg_dump -Fc database > backup_$(date +%Y%m%d).dump

# Point-in-time recovery
pg_basebackup -D /backup/base -Fp -Xs -P

# Encrypted backups
pg_dump | gpg -c > backup.sql.gpg
```

### Recovery Procedures

1. **Full Recovery**: Restore from latest backup
2. **Point-in-Time**: Use WAL archives
3. **Partial Recovery**: Table-specific restoration
4. **Audit Recovery**: Immutable logs ensure compliance

## Monitoring & Alerts

### Key Metrics

- Connection pool usage
- Query performance (>100ms warning)
- Lock contention
- Index usage statistics
- Table bloat
- Replication lag

### Alert Thresholds

```yaml
critical:
  - connection_pool > 90%
  - query_time > 1000ms
  - lock_wait > 30s
  - replication_lag > 60s

warning:
  - connection_pool > 70%
  - query_time > 500ms
  - table_bloat > 30%
  - failed_logins > 10/min
```

## Scaling Considerations

### Horizontal Scaling

1. **Read Replicas**: For analytics queries
2. **Connection Pooling**: PgBouncer for connection management
3. **Caching Layer**: Redis for session storage
4. **CDN**: For static content

### Vertical Scaling

1. **Initial**: 2 vCPU, 4GB RAM, 100GB SSD
2. **Growth**: 4 vCPU, 16GB RAM, 500GB SSD
3. **Scale**: 8+ vCPU, 32GB+ RAM, 1TB+ SSD
4. **Enterprise**: Dedicated cluster with HA

## Database Maintenance

### Regular Tasks

```sql
-- Weekly
VACUUM ANALYZE;

-- Monthly
REINDEX DATABASE dbname;

-- Quarterly
CLUSTER subscribers USING subscribers_created_at_idx;
```

### Health Checks

```sql
-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

## Security Checklist

- [ ] SSL/TLS connections enforced
- [ ] Network isolation (VPC)
- [ ] Encryption at rest enabled
- [ ] Regular security updates
- [ ] Audit logging enabled
- [ ] Backup encryption
- [ ] Access control lists
- [ ] Password complexity enforced
- [ ] Session timeout configured
- [ ] Rate limiting implemented

## Future Enhancements

1. **Row-Level Security**: Implement PostgreSQL RLS
2. **Time-Series Data**: TimescaleDB for analytics
3. **Full-Text Search**: PostgreSQL FTS or Elasticsearch
4. **Graph Relationships**: GraphQL integration
5. **Real-time Sync**: PostgreSQL logical replication
6. **Data Warehouse**: Separate OLAP system
7. **Blockchain Audit**: Immutable audit chain
8. **ML Analytics**: Predictive analytics integration