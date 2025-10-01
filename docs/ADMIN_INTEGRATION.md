# Admin Dashboard Integration Guide

## 🎯 Overview

This document describes the complete integration of the Admin Dashboard with real-time features, authentication, and Socket.io support.

## 🏗️ Architecture

### Components Integration

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Provider│  │Socket Provider│  │  Data Hooks  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                  ↓                  ↓         │
├─────────────────────────────────────────────────────────┤
│                    API Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Auth APIs  │  │ Admin APIs   │  │ Dashboard APIs│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                  Real-time Layer                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Socket.io Server (Port 3001)             │ │
│  └────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Database Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Registrations │  │ Admin Users  │  │ Audit Logs   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Start All Services
```bash
npm run admin:start
```

This command starts:
- Next.js development server on port 3000
- Socket.io server on port 3001
- Enables hot-reload for development

### 2. Access Admin Dashboard
- URL: http://localhost:3000/admin
- Default credentials:
  - Email: `admin@biggbuzz.com`
  - Password: `admin123`

### 3. Test Integration
```bash
npm run admin:test
```

## 📁 File Structure

```
src/
├── app/admin/                    # Admin pages
│   ├── layout.tsx               # Admin layout with providers
│   ├── login/                   # Login page
│   ├── dashboard/               # Dashboard with real-time stats
│   ├── registrations/           # Registration management
│   ├── users/                   # Admin user management
│   └── audit/                   # Audit logs
│
├── components/admin/             # Admin UI components
│   ├── providers/
│   │   ├── AdminAuthProvider.tsx  # JWT authentication
│   │   └── SocketProvider.tsx     # Socket.io integration
│   ├── dashboard/               # Dashboard components
│   └── shared/                  # Shared admin components
│
├── lib/
│   ├── api/admin.ts            # Admin API client
│   ├── hooks/useAdminData.ts   # Real-time data hooks
│   └── types/admin.ts          # TypeScript types
│
└── server.js                    # Custom Next.js + Socket.io server
```

## 🔐 Authentication Flow

### Login Process
1. User submits credentials to `/api/admin/auth/login`
2. Server validates credentials against database
3. JWT token generated and returned
4. Token stored in localStorage
5. All subsequent requests include Bearer token

### Protected Routes
- AdminAuthProvider wraps all admin pages
- Automatic redirect to login if unauthorized
- Token verification on each page load
- Automatic token refresh before expiry

### Code Example
```typescript
// Using authentication in components
import { useAdminAuth } from "@/components/admin/providers/AdminAuthProvider";

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAdminAuth();

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return <AdminContent user={user} />;
}
```

## 🔌 Real-time Features

### Socket.io Events

#### Client → Server Events
- `admin:join` - Join admin room for updates
- `stats:request` - Request dashboard statistics
- `registration:update` - Update registration status

#### Server → Client Events
- `stats:update` - Dashboard statistics update
- `registration:new` - New registration received
- `registration:update` - Registration status changed
- `activity:new` - New activity in system
- `notification` - System notifications
- `system:alert` - Critical system alerts

### Using Real-time Data
```typescript
// Hook with real-time updates
import { useDashboardStats } from "@/lib/hooks/useAdminData";

function Dashboard() {
  const { stats, loading, error } = useDashboardStats();
  // Stats automatically update via Socket.io

  return <StatsDisplay stats={stats} />;
}
```

## 📊 Data Management

### Available Hooks

#### `useDashboardStats()`
- Real-time dashboard statistics
- Auto-updates via Socket.io
- Includes trends and metrics

#### `useRegistrations(params)`
- Paginated registration list
- Real-time updates for new/changed registrations
- Built-in search and filtering

#### `useRecentActivity(limit)`
- Live activity feed
- Auto-scrolls on new events
- Configurable limit

#### `useAdminUsers()`
- Admin user management
- CRUD operations
- Real-time user status updates

### API Endpoints

#### Authentication
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Logout
- `GET /api/admin/auth/verify` - Verify token
- `POST /api/admin/auth/refresh` - Refresh token

#### Dashboard
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/dashboard/activity` - Recent activity

#### Registrations
- `GET /api/admin/registrations` - List registrations
- `GET /api/admin/registrations/:id` - Get single registration
- `PATCH /api/admin/registrations/:id/status` - Update status
- `GET /api/admin/registrations/export` - Export data

#### Admin Users
- `GET /api/admin/users` - List admin users
- `POST /api/admin/users` - Create admin
- `PATCH /api/admin/users/:id` - Update admin
- `DELETE /api/admin/users/:id` - Delete admin

#### Audit Logs
- `GET /api/admin/audit` - Get audit logs
- `GET /api/admin/audit/export` - Export logs

## 🎨 UI Components

### Key Components

#### `<StatsCard />`
- Real-time metric display
- Trend indicators
- Animated updates

#### `<ActivityFeed />`
- Live activity stream
- Auto-scroll on new events
- Icon and color coding

#### `<RegistrationTable />`
- Sortable, filterable table
- Bulk actions support
- Real-time status updates

#### `<SystemHealth />`
- Service status monitoring
- Uptime tracking
- Performance metrics

## 🧪 Testing

### Run Integration Tests
```bash
npm run admin:test
```

Tests cover:
- Authentication flow
- API endpoints
- Socket.io connections
- Real-time updates
- Error handling

### Manual Testing Checklist
- [ ] Login/logout flow works
- [ ] Dashboard stats update in real-time
- [ ] Registration status changes reflect immediately
- [ ] Activity feed shows new events
- [ ] Socket connection indicator works
- [ ] Protected routes redirect when unauthorized
- [ ] Export functions work correctly
- [ ] Pagination and filtering work
- [ ] Error states display properly

## 🔧 Configuration

### Environment Variables
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Socket.io Configuration
SOCKET_PORT=3001

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://...
```

### Security Settings
- JWT tokens expire after 7 days
- Refresh tokens available for seamless experience
- All admin actions logged to audit trail
- Rate limiting on authentication endpoints
- CORS configured for production domains

## 📈 Performance Optimization

### Implemented Optimizations
- Component-level code splitting
- Optimistic UI updates
- Debounced search inputs
- Virtual scrolling for long lists
- Efficient Socket.io room management
- Smart caching with invalidation

### Real-time Data Flow
1. **Initial Load**: Fetch data via REST API
2. **Subscribe**: Join Socket.io room for updates
3. **Updates**: Receive incremental updates via WebSocket
4. **Optimistic Updates**: Update UI immediately, sync later
5. **Error Recovery**: Automatic reconnection and resync

## 🐛 Troubleshooting

### Common Issues

#### Socket.io Not Connecting
- Check if port 3001 is available
- Verify server.js is running
- Check browser console for errors
- Ensure authentication token is valid

#### Authentication Failing
- Verify database is seeded with admin users
- Check JWT_SECRET environment variable
- Clear localStorage and retry
- Check network tab for API responses

#### Real-time Updates Not Working
- Verify Socket.io connection status
- Check if user joined admin room
- Look for WebSocket errors in console
- Ensure events are being emitted correctly

### Debug Mode
Enable debug logging:
```javascript
// In browser console
localStorage.setItem('DEBUG', 'socket.io-client:*');
```

## 📚 Additional Resources

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Next.js Custom Server](https://nextjs.org/docs/advanced-features/custom-server)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Real-time Web Applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

## 🤝 Contributing

When adding new features:
1. Update relevant hooks in `/lib/hooks/useAdminData.ts`
2. Add Socket.io events to server and client
3. Update TypeScript types in `/lib/types/admin.ts`
4. Add tests to integration test suite
5. Update this documentation

---

**Last Updated**: December 2024
**Maintained By**: Adi (Fullstack Engineer)