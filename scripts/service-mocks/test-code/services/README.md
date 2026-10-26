## Long Running Applications

### TCP Server

`tcp_server.js` is a TCP server application that supports both event and streaming connections

The following are the `.env` settings

```
TCP_PORT=4000
TCP_HOST=0.0.0.0
TCP_APPNAME=stream-app
TCP_STREAMING_MODE=1
TCP_CLIENT_LIMIT=100
```

TCP_APPNAME is the filename to be used

TCP_STREAMING_MODE
- event mode closes client after data is received
- streaming mode keeps client open, it can be configured to handle a limited number of clients

TCP_CLIENT_LIMIT
- limits number of TCP connections
- 0 means unlimited connections


Run using the following command

```bash
$ node tcp_server.js
```

---

### Scaled Websockets

`scaled-ws.js` is use to demonstrate horizontal scaling of websockets using Redis PubSub, it also includes
- upgrade event and authentication
- setting an id

#### References

- https://tsh.io/blog/how-to-scale-websocket/
- https://socket.io/docs/v4/using-multiple-nodes
- https://socket.io/docs/v4/adapter
- https://redislabs.com/blog/how-to-create-notification-services-with-redis-websockets-and-vue-js/
- https://www.shebanglabs.io/horizontal-scaling-websocket-on-kubernetes-and-nodejs/
- https://www.telerik.com/blogs/websockets-vs-server-sent-events (Websockets vs SSE)

#### Usage

Redis should be available on its default port on localhost

```
npm i
npm start -- 3000
npm start -- 3001
```

Use the following website to test

https://www.websocket.org/echo.html

connect 3 clients to 3000
connect 2 clients to 3001

See output when sending message from a client (currently client that sent will also receive its own message)

#### Notes

If going through a proxy such as load balancer, need sticky sessions

TODO: handle duplicate message to message originator client on subscription message

---

### References

pm2 logs --timestamp --raw

pm2 start tcpd.js --time --output logs/tcpd-log.txt --error logs/tcpd-err.txt --name tcpd
pm2 stop tcpd
pm2 delete tcpd

pm2 start ftpd.js --time --output logs/ftpd-log.txt --error logs/ftpd-err.txt --name ftpd
pm2 stop ftpd
pm2 delete ftpd


device id,time from startup (s) 2 dec pl,gps time hhmmssss utc,satelites,lat,lon,kmh,roll,pitch,yaw,long accel g,lat accel g,rpm,gear ratio,gear pos,clutch,front brake,rear brake,engine brake,foot r weight,foot l weight, checksum
162,727.75,11243960,6,1.3523782,103.7447128,0.00,0.00,0.00,0.00,0.00,0.00,0.00,,0,1,1,1,0,18.90,18.90,4964
162,727.85,11243970,6,1.3523782,103.7447128,0.00,0.00,0.00,0.00,0.00,0.00,0.00,,0,1,1,1,0,18.90,18.90,4966



const [serial, Timestamp, Time, GPS_Time, Sat, Latitude, Longitude, Speed, Roll, Pitch, Z_Rate, Accx, Accy, RPM, Gear_Ratio, Calc_gear, Clutch, Front_Brake, Rear_Brake, Engine_Brake, Foot_Right, Foot_Left, checksum] = data_str.split(',')

length = 22

CREATE TABLE `sensordata` (
`Serial` INT(10,0) NOT NULL,
`Timestamp` DATETIME(3) NOT NULL,
`Time` FLOAT(12) NOT NULL,
`GPS_Time` VARCHAR(50) NOT NULL COLLATE 'utf8mb4_0900_ai_ci',
`Sat` FLOAT(12) NOT NULL,
`Latitude` FLOAT(12) NOT NULL,
`Longitude` FLOAT(12) NOT NULL,
`Speed` VARCHAR(50) NOT NULL COLLATE 'utf8mb4_0900_ai_ci',
`Roll` FLOAT(12) NOT NULL,
`Pitch` FLOAT(12) NOT NULL,
`Z-Rate` FLOAT(12) NOT NULL,
`Accx` FLOAT(12) NOT NULL,
`Accy` FLOAT(12) NOT NULL,
`RPM` FLOAT(12) NOT NULL,
`Gear_Ratio` INT(10,0) NOT NULL,
`Calc_gear` INT(10,0) NOT NULL,
`Clutch` TINYINT(1) NOT NULL,
`Front_Brake` TINYINT(1) NOT NULL,
`Rear_Brake` TINYINT(1) NOT NULL,
`Engine_Brake` TINYINT(1) NOT NULL,
`Foot_Right` FLOAT(12) NOT NULL,
`Foot_Left` FLOAT(12) NOT NULL,
`checksum` INT(10,0) NOT NULL,
UNIQUE INDEX `Serial` (`Serial`, `Timestamp`) USING BTREE
)
COLLATE='utf8mb4_0900_ai_ci'
ENGINE=InnoDB
;





## Useful scripts for testing out stuff

- ga.js
  - test google authenticator and bcrypt
- aes.js
  - test encrypt and decrypt with AES
- net.js
  - list of NodeJS net library use case
- net-retries.js
  -net library retry connection example
- tcpServer.js
  - a sample tcp server
  - use putty (raw tcp mode) to connect and test
