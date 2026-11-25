# Deprecated — use `utils-tests/`

This folder is deprecated and will be removed. Its files have been copied to [`../utils-tests/`](../utils-tests/).

Update imports from `@common/node/tests/...` to `@common/node/utils-tests/...`:

```ts
// before
import { createRequest, createResponse } from '@common/node/tests/http-mocks';
import { httpRequest } from '@common/node/tests/http-request';

// after
import { createRequest, createResponse } from '@common/node/utils-tests/http-mocks';
import { httpRequest } from '@common/node/utils-tests/http-request';
```

Don't change the files here. Make changes in `utils-tests/`.
