import '@common/node/config';
import '@common/node/logger';
import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import Wss from '@common/node/ws/index';
import WebSocket from 'ws';

const TEST_PORT = 19876;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const waitForOpen = (ws: WebSocket) =>
  new Promise<void>((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

describe.only('Wss', () => {
  before(() => {
    process.env.WS_PORT = String(TEST_PORT);
    Wss._resetForTesting();
  });

  after(() => {
    delete process.env.WS_PORT;
  });

  describe.only('singleton', () => {
    it.only('first instance is stored as _instance', () => {
      const a = new Wss();
      assert.strictEqual(Wss.getInstance(), a);
      Wss._resetForTesting();
    });

    it.only('subsequent construction does not replace the singleton', () => {
      const a = new Wss();
      const second = new Wss(); // second call should be no-op
      assert.strictEqual(Wss.getInstance(), a);
      assert.notStrictEqual(second, a);
      Wss._resetForTesting();
    });
  });

  describe.only('lifecycle', () => {
    let wss: Wss;

    before(() => {
      Wss._resetForTesting();
      wss = new Wss();
    });

    it.only('opens without error', async () => {
      wss.open();
      await wait(100);
      assert.ok(Wss.getInstance() !== null);
    });

    it.only('closes and resets singleton', async () => {
      wss.close();
      await wait(100);
      assert.strictEqual(Wss.getInstance(), null);
    });
  });

  describe.only('messaging', () => {
    let wss: Wss;

    before(async () => {
      Wss._resetForTesting();
      wss = new Wss();
      wss.open();
      await wait(100);
    });

    after(async () => {
      wss.close();
      await wait(100);
    });

    it.only('echoes message back to sender', async () => {
      const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      await waitForOpen(client);

      const received = new Promise<string>(resolve =>
        client.once('message', d => resolve(Buffer.from(d as Buffer).toString('utf8'))),
      );
      client.send('hello');
      assert.strictEqual(await received, 'hello');
      client.close();
      await wait(20);
    });

    it.only('broadcasts message to other connected clients', async () => {
      const c1 = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      const c2 = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      await Promise.all([waitForOpen(c1), waitForOpen(c2)]);

      const c2Received = new Promise<string>(resolve =>
        c2.once('message', d => resolve(Buffer.from(d as Buffer).toString('utf8'))),
      );
      c1.send('broadcast');
      assert.strictEqual(await c2Received, 'broadcast');
      c1.close();
      c2.close();
      await wait(20);
    });
  });

  describe.only('server push', () => {
    let wss: Wss;

    before(async () => {
      Wss._resetForTesting();
      wss = new Wss();
      wss.open();
      await wait(100);
    });

    after(async () => {
      wss.close();
      await wait(100);
    });

    it.only('wss.send() delivers message to all connected clients', async () => {
      const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      await waitForOpen(client);

      const received = new Promise<string>(resolve =>
        client.once('message', d => resolve(Buffer.from(d as Buffer).toString('utf8'))),
      );
      wss.send('server push');
      assert.strictEqual(await received, 'server push');
      client.close();
      await wait(20);
    });
  });

  describe.only('custom handlers', () => {
    let wss: Wss;

    before(async () => {
      Wss._resetForTesting();
      wss = new Wss();
      wss.open();
      await wait(100);
    });

    after(async () => {
      wss.close();
      await wait(100);
    });

    it.only('setOnClientMessage replaces the default handler', async () => {
      wss.setOnClientMessage(async (data, _isBinary, ws) => {
        ws.send(`pong:${Buffer.from(data as Buffer).toString('utf8')}`);
      });

      const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      await waitForOpen(client);

      const received = new Promise<string>(resolve =>
        client.once('message', d => resolve(Buffer.from(d as Buffer).toString('utf8'))),
      );
      client.send('ping');
      assert.strictEqual(await received, 'pong:ping');
      client.close();
      await wait(20);
    });

    it.only('setOnClientConnect fires when a client connects', async () => {
      let connected = false;
      wss.setOnClientConnect(() => {
        connected = true;
      });

      const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      await waitForOpen(client);
      await wait(20);
      assert.ok(connected);
      client.close();
      await wait(20);
    });

    it.only('setOnClientClose fires when a client disconnects', async () => {
      let closed = false;
      wss.setOnClientClose(() => {
        closed = true;
      });

      const client = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      await waitForOpen(client);
      client.close();
      await wait(50);
      assert.ok(closed);
    });
  });
});
