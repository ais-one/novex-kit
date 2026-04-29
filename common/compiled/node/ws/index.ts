// https://www.npmjs.com/package/ws
// NOTE: if --forcedExit --detectOpenHandles in JEST test, will cause error

import https, { type Server as HttpsServer } from 'node:https';
import WebSocket, { type RawData, WebSocketServer } from 'ws';
import type { AliveWebSocket } from './types.ts';

export default class Wss {
  private static _instance: Wss | null = null;

  _port: number | undefined;
  _keepAliveMs: number;
  _wss: WebSocketServer | null;
  _keepAliveInterval: ReturnType<typeof setInterval> | null;
  _onClientConnect: (ws: AliveWebSocket) => void;
  _onClientClose: (ws: AliveWebSocket) => void;
  _onClientMessage: (data: RawData, isBinary: boolean, ws: AliveWebSocket, wss: WebSocketServer) => Promise<void>;

  constructor(_options = {}) {
    if (!Wss._instance) {
      Wss._instance = this;
      this._port = process.env?.WS_PORT ? Number(process.env.WS_PORT) : undefined;
      this._keepAliveMs = Number(process.env?.WS_KEEPALIVE_MS) || 30000;
      this._wss = null;
      this._keepAliveInterval = null;
      this._onClientConnect = (_ws: AliveWebSocket) => {};
      this._onClientClose = (_ws: AliveWebSocket) => {};
      this._onClientMessage = async (data: RawData, isBinary: boolean, ws: AliveWebSocket, wss: WebSocketServer) => {
        const message = isBinary ? (data as Buffer) : Buffer.from(data as Buffer).toString('utf8');
        const logMsg = isBinary ? `[binary ${(data as Buffer).length} bytes]` : String(message);
        logger.info(`ws message: ${logMsg}`);
        try {
          wss.clients.forEach((client: WebSocket) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
          ws.send(message);
        } catch (e) {
          logger.info((e as Error).toString());
        }
      };
    }
  }

  /** Returns the singleton Wss instance, or null if not yet initialised. */
  static getInstance(): Wss | null {
    return Wss._instance;
  }

  /** Reset the singleton — for use in tests only. */
  static _resetForTesting(): void {
    Wss._instance = null;
  }

  /** Returns the singleton Wss instance (used by services/index.ts via `services.get()`). */
  get(): Wss | null {
    return Wss._instance;
  }

  /** Override the default broadcast-echo message handler with a custom implementation. */
  setOnClientMessage(
    onClientMessageFn: (data: RawData, isBinary: boolean, ws: AliveWebSocket, wss: WebSocketServer) => Promise<void>,
  ): void {
    this._onClientMessage = onClientMessageFn;
  }

  /** Register a callback invoked when a new client connects. */
  setOnClientConnect(onClientConnectFn: (ws: AliveWebSocket) => void): void {
    this._onClientConnect = onClientConnectFn;
  }

  /** Register a callback invoked when a client disconnects. */
  setOnClientClose(onClientCloseFn: (ws: AliveWebSocket) => void): void {
    this._onClientClose = onClientCloseFn;
  }

  /** Broadcast a message to all currently connected clients. */
  send(data: string | Buffer): void {
    this._wss?.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private _createWss(server: HttpsServer | null): WebSocketServer {
    const { HTTPS_PRIVATE_KEY, HTTPS_CERTIFICATE } = process.env;
    if (HTTPS_CERTIFICATE) {
      const httpsServer =
        server ?? https.createServer({ key: HTTPS_PRIVATE_KEY, cert: HTTPS_CERTIFICATE }).listen(this._port);
      return new WebSocketServer({ server: httpsServer });
    }
    if (server) return new WebSocketServer({ server });
    return new WebSocketServer({ port: this._port });
  }

  private _setupKeepAlive(): void {
    this._keepAliveInterval = setInterval(() => {
      logger.info('WS Clients: ', this._wss?.clients.size);
      this._wss?.clients.forEach((ws: WebSocket) => {
        const aliveWs = ws as AliveWebSocket;
        if (!aliveWs.isAlive) {
          aliveWs.terminate();
          return;
        }
        aliveWs.isAlive = false;
        aliveWs.ping(() => {}); // NOSONAR
      });
    }, this._keepAliveMs);
  }

  /** Start the WebSocket server. Attaches to an existing HTTP/HTTPS server when provided. */
  open(server: HttpsServer | null = null, _app: unknown = null): this {
    let err: string | undefined;
    try {
      if (!this._wss && this._port) {
        this._wss = this._createWss(server);
        logger.info(`WS API listening on port ${this._port}`);

        this._wss.on('error', (e: Error) => logger.info(`WS error: ${e.toString()}`));
        this._wss.on('connection', (ws: WebSocket) => {
          const aliveWs = ws as AliveWebSocket;
          logger.info('ws client connected');
          this._onClientConnect(aliveWs);
          aliveWs.isAlive = true;
          aliveWs.on('pong', () => {
            aliveWs.isAlive = true;
          });
          aliveWs.on('close', () => this._onClientClose(aliveWs));
          aliveWs.on('message', (data: RawData, isBinary: boolean) => {
            if (this._wss) this._onClientMessage(data, isBinary, aliveWs, this._wss);
          });
        });

        this._setupKeepAlive();
      } else {
        logger.info('NO WS Service To Open');
      }
    } catch (e) {
      err = (e as Error).toString();
    }
    logger.info(`WS Open ${err ?? 'Done'}`);
    return this;
  }

  /** Gracefully shut down the WebSocket server: broadcasts shutdown, terminates all clients, resets singleton. */
  close(): void {
    try {
      if (this._keepAliveInterval) {
        clearInterval(this._keepAliveInterval);
        this._keepAliveInterval = null;
      }

      if (this._wss) {
        this._wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'server_shutdown' }));
            client.close(1001, 'Server shutting down');
          }
        });

        for (const client of this._wss.clients) client.terminate();
        this._wss.close();
        this._wss = null;
      }
    } catch (e) {
      logger.error((e as Error).toString());
    }

    Wss._instance = null;
    logger.info('WS API CLOSE OK');
  }
}
