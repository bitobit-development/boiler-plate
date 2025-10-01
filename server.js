const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = payload;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`Admin user connected: ${user.email} (${socket.id})`);

    // Join admin room
    socket.join('admin-room');

    // Join role-specific rooms
    if (user.permissions?.includes('manage_users')) {
      socket.join('admin-users');
    }
    if (user.permissions?.includes('view_registrations')) {
      socket.join('admin-registrations');
    }
    if (user.permissions?.includes('view_analytics')) {
      socket.join('admin-analytics');
    }

    // Handle subscription events
    socket.on('subscribe_to_stats', () => {
      if (user.permissions?.includes('view_analytics')) {
        socket.join('stats-updates');
        socket.emit('subscribed', { channel: 'stats-updates' });
      } else {
        socket.emit('error', { message: 'Insufficient permissions' });
      }
    });

    socket.on('subscribe_to_registrations', () => {
      if (user.permissions?.includes('view_registrations')) {
        socket.join('registration-updates');
        socket.emit('subscribed', { channel: 'registration-updates' });
      } else {
        socket.emit('error', { message: 'Insufficient permissions' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Admin user disconnected: ${user.email} (${socket.id})`);
    });
  });

  // Make io accessible globally
  global.io = io;

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log('> Socket.IO server initialized');
  });
});