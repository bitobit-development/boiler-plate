import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocketServer } from './server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create the Next.js app
const app = next({ dev });
const handle = app.getRequestHandler();

export async function startServerWithSocketIO() {
  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = initializeSocketServer(server);

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log('> Socket.IO server initialized');
  });

  return { server, io };
}

// Export for use in other parts of the application
export {
  broadcastNewRegistration,
  broadcastRegistrationUpdate,
  broadcastStatsUpdate,
  broadcastToAdmins,
  broadcastUserUpdate,
  broadcastSecurityAlert
} from './broadcast';