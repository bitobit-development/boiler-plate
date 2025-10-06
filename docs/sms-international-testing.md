# SMS International Testing Documentation

## Overview
This document provides information for testing SMS delivery to international numbers using the Clickatell API integration in the Bigg Buzz platform.

## API Configuration

### Clickatell API Credentials
Located in `.env.local`:
- **API Key**: `kGvdfOdLShuu9BZJ5U_Lvg==`
- **API URL**: `https://platform.clickatell.com/v1/message`

### API Endpoint Details
- **Method**: POST
- **Content-Type**: application/json
- **Authorization**: Direct API key (no "Bearer" prefix)

## Testing Methods

### 1. Direct cURL Command
Test SMS sending directly via cURL:

```bash
curl -X POST https://platform.clickatell.com/v1/message \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: kGvdfOdLShuu9BZJ5U_Lvg==" \
  -d '{
    "messages": [
      {
        "channel": "sms",
        "to": "972505489909",
        "content": "Your test message here"
      }
    ]
  }'
```

**Important Notes:**
- Phone number should be WITHOUT the "+" sign
- Country code must be included (e.g., 972 for Israel, 27 for South Africa)
- The API returns HTTP 202 for successful queue

### 2. Node.js Test Script
Use the provided test script for easier testing:

```bash
# Test with default Israeli number
npx tsx scripts/test-international-sms.ts

# Test with custom number and message
npx tsx scripts/test-international-sms.ts +972505489909 "Your custom message"

# Test with South African number
npx tsx scripts/test-international-sms.ts +27823292438 "Test message to SA"
```

### 3. Using the SMS Service Directly
The SMS service (`/src/lib/services/sms.ts`) provides these functions:
- `sendSMS()` - Send plain SMS or WhatsApp messages
- `sendOTPSMS()` - Send OTP verification codes
- `sendWelcomeSMS()` - Send welcome messages after verification

## Successful Response Format
```json
{
  "messages": [
    {
      "apiMessageId": "cf8c26cb41164ff8ad139f1c13e5a174",
      "accepted": true,
      "to": "972505489909"
    }
  ],
  "error": null
}
```

## Test Results Summary

### Israeli Number Test (+972505489909)
- **Status**: ✅ Successfully sent
- **Message IDs**:
  - `493234b1f6c84557a1e6b5976b3be436` (cURL test)
  - `cf8c26cb41164ff8ad139f1c13e5a174` (Script test)
- **Delivery**: Messages queued for delivery

## International Number Format Requirements

| Country | Code | Format Example | Notes |
|---------|------|---------------|--------|
| Israel | +972 | +972505489909 | Remove leading 0 from local number |
| South Africa | +27 | +27823292438 | Test number provided by Clickatell |
| USA | +1 | +12125551234 | Include area code |
| UK | +44 | +447123456789 | Remove leading 0 from local number |

## Troubleshooting

### Common Issues
1. **"SMS service not configured"** - Environment variables not loaded
   - Solution: Ensure `.env.local` is properly loaded with dotenv

2. **Invalid phone number format** - Missing or incorrect country code
   - Solution: Always include country code with "+" prefix in code

3. **API Authentication Failed** - Incorrect API key format
   - Solution: Use API key directly without "Bearer" prefix

### API Error Codes
- **202 Accepted**: Message queued successfully
- **401 Unauthorized**: Invalid API key
- **400 Bad Request**: Invalid message format or phone number
- **429 Too Many Requests**: Rate limit exceeded

## SMS Service Features

### Supported Channels
- **SMS**: Standard text messaging
- **WhatsApp**: Business messaging (requires WhatsApp Business account)

### Automatic Formatting
- Removes non-digit characters from phone numbers
- Validates country code presence
- Handles both "+" prefix and numeric-only formats

### Rate Limiting
- Clickatell API has rate limits per account
- Check your account dashboard for specific limits

## Files and Locations

- **SMS Service**: `/src/lib/services/sms.ts`
- **Test Script**: `/scripts/test-international-sms.ts`
- **Test Utilities**: `/src/lib/services/test-sms.ts`
- **Environment Config**: `.env.local`

## Security Notes

- API keys should never be committed to version control
- Use environment variables for all sensitive data
- Consider implementing additional rate limiting in production
- Log all SMS attempts for audit purposes

## Next Steps

1. Monitor delivery status via Clickatell dashboard
2. Implement webhook handlers for delivery notifications
3. Add retry logic for failed messages
4. Consider implementing SMS templates for consistent messaging