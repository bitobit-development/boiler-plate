// Socket.io broadcast utilities for API routes
// These functions access the global io instance created by server.js

export function broadcastNewRegistration(registration: any) {
  const io = (global as any).io;
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  io.to('registration-updates').emit('registration:new', {
    type: 'registration:new',
    data: registration,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastRegistrationUpdate(registrationId: string, updates: any) {
  const io = (global as any).io;
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  io.to('registration-updates').emit('registration:update', {
    type: 'registration:update',
    registrationId,
    data: updates,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastStatsUpdate(stats: any) {
  const io = (global as any).io;
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  io.to('stats-updates').emit('stats:update', {
    type: 'stats:update',
    data: stats,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastToAdmins(event: string, data: any) {
  const io = (global as any).io;
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  io.to('admin-room').emit(event, {
    type: event,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastUserUpdate(userId: string, updates: any) {
  const io = (global as any).io;
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  io.to('admin-users').emit('user:update', {
    type: 'user:update',
    userId,
    data: updates,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastSecurityAlert(alert: any) {
  const io = (global as any).io;
  if (!io) {
    console.warn('Socket.IO server not initialized');
    return;
  }

  io.to('admin-room').emit('security:alert', {
    type: 'security:alert',
    data: alert,
    severity: alert.severity || 'medium',
    timestamp: new Date().toISOString(),
  });
}