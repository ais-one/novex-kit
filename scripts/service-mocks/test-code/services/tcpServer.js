/* eslint-disable */
// TCP server
const net = require('node:net');
const port = 7070;
const host = '127.0.0.1';

const server = net.createServer();
server.listen(port, host, () => {
  console.log(`TCP Server is running on port ${port}.`);
});

const sockets = [];

server.on('connection', sock => {
  console.log(`CONNECTED: ${sock.remoteAddress}:${sock.remotePort}`);

  sockets.push(sock);

  // sock.setEncoding('utf8')
  sock.on('data', data => {
    console.log(`DATA received from ${sock.remoteAddress}`);
    // Write the data back to all the connected, the client will receive it as data from the server
    sockets.forEach((_sock, index, array) => {
      sock.write(`${_sock.remoteAddress}:${_sock.remotePort} said ${data}\n`);
    });
  });

  // Add a 'close' event handler to this instance of socket
  sock.on('close', data => {
    const index = sockets.findIndex(o => {
      return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
    });
    if (index !== -1) sockets.splice(index, 1);
    console.log(`CLOSED: ${sock.remoteAddress} ${sock.remotePort}`);
  });

  sock.on('error', () => console.log('Socket error'));
});

server.on('close', () => {
  console.log('Server closed 2');
});

// for (let socket of sockets) socket.destroy()
// server.close(function () { server.unref() })

/* NOSONAR
var net = require('net');

// Create and return a net.Server object, the function will be invoked when client connect to this server.
var server = net.createServer(function(client) {

    console.log('Client connect. Client local address : ' + client.localAddress + ':' + client.localPort + '. client remote address : ' + client.remoteAddress + ':' + client.remotePort);

    client.setEncoding('utf-8');

    client.setTimeout(1000);

    // When receive client data.
    client.on('data', function (data) {

        // Print received client data and length.
        console.log('Receive client send data : ' + data + ', data size : ' + client.bytesRead);

        // Server send data back to client use client net.Socket object.
        client.end('Server received data : ' + data + ', send back to client data size : ' + client.bytesWritten);
    });

    // When client send data complete.
    client.on('end', function () {
        console.log('Client disconnect.');

        // Get current connections count.
        server.getConnections(function (err, count) {
            if(!err)
            {
                // Print current connection count in server console.
                console.log("There are %d connections now. ", count);
            }else
            {
                console.error(JSON.stringify(err));
            }

        });
    });

    // When client timeout.
    client.on('timeout', function () {
        console.log('Client request time out. ');
    })
});

// Make the server a TCP server listening on port 9999.
server.listen(9999, function () {

    // Get server address info.
    var serverInfo = server.address();

    var serverInfoJson = JSON.stringify(serverInfo);

    console.log('TCP server listen on address : ' + serverInfoJson);

    server.on('close', function () {
        console.log('TCP server socket is closed.');
    });

    server.on('error', function (error) {
        console.error(JSON.stringify(error));
    });

});
*/
