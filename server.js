const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socketio',
  });

  // Make io accessible globally for services
  // Use both global and globalThis for compatibility
  global.io = io;
  globalThis.io = io;

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join client room
    socket.on('join:client', (clientId) => {
      if (clientId) {
        const room = `client:${clientId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });

    // Join provider room
    socket.on('join:provider', (organizationId) => {
      if (organizationId) {
        const room = `provider:${organizationId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });

    // Join specific quote request room (for detailed updates)
    socket.on('join:quote-request', (quoteRequestId) => {
      if (quoteRequestId) {
        const room = `quote-request:${quoteRequestId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });

    // Leave rooms
    socket.on('leave:client', (clientId) => {
      if (clientId) {
        socket.leave(`client:${clientId}`);
      }
    });

    socket.on('leave:provider', (organizationId) => {
      if (organizationId) {
        socket.leave(`provider:${organizationId}`);
      }
    });

    socket.on('leave:quote-request', (quoteRequestId) => {
      if (quoteRequestId) {
        socket.leave(`quote-request:${quoteRequestId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.io server running');
  });
});
