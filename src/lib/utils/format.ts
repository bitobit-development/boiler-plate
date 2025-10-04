/**
 * Formatting utilities for the application
 */

/**
 * Format a number in cents to South African Rand currency format
 * @param cents - Amount in cents
 * @returns Formatted currency string (e.g., "R1,234.56")
 */
export function formatCurrency(cents: number): string {
  const rand = cents / 100;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rand);
}

/**
 * Format a Date object to time string (HH:MM)
 * @param date - Date object or string
 * @returns Formatted time string
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

/**
 * Format a Date object to full date and time string
 * @param date - Date object or string
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

/**
 * Format a Date object to date string (YYYY-MM-DD)
 * @param date - Date object or string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-ZA').format(num);
}

/**
 * Format a phone number for display
 * @param phone - Phone number string
 * @returns Formatted phone number
 */
export function formatPhone(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format as South African mobile number if it matches the pattern
  if (digits.startsWith('27') && digits.length === 11) {
    // +27 82 123 4567
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  } else if (digits.startsWith('0') && digits.length === 10) {
    // 082 123 4567
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Return as-is if not a recognized format
  return phone;
}

/**
 * Truncate text to a maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add if truncated (default: "...")
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format bytes to human-readable size
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format a duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "2h 30m")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Format percentage
 * @param value - Value between 0 and 1 or 0 and 100
 * @param decimals - Number of decimal places (default: 0)
 * @param isDecimal - Whether the input is already a decimal (0-1) or percentage (0-100)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercentage(value: number, decimals: number = 0, isDecimal: boolean = true): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}