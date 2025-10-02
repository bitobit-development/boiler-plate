/**
 * Clickatell SMS Integration Service
 * Handles sending SMS messages via Clickatell's One API
 */

interface SendSMSParams {
  to: string; // Mobile number with country code (e.g., +27821234567)
  message: string;
  channel?: 'sms' | 'whatsapp'; // Default to SMS
}

interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel?: string;
}

interface ClickatellMessage {
  channel: 'sms' | 'whatsapp';
  to: string;
  content: string;
}

interface ClickatellResponse {
  messages?: Array<{
    accepted?: boolean;
    to?: string;
    apiMessageId?: string;
    error?: {
      code?: number;
      description?: string;
    };
  }>;
  error?: {
    code?: number;
    description?: string;
  };
}

/**
 * Send SMS via Clickatell API
 * Supports both SMS and WhatsApp channels
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const apiKey = process.env.CLICKATELL_API_KEY;
  const apiUrl = process.env.CLICKATELL_API_URL;

  if (!apiKey || !apiUrl) {
    console.error('Clickatell API credentials not configured');
    return {
      success: false,
      error: 'SMS service not configured',
    };
  }

  // Remove any non-digit characters except the leading +
  const cleanedNumber = params.to.replace(/[^\d+]/g, '');

  // Ensure the number starts with a country code
  if (!cleanedNumber.startsWith('+')) {
    console.error('Invalid phone number format - must include country code');
    return {
      success: false,
      error: 'Invalid phone number format',
    };
  }

  // Remove the + for Clickatell API (they expect just digits)
  const phoneNumber = cleanedNumber.substring(1);

  try {
    const messages: ClickatellMessage[] = [{
      channel: params.channel || 'sms',
      to: phoneNumber,
      content: params.message,
    }];

    console.log(`Sending ${params.channel || 'sms'} to ${phoneNumber}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey, // Clickatell expects the API key directly, not with Bearer prefix
      },
      body: JSON.stringify({ messages }),
    });

    const data: ClickatellResponse = await response.json();

    // Check for API-level errors
    if (!response.ok) {
      console.error('Clickatell API error:', data);
      return {
        success: false,
        error: data.error?.description || `API error: ${response.status}`,
      };
    }

    // Check message-level success
    const messageResult = data.messages?.[0];
    if (messageResult?.accepted) {
      console.log(`SMS sent successfully: ${messageResult.apiMessageId}`);
      return {
        success: true,
        messageId: messageResult.apiMessageId,
        channel: params.channel || 'sms',
      };
    }

    // Handle message-level errors
    const errorMessage = messageResult?.error?.description || 'Failed to send SMS';
    console.error('SMS sending failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      channel: params.channel || 'sms',
    };
  } catch (error) {
    console.error('SMS service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error sending SMS',
    };
  }
}

/**
 * Send OTP code via SMS with a formatted message
 */
export async function sendOTPSMS(mobile: string, otpCode: string): Promise<SendSMSResult> {
  const message = `Your Bigg Buzz verification code is: ${otpCode}\n\nThis code will expire in 10 minutes. Do not share this code with anyone.`;

  // Try SMS first
  const smsResult = await sendSMS({
    to: mobile,
    message,
    channel: 'sms',
  });

  // If SMS fails and it's a test number, try WhatsApp as fallback
  if (!smsResult.success && mobile.includes('2782329')) {
    console.log('SMS failed for test number, trying WhatsApp...');
    return sendSMS({
      to: mobile,
      message,
      channel: 'whatsapp',
    });
  }

  return smsResult;
}

/**
 * Send a welcome SMS after successful verification
 */
export async function sendWelcomeSMS(mobile: string, name: string): Promise<SendSMSResult> {
  const message = `Welcome to Bigg Buzz, ${name}! 🎉\n\nYour mobile number has been verified. Stay tuned for exclusive updates and offers!`;

  return sendSMS({
    to: mobile,
    message,
    channel: 'sms',
  });
}

/**
 * Validate mobile number format
 * Returns cleaned number or null if invalid
 */
export function validateMobileFormat(mobile: string): string | null {
  // Remove all non-digit characters except +
  const cleaned = mobile.replace(/[^\d+]/g, '');

  // Must start with + and country code
  if (!cleaned.startsWith('+')) {
    return null;
  }

  // Must be between 10 and 15 digits (including country code)
  const digitsOnly = cleaned.substring(1);
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return null;
  }

  // Check for South African numbers specifically (if needed)
  if (cleaned.startsWith('+27')) {
    // South African mobile numbers should be 11 digits total (+27 XX XXX XXXX)
    if (digitsOnly.length !== 11) {
      return null;
    }
  }

  return cleaned;
}