import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER, requestIdMiddleware } from '../express/requestId.ts';
import { createRequest, createResponse } from '../tests/http-mocks.ts';

describe.only('express/requestId', () => {
  it.only('mints a new request id when none is provided, and echoes it on the response', () => {
    const req = createRequest() as unknown as Request;
    const res = createResponse() as unknown as Response;
    let calledNext = false;

    requestIdMiddleware(req, res, () => {
      calledNext = true;
    });

    assert.ok(calledNext);
    assert.equal(typeof req.requestId, 'string');
    assert.ok(req.requestId.length > 0);
    assert.equal((res as unknown as ReturnType<typeof createResponse>)._getHeader(REQUEST_ID_HEADER), req.requestId);
  });

  it.only('reuses an incoming x-request-id header instead of minting a new one', () => {
    const req = createRequest({ headers: { [REQUEST_ID_HEADER]: 'upstream-id-123' } }) as unknown as Request;
    const res = createResponse() as unknown as Response;

    requestIdMiddleware(req, res, () => {});

    assert.equal(req.requestId, 'upstream-id-123');
    assert.equal(
      (res as unknown as ReturnType<typeof createResponse>)._getHeader(REQUEST_ID_HEADER),
      'upstream-id-123',
    );
  });
});
