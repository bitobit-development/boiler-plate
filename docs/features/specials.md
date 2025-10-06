# Members-Only Specials Feature

**Feature Type**: Authentication & Access Control
**Status**: In Development
**Created**: 2025-10-06
**Last Updated**: 2025-10-06

---

## Table of Contents
1. [Overview](#overview)
2. [User Flows](#user-flows)
3. [Technical Architecture](#technical-architecture)
4. [Component Specifications](#component-specifications)
5. [Server Actions API](#server-actions-api)
6. [Database Schema](#database-schema)
7. [Security Considerations](#security-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Agent Assignments](#agent-assignments)
10. [Implementation Timeline](#implementation-timeline)

---

## Overview

### Business Requirement
Implement gated access to product pricing on the specials page, requiring visitors to either:
- **Login** (if they're already a member) using mobile number + OTP
- **Subscribe** (if they're a new visitor) to gain access

### Goals
1. **Increase subscriptions** by showing value proposition (member benefits)
2. **Secure pricing** by requiring authentication
3. **Seamless experience** for existing members to login quickly
4. **Preserve existing flow** - subscription → OTP → cookies → access

### Success Metrics
- Conversion rate from visitor → subscriber
- Login success rate for existing members
- Reduced bounce rate on specials page
- Time to access pricing (should be < 30 seconds)

---

## User Flows

### Flow 1: Existing Member Login

```
┌─────────────────────────────────────────────────────────┐
│ 1. User visits /specials (not authenticated)            │
│    → Sees products but NO PRICES                        │
│    → Sees "Login to See Prices" buttons                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 2. User clicks "Login to See Prices"                    │
│    → Modal opens with two options:                      │
│      • "Already a Member? Login"                        │
│      • "New Here? Subscribe Now"                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 3. User selects "Already a Member? Login"               │
│    → Shows mobile number input (international)          │
│    → User enters their registered mobile number         │
│    → Clicks "Send Code"                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 4. System validates mobile number                       │
│    → Checks if mobile exists in subscribers table       │
│    → If NOT found: "Please subscribe first"             │
│    → If found: Generates & sends OTP via SMS            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 5. User receives SMS with OTP code                      │
│    → Modal shows OTP input (6 digits)                   │
│    → User enters OTP code                               │
│    → Clicks "Verify & Login"                            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 6. System validates OTP                                 │
│    → Verifies code matches & not expired                │
│    → Sets cookies: subscriber_id (30 days)              │
│    → Modal closes                                       │
│    → Page refreshes → Prices now visible!               │
└─────────────────────────────────────────────────────────┘
```

### Flow 2: New Visitor Subscribe

```
┌─────────────────────────────────────────────────────────┐
│ 1. User visits /specials (not authenticated)            │
│    → Sees products but NO PRICES                        │
│    → Sees "Login to See Prices" buttons                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 2. User clicks "Login to See Prices" or                 │
│    "Subscribe to Purchase" button                       │
│    → Modal opens with two options                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 3. User selects "New Here? Subscribe Now"               │
│    → Redirects to /subscribe page                       │
│    → Existing subscription flow takes over              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 4. User completes subscription (existing flow)          │
│    → Fills form (name, email, mobile, etc.)             │
│    → Receives OTP via SMS                               │
│    → Verifies OTP                                       │
│    → Cookies set: subscriber_id + just_subscribed       │
│    → Redirects to /specials                             │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 5. User returns to /specials (now authenticated)        │
│    → Sees welcome banner (just_subscribed = true)       │
│    → Prices are now VISIBLE (member prices)             │
│    → Can add products to cart                           │
└─────────────────────────────────────────────────────────┘
```

### Flow 3: Already Authenticated (No Action Needed)

```
┌─────────────────────────────────────────────────────────┐
│ User visits /specials with valid cookies                │
│ → subscriber_id cookie present                          │
│ → isMember = true                                       │
│ → Prices immediately visible                            │
│ → No login required                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Current Authentication System (Preserved)

**Subscription Flow** (`src/app/actions/verify-otp.ts`):
1. User subscribes → Verifies mobile with OTP
2. Sets cookies:
   - `subscriber_id` (HttpOnly, 30 days)
   - `just_subscribed` (HttpOnly, 10 minutes)
3. Status: `mobileVerified = true`, `status = 'active'`

**Specials Page Check** (`src/app/specials/page.tsx`):
```typescript
// Existing authentication check
const subscriberId = cookieStore.get("subscriber_id")?.value;
const accessToken = cookieStore.get("access_token")?.value;
const isMember = !!(subscriberId || accessToken);
```

### New Login System (To Be Added)

**Login Flow** (New: `src/app/actions/member-login.ts`):
1. User provides mobile → Check if exists in subscribers
2. If exists → Send OTP via existing SMS system
3. User verifies OTP → Set **same cookies** as subscription flow
4. Result: Identical authentication state

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    SPECIALS PAGE                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Server Component (page.tsx)                        │  │
│  │  → Checks cookies: subscriber_id, access_token     │  │
│  │  → Sets isMember flag                              │  │
│  │  → Passes to client components                     │  │
│  └────────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ProductGridWrapper (Client)                        │  │
│  │  → Receives isMember prop                          │  │
│  │  → Passes to ProductCard components                │  │
│  └────────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ProductCard (Client)                               │  │
│  │  → Shows PriceDisplay with isMember                │  │
│  │  → Shows MemberLoginModal trigger if !isMember     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│              PRICE DISPLAY COMPONENT                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ if (isMember)                                      │  │
│  │   → Show member price (20% off)                    │  │
│  │ else                                               │  │
│  │   → Show "Login to See Price" button               │  │
│  │   → Opens MemberLoginModal                         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│           MEMBER LOGIN MODAL (New)                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Choice Screen:                                     │  │
│  │  → "Already a Member? Login" → Login Flow          │  │
│  │  → "New Here? Subscribe" → Redirect /subscribe     │  │
│  └────────────────────────────────────────────────────┘  │
│                          ↓                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Login Flow:                                        │  │
│  │  1. Mobile Input → sendLoginOTP()                  │  │
│  │  2. OTP Input → verifyLoginOTP()                   │  │
│  │  3. Success → Set cookies → Reload page            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│              SERVER ACTIONS (New)                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │ sendLoginOTP(mobile: string)                       │  │
│  │  → Check if mobile exists in subscribers           │  │
│  │  → If yes: Generate OTP, send SMS                  │  │
│  │  → If no: Return error                             │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ verifyLoginOTP(mobile: string, otp: string)        │  │
│  │  → Validate OTP using existing helper             │  │
│  │  → Set cookies: subscriber_id                      │  │
│  │  → Return success                                  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. PriceDisplay Component (Updated)

**File**: `src/components/shop/PriceDisplay.tsx`

**Current Behavior**:
- Members: Show member price (20% off)
- Non-members: Show BOTH regular AND member prices

**New Behavior**:
```typescript
if (isMember) {
  // Keep existing member price display
  return (
    <div>
      <MemberPriceBadge />
      <StrikeThroughPrice>{regularPrice}</StrikeThroughPrice>
      <MemberPrice>{memberPrice}</MemberPrice>
      <SavingsBadge>Save 20%</SavingsBadge>
    </div>
  );
} else {
  // NEW: Hide prices, show login prompt
  return (
    <Button
      onClick={onLoginClick}
      variant="outline"
      className="w-full border-amber-500/30 text-amber-400"
    >
      <Lock className="h-4 w-4 mr-2" />
      Login to See Price
    </Button>
  );
}
```

**Props**:
```typescript
interface PriceDisplayProps {
  price: number | null;
  comparePrice?: number | null;
  isMember?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  showCurrency?: boolean;
  onLoginClick?: () => void; // NEW
  className?: string;
}
```

### 2. MemberLoginModal Component (New)

**File**: `src/components/shop/MemberLoginModal.tsx`

**States**:
1. `choice` - Show "Login" vs "Subscribe" options
2. `mobile` - Mobile number input
3. `otp` - OTP verification
4. `success` - Success message before reload

**Component Structure**:
```typescript
export function MemberLoginModal({
  open,
  onClose
}: MemberLoginModalProps) {
  const [step, setStep] = useState<'choice' | 'mobile' | 'otp' | 'success'>('choice');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Choice
  if (step === 'choice') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Member Pricing</DialogTitle>
            <DialogDescription>
              Choose how you'd like to proceed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              onClick={() => setStep('mobile')}
              className="w-full"
            >
              <User className="mr-2 h-4 w-4" />
              Already a Member? Login
            </Button>
            <Button
              onClick={() => router.push('/subscribe')}
              variant="outline"
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              New Here? Subscribe Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: Mobile Input
  if (step === 'mobile') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Your Mobile Number</DialogTitle>
            <DialogDescription>
              We'll send you a verification code
            </DialogDescription>
          </DialogHeader>
          <Form onSubmit={handleSendOTP}>
            <PhoneInput
              value={mobile}
              onChange={setMobile}
              placeholder="Enter mobile number"
            />
            <Button type="submit" loading={loading}>
              Send Code
            </Button>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 3: OTP Verification
  if (step === 'otp') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Verification Code</DialogTitle>
            <DialogDescription>
              Code sent to {mobile}
            </DialogDescription>
          </DialogHeader>
          <Form onSubmit={handleVerifyOTP}>
            <OTPInput
              value={otp}
              onChange={setOtp}
              length={6}
            />
            <Button type="submit" loading={loading}>
              Verify & Login
            </Button>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 4: Success
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <DialogTitle>Login Successful!</DialogTitle>
          <DialogDescription>
            Redirecting to member pricing...
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Dependencies**:
- `shadcn/ui`: Dialog, Form, Button, Input
- `react-international-phone` or custom PhoneInput component
- `react-otp-input` or custom OTPInput component

### 3. ProductCard Integration (Updated)

**File**: `src/components/shop/ProductCard.tsx`

**Changes**:
```typescript
export function ProductCard({ product, isMember, onAddToCart }: Props) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <>
      <Card>
        {/* ... existing card content ... */}

        <CardFooter>
          <PriceDisplay
            price={product.price}
            isMember={isMember}
            onLoginClick={() => setLoginModalOpen(true)} // NEW
          />

          {isMember ? (
            <Button onClick={() => onAddToCart(product)}>
              Add to Cart
            </Button>
          ) : (
            <Button onClick={() => setLoginModalOpen(true)}>
              Subscribe to Purchase
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* NEW: Login Modal */}
      <MemberLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
}
```

---

## Server Actions API

### 1. sendLoginOTP

**File**: `src/app/actions/member-login.ts`

```typescript
export async function sendLoginOTP(
  mobile: string
): Promise<SendLoginOTPResult> {
  try {
    // 1. Normalize mobile number
    const normalizedMobile = normalizeMobileNumber(mobile);

    // 2. Check if mobile exists in subscribers
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.mobile, normalizedMobile))
      .limit(1);

    if (!subscriber) {
      return {
        success: false,
        error: "Mobile number not found. Please subscribe first.",
      };
    }

    // 3. Check if already verified (must be active member)
    if (!subscriber.mobileVerified || subscriber.status !== 'active') {
      return {
        success: false,
        error: "Account not active. Please complete subscription first.",
      };
    }

    // 4. Generate OTP (reuse existing helper)
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 5. Store OTP in database
    await db
      .update(subscribers)
      .set({
        otpCode: hashedOTP,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, subscriber.id));

    // 6. Send SMS (reuse existing Clickatell service)
    await sendSMS({
      to: normalizedMobile,
      message: `Your BiggBuzz login code is: ${otpCode}\n\nValid for 10 minutes.`,
    });

    console.log(`Login OTP sent to ${normalizedMobile}`);

    return {
      success: true,
      subscriberId: subscriber.id,
      message: "Verification code sent to your mobile",
    };
  } catch (error) {
    console.error("Send login OTP error:", error);
    return {
      success: false,
      error: "Failed to send verification code. Please try again.",
    };
  }
}
```

### 2. verifyLoginOTP

**File**: `src/app/actions/member-login.ts`

```typescript
export async function verifyLoginOTP(
  subscriberId: string,
  otpCode: string
): Promise<VerifyLoginOTPResult> {
  try {
    // 1. Validate input
    const validatedData = otpVerificationSchema.parse({
      subscriberId,
      otpCode,
    });

    // 2. Find subscriber
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, validatedData.subscriberId))
      .limit(1);

    if (!subscriber) {
      return {
        success: false,
        error: "Invalid session. Please start over.",
      };
    }

    // 3. Check attempts limit
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');
    if (subscriber.otpAttempts >= maxAttempts) {
      return {
        success: false,
        error: "Too many failed attempts. Please request a new code.",
        attemptsRemaining: 0,
      };
    }

    // 4. Check expiration
    if (!subscriber.otpExpiresAt || isOTPExpired(subscriber.otpExpiresAt)) {
      return {
        success: false,
        error: "Code expired. Please request a new code.",
      };
    }

    // 5. Verify OTP
    if (!subscriber.otpCode || !verifyOTP(validatedData.otpCode, subscriber.otpCode)) {
      // Increment attempt counter
      const newAttempts = subscriber.otpAttempts + 1;
      await db
        .update(subscribers)
        .set({
          otpAttempts: newAttempts,
          updatedAt: new Date(),
        })
        .where(eq(subscribers.id, validatedData.subscriberId));

      const remaining = maxAttempts - newAttempts;

      return {
        success: false,
        error: remaining > 0
          ? "Invalid code. Please try again."
          : "Too many failed attempts. Please request a new code.",
        attemptsRemaining: remaining,
      };
    }

    // 6. SUCCESS: Clear OTP data
    await db
      .update(subscribers)
      .set({
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, validatedData.subscriberId));

    // 7. Set authentication cookies (SAME as subscription flow)
    const cookieStore = await cookies();

    // Set subscriber_id cookie (30 days)
    cookieStore.set('subscriber_id', subscriber.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    console.log(`Login successful for ${subscriber.email}`);

    return {
      success: true,
      subscriber: {
        id: subscriber.id,
        name: subscriber.name,
        email: subscriber.email,
      },
    };
  } catch (error) {
    console.error("Verify login OTP error:", error);
    return {
      success: false,
      error: "Verification failed. Please try again.",
    };
  }
}
```

**Return Types**:
```typescript
export type SendLoginOTPResult =
  | {
      success: true;
      subscriberId: string;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

export type VerifyLoginOTPResult =
  | {
      success: true;
      subscriber: {
        id: string;
        name: string;
        email: string;
      };
    }
  | {
      success: false;
      error: string;
      attemptsRemaining?: number;
    };
```

---

## Database Schema

**No database changes required!** ✅

The existing `subscribers` table already supports the login flow:

```typescript
// Existing schema (src/lib/db/schema/subscribers.ts)
export const subscribers = pgTable('subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  mobile: varchar('mobile', { length: 50 }).notNull().unique(),

  // OTP fields (reused for login)
  otpCode: text('otp_code'),
  otpExpiresAt: timestamp('otp_expires_at'),
  otpAttempts: integer('otp_attempts').default(0).notNull(),

  // Verification status
  mobileVerified: boolean('mobile_verified').default(false).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**OTP Flow Reuse**:
- Login OTP stored in same `otpCode` field
- Same expiration tracking via `otpExpiresAt`
- Same attempt limiting via `otpAttempts`
- No conflicts with subscription OTP (cleared after verification)

---

## Security Considerations

### 1. Rate Limiting
**Implementation**: Add rate limiting to login OTP endpoint

```typescript
// lib/rate-limit.ts (existing or new)
export const loginOTPRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute per IP
});

// In sendLoginOTP action:
const rateLimitResult = await loginOTPRateLimit.check(request);
if (!rateLimitResult.success) {
  return {
    success: false,
    error: "Too many requests. Please wait a moment.",
  };
}
```

### 2. OTP Security
- ✅ **Hashing**: OTPs stored hashed (bcrypt) in database
- ✅ **Expiration**: 10-minute validity window
- ✅ **Attempt Limiting**: Max 3 attempts before lockout
- ✅ **Single Use**: OTP cleared after successful verification

### 3. Session Security
- ✅ **HttpOnly Cookies**: Cannot be accessed by JavaScript
- ✅ **Secure Flag**: HTTPS-only in production
- ✅ **SameSite**: CSRF protection
- ✅ **30-Day Expiry**: Reasonable session duration

### 4. Input Validation
```typescript
// Zod schema for login OTP
export const loginOTPSchema = z.object({
  mobile: z.string()
    .min(10, "Mobile number too short")
    .max(20, "Mobile number too long")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid mobile format"),
});

export const otpVerificationSchema = z.object({
  subscriberId: z.string().uuid("Invalid subscriber ID"),
  otpCode: z.string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});
```

### 5. Error Messages
**Avoid information leakage**:
- ❌ "This mobile number is not registered" (reveals valid numbers)
- ✅ "Invalid credentials. Please try again." (generic)

### 6. SMS Abuse Prevention
- Rate limit: Max 3 OTP requests per mobile per hour
- Track failed login attempts per IP
- Consider CAPTCHA after multiple failures

---

## Testing Strategy

### Unit Tests

**File**: `__tests__/actions/member-login.test.ts`

```typescript
describe('sendLoginOTP', () => {
  it('should send OTP to registered mobile number', async () => {
    const result = await sendLoginOTP('+27812345678');
    expect(result.success).toBe(true);
    expect(result.subscriberId).toBeDefined();
  });

  it('should reject unregistered mobile number', async () => {
    const result = await sendLoginOTP('+27899999999');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should reject inactive accounts', async () => {
    // Create inactive subscriber
    const result = await sendLoginOTP(inactiveMobile);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not active');
  });
});

describe('verifyLoginOTP', () => {
  it('should verify correct OTP and set cookies', async () => {
    const result = await verifyLoginOTP(subscriberId, '123456');
    expect(result.success).toBe(true);
    expect(result.subscriber).toBeDefined();
  });

  it('should reject invalid OTP', async () => {
    const result = await verifyLoginOTP(subscriberId, '000000');
    expect(result.success).toBe(false);
    expect(result.attemptsRemaining).toBe(2);
  });

  it('should lock after max attempts', async () => {
    // Attempt 3 times
    const result = await verifyLoginOTP(subscriberId, 'wrong');
    expect(result.attemptsRemaining).toBe(0);
  });

  it('should reject expired OTP', async () => {
    // Set OTP expired in past
    const result = await verifyLoginOTP(subscriberId, '123456');
    expect(result.error).toContain('expired');
  });
});
```

### Integration Tests

**File**: `__tests__/integration/member-login-flow.test.ts`

```typescript
describe('Member Login Flow', () => {
  it('should complete full login flow', async () => {
    // 1. Send OTP
    const sendResult = await sendLoginOTP('+27812345678');
    expect(sendResult.success).toBe(true);

    // 2. Get OTP from database (test only)
    const otp = await getOTPFromDB(sendResult.subscriberId);

    // 3. Verify OTP
    const verifyResult = await verifyLoginOTP(sendResult.subscriberId, otp);
    expect(verifyResult.success).toBe(true);

    // 4. Check cookies are set
    const cookies = await getCookies();
    expect(cookies.subscriber_id).toBe(sendResult.subscriberId);
  });

  it('should show prices after successful login', async () => {
    // Login
    await completeLogin('+27812345678');

    // Visit specials page
    const response = await fetch('/specials');
    const html = await response.text();

    // Check prices are visible
    expect(html).toContain('R'); // Price symbol
    expect(html).not.toContain('Login to See Price');
  });
});
```

### E2E Tests (Playwright)

**File**: `e2e/member-login.spec.ts`

```typescript
test.describe('Member Login on Specials Page', () => {
  test('non-member should see login prompt instead of prices', async ({ page }) => {
    await page.goto('/specials');

    // Should NOT see prices
    await expect(page.locator('text=/R\\d+/')).toHaveCount(0);

    // Should see login prompt
    await expect(page.locator('text=Login to See Price')).toBeVisible();
  });

  test('should login successfully with mobile + OTP', async ({ page }) => {
    await page.goto('/specials');

    // Click login button
    await page.click('text=Login to See Price');

    // Modal should open
    await expect(page.locator('text=Access Member Pricing')).toBeVisible();

    // Click "Already a Member? Login"
    await page.click('text=Already a Member? Login');

    // Enter mobile
    await page.fill('input[type="tel"]', '+27812345678');
    await page.click('text=Send Code');

    // Enter OTP (mock SMS in test)
    const otp = await getTestOTP(); // Helper
    await page.fill('input[type="text"][maxlength="6"]', otp);
    await page.click('text=Verify & Login');

    // Should see success and redirect
    await expect(page.locator('text=Login Successful')).toBeVisible();

    // Page should reload with prices visible
    await page.waitForURL('/specials');
    await expect(page.locator('text=/R\\d+/')).toHaveCount(8); // 8 products
  });

  test('should redirect to subscribe for new visitors', async ({ page }) => {
    await page.goto('/specials');

    await page.click('text=Login to See Price');
    await page.click('text=New Here? Subscribe Now');

    // Should redirect to subscribe page
    await expect(page).toHaveURL('/subscribe');
  });
});
```

### Manual Testing Checklist

- [ ] **Login Flow**
  - [ ] Enter registered mobile → OTP sent
  - [ ] Enter correct OTP → Login successful
  - [ ] Enter wrong OTP → Error shown, attempts decremented
  - [ ] 3 wrong attempts → Locked out
  - [ ] Expired OTP → Error shown
  - [ ] Unregistered mobile → "Please subscribe" error

- [ ] **Price Visibility**
  - [ ] Non-member: Prices hidden, "Login to See Price" shown
  - [ ] Member: Prices visible, member discount shown
  - [ ] After login: Prices appear without page refresh

- [ ] **Subscription Flow (Unchanged)**
  - [ ] New user subscribes → Completes OTP → Redirected to specials
  - [ ] Sees "just subscribed" banner
  - [ ] Prices immediately visible
  - [ ] Same cookies as login flow

- [ ] **Edge Cases**
  - [ ] Cookie expires after 30 days → Prices hidden, must re-login
  - [ ] Multiple tabs open → Login in one tab reflects in others
  - [ ] Network error during OTP send → User-friendly error
  - [ ] SMS delivery delay → Resend button works

---

## Agent Assignments

### 🎨 Tal (Frontend/Design Agent)
**Responsibility**: UI/UX Components & Design

**Tasks**:
1. **Update PriceDisplay.tsx**
   - Hide prices for non-members
   - Add "Login to See Price" button with amber/gold styling
   - Maintain shadcn design system consistency

2. **Create MemberLoginModal.tsx**
   - Design 4-step modal flow (choice → mobile → OTP → success)
   - Use shadcn Dialog, Form, Button components
   - International phone input with country selector
   - 6-digit OTP input with auto-focus
   - Loading states and error handling
   - Responsive design (mobile-first)

3. **Integrate Modal Triggers**
   - Update ProductCard.tsx to show modal
   - Add click handlers to PriceDisplay
   - Ensure modal accessibility (keyboard navigation, ARIA labels)

4. **Design Polish**
   - Animations for modal transitions
   - Loading spinners for async actions
   - Success/error toast notifications
   - Dark mode compatibility

**Deliverables**:
- Updated `PriceDisplay.tsx`
- New `MemberLoginModal.tsx` component
- Updated `ProductCard.tsx`
- Design documentation with screenshots

**Estimated Time**: 1-2 days

---

### 💻 Adi (Fullstack Agent)
**Responsibility**: Server Actions & Authentication Logic

**Tasks**:
1. **Create member-login.ts Server Actions**
   - Implement `sendLoginOTP(mobile: string)`
   - Implement `verifyLoginOTP(subscriberId: string, otp: string)`
   - Reuse existing OTP helpers (generateOTP, hashOTP, verifyOTP)
   - Reuse existing SMS service (Clickatell)

2. **Cookie Management**
   - Set `subscriber_id` cookie on successful login (match subscription flow)
   - Ensure HttpOnly, Secure, SameSite flags
   - 30-day expiration

3. **Error Handling**
   - Validate mobile number format
   - Check subscriber exists and is active
   - Handle OTP expiration and attempt limits
   - Return user-friendly error messages

4. **Rate Limiting** (if not exists)
   - Add rate limiting to OTP endpoints
   - Max 3 requests per minute per IP
   - Max 5 requests per hour per mobile

5. **Integration with Specials Page**
   - Verify authentication check works with login cookies
   - Test isMember flag updates correctly

**Deliverables**:
- New `src/app/actions/member-login.ts`
- Updated rate limiting (if applicable)
- API documentation with examples
- Integration with existing auth flow

**Estimated Time**: 2-3 days

---

### 🧪 Uri (Testing Agent)
**Responsibility**: Test Coverage & Quality Assurance

**Tasks**:
1. **Unit Tests**
   - Test `sendLoginOTP` with various scenarios
   - Test `verifyLoginOTP` with edge cases
   - Test error handling and validation
   - Achieve >90% code coverage

2. **Integration Tests**
   - Test complete login flow (send OTP → verify → cookies)
   - Test interaction with specials page
   - Test subscription flow still works (regression)

3. **E2E Tests (Playwright)**
   - Test user journey: non-member → login → see prices
   - Test user journey: non-member → subscribe → see prices
   - Test error scenarios (wrong OTP, expired, etc.)

4. **Security Testing**
   - Test rate limiting works
   - Test OTP cannot be reused
   - Test cookies are HttpOnly/Secure
   - Test SQL injection prevention

5. **Performance Testing**
   - Test login flow under load (100 concurrent users)
   - Test SMS delivery latency
   - Test database query performance

**Deliverables**:
- Unit test suite
- Integration test suite
- E2E test suite
- Security audit report
- Performance benchmark results

**Estimated Time**: 1-2 days

---

### 📝 Rotem (Strategy/Documentation Agent)
**Responsibility**: Documentation & Architecture

**Tasks**:
1. **Create Feature Documentation** ✅ (This document)
   - User flows with diagrams
   - Technical architecture
   - Component specifications
   - API documentation

2. **Update Project README**
   - Add login flow documentation
   - Update authentication section
   - Add troubleshooting guide

3. **Code Review**
   - Review implementation for best practices
   - Ensure security considerations addressed
   - Verify adherence to project standards

**Deliverables**:
- `docs/features/specials.md` ✅
- Updated project documentation
- Code review report

**Estimated Time**: 1 day

---

## Implementation Timeline

### Phase 1: Foundation (Days 1-2)
**Agent**: Adi (Fullstack)
- [ ] Create `member-login.ts` Server Actions
- [ ] Implement `sendLoginOTP()`
- [ ] Implement `verifyLoginOTP()`
- [ ] Add rate limiting
- [ ] Test with Postman/Thunder Client

**Agent**: Tal (Frontend)
- [ ] Update `PriceDisplay.tsx` to hide prices
- [ ] Create basic modal structure
- [ ] Design mobile input step
- [ ] Design OTP input step

---

### Phase 2: Integration (Days 2-3)
**Agent**: Tal (Frontend)
- [ ] Complete `MemberLoginModal.tsx` with all states
- [ ] Integrate modal with `ProductCard.tsx`
- [ ] Add loading states and error handling
- [ ] Polish animations and transitions

**Agent**: Adi (Fullstack)
- [ ] Integrate login actions with modal
- [ ] Test cookie setting
- [ ] Verify specials page authentication
- [ ] Test subscription flow (regression)

---

### Phase 3: Testing & Polish (Day 4)
**Agent**: Uri (Testing)
- [ ] Write unit tests for server actions
- [ ] Write integration tests for login flow
- [ ] Write E2E tests with Playwright
- [ ] Run security audit
- [ ] Performance benchmarks

**Agent**: Tal (Frontend)
- [ ] Fix UI bugs from testing
- [ ] Add toast notifications
- [ ] Responsive design review
- [ ] Accessibility audit (ARIA labels, keyboard nav)

---

### Phase 4: Documentation & Launch (Day 5)
**Agent**: Rotem (Strategy)
- [ ] Review all code
- [ ] Update project documentation
- [ ] Create troubleshooting guide
- [ ] Write deployment checklist

**All Agents**:
- [ ] Final code review
- [ ] Merge feature branch
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor errors and performance

---

## Success Criteria

### Functional Requirements ✅
- [ ] Non-members cannot see prices without logging in
- [ ] Existing members can login with mobile + OTP
- [ ] New visitors can subscribe to gain access
- [ ] Subscription flow remains unchanged
- [ ] Login sets same cookies as subscription
- [ ] Prices visible immediately after authentication

### Technical Requirements ✅
- [ ] Server actions handle all error cases gracefully
- [ ] OTP system reuses existing infrastructure
- [ ] Rate limiting prevents abuse
- [ ] Cookies are secure (HttpOnly, Secure, SameSite)
- [ ] No database schema changes required
- [ ] Code follows project standards (TypeScript, ESLint)

### User Experience ✅
- [ ] Modal is responsive (mobile & desktop)
- [ ] Loading states provide feedback
- [ ] Error messages are clear and helpful
- [ ] Success flow feels seamless
- [ ] Accessibility standards met (WCAG 2.1 AA)

### Performance ✅
- [ ] Login flow completes in <30 seconds
- [ ] SMS delivery within 10 seconds
- [ ] Page load time <2 seconds
- [ ] Modal renders in <300ms

### Security ✅
- [ ] OTPs are hashed in database
- [ ] Rate limiting prevents brute force
- [ ] Session cookies expire after 30 days
- [ ] No sensitive data in client-side code
- [ ] XSS and CSRF protections in place

---

## Post-Launch Monitoring

### Metrics to Track
1. **Conversion Funnel**
   - Visitors who see login prompt
   - % who attempt login vs subscribe
   - Login success rate
   - Subscribe completion rate

2. **Performance**
   - Average login time (target: <20s)
   - SMS delivery success rate (target: >98%)
   - OTP verification success rate
   - Page load time for authenticated users

3. **Errors**
   - Failed login attempts (by reason)
   - OTP expiration rate
   - SMS delivery failures
   - Rate limit triggers

4. **User Behavior**
   - Time on specials page (before/after login)
   - Products viewed after login
   - Conversion rate (login → purchase)

### Alerts to Configure
- [ ] SMS delivery failure rate >5%
- [ ] Login success rate <80%
- [ ] OTP expiration rate >30%
- [ ] Error rate >1% of total requests
- [ ] Rate limit triggered >10 times/hour

---

## Rollback Plan

### If Critical Issues Arise:

1. **Immediate Rollback**
   ```bash
   # Revert to previous deployment
   git revert <commit-hash>
   npm run build
   npm run deploy
   ```

2. **Feature Flag Disable**
   ```typescript
   // In specials/page.tsx
   const ENABLE_PRICE_GATING = process.env.NEXT_PUBLIC_ENABLE_PRICE_GATING === 'true';

   if (!ENABLE_PRICE_GATING) {
     // Show prices to everyone (old behavior)
     return <PriceDisplay isMember={true} />;
   }
   ```

3. **Database Rollback**
   - No migrations = no database rollback needed ✅

4. **Communication Plan**
   - Notify users via banner on site
   - Email to affected members
   - Social media announcement

---

## Future Enhancements

### Phase 2 Features (Post-Launch)
1. **Social Login**
   - Login with Google
   - Login with Facebook
   - Login with Apple

2. **Remember Me**
   - Extended session (90 days)
   - Device fingerprinting

3. **Passwordless Magic Links**
   - Email login link
   - No OTP required

4. **Two-Factor Authentication**
   - Optional 2FA for high-security accounts
   - Backup codes

5. **Analytics Dashboard**
   - Login success/failure trends
   - Conversion funnel visualization
   - A/B testing framework

---

## Appendix

### A. Existing OTP Helpers (Reused)

**File**: `src/lib/otp.ts`

```typescript
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashOTP(otp: string): string {
  return bcrypt.hashSync(otp, 10);
}

export function verifyOTP(plainOTP: string, hashedOTP: string): boolean {
  return bcrypt.compareSync(plainOTP, hashedOTP);
}

export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
```

### B. Existing SMS Service (Reused)

**File**: `src/lib/sms/clickatell.ts`

```typescript
export async function sendSMS({ to, message }: SendSMSParams) {
  const response = await fetch('https://platform.clickatell.com/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CLICKATELL_API_KEY}`,
    },
    body: JSON.stringify({
      to: [to],
      content: message,
    }),
  });

  if (!response.ok) {
    throw new Error('SMS delivery failed');
  }

  return response.json();
}
```

### C. Existing Cookie Utilities

**File**: `next/headers`

```typescript
import { cookies } from 'next/headers';

// Read cookies (server component)
const cookieStore = await cookies();
const subscriberId = cookieStore.get('subscriber_id')?.value;

// Set cookies (server action)
cookieStore.set('subscriber_id', userId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
});
```

### D. shadcn Components Used

- **Dialog**: Modal container
- **DialogContent**: Modal content wrapper
- **DialogHeader**: Modal header with title/description
- **DialogTitle**: Modal title
- **DialogDescription**: Modal description
- **Form**: Form wrapper with validation
- **Button**: Action buttons
- **Input**: Text/phone inputs
- **Label**: Form labels
- **Alert**: Error/success messages

---

## Contact & Support

**Feature Owner**: Rotem (Strategy Agent)
**Technical Lead**: Adi (Fullstack Agent)
**Design Lead**: Tal (Frontend Agent)
**QA Lead**: Uri (Testing Agent)

**Questions?** Open an issue in the project repo or contact the team.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-06
**Next Review**: After Phase 1 completion
