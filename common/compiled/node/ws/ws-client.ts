// client.ts — test all three WebSocket endpoints from websocket.ts
import WebSocket from 'ws';

/**
 * Open a WebSocket connection to the local dev server.
 *
 * @param path - URL path, e.g. `/ws/chat`.
 * @param token - Auth token passed as a query parameter.
 * @param label - Human-readable label used in log output.
 */
function connect(path: string, token: string, label: string): WebSocket {
  const ws = new WebSocket(`ws://localhost:3000${path}?token=${token}`);
  ws.on('open', () => logger.info(`[${label}] open`));
  ws.on('message', (d: WebSocket.RawData) =>
    logger.info(`[${label}]`, JSON.parse(Buffer.from(d as Buffer).toString('utf8'))),
  );
  ws.on('close', (code: number) => logger.info(`[${label}] closed`, { code }));
  ws.on('error', (err: Error) => logger.error(`[${label}] error`, { message: err.message }));
  return ws;
}

const chat = connect('/ws/chat', 'user-token-abc', 'chat');
const notif = connect('/ws/notif', 'user-token-abc', 'notif');
const admin = connect('/ws/admin', 'admin-token-xyz', 'admin');

chat.on('open', () => {
  chat.send(JSON.stringify({ type: 'message', text: 'Hello everyone!' }));
});

// Test a rejected connection (wrong token)
setTimeout(() => {
  connect('/ws/admin', 'user-token-abc', 'admin-REJECTED');
}, 500);
