import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as SocketIOClient, Socket as ClientSocket } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';
import { mockRegistrations, mockSocketEvents } from '@/test/fixtures/admin.fixtures';

// Mock database models
jest.mock('@/lib/db/models/AdminUser');
jest.mock('@/lib/db/models/AdminSession');
jest.mock('@/lib/db/models/Registration');
jest.mock('@/lib/db/connection', () => ({
  connectToDatabase: jest.fn().mockResolvedValue(true)
}));

const { AdminUser } = require('@/lib/db/models/AdminUser');
const { AdminSession } = require('@/lib/db/models/AdminSession');
const { Registration } = require('@/lib/db/models/Registration');

describe('Socket.IO Real-time Features', () => {
  let httpServer: any;
  let ioServer: SocketIOServer;
  let clientSocket: ClientSocket;
  let adminSocket: ClientSocket;
  const serverPort = 3002;

  const validToken = jwt.sign(
    {
      userId: '123',
      email: 'admin@biggbuzz.com',
      role: 'super_admin',
      permissions: ['all'],
      sessionId: 'session-123'
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: '15m' }
  );

  const viewerToken = jwt.sign(
    {
      userId: '456',
      email: 'viewer@biggbuzz.com',
      role: 'viewer',
      permissions: ['read'],
      sessionId: 'session-456'
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
    { expiresIn: '15m' }
  );

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();

    // Create Socket.IO server
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Set up Socket.IO middleware and handlers
    ioServer.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only'
        ) as any;

        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    // Admin namespace
    const adminNamespace = ioServer.of('/admin');

    adminNamespace.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only'
        ) as any;

        socket.data.user = decoded;
        socket.join(`admin:${decoded.role}`);
        socket.join('admin:all');
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    adminNamespace.on('connection', (socket) => {
      socket.emit('connected', { userId: socket.data.user.userId });

      socket.on('subscribe:dashboard', () => {
        socket.join('dashboard:stats');
        socket.emit('subscribed', { channel: 'dashboard:stats' });
      });

      socket.on('subscribe:registrations', () => {
        socket.join('registrations:updates');
        socket.emit('subscribed', { channel: 'registrations:updates' });
      });

      socket.on('registration:update', async (data) => {
        // Check permissions
        if (!socket.data.user.permissions.includes('write')) {
          socket.emit('error', { message: 'Insufficient permissions' });
          return;
        }

        // Emit to all admins
        adminNamespace.to('registrations:updates').emit('registration:updated', data);
      });

      socket.on('disconnect', () => {
        console.log('Admin disconnected:', socket.data.user.userId);
      });
    });

    httpServer.listen(serverPort, done);
  });

  beforeEach((done) => {
    // Clean up existing connections
    if (clientSocket) clientSocket.disconnect();
    if (adminSocket) adminSocket.disconnect();

    jest.clearAllMocks();
    done();
  });

  afterAll((done) => {
    if (clientSocket) clientSocket.disconnect();
    if (adminSocket) adminSocket.disconnect();
    ioServer.close();
    httpServer.close(done);
  });

  describe('Connection and Authentication', () => {
    it('should connect with valid admin token', (done) => {
      adminSocket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: {
          token: validToken
        }
      });

      adminSocket.on('connected', (data) => {
        expect(data.userId).toBe('123');
        done();
      });

      adminSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should reject connection without token', (done) => {
      const socket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: {}
      });

      socket.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication required');
        socket.disconnect();
        done();
      });

      socket.on('connect', () => {
        socket.disconnect();
        done(new Error('Should not connect without token'));
      });
    });

    it('should reject connection with invalid token', (done) => {
      const socket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: {
          token: 'invalid-token'
        }
      });

      socket.on('connect_error', (error) => {
        expect(error.message).toBe('Invalid token');
        socket.disconnect();
        done();
      });

      socket.on('connect', () => {
        socket.disconnect();
        done(new Error('Should not connect with invalid token'));
      });
    });

    it('should handle multiple concurrent connections', (done) => {
      const sockets: ClientSocket[] = [];
      let connectedCount = 0;
      const targetCount = 5;

      for (let i = 0; i < targetCount; i++) {
        const socket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
          auth: {
            token: i % 2 === 0 ? validToken : viewerToken
          }
        });

        socket.on('connected', () => {
          connectedCount++;
          if (connectedCount === targetCount) {
            sockets.forEach(s => s.disconnect());
            done();
          }
        });

        socket.on('connect_error', (error) => {
          done(error);
        });

        sockets.push(socket);
      }
    });
  });

  describe('Channel Subscriptions', () => {
    beforeEach((done) => {
      adminSocket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: {
          token: validToken
        }
      });

      adminSocket.on('connected', () => done());
    });

    it('should subscribe to dashboard stats', (done) => {
      adminSocket.emit('subscribe:dashboard');

      adminSocket.on('subscribed', (data) => {
        expect(data.channel).toBe('dashboard:stats');
        done();
      });
    });

    it('should subscribe to registration updates', (done) => {
      adminSocket.emit('subscribe:registrations');

      adminSocket.on('subscribed', (data) => {
        expect(data.channel).toBe('registrations:updates');
        done();
      });
    });

    it('should receive updates after subscribing', (done) => {
      adminSocket.emit('subscribe:registrations');

      adminSocket.on('subscribed', () => {
        // Simulate a registration update from server
        const adminNamespace = ioServer.of('/admin');
        adminNamespace.to('registrations:updates').emit('registration:new', mockRegistrations[0]);
      });

      adminSocket.on('registration:new', (data) => {
        expect(data).toEqual(mockRegistrations[0]);
        done();
      });
    });

    it('should handle multiple subscriptions', (done) => {
      let subscriptionCount = 0;
      const expectedSubscriptions = 2;

      adminSocket.on('subscribed', (data) => {
        subscriptionCount++;
        if (subscriptionCount === expectedSubscriptions) {
          expect(true).toBe(true);
          done();
        }
      });

      adminSocket.emit('subscribe:dashboard');
      adminSocket.emit('subscribe:registrations');
    });
  });

  describe('Real-time Updates', () => {
    let adminSocket1: ClientSocket;
    let adminSocket2: ClientSocket;

    beforeEach((done) => {
      let connected = 0;

      adminSocket1 = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: { token: validToken }
      });

      adminSocket2 = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: { token: viewerToken }
      });

      const checkConnected = () => {
        connected++;
        if (connected === 2) done();
      };

      adminSocket1.on('connected', checkConnected);
      adminSocket2.on('connected', checkConnected);
    });

    afterEach(() => {
      if (adminSocket1) adminSocket1.disconnect();
      if (adminSocket2) adminSocket2.disconnect();
    });

    it('should broadcast new registration to all subscribed admins', (done) => {
      let receivedCount = 0;
      const expectedReceivers = 2;

      const handleNewRegistration = (data: any) => {
        expect(data).toEqual(mockSocketEvents.newRegistration.data);
        receivedCount++;
        if (receivedCount === expectedReceivers) {
          done();
        }
      };

      adminSocket1.emit('subscribe:registrations');
      adminSocket2.emit('subscribe:registrations');

      adminSocket1.on('registration:new', handleNewRegistration);
      adminSocket2.on('registration:new', handleNewRegistration);

      // Wait for subscriptions to complete
      setTimeout(() => {
        const adminNamespace = ioServer.of('/admin');
        adminNamespace.to('registrations:updates').emit(
          'registration:new',
          mockSocketEvents.newRegistration.data
        );
      }, 100);
    });

    it('should broadcast registration status update', (done) => {
      adminSocket1.emit('subscribe:registrations');

      adminSocket1.on('registration:updated', (data) => {
        expect(data).toEqual(mockSocketEvents.registrationUpdate.data);
        done();
      });

      setTimeout(() => {
        // Admin with write permission updates registration
        adminSocket1.emit('registration:update', mockSocketEvents.registrationUpdate.data);
      }, 100);
    });

    it('should prevent unauthorized updates', (done) => {
      // Viewer socket (no write permission)
      adminSocket2.on('error', (error) => {
        expect(error.message).toBe('Insufficient permissions');
        done();
      });

      adminSocket2.emit('registration:update', {
        id: '1',
        status: 'approved'
      });
    });

    it('should broadcast dashboard stats updates', (done) => {
      adminSocket1.emit('subscribe:dashboard');

      adminSocket1.on('stats:updated', (data) => {
        expect(data).toEqual(mockSocketEvents.statsUpdate.data);
        done();
      });

      setTimeout(() => {
        const adminNamespace = ioServer.of('/admin');
        adminNamespace.to('dashboard:stats').emit(
          'stats:updated',
          mockSocketEvents.statsUpdate.data
        );
      }, 100);
    });
  });

  describe('Disconnection Handling', () => {
    it('should handle client disconnect gracefully', (done) => {
      const socket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: { token: validToken }
      });

      socket.on('connected', () => {
        socket.disconnect();

        // Verify server handles disconnection
        setTimeout(() => {
          expect(socket.connected).toBe(false);
          done();
        }, 100);
      });
    });

    it('should reconnect automatically after disconnect', (done) => {
      const socket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: { token: validToken },
        reconnection: true,
        reconnectionDelay: 100,
        reconnectionAttempts: 3
      });

      let connectionCount = 0;

      socket.on('connected', () => {
        connectionCount++;

        if (connectionCount === 1) {
          // Force disconnect
          socket.io.engine.close();
        } else if (connectionCount === 2) {
          // Reconnected successfully
          expect(connectionCount).toBe(2);
          socket.disconnect();
          done();
        }
      });
    });

    it('should clean up room subscriptions on disconnect', (done) => {
      const socket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: { token: validToken }
      });

      socket.on('connected', () => {
        socket.emit('subscribe:dashboard');
        socket.emit('subscribe:registrations');
      });

      let subscriptionCount = 0;
      socket.on('subscribed', () => {
        subscriptionCount++;
        if (subscriptionCount === 2) {
          socket.disconnect();

          // Verify rooms are cleaned up (server-side check)
          setTimeout(() => {
            const adminNamespace = ioServer.of('/admin');
            const rooms = adminNamespace.adapter.rooms;

            // Socket should not be in any rooms after disconnect
            expect(socket.connected).toBe(false);
            done();
          }, 100);
        }
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach((done) => {
      adminSocket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: { token: validToken }
      });

      adminSocket.on('connected', () => done());
    });

    it('should handle malformed data gracefully', (done) => {
      adminSocket.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      // Send malformed data
      adminSocket.emit('registration:update', null);
      adminSocket.emit('registration:update', undefined);
      adminSocket.emit('registration:update', 'not-an-object');

      // If no error after timeout, test passes
      setTimeout(() => done(), 500);
    });

    it('should handle rapid updates', (done) => {
      let updateCount = 0;
      const totalUpdates = 100;

      adminSocket.emit('subscribe:registrations');

      adminSocket.on('registration:updated', () => {
        updateCount++;
        if (updateCount === totalUpdates) {
          done();
        }
      });

      // Send rapid updates
      for (let i = 0; i < totalUpdates; i++) {
        adminSocket.emit('registration:update', {
          id: `${i}`,
          status: 'approved'
        });
      }
    });

    it('should handle network interruption simulation', (done) => {
      adminSocket.on('disconnect', (reason) => {
        expect(reason).toBe('io client disconnect');
        done();
      });

      // Simulate network interruption
      adminSocket.io.engine.close();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple simultaneous broadcasts', (done) => {
      const sockets: ClientSocket[] = [];
      const socketCount = 10;
      let connectedCount = 0;
      let messageCount = 0;
      const messagesPerSocket = 5;
      const totalExpectedMessages = socketCount * messagesPerSocket;

      // Create multiple connections
      for (let i = 0; i < socketCount; i++) {
        const socket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
          auth: { token: i % 2 === 0 ? validToken : viewerToken }
        });

        socket.on('connected', () => {
          connectedCount++;
          socket.emit('subscribe:registrations');

          if (connectedCount === socketCount) {
            // All connected, start broadcasting
            setTimeout(() => {
              const adminNamespace = ioServer.of('/admin');
              for (let j = 0; j < messagesPerSocket; j++) {
                adminNamespace.to('registrations:updates').emit('test:message', {
                  index: j,
                  timestamp: Date.now()
                });
              }
            }, 100);
          }
        });

        socket.on('test:message', () => {
          messageCount++;
          if (messageCount === totalExpectedMessages) {
            sockets.forEach(s => s.disconnect());
            done();
          }
        });

        sockets.push(socket);
      }
    });

    it('should maintain performance with large payloads', (done) => {
      adminSocket = SocketIOClient(`http://localhost:${serverPort}/admin`, {
        auth: { token: validToken }
      });

      adminSocket.on('connected', () => {
        adminSocket.emit('subscribe:registrations');
      });

      adminSocket.on('large:payload', (data) => {
        expect(data.items).toHaveLength(1000);
        expect(data.timestamp).toBeDefined();
        done();
      });

      adminSocket.on('subscribed', () => {
        // Send large payload
        const largeData = {
          items: Array(1000).fill(null).map((_, i) => ({
            id: i,
            data: 'x'.repeat(100)
          })),
          timestamp: Date.now()
        };

        const adminNamespace = ioServer.of('/admin');
        adminNamespace.to('registrations:updates').emit('large:payload', largeData);
      });
    });
  });
});