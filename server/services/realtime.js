import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

// SECURITY: Validate JWT secret on first client connection (or at import time)
if (process.env.NODE_ENV === 'production' && (JWT_SECRET.length < 32 || JWT_SECRET === '')) {
  console.error('🔴 FATAL: JWT_SECRET is not set or is too weak for production in realtime.js. Set a random 64-char secret.');
  process.exit(1);
}
let clients = [];

export const registerClient = (req, res) => {
  const token = req.query.token;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }

  // Set headers for Server-Sent Events (SSE)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  // Write initial connection message
  res.write('data: {"type":"connected"}\n\n');
  if (typeof res.flush === 'function') res.flush();

  // Keep HTTP/2 & proxy connections alive with comments + ping every 15 seconds
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
      res.write('data: {"type":"ping"}\n\n');
      if (typeof res.flush === 'function') res.flush();
    } catch (err) {
      clearInterval(keepAliveInterval);
    }
  }, 15000);

  const clientObj = { id: Date.now(), res };
  clients.push(clientObj);

  console.log(`🔌 Real-Time Client connected. Total active clients: ${clients.length}`);

  // Clean up on client disconnection
  req.on('close', () => {
    clearInterval(keepAliveInterval);
    clients = clients.filter(c => c.id !== clientObj.id);
    console.log(`🔌 Real-Time Client disconnected. Total active clients: ${clients.length}`);
  });
};

export const broadcastEvent = (type, data) => {
  const payload = JSON.stringify({ type, data });
  console.log(`📡 Real-Time Broadcasting event: ${type}`);
  clients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
      if (typeof client.res.flush === 'function') client.res.flush();
    } catch (err) {
      console.error('Error writing to client:', err.message);
    }
  });
};
