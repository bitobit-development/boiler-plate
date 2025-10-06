/**
 * Phone Number Validation & E.164 Formatting Utility
 *
 * This utility ensures phone numbers are captured and stored in the correct
 * E.164 international format, regardless of how users input them.
 *
 * E.164 Format: +[country_code][subscriber_number]
 * Example: +972505489909 (Israel), +14155552671 (US)
 *
 * Key Features:
 * - Removes leading zeros for 14 countries (Israel, UK, South Africa, etc.)
 * - Validates phone numbers using libphonenumber-js
 * - Handles multiple input formats (with/without formatting, leading zeros)
 * - Returns normalized E.164 format for SMS delivery
 */

import parsePhoneNumber, {
  isValidPhoneNumber,
  CountryCode,
} from "libphonenumber-js";

/**
 * Countries that use a leading 0 for domestic dialing
 * that must be removed for international E.164 format
 */
const COUNTRIES_WITH_LEADING_ZERO: readonly string[] = [
  "27", // South Africa
  "972", // Israel
  "44", // United Kingdom
  "33", // France
  "39", // Italy
  "49", // Germany
  "31", // Netherlands
  "32", // Belgium
  "41", // Switzerland
  "43", // Austria
  "81", // Japan
  "82", // South Korea
  "61", // Australia
  "64", // New Zealand
] as const;

/**
 * Result of phone validation and formatting
 */
export interface PhoneValidationResult {
  /** Whether the phone number is valid */
  isValid: boolean;
  /** Phone number in E.164 format (e.g., +972505489909) */
  e164: string | null;
  /** ISO country code (e.g., IL, US, GB) */
  country: CountryCode | null;
  /** National format (e.g., (415) 555-2671 for US) */
  nationalFormat: string | null;
  /** International format with spaces (e.g., +972 50 548 9909) */
  internationalFormat: string | null;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Validates and formats a phone number to E.164 standard
 *
 * Handles multiple input formats:
 * - With leading zero: "0505489909" → "+972505489909"
 * - Without leading zero: "505489909" → "+972505489909"
 * - With formatting: "050-548-9909" → "+972505489909"
 * - Already international: "+972505489909" → "+972505489909"
 *
 * @param phoneInput - The phone number input (any format)
 * @param countryCode - The country code (e.g., "+972", "+1", "+44")
 * @returns PhoneValidationResult with E.164 format and validation status
 *
 * @example
 * // Israeli number with leading zero
 * validateAndFormatPhone("0505489909", "+972")
 * // Returns: { isValid: true, e164: "+972505489909", country: "IL", ... }
 *
 * @example
 * // US number (no leading zero removal)
 * validateAndFormatPhone("4155552671", "+1")
 * // Returns: { isValid: true, e164: "+14155552671", country: "US", ... }
 */
export function validateAndFormatPhone(
  phoneInput: string,
  countryCode: string
): PhoneValidationResult {
  try {
    // Remove all non-digit characters (spaces, dashes, parentheses, etc.)
    let cleaned = phoneInput.replace(/\D/g, "");

    // Handle leading zero removal for specific countries
    const numericCountryCode = countryCode.replace("+", "");

    if (
      cleaned.startsWith("0") &&
      COUNTRIES_WITH_LEADING_ZERO.includes(numericCountryCode)
    ) {
      cleaned = cleaned.slice(1); // Remove the leading 0
    }

    // Construct E.164 format
    const e164Number = `+${numericCountryCode}${cleaned}`;

    // Validate using libphonenumber-js
    if (!isValidPhoneNumber(e164Number)) {
      return {
        isValid: false,
        e164: null,
        country: null,
        nationalFormat: null,
        internationalFormat: null,
        error: "Invalid phone number format",
      };
    }

    // Parse the validated number
    const parsed = parsePhoneNumber(e164Number);

    return {
      isValid: true,
      e164: parsed.number,
      country: parsed.country || null,
      nationalFormat: parsed.formatNational(),
      internationalFormat: parsed.formatInternational(),
    };
  } catch (error) {
    return {
      isValid: false,
      e164: null,
      country: null,
      nationalFormat: null,
      internationalFormat: null,
      error: error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}

/**
 * Quick validation check without full parsing
 *
 * Use this for fast validation when you don't need formatted outputs
 *
 * @param phoneInput - The phone number input
 * @param countryCode - The country code (e.g., "+972", "+1")
 * @returns true if valid, false otherwise
 *
 * @example
 * isPhoneValid("0505489909", "+972") // true
 * isPhoneValid("123", "+972") // false
 */
export function isPhoneValid(
  phoneInput: string,
  countryCode: string
): boolean {
  const result = validateAndFormatPhone(phoneInput, countryCode);
  return result.isValid;
}

/**
 * Extracts just the E.164 formatted number
 *
 * Returns null if invalid
 *
 * @param phoneInput - The phone number input
 * @param countryCode - The country code
 * @returns E.164 formatted number or null
 *
 * @example
 * getE164Format("0505489909", "+972") // "+972505489909"
 * getE164Format("123", "+972") // null
 */
export function getE164Format(
  phoneInput: string,
  countryCode: string
): string | null {
  const result = validateAndFormatPhone(phoneInput, countryCode);
  return result.isValid ? result.e164 : null;
}

/**
 * Detects if a phone number is likely malformed in the database
 *
 * Common patterns of malformed numbers:
 * - Double zero after country code: +9720505489909
 * - Missing country code: 505489909
 * - Invalid E.164 format
 *
 * @param dbPhoneNumber - Phone number stored in database
 * @returns true if malformed, false if valid
 *
 * @example
 * isMalformedE164("+9720505489909") // true (extra 0)
 * isMalformedE164("+972505489909") // false (correct)
 * isMalformedE164("505489909") // true (missing country code)
 */
export function isMalformedE164(dbPhoneNumber: string): boolean {
  if (!dbPhoneNumber) return true;

  // Must start with +
  if (!dbPhoneNumber.startsWith("+")) return true;

  // Check if it's valid E.164
  if (!isValidPhoneNumber(dbPhoneNumber)) return true;

  // Check for double-zero patterns (e.g., +9720, +440, +270)
  // This catches cases where leading zero wasn't removed
  const doubleZeroPattern = /\+\d{2,3}0\d{9,}/;
  if (doubleZeroPattern.test(dbPhoneNumber)) return true;

  return false;
}

/**
 * Attempts to fix a malformed E.164 number
 *
 * Common fixes:
 * - Removes extra zero after country code
 * - Adds missing country code (requires countryCode parameter)
 * - Validates and reformats
 *
 * @param malformedNumber - The malformed phone number
 * @param countryCode - Optional country code to use if missing
 * @returns Fixed E.164 number or null if cannot be fixed
 *
 * @example
 * fixMalformedE164("+9720505489909") // "+972505489909"
 * fixMalformedE164("505489909", "+972") // "+972505489909"
 * fixMalformedE164("invalid") // null
 */
export function fixMalformedE164(
  malformedNumber: string,
  countryCode?: string
): string | null {
  try {
    // Case 1: Has country code but extra zero (e.g., +9720505489909)
    if (malformedNumber.startsWith("+")) {
      const match = malformedNumber.match(/^\+(\d{2,3})0(\d+)$/);
      if (match) {
        const [, code, rest] = match;
        const fixed = `+${code}${rest}`;
        if (isValidPhoneNumber(fixed)) {
          return fixed;
        }
      }

      // Already in E.164 format, just validate
      if (isValidPhoneNumber(malformedNumber)) {
        return parsePhoneNumber(malformedNumber).number;
      }
    }

    // Case 2: Missing country code (requires countryCode parameter)
    if (countryCode && !malformedNumber.startsWith("+")) {
      return getE164Format(malformedNumber, countryCode);
    }

    return null;
  } catch {
    return null;
  }
}
