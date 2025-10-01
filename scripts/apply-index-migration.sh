#!/bin/bash

# Script to apply subscriber index optimization migration
# This migration adds performance indexes to dramatically speed up queries

set -e

echo "=========================================="
echo "Subscriber Index Optimization Migration"
echo "=========================================="
echo ""
echo "This migration will add the following indexes:"
echo "1. Status and temporal indexes for filtering"
echo "2. Composite indexes for common query patterns"
echo "3. Trigram indexes for fast text search (ILIKE)"
echo "4. Specialized partial indexes for specific queries"
echo "5. JSON indexes for tags and custom fields"
echo ""
echo "Expected improvements:"
echo "- 5-10x faster query performance"
echo "- Sub-second response times for pagination"
echo "- Efficient text search across multiple fields"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Error: .env.local file not found!"
    echo "Please ensure DATABASE_URL_UNPOOLED is set in .env.local"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep DATABASE_URL_UNPOOLED | xargs)

if [ -z "$DATABASE_URL_UNPOOLED" ]; then
    echo "Error: DATABASE_URL_UNPOOLED not found in .env.local"
    exit 1
fi

echo "Database URL found. Proceeding with migration..."
echo ""

# Option 1: Using Drizzle Kit (recommended)
echo "Option 1: Apply using Drizzle Kit (recommended)"
echo "Run: npm run db:push"
echo ""

# Option 2: Direct SQL execution
echo "Option 2: Apply directly using psql"
echo "Run: psql $DATABASE_URL_UNPOOLED -f drizzle/0003_optimize_subscriber_indexes.sql"
echo ""

# Option 3: Using Drizzle migration
echo "Option 3: Apply using Drizzle migrate"
echo "Run: npx drizzle-kit migrate"
echo ""

read -p "Choose option (1/2/3) or 'q' to quit: " choice

case $choice in
    1)
        echo "Running: npm run db:push"
        npm run db:push
        ;;
    2)
        echo "Applying migration directly via psql..."
        psql "$DATABASE_URL_UNPOOLED" -f drizzle/0003_optimize_subscriber_indexes.sql
        echo "Migration applied successfully!"
        ;;
    3)
        echo "Running: npx drizzle-kit migrate"
        npx drizzle-kit migrate
        ;;
    q|Q)
        echo "Migration cancelled."
        exit 0
        ;;
    *)
        echo "Invalid option. Migration cancelled."
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Migration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test the admin dashboard registration queries"
echo "2. Monitor query performance in your logs"
echo "3. Run EXPLAIN ANALYZE on slow queries to verify index usage"
echo ""
echo "To verify indexes were created, run:"
echo "psql $DATABASE_URL_UNPOOLED -c \"\\di *subscribers*\""