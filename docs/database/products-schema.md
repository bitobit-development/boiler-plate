# Products Database Schema Documentation

## Overview

This document describes the complete database schema for the shop/specials feature of the Bigg Buzz cannabis collective platform. The schema is designed using PostgreSQL with Drizzle ORM and follows best practices for scalability, performance, and compliance.

## Database Tables

### 1. Product Categories (`product_categories`)

Hierarchical category structure for organizing products.

#### Key Fields:
- `id`: UUID primary key
- `name`: Category display name
- `slug`: URL-friendly identifier (unique)
- `parentId`: Reference to parent category (for subcategories)
- `depth`: Nesting level (0 for root categories)
- `sortOrder`: Display ordering
- `productCount`: Denormalized count for performance
- `isActive`, `isFeatured`: Visibility flags

#### Indexes:
- Unique on `slug`
- Index on `parentId`, `sortOrder`, `isActive`, `isFeatured`

### 2. Products (`products`)

Main product catalog table with comprehensive attributes.

#### Key Fields:

**Basic Information:**
- `id`: UUID primary key
- `name`: Product name
- `slug`: URL-friendly identifier (unique)
- `categoryId`: Foreign key to categories
- `sku`: Stock keeping unit (unique)
- `productType`: Enum (pre_roll, dab, edible, vape, etc.)

**Pricing (stored in cents):**
- `price`: Current selling price
- `comparePrice`: Original price for discounts
- `costPrice`: Internal cost tracking

**Variants:**
- `variantOf`: Parent product ID
- `variantLabel`: e.g., "x1", "x2", "x3"
- `sortVariantOrder`: Display ordering

**Inventory:**
- `quantity`: Total stock
- `reservedQuantity`: Reserved for pending orders
- `trackQuantity`: Enable inventory tracking
- `allowBackorder`: Allow orders when out of stock
- `lowStockThreshold`: Alert threshold

**Cannabis Attributes:**
- `weight`: Product weight/quantity
- `potency`: THC/CBD strength description
- `strain`: Sativa/Indica/Hybrid
- `thcContent`, `cbdContent`: Percentage values
- `terpenes`, `effects`, `flavorProfile`: JSON arrays

**Membership:**
- `requiresMembership`: Access restriction flag
- `membershipTiers`: Array of allowed tiers

#### Indexes:
- Unique on `slug`, `sku`
- Index on `categoryId`, `status`, `isVisible`, `isFeatured`
- Composite indexes for common query patterns

### 3. Price History (`price_history`)

Audit trail for all price changes (regulatory compliance).

#### Key Fields:
- `productId`: Foreign key to products
- `oldPrice`, `newPrice`: Price change details
- `priceDifference`, `percentageChange`: Calculated metrics
- `reason`: Change justification
- `changeType`: manual, bulk_update, promotion, etc.
- `changedBy`: Admin user reference
- `effectiveFrom`, `effectiveUntil`: Time boundaries
- `batchId`: For grouping bulk updates

#### Indexes:
- Index on `productId`, `changedBy`, `createdAt`, `batchId`

### 4. Inventory Movements (`inventory_movements`)

Optional table for detailed inventory tracking.

#### Key Fields:
- `productId`: Foreign key to products
- `movementType`: addition, removal, adjustment, etc.
- `quantity`: Change amount (positive/negative)
- `previousQuantity`, `newQuantity`: Stock levels
- `referenceType`, `referenceId`: Link to orders/returns
- `batchNumber`, `expiryDate`: Lot tracking

### 5. Product Attributes (`product_attributes`)

Extensible key-value pairs for additional product data.

#### Key Fields:
- `productId`: Foreign key to products
- `attributeKey`, `attributeValue`: Flexible storage
- `attributeType`: text, number, boolean, json
- `displayOrder`: Sorting for display

## Enums

### ProductType
- `pre_roll` - Pre-rolled joints
- `dab` - Cannabis concentrates
- `edible` - THC-infused edibles
- `vape` - THC vape cartridges
- `flower` - Cannabis flower
- `concentrate` - Other concentrates
- `accessory` - Related accessories

### ProductStatus
- `draft` - Not published
- `active` - Available for purchase
- `archived` - Removed from catalog
- `out_of_stock` - Temporarily unavailable

### MembershipTier
- `basic` - Entry-level membership
- `premium` - Enhanced benefits
- `vip` - Exclusive access
- `founding` - Original members

## Key Design Decisions

### 1. Price Storage in Cents
Prices are stored as integers in cents (R250.00 = 25000) to avoid floating-point precision issues and ensure accurate financial calculations.

### 2. Variant Management
Products can have variants (e.g., "Indoor x1", "Indoor x2") linked via `variantOf` field, allowing shared attributes while maintaining individual inventory.

### 3. Denormalized Fields
Strategic denormalization (e.g., `productCount` in categories) for query performance, with triggers or application logic to maintain consistency.

### 4. Audit Trail
Comprehensive price history tracking for regulatory compliance and business analytics.

### 5. Flexible Attributes
JSON fields and attribute table allow extending products without schema changes.

## Performance Optimizations

### Indexes Strategy
- Primary indexes on frequently queried fields
- Composite indexes for common filter combinations
- Full-text search preparation on name/description

### Query Patterns
```sql
-- Active products by category
SELECT * FROM products
WHERE category_id = ?
  AND status = 'active'
  AND is_visible = true
ORDER BY sort_variant_order, created_at DESC;

-- Products with membership check
SELECT * FROM products
WHERE requires_membership = false
   OR 'basic' = ANY(membership_tiers);
```

## Migration & Seeding

### Apply Migration
```bash
npm run db:push
# or
npm run db:migrate
```

### Seed Initial Data
```bash
npm run db:seed:products
```

This will create:
- 4 product categories
- 14 initial products with full attributes

## TypeScript Integration

### Type Exports
```typescript
import type {
  Product,
  ProductCategory,
  PriceHistory,
  NewProduct,
  ProductType,
  ProductStatus
} from '@/lib/db/schema/products';
```

### Validation Schemas
```typescript
import {
  createProductSchema,
  updateProductSchema,
  updatePriceSchema,
  productQuerySchema
} from '@/lib/validations/products';
```

### Utility Functions
```typescript
import {
  formatPrice,
  calculateDiscountPercentage,
  isInStock,
  canAccessProduct
} from '@/lib/utils/products';
```

## Security Considerations

1. **Row-Level Security**: Implement RLS policies for membership access
2. **Audit Logging**: All price changes tracked with user/IP/session
3. **Input Validation**: Zod schemas for all mutations
4. **Rate Limiting**: Protect price update endpoints
5. **Encryption**: Sensitive data encrypted at rest

## Compliance Features

1. **Price History**: Complete audit trail for regulatory review
2. **Age Verification**: `ageRestricted` flag on products
3. **Lab Results**: Storage for test certificates
4. **Compliance Notes**: Field for regulatory requirements
5. **Immutable Audit**: Price history records cannot be modified

## Future Enhancements

1. **Reviews & Ratings**: Customer feedback system
2. **Promotions**: Time-based discounts and offers
3. **Bundles**: Product packages and kits
4. **Wishlists**: Customer saved products
5. **Stock Alerts**: Customer notifications for restocks
6. **Advanced Search**: ElasticSearch integration
7. **Multi-location**: Inventory per location
8. **Batch Tracking**: Full seed-to-sale tracking

## Maintenance

### Regular Tasks
- Monitor index performance
- Archive old price history records
- Update product counts after bulk operations
- Review and optimize slow queries

### Backup Strategy
- Daily automated backups
- Point-in-time recovery enabled
- Test restore procedures monthly