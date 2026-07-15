require('dotenv').config();

let appOpen = () => console.log('SERVER OPEN CALLED');
let appClose = () => console.log('SERVER CLOSE CALLED');
let appData = (data, client, _server) => console.log('DATA', data);

try {
  const app = require(`./${process.env.TCP_APPNAME}`);
  appOpen = app.open;
  appClose = app.close;
  appData = app.onData;
} catch (e) {
  console.log(process.env.TCP_APPNAME, e.toString());
}

const net = require('node:net');
const port = process.env.TCP_PORT;
const host = process.env.TCP_HOST;
const sockets = []; //  for streaming socket
const tcpClientLimit = parseInt(process.env.TCP_CLIENT_LIMIT) || 0; // 0 means unlimited connections
const streaming = !!process.env.TCP_STREAMING_MODE; // either streaming or event socket

appOpen();

const server = net.createServer();

server.on('connection', client => {
  console.log(`TCP Client connected: ${client.remoteAddress}:${client.remotePort}`);
  if (streaming) sockets.push(client);
  // client.setEncoding('utf8')
  client.on('error', () => console.log('Socket error'));
  client.on('data', data => {
    console.log(`TCP Client data received from ${client.remoteAddress}:${client.remotePort}`);
    // close if number of connections exceeded
    if (tcpClientLimit && sockets.length > tcpClientLimit) {
      client.destroy(); // close if too many connections
    } else {
      appData(data, client, server); // Write the data back to all the connected, the client will receive it as data from the server
      if (!streaming) client.destroy(); // close if event
    }
  });
  if (streaming) {
    client.on('close', data => {
      const index = sockets.findIndex(o => {
        return o.remoteAddress === client.remoteAddress && o.remotePort === client.remotePort;
      });
      if (index !== -1) sockets.splice(index, 1);
      console.log(`CLIENT CLOSED: ${client.remoteAddress} ${client.remotePort}`);
    });
  }
});

server.on('close', () => console.log('TCP Server closed'));
server.on('error', err => {
  throw err;
});
server.listen(port, host, () => console.log(`TCP Server listening on: ${host}:${port}`));
require('@ais-one/node/traps')(async () => {
  for (const socket of sockets) socket.destroy();
  server.close(() => server.unref());
  appClose();
  return 0;
});
