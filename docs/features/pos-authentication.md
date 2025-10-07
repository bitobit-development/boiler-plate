# POS Authentication System

## Overview

The POS (Point of Sale) system implements a secure authentication mechanism to ensure only authorized shop users can access the POS terminal. The system uses HTTP-only cookies, JWT tokens, database session validation, and automatic session renewal to provide a seamless and secure experience.

## Architecture

### Components

1. **Authentication Flow**
   - `/api/admin/auth/login` - Login endpoint that creates sessions and JWT tokens
   - `/api/pos/auth/verify` - Validates authentication and session status
   - `/api/pos/heartbeat` - Keeps sessions alive with periodic updates

2. **Client-Side Hooks**
   - `usePOSAuth()` - Verifies authentication and redirects if unauthorized
   - `usePOSSession()` - Sends periodic heartbeats to maintain session

3. **Security Features**
   - HTTP-only cookies for token storage
   - JWT signature verification
   - Database session validation
   - 60-minute session timeout
   - Automatic session renewal via heartbeat

## Authentication Flow

```
┌─────────────┐
│ User visits │
│  /pos page  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  usePOSAuth()    │
│  checks auth via │
│  /api/pos/auth/  │
│     verify       │
└──────┬───────────┘
       │
       ├─── Authenticated ────▶ Load POS Dashboard
       │                        ├─ Start heartbeat (5 min)
       │                        └─ Update lastActivityAt
       │
       └─── Not Authenticated ─▶ Redirect to /pos/login
                                  └─ Include returnUrl param
```

## Session Management

### Session Timeout

Sessions expire after **60 minutes** of inactivity. The timeout is enforced at two levels:

1. **JWT Level**: Token age is checked in `/api/pos/auth/verify`
2. **Database Level**: `lastActivityAt` timestamp tracks user activity

### Auto-Renewal

Sessions are automatically renewed while the user is active:

1. `usePOSSession()` hook sends heartbeat every **5 minutes**
2. Heartbeat updates `lastActivityAt` in database
3. As long as heartbeats continue, session remains active

## Implementation Details

### 1. Login (`/api/admin/auth/login`)

```typescript
// Creates kiosk session for shop_user role
if (user.role === 'shop_user') {
  const kioskResult = await startKioskSession(
    user.id,
    'POS-KIOSK-001',
    { fingerprint, ipAddress, userAgent },
    { name: 'Main Shop', code: 'MAIN-01' }
  );
  kioskSessionId = kioskResult.session?.id;
}

// Generate JWT with kiosk session ID
const { accessToken, refreshToken } = generateTokens(
  user,
  session.id,
  kioskSessionId
);

// Set HTTP-only cookies
cookies().set('accessToken', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});
```

### 2. Auth Verification (`/api/pos/auth/verify`)

```typescript
// Verify JWT token
const decoded = verifyAccessToken(accessToken);

// Verify session exists in database
const session = await db.query.adminSessions.findFirst({
  where: (sessions, { eq }) => eq(sessions.id, decoded.sessionId),
});

if (!session || !session.isActive) {
  return { authenticated: false, reason: 'session_inactive' };
}

// Check 60-minute timeout
const tokenAge = Date.now() / 1000 - decoded.iat;
if (tokenAge > 60 * 60) {
  return { authenticated: false, reason: 'session_expired' };
}
```

### 3. Heartbeat (`/api/pos/heartbeat`)

```typescript
// Update lastActivityAt timestamp
await db
  .update(adminSessions)
  .set({ lastActivityAt: new Date() })
  .where(eq(adminSessions.id, decoded.sessionId));
```

### 4. Client-Side Auth Hook (`usePOSAuth`)

```typescript
export function usePOSAuth() {
  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/pos/auth/verify', {
        credentials: 'include',
      });

      if (!response.ok) {
        router.push(`/pos/login?returnUrl=${window.location.pathname}`);
      }
    };
    checkAuth();
  }, [router]);
}
```

### 5. Session Monitoring Hook (`usePOSSession`)

```typescript
export function usePOSSession(intervalMs = 5 * 60 * 1000, enabled = true) {
  useEffect(() => {
    const sendHeartbeat = async () => {
      await fetch('/api/pos/heartbeat', {
        method: 'POST',
        credentials: 'include',
      });
    };

    // Send heartbeat every 5 minutes
    const interval = setInterval(sendHeartbeat, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, enabled]);
}
```

## Security Considerations

### HTTP-Only Cookies

Tokens are stored in HTTP-only cookies, which:
- Cannot be accessed via JavaScript (`document.cookie`)
- Are automatically sent with requests
- Prevent XSS attacks from stealing tokens

### JWT Payload

```typescript
interface TokenPayload {
  userId: string;
  email: string;
  role: string;              // Must be 'shop_user' for POS
  sessionId: string;         // Database session ID
  kioskSessionId?: string;   // POS kiosk session ID
  iat: number;               // Issued at timestamp
  exp: number;               // Expiration timestamp
}
```

### Database Session Validation

The system validates:
1. **Session exists** - Session ID from JWT exists in database
2. **Session active** - `isActive` flag is true
3. **Token age** - Less than 60 minutes since `iat`

This prevents:
- Using tokens after manual logout
- Using tokens after session cleanup
- Using expired tokens even if JWT hasn't expired

## Testing

### Test Authentication Enforcement

```bash
# Without cookies - should return 401
curl -X GET http://localhost:3000/api/pos/auth/verify

# With valid session - should return 200
# (cookies automatically sent by browser)
```

### Test Heartbeat

```bash
# Without cookies - should return 401
curl -X POST http://localhost:3000/api/pos/heartbeat

# With valid session - should return 200
# (cookies automatically sent by browser)
```

### Test Session Expiry

1. Login to POS
2. Clear all sessions: `npx tsx scripts/clear-all-sessions.ts`
3. Refresh POS page
4. Should redirect to login with "session_not_found" error

## Configuration

### Session Timeout

Modify timeout in `/api/pos/auth/verify`:

```typescript
const sessionTimeout = 60 * 60; // 60 minutes in seconds
```

### Heartbeat Interval

Modify interval in `/app/pos/page.tsx`:

```typescript
usePOSSession(5 * 60 * 1000, isAuthenticated); // 5 minutes
```

**Recommendation**: Keep heartbeat interval significantly shorter than session timeout (e.g., 5 min heartbeat for 60 min timeout).

## Troubleshooting

### "session_not_found" Error

**Cause**: JWT token references a session that doesn't exist in database

**Solutions**:
1. Check if session was manually deleted
2. Verify login creates session properly
3. Check database connection

### "session_inactive" Error

**Cause**: Session exists but `isActive` is false

**Solutions**:
1. Check if session was manually deactivated
2. Verify login sets `isActive: true`
3. Check for automated session cleanup scripts

### "session_expired" Error

**Cause**: More than 60 minutes since token was issued

**Solutions**:
1. Login again
2. Ensure heartbeat is running
3. Check if `lastActivityAt` is being updated

### Heartbeat Not Working

**Symptoms**: Sessions expire even when user is active

**Solutions**:
1. Check browser console for heartbeat errors
2. Verify `/api/pos/heartbeat` returns 200
3. Ensure `usePOSSession` hook is called with `enabled=true`
4. Check network tab for POST requests to `/api/pos/heartbeat`

## Future Enhancements

1. **Refresh Token Rotation**: Implement automatic access token refresh
2. **Multi-Device Sessions**: Track and display active sessions per user
3. **Session Analytics**: Log session duration and activity patterns
4. **Graceful Expiry Warning**: Show warning before session expires
5. **Idle Detection**: Use browser visibility API to detect truly idle users

## Related Files

- `/src/app/pos/page.tsx` - POS dashboard with auth hooks
- `/src/app/pos/login/page.tsx` - Login page
- `/src/hooks/usePOSAuth.ts` - Authentication hook
- `/src/hooks/usePOSSession.ts` - Session monitoring hook
- `/src/app/api/pos/auth/verify/route.ts` - Auth verification endpoint
- `/src/app/api/pos/heartbeat/route.ts` - Heartbeat endpoint
- `/src/app/api/admin/auth/login/route.ts` - Login endpoint
- `/src/lib/auth/jwt.ts` - JWT utilities
- `/src/lib/db/schema/sessions.ts` - Session schema
