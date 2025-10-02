# OTP Verification Implementation Plan

## Overview
Add SMS-based OTP (One-Time Password) verification between the registration form and success page to verify subscriber mobile numbers using Clickatell SMS API.

## Current Flow
```
/subscribe (form) → subscribeAction → Database (save) → /success
```

## New Flow
```
/subscribe (form) → subscribeAction → Database (pending, send OTP) → /verify-otp → verifyOtpAction → Database (mobileVerified: true) → /success
```

---

## 1. Database Schema Changes

### Subscribers Table Updates
Add OTP tracking fields to the `subscribers` table in `src/lib/db/schema.ts`:

```typescript
export const subscribers = pgTable("subscribers", {
  // ... existing fields ...

  // OTP Fields
  otpCode: varchar("otp_code", { length: 255 }), // Encrypted 6-digit code
  otpExpiresAt: timestamp("otp_expires_at"), // OTP expiration time
  otpAttempts: integer("otp_attempts").default(0), // Failed verification attempts
  otpLastSentAt: timestamp("otp_last_sent_at"), // Last OTP send timestamp

  // ... rest of existing fields ...
});
```

### Migration
Create a new Drizzle migration file:
```sql
-- Add OTP fields to subscribers table
ALTER TABLE subscribers ADD COLUMN otp_code VARCHAR(255);
ALTER TABLE subscribers ADD COLUMN otp_expires_at TIMESTAMP;
ALTER TABLE subscribers ADD COLUMN otp_attempts INTEGER DEFAULT 0;
ALTER TABLE subscribers ADD COLUMN otp_last_sent_at TIMESTAMP;
```

### Database States

#### Pending State (After Form Submission)
```typescript
{
  name: "John",
  email: "john@example.com",
  mobile: "+27821234567",
  mobileVerified: false, // Not verified yet
  status: 'pending', // Waiting for OTP verification
  otpCode: '[encrypted-hash]',
  otpExpiresAt: Date(now + 10 minutes),
  otpAttempts: 0,
  otpLastSentAt: Date(now)
}
```

#### Verified State (After OTP Success)
```typescript
{
  name: "John",
  email: "john@example.com",
  mobile: "+27821234567",
  mobileVerified: true, // ✅ VERIFIED
  status: 'active', // ✅ ACTIVE
  verifiedAt: Date(now), // ✅ TIMESTAMP
  otpCode: null, // Cleared
  otpExpiresAt: null,
  otpAttempts: 0
}
```

---

## 2. Environment Variables

Add to `.env`:
```env
# Clickatell SMS API
CLICKATELL_API_KEY= kGvdfOdLShuu9BZJ5U_Lvg==
CLICKATELL_API_URL=https://platform.clickatell.com/v1/message

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_SENDS_PER_HOUR=3

#sSAMPLE CURL TO SEND SMS
curl -i \
-X POST \
-H "Content-Type: application/json" \
-H "Accept: application/json" \
-H "Authorization: kGvdfOdLShuu9BZJ5U_Lvg==" \
-d '{"messages": [{ "channel": "whatsapp", "to": "27823292438", "content": "Test WhatsApp Message Text" }, { "channel": "sms", "to": "27823292438", "content": "Test SMS Message Text" }]}' \
-s https://platform.clickatell.com/v1/message

# Encryption (for OTP storage)
ENCRYPTION_KEY=your_secure_encryption_key
```

---

## 3. File Structure

### New Files to Create

```
src/
├── app/
│   ├── verify-otp/
│   │   └── page.tsx                    # OTP verification page UI
│   ├── actions/
│   │   ├── verify-otp.ts               # Server Action: verify OTP
│   │   └── resend-otp.ts               # Server Action: resend OTP
│   └── api/
│       └── otp/
│           ├── verify/
│           │   └── route.ts            # API: POST verify OTP
│           └── resend/
│               └── route.ts            # API: POST resend OTP
├── lib/
│   ├── otp.ts                          # OTP utilities (generate, verify)
│   ├── services/
│   │   └── sms.ts                      # Clickatell SMS integration
│   └── validations/
│       └── otp.ts                      # Zod schemas for OTP
└── components/
    └── ui/
        └── input-otp.tsx               # shadcn component (auto-generated)
```

### Files to Modify

```
src/
├── app/
│   └── actions/
│       └── subscribe.ts                # MODIFY: Generate & send OTP
└── lib/
    └── db/
        └── schema.ts                   # MODIFY: Add OTP fields
```

---

## 4. Implementation Details

### 4.1 OTP Utilities (`src/lib/otp.ts`)

```typescript
import crypto from 'crypto';
import { encryptData, decryptData } from '@/lib/db/security';

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash OTP for secure storage
 */
export function hashOTP(code: string): string {
  return encryptData(code);
}

/**
 * Verify OTP code
 */
export function verifyOTP(inputCode: string, hashedCode: string): boolean {
  try {
    const decrypted = decryptData(hashedCode);
    return inputCode === decrypted;
  } catch {
    return false;
  }
}

/**
 * Check if OTP is expired
 */
export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Calculate OTP expiration time
 */
export function getOTPExpiration(): Date {
  const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
  return new Date(Date.now() + minutes * 60 * 1000);
}
```

### 4.2 SMS Service (`src/lib/services/sms.ts`)

```typescript
/**
 * Clickatell SMS Integration
 */

interface SendSMSParams {
  to: string; // Mobile number in +27 format
  message: string;
}

interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS via Clickatell API
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const apiKey = process.env.CLICKATELL_API_KEY;
  const apiUrl = process.env.CLICKATELL_API_URL;

  if (!apiKey || !apiUrl) {
    throw new Error('Clickatell API credentials not configured');
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: [params.to],
        content: params.message,
      }),
    });

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.accepted) {
      return {
        success: true,
        messageId: data.messages[0].apiMessageId,
      };
    }

    return {
      success: false,
      error: data.messages?.[0]?.error || 'Failed to send SMS',
    };
  } catch (error) {
    console.error('SMS Error:', error);
    return {
      success: false,
      error: 'Network error sending SMS',
    };
  }
}

/**
 * Send OTP via SMS
 */
export async function sendOTPSMS(mobile: string, otpCode: string): Promise<SendSMSResult> {
  const message = `Your Bigg Buzz verification code is: ${otpCode}. Valid for 10 minutes.`;

  return sendSMS({
    to: mobile,
    message,
  });
}
```

### 4.3 Modified Subscribe Action (`src/app/actions/subscribe.ts`)

```typescript
"use server";

import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { subscriptionSchema } from "@/lib/validations/subscription";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { deletePattern, CacheKeys } from "@/lib/cache";
import { generateOTP, hashOTP, getOTPExpiration } from "@/lib/otp";
import { sendOTPSMS } from "@/lib/services/sms";

export type SubscribeResult =
  | {
      success: true;
      subscriberId: string; // Changed: return ID for OTP verification
    }
  | {
      success: false;
      error: string;
      field?: string;
    };

export async function subscribeAction(
  formData: unknown
): Promise<SubscribeResult> {
  try {
    // 1. Validate input
    const validatedData = subscriptionSchema.parse(formData);

    // 2. Check for duplicates
    const existingEmail = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, validatedData.email))
      .limit(1);

    if (existingEmail.length > 0) {
      return {
        success: false,
        error: "This email is already subscribed to Bigg Buzz",
        field: "email",
      };
    }

    const existingMobile = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.mobile, validatedData.mobile))
      .limit(1);

    if (existingMobile.length > 0) {
      return {
        success: false,
        error: "This mobile number is already subscribed to Bigg Buzz",
        field: "mobile",
      };
    }

    // 3. Generate OTP
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const otpExpiration = getOTPExpiration();

    // 4. Send OTP via SMS
    const smsResult = await sendOTPSMS(validatedData.mobile, otpCode);

    if (!smsResult.success) {
      return {
        success: false,
        error: "Failed to send verification code. Please try again.",
      };
    }

    // 5. Insert subscriber with PENDING status
    const [newSubscriber] = await db
      .insert(subscribers)
      .values({
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email,
        mobile: validatedData.mobile,
        ageVerified: validatedData.ageVerified,
        status: 'pending', // Wait for OTP verification
        mobileVerified: false,
        otpCode: hashedOTP,
        otpExpiresAt: otpExpiration,
        otpAttempts: 0,
        otpLastSentAt: new Date(),
      })
      .returning({
        id: subscribers.id,
      });

    // 6. Invalidate caches
    await Promise.all([
      deletePattern(CacheKeys.patterns.allRegistrations()),
      deletePattern(CacheKeys.patterns.allStats()),
      deletePattern(CacheKeys.patterns.allDashboard()),
    ]);

    // 7. Return success with subscriber ID
    return {
      success: true,
      subscriberId: newSubscriber.id,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues;
      if (issues && issues.length > 0) {
        const firstError = issues[0];
        return {
          success: false,
          error: firstError.message,
          field: firstError.path[0]?.toString(),
        };
      }
    }

    console.error("Subscription error:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again later.",
    };
  }
}
```

### 4.4 Verify OTP Action (`src/app/actions/verify-otp.ts`)

```typescript
"use server";

import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyOTP, isOTPExpired } from "@/lib/otp";
import { deletePattern, CacheKeys } from "@/lib/cache";

export type VerifyOTPResult =
  | {
      success: true;
      subscriber: {
        name: string;
        email: string;
      };
    }
  | {
      success: false;
      error: string;
      attemptsRemaining?: number;
    };

export async function verifyOtpAction(
  subscriberId: string,
  otpCode: string
): Promise<VerifyOTPResult> {
  try {
    // 1. Find subscriber
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId))
      .limit(1);

    if (!subscriber) {
      return {
        success: false,
        error: "Invalid verification session",
      };
    }

    // 2. Check if already verified
    if (subscriber.mobileVerified) {
      return {
        success: false,
        error: "Mobile number already verified",
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
        error: "Verification code expired. Please request a new code.",
      };
    }

    // 5. Verify OTP
    if (!subscriber.otpCode || !verifyOTP(otpCode, subscriber.otpCode)) {
      // Increment attempt counter
      await db
        .update(subscribers)
        .set({
          otpAttempts: subscriber.otpAttempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(subscribers.id, subscriberId));

      const remaining = maxAttempts - (subscriber.otpAttempts + 1);

      return {
        success: false,
        error: "Invalid verification code",
        attemptsRemaining: remaining,
      };
    }

    // 6. SUCCESS: Update subscriber as verified
    const [updatedSubscriber] = await db
      .update(subscribers)
      .set({
        mobileVerified: true, // ✅ MARK AS VERIFIED
        status: 'active', // ✅ ACTIVATE SUBSCRIBER
        verifiedAt: new Date(), // ✅ TIMESTAMP
        otpCode: null, // Clear OTP
        otpExpiresAt: null,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, subscriberId))
      .returning({
        name: subscribers.name,
        email: subscribers.email,
      });

    // 7. Invalidate caches
    await Promise.all([
      deletePattern(CacheKeys.patterns.allRegistrations()),
      deletePattern(CacheKeys.patterns.allStats()),
      deletePattern(CacheKeys.patterns.allDashboard()),
    ]);

    return {
      success: true,
      subscriber: updatedSubscriber,
    };
  } catch (error) {
    console.error("OTP verification error:", error);
    return {
      success: false,
      error: "Verification failed. Please try again.",
    };
  }
}
```

### 4.5 Resend OTP Action (`src/app/actions/resend-otp.ts`)

```typescript
"use server";

import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateOTP, hashOTP, getOTPExpiration } from "@/lib/otp";
import { sendOTPSMS } from "@/lib/services/sms";

export type ResendOTPResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
      cooldownSeconds?: number;
    };

export async function resendOtpAction(
  subscriberId: string
): Promise<ResendOTPResult> {
  try {
    // 1. Find subscriber
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId))
      .limit(1);

    if (!subscriber) {
      return {
        success: false,
        error: "Invalid verification session",
      };
    }

    // 2. Check if already verified
    if (subscriber.mobileVerified) {
      return {
        success: false,
        error: "Mobile number already verified",
      };
    }

    // 3. Check cooldown period
    const cooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60');
    if (subscriber.otpLastSentAt) {
      const timeSinceLastSend = Date.now() - subscriber.otpLastSentAt.getTime();
      const cooldownMs = cooldownSeconds * 1000;

      if (timeSinceLastSend < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
        return {
          success: false,
          error: `Please wait before requesting a new code`,
          cooldownSeconds: remainingSeconds,
        };
      }
    }

    // 4. Generate new OTP
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const otpExpiration = getOTPExpiration();

    // 5. Send OTP via SMS
    const smsResult = await sendOTPSMS(subscriber.mobile, otpCode);

    if (!smsResult.success) {
      return {
        success: false,
        error: "Failed to send verification code. Please try again.",
      };
    }

    // 6. Update subscriber with new OTP
    await db
      .update(subscribers)
      .set({
        otpCode: hashedOTP,
        otpExpiresAt: otpExpiration,
        otpAttempts: 0, // Reset attempts
        otpLastSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, subscriberId));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Resend OTP error:", error);
    return {
      success: false,
      error: "Failed to resend code. Please try again.",
    };
  }
}
```

### 4.6 OTP Validation Schema (`src/lib/validations/otp.ts`)

```typescript
import { z } from "zod";

export const otpVerificationSchema = z.object({
  subscriberId: z.string().uuid("Invalid session"),
  otpCode: z.string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must contain only numbers"),
});

export type OTPVerificationData = z.infer<typeof otpVerificationSchema>;
```

---

## 5. Frontend Implementation

### 5.1 Install shadcn Input OTP Component

```bash
npx shadcn@latest add input-otp
```

### 5.2 OTP Verification Page (`src/app/verify-otp/page.tsx`)

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { verifyOtpAction } from "@/app/actions/verify-otp";
import { resendOtpAction } from "@/app/actions/resend-otp";
import ParticleBackground from "@/components/subscription/ParticleBackground";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subscriberId = searchParams.get("session");

  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Redirect if no session
  useEffect(() => {
    if (!subscriberId) {
      router.push("/subscribe");
    }
  }, [subscriberId, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otpValue.length === 6 && subscriberId) {
      handleVerify(otpValue);
    }
  }, [otpValue, subscriberId]);

  const handleVerify = async (code: string) => {
    if (!subscriberId) return;

    setIsVerifying(true);

    try {
      const result = await verifyOtpAction(subscriberId, code);

      if (result.success) {
        toast.success("Mobile verified successfully!");
        router.push(
          `/success?name=${encodeURIComponent(result.subscriber.name)}&email=${encodeURIComponent(result.subscriber.email)}`
        );
      } else {
        toast.error(result.error);
        setOtpValue(""); // Clear input

        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        }
      }
    } catch (error) {
      toast.error("Verification failed. Please try again.");
      setOtpValue("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!subscriberId || cooldown > 0) return;

    setIsResending(true);

    try {
      const result = await resendOtpAction(subscriberId);

      if (result.success) {
        toast.success("New code sent!");
        setCooldown(60); // 60 second cooldown
        setAttemptsRemaining(null);
        setOtpValue("");
      } else {
        toast.error(result.error);
        if (result.cooldownSeconds) {
          setCooldown(result.cooldownSeconds);
        }
      }
    } catch (error) {
      toast.error("Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  if (!subscriberId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <ParticleBackground />

      <main className="w-full max-w-md py-12 sm:py-16 relative z-10">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-800">
          <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Verify Your Number
          </h1>

          <p className="text-gray-400 text-center mb-8">
            Enter the 6-digit code sent to your mobile
          </p>

          {/* OTP Input */}
          <div className="flex justify-center mb-6">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={(value) => setOtpValue(value)}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Attempts Remaining */}
          {attemptsRemaining !== null && attemptsRemaining > 0 && (
            <p className="text-yellow-500 text-sm text-center mb-4">
              {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
            </p>
          )}

          {/* Verification Status */}
          {isVerifying && (
            <p className="text-orange-400 text-center mb-4">
              Verifying...
            </p>
          )}

          {/* Resend Button */}
          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="text-orange-500 hover:text-orange-400 disabled:text-gray-600 disabled:cursor-not-allowed text-sm font-medium"
            >
              {cooldown > 0
                ? `Resend code in ${cooldown}s`
                : isResending
                ? "Sending..."
                : "Didn't receive? Resend code"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyOTP() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
```

### 5.3 Update Subscribe Page (`src/app/subscribe/page.tsx`)

Update the `onSubmit` handler:

```typescript
const onSubmit = async (data: SubscriptionFormData) => {
  setIsSubmitting(true);

  try {
    const result = await subscribeAction(data);

    if (result.success) {
      // Navigate to OTP verification page
      router.push(`/verify-otp?session=${result.subscriberId}`);
    } else {
      // Handle errors
      setIsSubmitting(false);

      if (result.field) {
        setError(result.field as keyof SubscriptionFormData, {
          type: "server",
          message: result.error,
        });
      } else {
        toast.error(result.error, {
          description: "Please try again in a moment.",
        });
      }
    }
  } catch (error) {
    setIsSubmitting(false);
    toast.error("Unable to connect to the server", {
      description: "Please check your connection and try again.",
    });
  }
};
```

---

## 6. Testing Requirements

### Unit Tests
- `lib/otp.ts`:
  - Generate 6-digit OTP
  - Hash OTP correctly
  - Verify OTP matches
  - Check expiration logic

### Integration Tests
- SMS sending via Clickatell
- Database OTP storage
- Verification workflow
- Resend workflow

### API Tests
- `POST /api/otp/verify`:
  - Valid OTP → success
  - Invalid OTP → increment attempts
  - Expired OTP → error
  - Max attempts → locked
- `POST /api/otp/resend`:
  - Resend with cooldown
  - Rate limiting

### E2E Tests
1. Submit form → OTP sent
2. Enter correct OTP → verified → success page
3. Enter wrong OTP → error + attempts remaining
4. Resend OTP → new code sent
5. Expired OTP → request new code

---

## 7. Security Considerations

### Rate Limiting
- Max 3 OTP sends per mobile per hour
- Max 3 verification attempts per OTP
- 60-second cooldown between resends

### Data Protection
- OTP codes encrypted in database
- OTP cleared after verification
- Short expiration window (10 minutes)

### Audit Logging
- Log OTP generation events
- Log verification attempts (success/failure)
- Log SMS sending status
- Track IP addresses

### Error Handling
- Don't reveal if mobile exists
- Generic error messages
- Log detailed errors server-side

---

## 8. Agent Assignments

### 🗄️ **Gal (Database Architect)**
**Responsibility**: Database schema design and migration

**Tasks**:
1. Add OTP fields to `subscribers` table in `src/lib/db/schema.ts`:
   - `otpCode` (varchar, encrypted)
   - `otpExpiresAt` (timestamp)
   - `otpAttempts` (integer)
   - `otpLastSentAt` (timestamp)
2. Create Drizzle migration file
3. Test migration on local database
4. Update Subscriber model operations if needed
5. Add database indexes for OTP queries

**Deliverables**:
- Updated schema.ts
- Migration file
- Migration test results

---

### ⚙️ **Adi (Fullstack Engineer)**
**Responsibility**: Backend services, API integration, Server Actions

**Tasks**:
1. **Clickatell SMS Integration** (`src/lib/services/sms.ts`):
   - Implement `sendSMS()` function
   - Implement `sendOTPSMS()` wrapper
   - Error handling for SMS failures
   - Add retry logic

2. **OTP Utilities** (`src/lib/otp.ts`):
   - `generateOTP()` - 6-digit code
   - `hashOTP()` - encrypt for storage
   - `verifyOTP()` - compare codes
   - `isOTPExpired()` - check expiration
   - `getOTPExpiration()` - calculate expiry time

3. **Server Actions**:
   - Modify `src/app/actions/subscribe.ts`:
     - Generate OTP
     - Send SMS
     - Save subscriber as 'pending'
     - Return subscriberId instead of success redirect
   - Create `src/app/actions/verify-otp.ts`:
     - Validate OTP
     - Update `mobileVerified: true`
     - Update `status: 'active'`
     - Clear OTP data
   - Create `src/app/actions/resend-otp.ts`:
     - Check cooldown
     - Generate new OTP
     - Send SMS
     - Update database

4. **Validation Schemas** (`src/lib/validations/otp.ts`):
   - OTP verification schema (Zod)

5. **Environment Variables**:
   - Document required variables
   - Add to .env.example

**Deliverables**:
- SMS service integration
- OTP utility functions
- Modified subscribe action
- New verify/resend actions
- Validation schemas
- Environment variable documentation

---

### 🎨 **Tal (Frontend/Design Engineer)**
**Responsibility**: UI components and user experience

**Tasks**:
1. **Install shadcn Component**:
   ```bash
   npx shadcn@latest add input-otp
   ```

2. **Create OTP Verification Page** (`src/app/verify-otp/page.tsx`):
   - shadcn Input OTP component with 6 slots
   - Auto-focus on mount
   - Auto-submit when 6 digits entered
   - Loading states during verification
   - Error states with attempts remaining
   - Success animation/feedback

3. **Resend Functionality**:
   - Resend button with cooldown timer
   - Countdown display (60 seconds)
   - Disabled state during cooldown
   - Loading state while sending

4. **Design System Integration**:
   - Match existing design (black bg, orange accents)
   - Use ParticleBackground component
   - Responsive layout (mobile-first)
   - Accessibility:
     - ARIA labels
     - Keyboard navigation
     - Screen reader support
     - Focus management
   - Mobile optimizations:
     - Trigger numeric keyboard
     - Large touch targets
     - Auto-zoom prevention

5. **Update Subscribe Page**:
   - Modify redirect logic to go to OTP page instead of success
   - Handle subscriberId in response

**Deliverables**:
- OTP verification page UI
- Resend functionality with timer
- Updated subscribe page redirect
- Accessible, mobile-optimized design
- Design matches existing system

---

### 🧪 **Uri (Testing Engineer)**
**Responsibility**: Comprehensive test coverage

**Tasks**:
1. **Unit Tests**:
   - `lib/otp.ts`:
     - OTP generation (6 digits, numeric)
     - OTP hashing/encryption
     - OTP verification (match/no match)
     - Expiration logic
   - `lib/services/sms.ts`:
     - Mock Clickatell API
     - Test success/failure scenarios

2. **Integration Tests**:
   - Database operations:
     - Save subscriber with OTP
     - Update mobileVerified status
     - Clear OTP after verification
   - Server Actions:
     - subscribeAction (generate + send)
     - verifyOtpAction (verify + update)
     - resendOtpAction (cooldown + send)

3. **API Route Tests**:
   - Verify OTP endpoint:
     - Valid OTP → success
     - Invalid OTP → error + attempts
     - Expired OTP → error
     - Max attempts → locked
   - Resend OTP endpoint:
     - Cooldown enforcement
     - Rate limiting

4. **E2E Tests** (Playwright):
   - Complete flow:
     1. Fill registration form
     2. Submit → redirected to OTP page
     3. Enter correct OTP → success page
   - Error scenarios:
     - Wrong OTP → error message
     - Expired OTP → error message
     - Max attempts → locked message
   - Resend flow:
     - Click resend → new code sent
     - Cooldown timer works

5. **Security Tests**:
   - Rate limiting works
   - OTP encryption in database
   - Session validation
   - CSRF protection

**Deliverables**:
- Unit test suite (80%+ coverage)
- Integration test suite
- API route tests
- E2E test scenarios
- Test documentation
- CI/CD integration

---

## 9. Implementation Order

1. **Phase 1: Database** (Gal)
   - Schema changes
   - Migration
   - Testing

2. **Phase 2: Backend** (Adi)
   - OTP utilities
   - SMS service
   - Server Actions
   - API routes

3. **Phase 3: Frontend** (Tal)
   - Install input-otp component
   - OTP verification page
   - Update subscribe page

4. **Phase 4: Testing** (Uri)
   - Unit tests
   - Integration tests
   - E2E tests

5. **Phase 5: Integration**
   - End-to-end testing
   - Security audit
   - Performance testing
   - Deployment

---

## 10. Deployment Checklist

- [ ] Environment variables configured (Clickatell API key)
- [ ] Database migration executed
- [ ] SMS service tested with real phone numbers
- [ ] Rate limiting configured
- [ ] Monitoring/logging setup
- [ ] Error tracking configured
- [ ] Audit logs enabled
- [ ] Security review completed
- [ ] Performance testing passed
- [ ] User acceptance testing completed

---

## 11. Future Enhancements

- Email OTP as fallback option
- Biometric verification (Touch ID, Face ID)
- WhatsApp OTP delivery
- Multi-language SMS templates
- OTP analytics dashboard
- A/B testing different OTP lengths
- SMS cost tracking
- Alternative verification methods (voice call)

---

**Last Updated**: 2025-10-02
**Version**: 1.0
**Status**: Planning Phase
