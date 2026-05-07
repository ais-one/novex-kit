// websocket.ts — multi-path WebSocket server example
// Demonstrates routing upgrade requests to separate WebSocketServer instances
// per path (/ws/chat, /ws/notif, /ws/admin) with per-route auth.

import type http from 'node:http';
import type { Duplex } from 'node:stream';
import type WebSocket from 'ws';
import type { RawData } from 'ws';
import { WebSocketServer } from 'ws';

interface AuthUser {
  id: number;
  name: string;
  role: string;
}

interface WsRoute {
  prefix: string;
  wss: WebSocketServer;
  auth: (req: http.IncomingMessage) => Promise<AuthUser>;
}

// ─── Module-level WSS references (assigned in wsLoader) ──────────────────────
let chatWSS: WebSocketServer;
let notifWSS: WebSocketServer;
let adminWSS: WebSocketServer;

// ─── Auth helpers ─────────────────────────────────────────────────────────────
/** Parse the `?token=` query param and return the authenticated user. Throws on invalid or missing token. */
async function requireUser(req: http.IncomingMessage): Promise<AuthUser> {
  const params = new URLSearchParams(req.url?.split('?')[1]);
  const token = params.get('token');
  if (!token) throw new Error('No token');

  const user = await verifyToken(token);
  if (!user) throw new Error('Invalid token');
  return user;
}

/** Like `requireUser` but additionally asserts `role === 'admin'`. */
async function requireAdmin(req: http.IncomingMessage): Promise<AuthUser> {
  const user = await requireUser(req);
  if (user.role !== 'admin') throw new Error('Insufficient role');
  return user;
}

// ─── Reject a socket before any WS handshake ─────────────────────────────────
/** Reject an upgrade request with an HTTP error response before the WS handshake completes. */
function rejectSocket(socket: Duplex, code: number, message: string): void {
  socket.write(
    `HTTP/1.1 ${code} ${message}\r\n` +
      'Content-Type: text/plain\r\n' +
      'Connection: close\r\n' +
      '\r\n' +
      `${message}`,
  );
  socket.destroy();
}

// ─── Utilities ────────────────────────────────────────────────────────────────
/** Send a JSON-serialised payload to every open client on a WebSocketServer. */
function broadcast(wss: WebSocketServer, payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

/** Normalise a ws `RawData` value (Buffer | ArrayBuffer | Buffer[]) to a single Buffer. */
function rawToBuffer(raw: RawData): Buffer {
  if (Buffer.isBuffer(raw)) return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw);
  return Buffer.from(new Uint8Array(raw));
}

/** Parse raw WS data as JSON; returns `null` on any parse failure. */
function safeParseJSON(raw: RawData): unknown {
  try {
    return JSON.parse(rawToBuffer(raw).toString('utf8'));
  } catch {
    return null;
  }
}

const MAX_BYTES = 64 * 1024;

/** Parse raw WS data as JSON with a max-byte guard. Returns `{ ok, error, value }`. */
function safeParseJSON2(
  raw: RawData,
  { maxBytes = MAX_BYTES } = {},
): { ok: boolean; error: string | null; value: unknown } {
  const buf = rawToBuffer(raw);
  if (buf.length > maxBytes) {
    return { ok: false, error: 'PAYLOAD_TOO_LARGE', value: null };
  }
  try {
    const value = JSON.parse(buf.toString('utf8'));
    return { ok: true, error: null, value };
  } catch {
    return { ok: false, error: 'INVALID_JSON', value: null };
  }
}

/** Serialise an error message into a `{ type: 'error', message }` JSON string. */
function wsError(message: string): string {
  return JSON.stringify({ type: 'error', message });
}

/** Return live connection counts for all three namespaces plus process uptime. */
function getServerStats(): { chat: number; notif: number; admin: number; uptime: number } {
  return {
    chat: chatWSS.clients.size,
    notif: notifWSS.clients.size,
    admin: adminWSS.clients.size,
    uptime: process.uptime(),
  };
}

/** Stub token verifier — replace with real JWT validation in production. */
async function verifyToken(token: string): Promise<AuthUser | null> {
  const users: Record<string, AuthUser> = {
    'user-token-abc': { id: 1, name: 'Alice', role: 'user' },
    'admin-token-xyz': { id: 2, name: 'Bob', role: 'admin' },
  };
  return users[token] ?? null;
}

// ─── Typed WebSocket with userId for targeted pushes ─────────────────────────
interface UserWebSocket extends WebSocket {
  userId?: number;
}

/** Push a notification payload to all sockets belonging to a specific user. */
export function pushToUser(userId: number, payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const client of notifWSS.clients as Set<UserWebSocket>) {
    if (client.userId === userId && client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

/**
 * Attach three WebSocket namespaces (chat, notif, admin) to the given HTTP server.
 * Routes upgrade requests by URL prefix, runs per-route auth before completing the handshake.
 */
export default function wsLoader(server: http.Server): void {
  chatWSS = new WebSocketServer({ noServer: true });
  notifWSS = new WebSocketServer({ noServer: true });
  adminWSS = new WebSocketServer({ noServer: true });

  const wsRoutes: WsRoute[] = [
    { prefix: '/ws/chat', wss: chatWSS, auth: requireUser },
    { prefix: '/ws/notif', wss: notifWSS, auth: requireUser },
    { prefix: '/ws/admin', wss: adminWSS, auth: requireAdmin },
  ];

  server.on('upgrade', async (req: http.IncomingMessage, socket: Duplex, head: Buffer) => {
    if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
      return rejectSocket(socket, 400, 'Bad Request');
    }

    const route = wsRoutes.find(r => req.url?.startsWith(r.prefix));
    if (!route) {
      return rejectSocket(socket, 404, 'Not Found');
    }

    // biome-ignore lint/suspicious/noExplicitAny: auth context shape varies by route
    let context: any;
    try {
      context = await route.auth(req);
    } catch (err) {
      logger.warn(`[upgrade] auth failed: ${(err as Error).message}`);
      return rejectSocket(socket, 401, 'Unauthorized');
    }

    (req as http.IncomingMessage & { user: AuthUser }).user = context;

    route.wss.handleUpgrade(req, socket, head, ws => {
      route.wss.emit('connection', ws, req);
    });
  });

  // ─── Per-WSS connection logic ─────────────────────────────────────────────
  chatWSS.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const { user } = req as http.IncomingMessage & { user: AuthUser };
    logger.info(`[chat] connected: ${user.name}`);
    ws.send(JSON.stringify({ type: 'welcome', room: 'chat', user: user.name }));
    ws.on('message', (data: RawData) => {
      const msg = safeParseJSON(data) as { text?: string } | null;
      if (!msg) return ws.send(wsError('Invalid JSON'));
      broadcast(chatWSS, { type: 'message', from: user.name, text: msg.text });
    });
    ws.on('close', () => logger.info(`[chat] disconnected: ${user.name}`));
    ws.on('error', (err: Error) => logger.error('[chat] error', { message: err.message }));
  });

  notifWSS.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const { user } = req as http.IncomingMessage & { user: AuthUser };
    logger.info(`[notif] connected: ${user.name}`);
    (ws as UserWebSocket).userId = user.id;
    ws.send(JSON.stringify({ type: 'welcome', room: 'notif' }));
    ws.on('error', (err: Error) => logger.error('[notif] error', { message: err.message }));
  });

  adminWSS.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const { user } = req as http.IncomingMessage & { user: AuthUser };
    logger.info(`[admin] connected: ${user.name} (role=${user.role})`);
    ws.send(JSON.stringify({ type: 'stats', data: getServerStats() }));
    ws.on('error', (err: Error) => logger.error('[admin] error', { message: err.message }));
  });
}
