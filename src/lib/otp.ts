import crypto from 'crypto';
import { encryptData, decryptData } from '@/lib/db/security';

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash OTP for secure storage using existing encryption
 */
export function hashOTP(code: string): string {
  return encryptData(code);
}

/**
 * Verify OTP code by comparing with encrypted hash
 */
export function verifyOTP(inputCode: string, hashedCode: string): boolean {
  try {
    const decrypted = decryptData(hashedCode);
    return inputCode === decrypted;
  } catch (error) {
    console.error('OTP verification error:', error);
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
 * Calculate OTP expiration time based on environment config
 */
export function getOTPExpiration(): Date {
  const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Check if cooldown period has passed for resending OTP
 */
export function canResendOTP(lastSentAt: Date | null): { canSend: boolean; remainingSeconds?: number } {
  if (!lastSentAt) {
    return { canSend: true };
  }

  const cooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60');
  const timeSinceLastSend = Date.now() - lastSentAt.getTime();
  const cooldownMs = cooldownSeconds * 1000;

  if (timeSinceLastSend < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
    return { canSend: false, remainingSeconds };
  }

  return { canSend: true };
}