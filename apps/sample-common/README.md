## Description

Internal shared backend workspace for code reused by multiple apps under `apps/*`.

Also include schemas and documents related to this shared backend workspace.

Use this workspace for backend-only code that is not template-wide enough for `common/`.

Suggested folders:

- `auth/` - shared auth helpers used by multiple backend apps
- `express/` - shared Express middleware or route helpers
- `services/` - shared service-layer logic (this one currently created)
- `utils/` - backend utility helpers
- `__tests__/` - unit and integration tests for this workspace

### Example usage

Add this dependency from another app workspace:

```json
{
  "dependencies": {
    "@apps/shared-sample": "file:../shared-sample"
  }
}
```

Then import concrete modules directly, for example:

```js
import { someHelper } from '@apps/shared-sample/services/some-helper.js';
```

Avoid barrel `index.js` files. Export concrete modules from their own files.
