## Description

Internal shared backend workspace for code reused by multiple apps under `apps/*`.

Also include schemas and documents related to this shared backend workspace.

Use this workspace for backend-only code that is not template-wide enough for `common/`.

Suggested folders:

- `auth/` - shared auth helpers used by multiple backend apps
- `express/` - shared Express middleware or route helpers (populated: `express/audit/` — the
  Knex-based audit-context/hard-delete middleware, for apps on a Postgres+Knex stack)
- `services/` - shared service-layer logic (populated: `services/mq/` — the Kafka-backed
  `QueueDriver`, and the RAG/document-ingestion helpers this workspace was originally created for)
- `utils/` - backend utility helpers
- `__tests__/` - unit and integration tests for this workspace

### Example usage

Add this dependency from another app workspace:

```json
{
  "dependencies": {
    "@apps/sample-common": "file:../sample-common"
  }
}
```

Then import concrete modules directly, for example:

```ts
import { auditContext } from '@apps/sample-common/express/audit/audit-context';
```

Avoid barrel `index.ts` files. Export concrete modules from their own files.
