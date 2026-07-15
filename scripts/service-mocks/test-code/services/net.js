/* eslint-disable */
var net = require('node:net');

// creates the server
var server = net.createServer();

//emitted when server closes ...not emitted until all connections closes.
server.on('close', () => {
  console.log('Server closed !');
});

// emitted when new client connects
server.on('connection', socket => {
  //this property shows the number of characters currently buffered to be written. (Number of characters is approximately equal to the number of bytes to be written, but the buffer may contain strings, and the strings are lazily encoded, so the exact number of bytes is not known.)
  //Users who experience large or growing bufferSize should attempt to "throttle" the data flows in their program with pause() and resume().

  console.log(`Buffer size : ${socket.bufferSize}`);

  console.log('---------server details -----------------');

  var address = server.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log(`Server is listening at port${port}`);
  console.log(`Server ip :${ipaddr}`);
  console.log(`Server is IP4/IP6 : ${family}`);

  var lport = socket.localPort;
  var laddr = socket.localAddress;
  console.log(`Server is listening at LOCAL port${lport}`);
  console.log(`Server LOCAL ip :${laddr}`);

  console.log('------------remote client info --------------');

  var rport = socket.remotePort;
  var raddr = socket.remoteAddress;
  var rfamily = socket.remoteFamily;

  console.log(`REMOTE Socket is listening at port${rport}`);
  console.log(`REMOTE Socket ip :${raddr}`);
  console.log(`REMOTE Socket is IP4/IP6 : ${rfamily}`);

  console.log('--------------------------------------------');
  //var no_of_connections =  server.getConnections(); // sychronous version
  server.getConnections((error, count) => {
    console.log(`Number of concurrent connections to the server : ${count}`);
  });

  socket.setEncoding('utf8');

  socket.setTimeout(800000, () => {
    // called after timeout -> same as socket.on('timeout')
    // it just tells that soket timed out => its ur job to end or destroy the socket.
    // socket.end() vs socket.destroy() => end allows us to send final data and allows some i/o activity to finish before destroying the socket
    // whereas destroy kills the socket immediately irrespective of whether any i/o operation is goin on or not...force destry takes place
    console.log('Socket timed out');
  });

  socket.on('data', data => {
    var bread = socket.bytesRead;
    var bwrite = socket.bytesWritten;
    console.log(`Bytes read : ${bread}`);
    console.log(`Bytes written : ${bwrite}`);
    console.log('Data received from client');

    //echo data
    var is_kernel_buffer_full = socket.write(`Data ::${data}`);
    if (is_kernel_buffer_full) {
      console.log('Data was flushed successfully from kernel buffer i.e written successfully!');
    } else {
      socket.pause();
    }
  });

  socket.on('drain', () => {
    console.log('write buffer is empty now .. u can resume the writable stream');
    socket.resume();
  });

  socket.on('error', error => {
    console.log(`Error : ${error}`);
  });

  socket.on('timeout', () => {
    console.log('Socket timed out !');
    socket.end('Timed out!');
    // can call socket.destroy() here too.
  });

  socket.on('end', data => {
    console.log('Socket ended from other end!');
  });

  socket.on('close', error => {
    var bread = socket.bytesRead;
    var bwrite = socket.bytesWritten;
    console.log(`Bytes read : ${bread}`);
    console.log(`Bytes written : ${bwrite}`);
    console.log('Socket closed!');
    if (error) {
      console.log('Socket was closed coz of transmission error');
    }
  });

  setTimeout(() => {
    var isdestroyed = socket.destroyed;
    console.log(`Socket destroyed:${isdestroyed}`);
    socket.destroy();
  }, 1200000);
});

// emits when any error occurs -> calls closed event immediately after this.
server.on('error', error => {
  console.log(`Error: ${error}`);
});

//emits when server is bound with server.listen
server.on('listening', () => {
  console.log('Server is listening!');
});

server.maxConnections = 10;

//static port allocation
server.listen(2222);

// for dyanmic port allocation
server.listen(() => {
  var address = server.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log(`Server is listening at port${port}`);
  console.log(`Server ip :${ipaddr}`);
  console.log(`Server is IP4/IP6 : ${family}`);
});

var islistening = server.listening;

if (islistening) {
  console.log('Server is listening');
} else {
  console.log('Server is not listening');
}

setTimeout(() => {
  server.close();
}, 5000000);

//---------------------client----------------------

// creating a custom socket client and connecting it....
var client = new net.Socket();
client.connect({
  port: 2222,
});

client.on('connect', () => {
  console.log('Client: connection established with server');

  console.log('---------client details -----------------');
  var address = client.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log(`Client is listening at port${port}`);
  console.log(`Client ip :${ipaddr}`);
  console.log(`Client is IP4/IP6 : ${family}`);

  // writing data to server
  client.write('hello from client');
});

client.setEncoding('utf8');

client.on('data', data => {
  console.log('Data received from server');
});

setTimeout(() => {
  client.end('Bye bye server');
}, 5000);

//NOTE:--> all the events of the socket are applicable here..in client...

// -----------------creating client using net.connect instead of custom socket-------

// server creation using net.connect --->
// u can also => write the below code in seperate js file
// open new node instance => and run it...

const clients = net.connect({ port: 2222 }, () => {
  // 'connect' listener
  console.log('connected to server!');
  clients.write('world!\r\n');
});
clients.on('data', data => {
  console.log('Data received from server');
  clients.end();
});
clients.on('end', () => {
  console.log('disconnected from server');
});
