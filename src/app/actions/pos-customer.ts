'use server';

import { db } from '@/lib/db';
import { subscribers, otpOverrideLogs, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Subscriber, OtpOverrideReason } from '@/lib/db/schema';
import { generateOTP, hashOTP, verifyOTP, getOTPExpiration, canResendOTP } from '@/lib/otp';
import { sendOTPSMS } from '@/lib/services/sms';

// Type definitions
export interface OTPInitiationResult {
  success: boolean;
  message: string;
  otpSent?: boolean;
  canResendAfter?: number; // seconds until next resend allowed
  expiresIn?: number; // seconds until OTP expires
}

export interface OTPVerificationResult {
  success: boolean;
  message: string;
  customer?: Subscriber;
  attemptsRemaining?: number;
}

export interface OTPOverrideResult {
  success: boolean;
  message: string;
  overrideLogId?: string;
  customer?: Subscriber;
}

/**
 * Initiate OTP verification for customer
 * Generates and sends OTP code via SMS
 */
export async function initiateCustomerOTP(customerId: string): Promise<OTPInitiationResult> {
  try {
    // Get customer details
    const [customer] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, customerId))
      .limit(1);

    if (!customer) {
      return {
        success: false,
        message: 'Customer not found',
        otpSent: false
      };
    }

    // Check if customer is already verified
    if (customer.mobileVerified && customer.status === 'active') {
      return {
        success: true,
        message: 'Customer already verified',
        otpSent: false
      };
    }

    // Check OTP resend cooldown
    const resendCheck = canResendOTP(customer.otpLastSentAt);
    if (!resendCheck.canSend) {
      return {
        success: false,
        message: `Please wait ${resendCheck.remainingSeconds} seconds before requesting a new code`,
        otpSent: false,
        canResendAfter: resendCheck.remainingSeconds
      };
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const expiresAt = getOTPExpiration();

    // Update customer with new OTP
    await db
      .update(subscribers)
      .set({
        otpCode: hashedOTP,
        otpExpiresAt: expiresAt,
        otpAttempts: 0, // Reset attempts
        otpLastSentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(subscribers.id, customerId));

    // Send OTP via SMS
    const smsResult = await sendOTPSMS(customer.mobile, otpCode);

    if (!smsResult.success) {
      // Log failed SMS attempt
      await db.insert(auditLogs).values({
        adminUserId: null,
        adminEmail: 'system',
        adminRole: 'system',
        action: 'create',
        entityType: 'otp_sms',
        entityId: customerId,
        entityName: `${customer.name} ${customer.surname}`,
        description: `Failed to send OTP SMS to ${customer.mobile}`,
        metadata: {
          error: smsResult.error,
          mobile: customer.mobile
        },
        ipAddress: '0.0.0.0',
        isSuccess: false,
        errorMessage: smsResult.error,
        createdAt: new Date()
      });

      return {
        success: false,
        message: 'Failed to send OTP. Please try again or use override option.',
        otpSent: false
      };
    }

    // Calculate expiry time in seconds
    const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    // Log successful OTP send
    await db.insert(auditLogs).values({
      adminUserId: null,
      adminEmail: 'system',
      adminRole: 'system',
      action: 'create',
      entityType: 'otp_sms',
      entityId: customerId,
      entityName: `${customer.name} ${customer.surname}`,
      description: `OTP SMS sent successfully to ${customer.mobile}`,
      metadata: {
        mobile: customer.mobile,
        messageId: smsResult.messageId,
        expiresAt: expiresAt.toISOString()
      },
      ipAddress: '0.0.0.0',
      isSuccess: true,
      createdAt: new Date()
    });

    return {
      success: true,
      message: `OTP code sent to ${customer.mobile}`,
      otpSent: true,
      expiresIn
    };
  } catch (error) {
    console.error('Error initiating customer OTP:', error);
    return {
      success: false,
      message: 'Failed to initiate OTP verification',
      otpSent: false
    };
  }
}

/**
 * Verify OTP code entered by customer
 */
export async function verifyCustomerOTP(
  customerId: string,
  otpCode: string
): Promise<OTPVerificationResult> {
  try {
    // Get customer details
    const [customer] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, customerId))
      .limit(1);

    if (!customer) {
      return {
        success: false,
        message: 'Customer not found'
      };
    }

    // Check if OTP exists
    if (!customer.otpCode || !customer.otpExpiresAt) {
      return {
        success: false,
        message: 'No OTP code found. Please request a new code.'
      };
    }

    // Check if OTP is expired
    if (new Date() > customer.otpExpiresAt) {
      return {
        success: false,
        message: 'OTP code has expired. Please request a new code.'
      };
    }

    // Check attempt limit (max 5 attempts)
    const maxAttempts = 5;
    if (customer.otpAttempts >= maxAttempts) {
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
        attemptsRemaining: 0
      };
    }

    // Verify the OTP
    const isValid = verifyOTP(otpCode, customer.otpCode);

    if (!isValid) {
      // Increment failed attempts
      const newAttempts = customer.otpAttempts + 1;
      await db
        .update(subscribers)
        .set({
          otpAttempts: newAttempts,
          updatedAt: new Date()
        })
        .where(eq(subscribers.id, customerId));

      const attemptsRemaining = maxAttempts - newAttempts;

      return {
        success: false,
        message: `Invalid OTP code. ${attemptsRemaining} attempts remaining.`,
        attemptsRemaining
      };
    }

    // OTP is valid - update customer status
    const updatedCustomer = await db
      .update(subscribers)
      .set({
        mobileVerified: true,
        status: 'active',
        verifiedAt: new Date(),
        otpCode: null, // Clear OTP
        otpExpiresAt: null,
        otpAttempts: 0,
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(subscribers.id, customerId))
      .returning();

    // Log successful verification
    await db.insert(auditLogs).values({
      adminUserId: null,
      adminEmail: 'system',
      adminRole: 'system',
      action: 'update',
      entityType: 'subscriber',
      entityId: customerId,
      entityName: `${customer.name} ${customer.surname}`,
      description: 'Customer mobile number verified via OTP',
      metadata: {
        mobile: customer.mobile,
        previousStatus: customer.status,
        newStatus: 'active'
      },
      ipAddress: '0.0.0.0',
      isSuccess: true,
      createdAt: new Date()
    });

    return {
      success: true,
      message: 'Mobile number verified successfully',
      customer: updatedCustomer[0]
    };
  } catch (error) {
    console.error('Error verifying customer OTP:', error);
    return {
      success: false,
      message: 'Failed to verify OTP code'
    };
  }
}

/**
 * Override OTP verification with manager approval
 * Used when SMS delivery fails or customer cannot receive OTP
 */
export async function overrideCustomerOTP(
  customerId: string,
  reason: OtpOverrideReason,
  explanation: string,
  shopUserId?: string,
  orderId?: string
): Promise<OTPOverrideResult> {
  try {
    // Validate explanation length
    if (!explanation || explanation.trim().length < 10) {
      return {
        success: false,
        message: 'Please provide a detailed explanation (minimum 10 characters)'
      };
    }

    // Get customer details
    const [customer] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, customerId))
      .limit(1);

    if (!customer) {
      return {
        success: false,
        message: 'Customer not found'
      };
    }

    // Create override log entry
    const [overrideLog] = await db
      .insert(otpOverrideLogs)
      .values({
        subscriberId: customerId,
        shopUserId: shopUserId || null, // Pass null if no shop user logged in
        orderId,
        reason,
        explanation: explanation.trim(),
        wasSuccessful: true,
        ipAddress: '0.0.0.0', // This should be passed from the request context
        kioskId: 'POS-KIOSK-001', // This should be passed from the session
        deviceFingerprint: 'pos-terminal', // This should be from the device
        riskScore: calculateRiskScore(reason), // Calculate based on reason
        flaggedForReview: shouldFlagForReview(reason),
        createdAt: new Date()
      })
      .returning();

    // Update customer to verified status
    const [updatedCustomer] = await db
      .update(subscribers)
      .set({
        mobileVerified: true,
        status: 'active',
        verifiedAt: new Date(),
        otpCode: null, // Clear any pending OTP
        otpExpiresAt: null,
        otpAttempts: 0,
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(subscribers.id, customerId))
      .returning();

    // Create audit log for the override
    await db.insert(auditLogs).values({
      adminUserId: shopUserId,
      adminEmail: 'shop_user',
      adminRole: 'shop_user',
      action: 'approve',
      entityType: 'otp_override',
      entityId: overrideLog.id,
      entityName: `${customer.name} ${customer.surname}`,
      description: `OTP verification overridden for customer`,
      changes: {
        before: { mobileVerified: false, status: customer.status },
        after: { mobileVerified: true, status: 'active' }
      },
      metadata: {
        reason,
        explanation,
        customerId,
        customerMobile: customer.mobile,
        orderId
      },
      ipAddress: '0.0.0.0',
      riskLevel: calculateRiskScore(reason),
      isCompliance: true,
      isSecurity: true,
      isSuccess: true,
      createdAt: new Date()
    });

    return {
      success: true,
      message: 'OTP verification overridden successfully',
      overrideLogId: overrideLog.id,
      customer: updatedCustomer
    };
  } catch (error) {
    console.error('Error overriding customer OTP:', error);
    return {
      success: false,
      message: 'Failed to override OTP verification'
    };
  }
}

/**
 * Calculate risk score based on override reason
 * Higher scores indicate higher risk and may require additional review
 */
function calculateRiskScore(reason: OtpOverrideReason): number {
  const riskScores: Record<OtpOverrideReason, number> = {
    sms_delivery_failure: 20,
    network_issues: 20,
    customer_phone_issues: 30,
    international_number: 40,
    elderly_assistance: 10,
    disability_accommodation: 10,
    technical_error: 25,
    manager_approval: 50
  };

  return riskScores[reason] || 50;
}

/**
 * Determine if override should be flagged for review
 */
function shouldFlagForReview(reason: OtpOverrideReason): boolean {
  const reviewRequired: OtpOverrideReason[] = [
    'manager_approval',
    'international_number'
  ];

  return reviewRequired.includes(reason);
}

/**
 * Get customer's OTP override history
 * Used to check for patterns or abuse
 */
export async function getCustomerOverrideHistory(customerId: string) {
  try {
    const overrides = await db
      .select()
      .from(otpOverrideLogs)
      .where(eq(otpOverrideLogs.subscriberId, customerId))
      .orderBy(otpOverrideLogs.createdAt)
      .limit(10);

    return overrides;
  } catch (error) {
    console.error('Error fetching override history:', error);
    return [];
  }
}