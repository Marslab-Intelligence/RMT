import jwt from 'jsonwebtoken';

const DEFAULT_JWT_SECRET = 'b6e8a49f50dc9781cf4275ba098b671ef3b58402ac36de71b9e02c5ef2a0f8b1';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

if (JWT_SECRET.length < 32 || JWT_SECRET === 'rms-default-secret-key') {
  console.warn('⚠️ WARNING: Using fallback JWT_SECRET in realtime service.');
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
