# Testing Instructions: Unique Email + Mobile Constraint

## Implementation Summary

### Changes Made:

1. **Schema Update** (`/Users/haim/Projects/boiler-plate/src/lib/db/schema.ts`)
   - Added `.unique()` constraint to `mobile` column (line 9)
   - Now both `email` and `mobile` have unique constraints

2. **Server Action Update** (`/Users/haim/Projects/boiler-plate/src/app/actions/subscribe.ts`)
   - Added duplicate mobile number check (lines 45-58)
   - Now checks BOTH email AND mobile before inserting
   - Returns field-specific errors for better UX

3. **Database Migration**
   - Generated migration: `drizzle/0001_sweet_jamie_braddock.sql`
   - Applied constraint: `subscribers_mobile_unique`
   - Cleaned up 5 duplicate records (kept oldest, deleted newer duplicates)
   - Current database has 4 unique subscribers

### Database State:
- Total subscribers: 4
- All email addresses: UNIQUE
- All mobile numbers: UNIQUE
- Constraint verified in database: `subscribers_mobile_unique` (UNIQUE)

---

## Manual Test Cases

### Test Case 1: Duplicate Email
**Objective**: Verify that duplicate email is rejected with field-specific error

**Steps**:
1. Navigate to http://localhost:3000/subscribe
2. Fill in the form:
   - Name: Test
   - Surname: User
   - Email: **haim@bitobit.co.za** (existing email)
   - Mobile: 0829999999 (new number)
   - Age verification: Check the box
3. Click "Subscribe"

**Expected Result**:
- Form submission fails
- Error appears BELOW the email field (inline)
- Error message: "This email is already subscribed to Bigg Buzz"
- Mobile field should NOT show an error

---

### Test Case 2: Duplicate Mobile
**Objective**: Verify that duplicate mobile is rejected with field-specific error

**Steps**:
1. Navigate to http://localhost:3000/subscribe
2. Fill in the form:
   - Name: Another
   - Surname: User
   - Email: newemail@test.com (new email)
   - Mobile: **0821234567** (existing mobile in database)
   - Age verification: Check the box
3. Click "Subscribe"

**Expected Result**:
- Form submission fails
- Error appears BELOW the mobile field (inline)
- Error message: "This mobile number is already subscribed to Bigg Buzz"
- Email field should NOT show an error

---

### Test Case 3: Both Unique (Success)
**Objective**: Verify that new user with unique email + mobile can register

**Steps**:
1. Navigate to http://localhost:3000/subscribe
2. Fill in the form:
   - Name: Brand
   - Surname: New
   - Email: brandnew@test.com (new email)
   - Mobile: 0829998877 (new mobile)
   - Age verification: Check the box
3. Click "Subscribe"

**Expected Result**:
- Form submission succeeds
- User is redirected to `/success` page
- Success message displays: "Welcome to Bigg Buzz, Brand!"
- Database now has 5 subscribers

---

## Existing Subscribers (for reference)

Current 4 subscribers in database:

| Name  | Email                                    | Mobile       |
|-------|------------------------------------------|--------------|
| John  | john.doe.test1759232093742@example.com   | 0821234567   |
| Jane  | jane.smith.test@example.com              | 0827654321   |
| Sarah | sarah.johnson@example.com                | 0831234567   |
| Haim  | haim@bitobit.co.za                       | 0823292438   |

**To refresh this list**, run:
```bash
node show-subscribers.mjs
```

---

## Quality Gates Checklist

- [x] Migration file generated: `drizzle/0001_sweet_jamie_braddock.sql`
- [x] Unique constraint added to database: `subscribers_mobile_unique`
- [x] Schema updated: `mobile` column has `.unique()`
- [x] Server Action checks email duplicates (lines 30-43)
- [x] Server Action checks mobile duplicates (lines 45-58)
- [x] Both checks return field-specific errors
- [x] Database cleaned of duplicate records
- [ ] **Test Case 1**: Duplicate email rejected (manual test required)
- [ ] **Test Case 2**: Duplicate mobile rejected (manual test required)
- [ ] **Test Case 3**: New user registration succeeds (manual test required)

---

## Implementation Details

### Schema Change:
```typescript
// Before:
mobile: varchar("mobile", { length: 20 }).notNull(),

// After:
mobile: varchar("mobile", { length: 20 }).notNull().unique(),
```

### Server Action Logic:
```typescript
// Step 2: Check email uniqueness
const existingEmail = await db.select().from(subscribers)
  .where(eq(subscribers.email, validatedData.email)).limit(1);

if (existingEmail.length > 0) {
  return { success: false, error: "This email is already subscribed to Bigg Buzz", field: "email" };
}

// Step 3: Check mobile uniqueness
const existingMobile = await db.select().from(subscribers)
  .where(eq(subscribers.mobile, validatedData.mobile)).limit(1);

if (existingMobile.length > 0) {
  return { success: false, error: "This mobile number is already subscribed to Bigg Buzz", field: "mobile" };
}
```

---

## Frontend Error Handling

The frontend at `/Users/haim/Projects/boiler-plate/src/app/subscribe/page.tsx` already handles field-specific errors correctly. When the server action returns:

```typescript
{ success: false, error: "...", field: "mobile" }
```

The error will be displayed inline below the corresponding field.

No frontend changes were required for this implementation.
