# Admin Session Management Documentation

## Overview

The admin session management system has been enhanced to provide a 60-minute session timeout with automatic extension capabilities, activity tracking, and security monitoring.

## Key Features

### 1. Extended Session Duration
- **Access Token Duration**: 60 minutes (extended from 15 minutes)
- **Refresh Token Duration**: 7 days
- **Automatic Extension**: Sessions auto-extend when activity is detected near expiration
- **Manual Extension**: Admins can manually extend their sessions

### 2. Activity Tracking
- **Last Activity Monitoring**: Tracks the last activity timestamp for each session
- **Inactivity Detection**: Automatically detects inactive sessions (30 minutes default)
- **Session Warning**: Warns users 5 minutes before session expiry

### 3. Security Features
- **Session Validation**: Validates session on each authenticated request
- **Multiple Session Management**: Users can revoke other active sessions
- **Audit Logging**: All session events are logged for compliance
- **Expired Session Cleanup**: Automatic cleanup of expired sessions

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_ACCESS_EXPIRY=60m              # Access token expiry (60 minutes)
JWT_REFRESH_EXPIRY=7d               # Refresh token expiry (7 days)

# Session Management
ADMIN_SESSION_TIMEOUT=3600          # Session timeout in seconds (60 minutes)
ADMIN_SESSION_WARNING_THRESHOLD=300 # Warning before expiry in seconds (5 minutes)
ADMIN_ACTIVITY_CHECK_INTERVAL=300   # Activity check interval in seconds (5 minutes)
ADMIN_MAX_INACTIVE_TIME=1800        # Maximum inactive time in seconds (30 minutes)

# Cron Job Security (optional)
CRON_SECRET=your-secure-cron-secret # Secret for cron job authentication
```

## API Endpoints

### 1. Login
**POST** `/api/admin/auth/login`
- Creates a new session with 60-minute access token
- Returns access and refresh tokens

### 2. Refresh Token
**POST** `/api/admin/auth/refresh`
- Refreshes the access token using refresh token
- Extends session by another 60 minutes

### 3. Session Status
**GET** `/api/admin/auth/session-status`
- Returns current session status and timing information
- Shows minutes remaining and warning status

**POST** `/api/admin/auth/session-status`
- Manually extends the current session
- Body: `{ "extendMinutes": 60 }` (1-120 minutes allowed)

**DELETE** `/api/admin/auth/session-status`
- Revokes all other sessions for the current user
- Keeps only the current session active

### 4. Logout
**POST** `/api/admin/auth/logout`
- Terminates the current session
- Clears authentication cookies

### 5. Session Cleanup (Cron)
**POST** `/api/admin/cron/cleanup-sessions`
- Cleans up expired sessions
- Should be called periodically via cron job
- Protected by CRON_SECRET if configured

## Implementation Details

### Session Lifecycle

1. **Creation**: Session created on login with 60-minute expiry
2. **Activity Tracking**: Each API request updates `lastActivityAt`
3. **Auto-Extension**: When < 10 minutes remaining and user is active
4. **Warning**: Frontend notified when < 5 minutes remaining
5. **Expiration**: Session expires after 60 minutes of token creation
6. **Cleanup**: Expired sessions removed by cron job

### Database Schema

Sessions are stored with these key fields:
- `id`: Unique session identifier
- `adminUserId`: Associated admin user
- `accessToken`: Access token (hashed)
- `refreshToken`: Refresh token (hashed)
- `expiresAt`: Session expiration time
- `lastActivityAt`: Last activity timestamp
- `status`: active, expired, or revoked
- `ipAddress`: IP address of session creation
- `userAgent`: Browser/client information

### Security Considerations

1. **Token Storage**: Tokens stored as httpOnly cookies
2. **Token Hashing**: Tokens hashed in database using SHA-256
3. **Activity Monitoring**: Detects and handles inactive sessions
4. **Audit Trail**: All session events logged for compliance
5. **Multi-Device**: Users can manage sessions across devices

## Frontend Integration

### Checking Session Status

```javascript
// Check session status
const response = await fetch('/api/admin/auth/session-status', {
  credentials: 'include'
});

const data = await response.json();

if (data.timing.shouldWarn) {
  // Show warning to user
  console.log(`Session expiring in ${data.timing.minutesRemaining} minutes`);
}
```

### Extending Session

```javascript
// Manually extend session
const response = await fetch('/api/admin/auth/session-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ extendMinutes: 60 })
});

const data = await response.json();
console.log(data.message); // "Session extended by 60 minutes"
```

### Auto-Refresh Implementation

```javascript
// Set up auto-refresh before expiry
setInterval(async () => {
  const statusResponse = await fetch('/api/admin/auth/session-status', {
    credentials: 'include'
  });

  const status = await statusResponse.json();

  if (status.timing.minutesRemaining < 10) {
    // Refresh the token
    const refreshResponse = await fetch('/api/admin/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (refreshResponse.ok) {
      console.log('Session refreshed automatically');
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes
```

## Cron Job Setup

### Using Node-Cron (Example)

```javascript
// cron-jobs.js
import cron from 'node-cron';

// Run cleanup every hour
cron.schedule('0 * * * *', async () => {
  const response = await fetch('http://localhost:3000/api/admin/cron/cleanup-sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  });

  const result = await response.json();
  console.log('Session cleanup:', result);
});
```

### Using System Cron

```bash
# Add to crontab (crontab -e)
0 * * * * curl -X POST http://localhost:3000/api/admin/cron/cleanup-sessions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Monitoring

### Session Statistics

The `AdminSession.getStatistics()` method provides:
- Total sessions
- Active sessions
- Expired sessions
- Revoked sessions
- Unique users with sessions

### Audit Logs

All session events are logged:
- Login attempts (success/failure)
- Session creation
- Token refresh
- Session extension (auto/manual)
- Session expiration
- Session revocation

## Troubleshooting

### Common Issues

1. **Session Expires Too Quickly**
   - Check `JWT_ACCESS_EXPIRY` is set to `60m`
   - Verify cookies are being set with correct maxAge

2. **Auto-Extension Not Working**
   - Ensure `trackSessionActivity` is called in middleware
   - Check `ADMIN_MAX_INACTIVE_TIME` setting

3. **Multiple Login Required**
   - Verify refresh token is working
   - Check cookie settings (httpOnly, secure, sameSite)

4. **Sessions Not Cleaned Up**
   - Ensure cron job is running
   - Check `CRON_SECRET` if configured
   - Verify database connectivity

## Migration Notes

When migrating from 15-minute to 60-minute sessions:

1. Update environment variables
2. Clear existing sessions (optional)
3. Update frontend token refresh intervals
4. Test auto-extension functionality
5. Monitor audit logs for issues

## Best Practices

1. **Regular Monitoring**: Check session statistics regularly
2. **Security Audits**: Review audit logs for suspicious activity
3. **Cleanup Schedule**: Run cleanup job at least hourly
4. **User Communication**: Inform users of session timeout changes
5. **Testing**: Test session behavior across different scenarios