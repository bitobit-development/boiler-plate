import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '@/lib/auth/jwt';
import { AdminSession } from '@/lib/db/models/AdminSession';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { connectToDatabase } from '@/lib/db/connection';

let io: SocketIOServer | null = null;

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export function initializeSocketServer(server: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token
      const payload = verifyAccessToken(token);

      // Verify session is active
      await connectToDatabase();
      const session = await AdminSession.findById(payload.sessionId);
      if (!session || !session.active) {
        return next(new Error('Invalid or expired session'));
      }

      // Update session activity
      session.lastActivity = new Date();
      await session.save();

      // Attach user to socket
      socket.user = payload;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`Admin user connected: ${user.email} (${socket.id})`);

    // Join admin room based on permissions
    socket.join('admin-room');

    // Join role-specific rooms
    if (user.permissions.includes('manage_users')) {
      socket.join('admin-users');
    }
    if (user.permissions.includes('view_registrations')) {
      socket.join('admin-registrations');
    }
    if (user.permissions.includes('view_analytics')) {
      socket.join('admin-analytics');
    }

    // Log connection
    await AuditLog.create({
      userId: user.userId,
      action: 'websocket_connected',
      resource: 'admin_socket',
      details: { socketId: socket.id, rooms: Array.from(socket.rooms) },
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || 'unknown',
    });

    // Handle events
    socket.on('subscribe_to_stats', () => {
      if (user.permissions.includes('view_analytics')) {
        socket.join('stats-updates');
        socket.emit('subscribed', { channel: 'stats-updates' });
      } else {
        socket.emit('error', { message: 'Insufficient permissions' });
      }
    });

    socket.on('subscribe_to_registrations', () => {
      if (user.permissions.includes('view_registrations')) {
        socket.join('registration-updates');
        socket.emit('subscribed', { channel: 'registration-updates' });
      } else {
        socket.emit('error', { message: 'Insufficient permissions' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Admin user disconnected: ${user.email} (${socket.id})`);

      await AuditLog.create({
        userId: user.userId,
        action: 'websocket_disconnected',
        resource: 'admin_socket',
        details: { socketId: socket.id },
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'] || 'unknown',
      });
    });
  });

  return io;
}

// Utility functions for broadcasting events
export function broadcastNewRegistration(registration: any) {
  if (!io) return;

  io.to('registration-updates').emit('registration:new', {
    type: 'registration:new',
    data: registration,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastRegistrationUpdate(registrationId: string, updates: any) {
  if (!io) return;

  io.to('registration-updates').emit('registration:update', {
    type: 'registration:update',
    registrationId,
    data: updates,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastStatsUpdate(stats: any) {
  if (!io) return;

  io.to('stats-updates').emit('stats:update', {
    type: 'stats:update',
    data: stats,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastToAdmins(event: string, data: any) {
  if (!io) return;

  io.to('admin-room').emit(event, {
    type: event,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}