import crypto from "crypto";

// ====================================
// PASSWORD SECURITY
// ====================================

/**
 * Hash a password using PBKDF2 with a random salt
 * Cannabis industry compliance: Using strong hashing algorithm
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate random salt
    const salt = crypto.randomBytes(16).toString("hex");

    // Hash password with PBKDF2
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");

    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
}

// ====================================
// TOKEN MANAGEMENT
// ====================================

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate access and refresh tokens
 */
export function generateTokenPair() {
  return {
    accessToken: generateToken(32),
    refreshToken: generateToken(48),
    tokenHash: generateTokenHash(generateToken(32))
  };
}

/**
 * Hash a token for storage (one-way)
 */
export function generateTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verify token hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  return generateTokenHash(token) === hash;
}

// ====================================
// 2FA / MFA
// ====================================

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

/**
 * Generate TOTP secret for 2FA
 */
export function generateTOTPSecret(): string {
  // Generate 32-character base32 secret
  const buffer = crypto.randomBytes(20);
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";

  for (let i = 0; i < buffer.length; i++) {
    secret += base32Chars[buffer[i] % 32];
  }

  return secret;
}

// ====================================
// SESSION SECURITY
// ====================================

/**
 * Calculate session expiry times
 */
export function getSessionExpiry() {
  const now = new Date();

  return {
    // Access token: 15 minutes
    accessTokenExpiry: new Date(now.getTime() + 15 * 60 * 1000),

    // Refresh token: 7 days
    refreshTokenExpiry: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),

    // Session: 30 days maximum
    sessionExpiry: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  };
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `sess_${generateToken(24)}`;
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${generateToken(16)}`;
}

// ====================================
// IP & DEVICE FINGERPRINTING
// ====================================

/**
 * Generate device fingerprint from user agent and other factors
 */
export function generateDeviceFingerprint(
  userAgent: string,
  acceptLanguage?: string,
  acceptEncoding?: string
): string {
  const data = `${userAgent}|${acceptLanguage || ""}|${acceptEncoding || ""}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

/**
 * Check if IP is in private range (for security logging)
 */
export function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i
  ];

  return privateRanges.some(range => range.test(ip));
}

// ====================================
// DATA ENCRYPTION
// ====================================

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

/**
 * Encrypt sensitive data for storage
 */
export function encryptData(text: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("Encryption key not configured");
  }

  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(32);
  const keyBuffer = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, "sha256");

  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return salt.toString("hex") + ":" + iv.toString("hex") + ":" +
         authTag.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("Encryption key not configured");
  }

  const parts = encryptedData.split(":");
  const salt = Buffer.from(parts[0], "hex");
  const iv = Buffer.from(parts[1], "hex");
  const authTag = Buffer.from(parts[2], "hex");
  const encrypted = parts[3];

  const keyBuffer = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, "sha256");

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ====================================
// AUDIT & COMPLIANCE
// ====================================

/**
 * Calculate risk level for audit logging (0-10 scale)
 */
export function calculateRiskLevel(params: {
  action: string;
  isNewUser?: boolean;
  isUnusualTime?: boolean;
  isUnusualLocation?: boolean;
  failedAttempts?: number;
}): number {
  let riskLevel = 0;

  // High-risk actions
  const highRiskActions = ["delete", "export", "approve", "reject", "admin_create"];
  if (highRiskActions.includes(params.action.toLowerCase())) {
    riskLevel += 3;
  }

  // Risk factors
  if (params.isNewUser) riskLevel += 2;
  if (params.isUnusualTime) riskLevel += 1;
  if (params.isUnusualLocation) riskLevel += 2;
  if ((params.failedAttempts || 0) > 3) riskLevel += 2;

  return Math.min(riskLevel, 10);
}

/**
 * Sanitize data for audit logging (remove sensitive info)
 */
export function sanitizeForAudit(data: any): any {
  if (!data) return data;

  const sensitiveFields = [
    "password", "passwordHash", "twoFactorSecret",
    "backupCodes", "accessToken", "refreshToken",
    "tokenHash", "creditCard", "ssn", "bankAccount"
  ];

  if (typeof data === "object") {
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === "object") {
        sanitized[key] = sanitizeForAudit(sanitized[key]);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Generate compliance signature for immutable audit records
 */
export function generateComplianceSignature(data: any): string {
  const serialized = JSON.stringify(data);
  return crypto.createHash("sha256")
    .update(serialized + (process.env.AUDIT_SALT || ""))
    .digest("hex");
}