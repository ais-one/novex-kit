## Scripts

Releases are cut by the manual `Release` workflow in [release.yml](../.github/workflows/release.yml) (git-cliff), not by local scripts.

This folder keeps repository utility scripts and local dev-infra mocks.

### generators/

See [generators/README.md](generators/README.md) for full documentation on `generate-crud.ts`, `generate-openapi.ts` and `api-generator-route.ts`, including CLI flags, config file options, and a guide on customising generated code.

### db-mocks/

`serve-db.ts` (`@tools/db-mocks`) — local PGlite socket server on `127.0.0.1:5432` (with the `vector` and `pgmq` extensions), backed by `db/dev.db/`. It serves the `db/sample`, `db/iam` and `db/audit` schemas.

```bash
cd scripts/db-mocks
npm run serve                              # default data dir: db/dev.db
npm run serve -- --dbpath /tmp/scratch.db  # alternate data dir
```

See [db/README.md](../db/README.md) for migrations and seeding.

### service-mocks/

In-process redis and kafka mocks plus experimental test code. See [service-mocks/README.md](service-mocks/README.md).

### test-schemas.ts

Validates Zod schema exports in a given directory. Run from the repo root and pass the schema directory:

```bash
npm run test:schemas -- common/schemas
# or directly
node scripts/test-schemas.ts common/schemas
```

The git hooks run it for `common/schemas` and every `apps/*/schemas` directory.

### kafka-provision.ts / kafka-offset.ts

Kafka admin helpers for queue consumer apps. Run them from the consumer app's own directory so its `.env.json`/`.env` load (e.g. `apps/sample-queue-consumer`, which wires them up as `kafka:provision` and `kafka:offset`):

```bash
cd apps/sample-queue-consumer
npm run kafka:provision                     # create/align topics from KAFKA_TOPICS_CONFIG
npm run kafka:offset -- show --groupId=sample-queue-consumer --topic=sample.events
```

See the header comment of each script for all subcommands and flags.
