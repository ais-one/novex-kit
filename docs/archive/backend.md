# Backend Services

## TCP Server

Running the example

```
npm i
cd sandbox/services
node tcpServer.js
```

A TCP server will listen on port 7070. Use putty (for windows) as client to connect (Raw TCP) and test

Example Usage file location [../../sandbox/services/tcpServer.js]()

More Samples

- More TCP Usage [../../sandbox/services/net.js]()
- TCP Retries [../../sandbox/services/net-retries.js]()

# Micro Service

## URL

1. service.domain
2. domain/service
3. context.domain/service

- SSL certificates (you might need a wildcard in 1, but not 2)
- if using API gateway, 2 will probably be better, you can abstract microservice architecture behind API gateway and split or merge them without impacting routes. To the consumers it will look like a huge monolith with a lot of resources exposed
- if a flat architecture with consumers calling directly each microservices (i.e. no API gateway) 1 will probably be better as each microservice acts as a separate application (with each its own SSL certificate, etc.)
- you can also mix both approaches (see 3), like for instance app.eg.com, auth.eg.com and admin.eg.com as large "bounded contexts" then a finer split into microservices once inside the boundary (app.eg.com/cart and app.eg.com/billing)

- 1 allows u to use DNS to route the request but updating DNS can be slow.
- 2 is just a standard proxy
  - you specify the correct upstream server for url pattern matching
  - but now u have to maintain a HA proxy server on your own
- if u use DNS, u r using the cloud provider's infrastructure
