const WebSocket = require('ws');
const { createServer } = require('node:http');

const WEB_SOCKET_PORT = process.argv[2] || 3000;
const WEB_SOCKET_PATH = '/';

const Redis = require('ioredis');
const redisSub = new Redis();
const redisPub = redisSub.duplicate(); // new Redis()

// Connect to Redis and subscribe to "app:notifications" channel
redisSub.subscribe('app:notifications', (err, count) => {
  if (err) {
    // Just like other commands, subscribe() can fail for some reasons, ex network issues.
    console.error('Failed to subscribe: %s', err.message);
  } else {
    // `count` represents the number of channels this client are currently subscribed to.
    console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
  }
});

const server = createServer();
const wss = new WebSocket.Server({ noServer: true, path: WEB_SOCKET_PATH }); // either noServer or port

// Register event for client connection
wss.on('connection', (ws, req) => {
  console.log('Client connected');

  ws.id = Date.now(); // we could generate ID from JWT decoded in upgrade

  ws.on('message', (data, isBinary) => {
    console.log(`Incoming message from ${ws.id}`);
    redisPub.publish('app:notifications', data.toString('utf-8'));
  });

  redisSub.on('message', (channel, message) => {
    // - sent to all other sockets on this server... except message originator client (for chat apps)
    //   - need to trap this on client side
    //   - need to use a message sender id & timestamp to ignore incoming message
    // - sent to all other sockets on this server... including message originator client (if response is an update)
    wss.clients.forEach(client => {
      console.log('ws.id, client.id', ws.id, client.id);
      if (client.readyState === WebSocket.OPEN) {
        if (ws.id === client.id) client.send(message); //  prevent from getting duplicate messages
        // client.send(message, { binary: isBinary })
      }
    });
    console.log(`Received message from channel: ${channel}`);
  });
});

const authenticate = (req, callback) => {
  return callback(null, true); // simulate authenticated...
};

server.on('upgrade', function upgrade(request, socket, head) {
  // This function is not defined on purpose. Implement it with your own logic.
  authenticate(request, (err, client) => {
    if (err || !client) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    console.log('Upgrade request received');
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request, client);
    });
  });
});

server.listen(WEB_SOCKET_PORT);

console.log(process.argv);
console.log(`WebSocket server started at ws://locahost:${WEB_SOCKET_PORT}`);
