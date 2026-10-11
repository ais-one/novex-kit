## Description

This document describes the sample Express application in `apps/sample-api`, including configuration, feature demos, and the main API surface used as a reference implementation for new services.

---

## Configuration (Environment Files)

Refer to [docs/conventions.md](../../../docs/conventions.md)

## Some Features

### SAML, OIDC, OAuth

- SAML and OIDC require [Keycloak](https://github.com/ais-one/cookbook/blob/main/docker-devenv/keycloak/README.md) to be set up and the Express server to be running.
- You can test it on [sso.html](http://127.0.0.1:3000/sso.html). The file source is [apps/sample-api/public/demo-express/sso.html](../public/demo-express/sso.html).
- For SAML and OIDC, the sample credentials are `test` / `test`, which redirect to the Keycloak IdP.
- OAuth requires GitHub account setup and related configuration.

### FIDO2

Refer to the following files for the SPA sample, which uses `fido2-lib` in the backend:

- [apps/sample-api/public/demo-express/fido.html](../public/demo-express/fido.html)
  - You might need to use a nip.io-style service for a pseudo-domain during local testing.
  - Take note of and use the private IP on your local machine.
- You will need Windows Hello or a similar platform authenticator on macOS.

### Push Notification

- Ensure that browser notification permissions are enabled.
- Notifications may be blocked by company policy; you may receive a push event without a visible notification.
- Refer to the following files for the SPA sample:
  - [apps/sample-api/public/demo-express/pn.html](../public/demo-express/pn.html)
- The sample uses Web Push and runs on `http://127.0.0.1:3000`.
- Click the following buttons in order (see their output in console.log and screen):
  - (1) Subscribe PN, (2) Send And Receive Test PN, (3) Unsubscribe PN

## Project Structure

- `src/index.js` starts the application and loads runtime configuration.
- `src/app.js` wires shared middleware, routes, and application setup.
- `src/routes/` contains feature and API route modules such as auth, FIDO2, categories, tests, and web push.
- `public/demo-express/` contains browser-based demo pages for features such as SSO, FIDO2, and push notifications.
- `__tests__/` contains unit and integration tests for the sample service.
- `config/`, `schemas/`, and `docs/` contain application-specific configuration, schema, and documentation artifacts.

## Relational Database Schema

### Simple Relation

- books <- 1 --- 1 -> categories - one book belongs to one category
- books <- M --- N -> authors - one book has many authors, and an author can have more than 1 book
- books <- 1 --- M -> pages - one book has many pages

### Simple Table Schema

- authors - id, name
  1, author1
  2, author2

- categories - id, name
  1, cat1
  2, cat2

- books - id, name, categoryId
  1, book1, 1
  2, book2, 1

- pages - id, name, bookId
  1, pageA, 1
  2, pageB, 1
  3, pageC, 2
  4, pageD, 2
  5, pageE, 2

- book_author - bookId, authorId
  1, 1
  1, 2
  2, 1
  2, 2

### CRUD Routes

[* === COMPLETED, ** === TESTED]

- POST /auth/signup
- POST /auth/login
- GET /auth/logout
- POST /auth/otp

- POST /api/authors
- PATCH /api/authors/:id
- GET /api/authors/:id
- GET /api/authors

- POST /api/categories
- PATCH /api/categories/:id
- GET /api/categories/:id
- GET /api/categories

- POST /api/books
- PATCH /api/books/:id
- GET /api/books/:id
- GET /api/books

- POST /books/:id/pages - add page to book
- DELETE /pages/:id - remove page from book
- PATCH /pages/:id - edit a page

- POST /books/:id/authors/:authorId - relate author to book
- DELETE /books/:id/authors/:authorId - unrelate author to book
