# Shop/Specials Feature - Testing Strategy

## Executive Summary

This document outlines a comprehensive testing strategy for the shop/specials feature of the cannabis e-commerce platform. The strategy covers unit tests, integration tests, component tests, and E2E tests with specific focus on critical business logic, security, and user workflows.

## Coverage Goals

### Overall Targets
- **Critical Paths**: 100% coverage (membership gates, price calculations, audit trails)
- **Business Logic**: 85%+ coverage (Server Actions, validations, utilities)
- **UI Components**: 75%+ coverage (React components, user interactions)
- **Database Operations**: 90%+ coverage (CRUD operations, transactions)
- **Overall Target**: 80%+ coverage

## Testing Layers

### 1. Unit Tests

#### Utility Functions (`/src/lib/utils/products.ts`)

**Price Calculations**
```typescript
describe('Price Utilities', () => {
  test('formatPrice converts cents to ZAR format correctly')
  test('toCents handles decimal precision correctly')
  test('calculateDiscountPercentage returns correct percentage')
  test('calculateSavings returns correct amount')
  test('handles negative and zero values appropriately')
})
```

**Inventory Management**
```typescript
describe('Inventory Utilities', () => {
  test('calculateAvailableQuantity accounts for reservations')
  test('isLowStock triggers at correct threshold')
  test('isInStock respects backorder settings')
  test('getStockStatus returns correct variant and label')
})
```

**Membership Access**
```typescript
describe('Membership Access', () => {
  test('canAccessProduct respects tier hierarchy')
  test('handles missing or invalid membership tiers')
  test('VIP tier can access all products')
  test('basic tier restricted from VIP-only products')
})
```

#### Validation Schemas (`/src/lib/validations/products.ts`)

```typescript
describe('Product Validations', () => {
  test('createProductSchema validates required fields')
  test('price must be non-negative integer')
  test('slug format validation (lowercase, hyphenated)')
  test('THC/CBD content range validation (0-100)')
  test('updatePriceSchema requires reason')
  test('inventoryMovementSchema validates quantity changes')
})
```

### 2. Integration Tests

#### Server Actions (`/src/app/actions/products.ts`)

**Product CRUD Operations**
```typescript
describe('Product Server Actions', () => {
  beforeEach(() => {
    // Reset database to known state
    // Mock authentication context
  })

  describe('getProducts', () => {
    test('returns paginated products for public users')
    test('hides prices for non-members')
    test('shows prices for authenticated members')
    test('filters by category correctly')
    test('respects status and visibility filters')
    test('handles search queries with special characters')
    test('sorts by price, name, popularity correctly')
  })

  describe('createProduct', () => {
    test('requires admin authentication')
    test('validates input data')
    test('generates unique slug')
    test('creates audit log entry')
    test('updates category product count')
    test('handles duplicate SKU error')
  })

  describe('updateProductPrice', () => {
    test('creates price history record')
    test('calculates percentage change correctly')
    test('prevents negative prices')
    test('requires reason for price change')
    test('triggers audit log')
    test('handles concurrent price updates')
  })

  describe('bulkUpdateProductPrices', () => {
    test('updates multiple products in transaction')
    test('rolls back on partial failure')
    test('creates batch price history entries')
    test('handles percentage and fixed price changes')
  })
})
```

**Database Transactions**
```typescript
describe('Database Transactions', () => {
  test('price update transaction maintains consistency')
  test('inventory movement creates accurate audit trail')
  test('bulk operations roll back on error')
  test('concurrent updates handle locks correctly')
})
```

### 3. Component Tests

#### Shop Components

**ProductCard Component**
```typescript
describe('ProductCard', () => {
  test('displays product information correctly')
  test('shows member-only overlay for non-members')
  test('displays price for members only')
  test('shows discount badge when comparePrice exists')
  test('handles out of stock state')
  test('Add to Cart button disabled when appropriate')
  test('navigates to registration for non-members')
})
```

**MembershipBanner Component**
```typescript
describe('MembershipBanner', () => {
  test('renders different variants (hero, inline, floating)')
  test('dismissal persists in localStorage')
  test('shows correct benefits list')
  test('CTA buttons navigate correctly')
  test('respects dismissible prop')
})
```

**CategoryFilter Component**
```typescript
describe('CategoryFilter', () => {
  test('displays all categories with counts')
  test('updates URL params on selection')
  test('highlights active category')
  test('shows correct product counts')
  test('handles empty categories')
})
```

#### Admin Components

**ProductTable Component**
```typescript
describe('ProductTable', () => {
  test('displays products with correct formatting')
  test('handles bulk selection')
  test('sorts columns correctly')
  test('pagination controls work')
  test('quick price update opens modal')
  test('search filters results')
  test('status filter works correctly')
})
```

**ProductForm Component**
```typescript
describe('ProductForm', () => {
  test('validates required fields before submission')
  test('auto-generates slug from name')
  test('handles image upload')
  test('price input accepts only numbers')
  test('cannabis attributes section shows for relevant types')
  test('form submission calls correct Server Action')
  test('displays validation errors')
})
```

**PriceUpdateModal Component**
```typescript
describe('PriceUpdateModal', () => {
  test('displays current price')
  test('calculates percentage change in real-time')
  test('requires reason for price change')
  test('shows price history')
  test('submits update with audit trail')
  test('handles submission errors')
})
```

### 4. E2E Tests

#### Critical User Flows

**Public Shop Flow**
```typescript
describe('Public Shop User Journey', () => {
  test('Non-member browsing experience', async () => {
    // Navigate to /specials
    // Verify membership banner appears
    // Verify prices are hidden
    // Click on product card
    // Verify registration CTA
    // Test category filtering
    // Test search functionality
  })

  test('Member shopping experience', async () => {
    // Login as member
    // Navigate to /specials
    // Verify prices are visible
    // Add product to cart
    // Verify cart updates
    // Test membership tier restrictions
  })
})
```

**Admin Product Management**
```typescript
describe('Admin Product Management', () => {
  test('Create new product workflow', async () => {
    // Login as admin
    // Navigate to /admin/products/new
    // Fill product form
    // Upload image
    // Set pricing
    // Publish product
    // Verify product appears in shop
  })

  test('Bulk price update workflow', async () => {
    // Select multiple products
    // Choose bulk price update
    // Enter percentage increase
    // Add reason
    // Submit update
    // Verify price history created
    // Check audit logs
  })

  test('Inventory management workflow', async () => {
    // Navigate to product
    // Update stock quantity
    // Verify low stock warning
    // Set to zero quantity
    // Verify out of stock status
    // Check inventory movement log
  })
})
```

### 5. Security Tests

**Authentication & Authorization**
```typescript
describe('Security Tests', () => {
  test('Admin endpoints require authentication')
  test('Price manipulation prevention')
  test('SQL injection prevention in search')
  test('XSS prevention in product descriptions')
  test('CSRF protection on forms')
  test('Rate limiting on API endpoints')
  test('Input sanitization on all user inputs')
})
```

**Membership Access Control**
```typescript
describe('Membership Access Control', () => {
  test('Non-members cannot see prices')
  test('Basic members cannot access VIP products')
  test('Membership verification on each request')
  test('Session validation for member access')
})
```

### 6. Performance Tests

```typescript
describe('Performance Tests', () => {
  test('Product list loads within 2 seconds')
  test('Search returns results within 500ms')
  test('Image lazy loading works correctly')
  test('Pagination prevents loading all products')
  test('Database queries are optimized (no N+1)')
  test('Caching strategies work correctly')
})
```

## Test Data Management

### Seed Data Strategy
```typescript
// test/fixtures/products.ts
export const testProducts = {
  activeProduct: { /* ... */ },
  outOfStockProduct: { /* ... */ },
  memberOnlyProduct: { /* ... */ },
  vipOnlyProduct: { /* ... */ },
}

// test/fixtures/users.ts
export const testUsers = {
  admin: { /* ... */ },
  member: { /* ... */ },
  vipMember: { /* ... */ },
  nonMember: { /* ... */ },
}
```

### Database Reset Strategy
```typescript
beforeEach(async () => {
  await db.transaction(async (tx) => {
    // Clear test data
    await tx.delete(products).where(/* test data condition */)
    // Insert known test state
    await tx.insert(products).values(testProducts)
  })
})
```

## Testing Tools & Libraries

### Recommended Stack

**Unit & Integration Tests**
- Jest 29+ - Test runner
- @testing-library/react - Component testing
- @testing-library/user-event - User interaction simulation
- MSW (Mock Service Worker) - API mocking
- jest-mock-extended - Advanced mocking

**E2E Tests**
- Playwright - Cross-browser E2E testing
- @playwright/test - Test runner

**Database Testing**
- PostgreSQL test container or in-memory DB
- Database migrations for test environment
- Transaction rollback for test isolation

**Utilities**
- faker.js - Generate test data
- fishery - Factory pattern for test objects
- jest-axe - Accessibility testing

## Test Execution Strategy

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run unit tests
        run: npm run test:unit
      - name: Upload coverage
        run: npm run coverage:upload

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
    steps:
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run E2E tests
        run: npm run test:e2e
```

### Local Development

```json
// package.json scripts
{
  "test": "jest",
  "test:unit": "jest --testPathPattern=unit",
  "test:integration": "jest --testPathPattern=integration",
  "test:e2e": "playwright test",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:ci": "jest --ci --coverage --maxWorkers=2"
}
```

## Test Organization

```
/src
  /app
    /actions
      products.ts
      __tests__/
        products.test.ts        # Integration tests
  /components
    /shop
      ProductCard.tsx
      __tests__/
        ProductCard.test.tsx    # Component tests
  /lib
    /utils
      products.ts
      __tests__/
        products.test.ts        # Unit tests
    /validations
      products.ts
      __tests__/
        products.test.ts        # Validation tests

/tests
  /e2e
    shop-flow.spec.ts          # E2E tests
    admin-products.spec.ts
  /fixtures
    products.ts                # Test data
    users.ts
  /utils
    db-helpers.ts             # Test utilities
```

## Priority Test Cases

### P0 - Critical (Must Test)
1. Member price visibility gates
2. Price calculation accuracy
3. Inventory tracking accuracy
4. Audit trail creation
5. Authentication/authorization
6. Payment processing (when implemented)

### P1 - High Priority
1. Product CRUD operations
2. Search and filtering
3. Category management
4. Bulk operations
5. Form validations
6. Stock management

### P2 - Medium Priority
1. UI component interactions
2. Responsive design
3. Image handling
4. SEO metadata
5. Performance optimizations

## Risk Mitigation

### Identified Risks & Mitigations

1. **Price Manipulation**
   - Test: Verify prices are server-calculated
   - Test: Check for client-side price tampering
   - Mitigation: All price calculations server-side

2. **Inventory Overselling**
   - Test: Concurrent purchase attempts
   - Test: Reserved quantity management
   - Mitigation: Database-level constraints and locks

3. **Unauthorized Access**
   - Test: Role-based access control
   - Test: Membership tier verification
   - Mitigation: Middleware authentication checks

4. **Data Integrity**
   - Test: Transaction rollback scenarios
   - Test: Audit trail completeness
   - Mitigation: Database transactions and constraints

## Success Metrics

### Code Coverage
- Line Coverage: 80%+
- Branch Coverage: 75%+
- Function Coverage: 85%+
- Statement Coverage: 80%+

### Test Quality
- No flaky tests
- Test execution time < 5 minutes for unit/integration
- E2E tests < 10 minutes
- All critical paths tested
- Zero false positives

### Business Metrics
- Zero pricing errors in production
- 100% audit trail accuracy
- No unauthorized access incidents
- < 0.1% inventory discrepancies

## Maintenance & Updates

### Regular Tasks
- Weekly: Review and update test data
- Monthly: Analyze coverage reports
- Quarterly: Review and update E2E scenarios
- Per Release: Add tests for new features

### Documentation
- Maintain test case documentation
- Update this strategy document quarterly
- Document known test limitations
- Track test debt and plan remediation

## Conclusion

This testing strategy provides comprehensive coverage for the shop/specials feature, with emphasis on critical business logic, security, and user experience. Regular execution and maintenance of these tests will ensure system reliability and prevent regressions.