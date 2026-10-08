## Scripts

Releases are cut by the manual `Release` workflow in [release.yml](../.github/workflows/release.yml) (git-cliff), not by local scripts.

This folder keeps repository utility scripts.

### generators/

See [generators/README.md](generators/README.md) for full documentation on `generate-crud.ts` and `generate-openapi.ts`, including CLI flags, config file options, and a guide on customising generated code.

### test-schemas.ts

Validates Zod schema exports in a given directory.

Run from an app directory: `npm run test:schema`
