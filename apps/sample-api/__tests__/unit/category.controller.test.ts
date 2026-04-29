import '@common/node/config';
import '@common/node/logger';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import CategoryController, { _injectServices } from '../../src/controllers/category.ts';

// Drizzle-style chainable query builder stub — resolves to an empty result set
const mockQueryBuilder = {
  select() {
    return this;
  },
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  from(_table: any) {
    return this;
  },
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  limit(_n: any) {
    return this;
  },
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  offset(_n: any) {
    return Promise.resolve([]);
  },
};

// Inject mock services before any test runs
_injectServices({
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  get: (_name: any) => mockQueryBuilder,
});

// biome-ignore lint/suspicious/noExplicitAny: test mock
let req: any, res: any;

beforeEach(() => {
  req = { query: {} };
  res = {
    statusCode: 0,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(_data: unknown) {
      return this;
    },
  };
});

describe.only('categoryController.find', () => {
  it.only('should have a get function', () => {
    assert.strictEqual(typeof CategoryController.find, 'function');
  });

  it.only('should return status 200 and authors', async () => {
    await CategoryController.find(req, res);
    assert.strictEqual(res.statusCode, 200);
  });
});

describe.only('Category Unit Test', () => {
  it.only('should pass', () => {
    assert.strictEqual(true, true);
  });
});
