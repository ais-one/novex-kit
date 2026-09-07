// Aliyun OSS interface - https://github.com/ali-sdk/ali-oss
// suitable for files that are not large... limit to 10Mb file size

import crypto from 'node:crypto';
import OSS from 'ali-oss';

const { OSS_ACCESS_ID, OSS_ACCESS_KEY, OSS_REGION, OSS_BUCKET } = process.env;

const store =
  OSS_ACCESS_ID && OSS_ACCESS_KEY && OSS_REGION
    ? new OSS({
        region: OSS_REGION,
        accessKeyId: OSS_ACCESS_ID,
        accessKeySecret: OSS_ACCESS_KEY,
        bucket: OSS_BUCKET,
      })
    : null;

interface OssResult {
  status: number;
  statusMessage?: string;
}

interface CallbackConfig {
  callback_url?: string;
  body?: Record<string, unknown>;
}

/**
 * Get the total object count of a bucket.
 *
 * @param bucketName - Target bucket name. Defaults to the configured OSS_BUCKET.
 */
const countBucketObjects = async (bucketName: string | null = null): Promise<{ status: number; count: number }> => {
  try {
    const result = await store?.getBucketStat(bucketName ?? undefined);
    return { status: 200, count: result?.stat?.ObjectCount ?? 0 };
  } catch (e) {
    return { status: (e as { status: number }).status ?? 500, count: 0 };
  }
};

/**
 * List objects in the configured bucket.
 *
 * @param prefix - Key prefix filter.
 * @param maxKeys - Maximum number of keys to return.
 */
const listObjects = async ({
  prefix = '',
  maxKeys = 10,
}: {
  prefix?: string;
  maxKeys?: number;
} = {}): Promise<OssResult & { objects?: unknown[] }> => {
  try {
    const result = await store?.listV2({ prefix, 'max-keys': maxKeys });
    const { status, statusMessage } = result?.res ?? {};
    return { status: status ?? 200, statusMessage, objects: result?.objects };
  } catch (e) {
    return { status: 500, statusMessage: String(e) };
  }
};

/**
 * Upload an object to the configured bucket.
 *
 * @param key - Object key, e.g. `'folder/file.txt'`.
 * @param payload - File data as string, Buffer, or ReadableStream.
 */
const putObject = async (key: string, payload: string | Buffer | NodeJS.ReadableStream): Promise<OssResult> => {
  try {
    const result = await store?.put(key, payload);
    const { status, statusMessage } = result?.res ?? {};
    return { status: status ?? 200, statusMessage };
  } catch (e) {
    return { status: 500, statusMessage: String(e) };
  }
};

/**
 * Download an object from the configured bucket.
 *
 * @param key - Object key, e.g. `'folder/file.txt'`.
 */
const getObject = async (key: string): Promise<OssResult & { buffer?: Buffer }> => {
  try {
    const result = await store?.get(key);
    const { status, statusMessage } = result?.res ?? {};
    return { status: status ?? 200, statusMessage, buffer: result?.content };
  } catch (e) {
    return { status: 500, statusMessage: String(e) };
  }
};

/**
 * Delete multiple objects from the configured bucket.
 *
 * @param keys - Array of object keys to delete.
 */
const deleteObjects = async (keys: string[]): Promise<OssResult & { deleted?: unknown[] }> => {
  try {
    const result = await store?.deleteMulti(keys, {});
    const { status, statusMessage } = result?.res ?? {};
    return { status: status ?? 200, statusMessage, deleted: result?.deleted };
  } catch (e) {
    return { status: 500, statusMessage: String(e) };
  }
};

/**
 * Generate a pre-signed URL for direct client access.
 *
 * @param method - HTTP method: `'GET'` or `'PUT'`.
 * @param expires - Expiry in seconds.
 * @param key - Object key.
 * @param headers - Optional request headers.
 * @param additional - Optional additional signed headers.
 */
const getSignedUrl = async (
  method: string,
  expires: number,
  key: string,
  headers: Record<string, unknown> | null = null,
  additional: string[] | null = null,
): Promise<string> => {
  const signedUrl = await store?.signatureUrlV4(method, expires, headers ?? undefined, key, additional ?? undefined);
  return signedUrl ?? '';
};

/**
 * Generate a pre-signed upload URL for a client to PUT a file directly to OSS.
 *
 * @param directory - Target directory prefix in the bucket.
 * @param filename - Original filename (used to derive the stored name and extension).
 * @param contentType - MIME type of the file.
 * @param action - `'write'` (default) or `'read'`.
 * @param expiration - URL expiry in seconds. Defaults to 7200.
 * @param callbackConfig - Optional OSS callback config for write actions.
 */
const getUploadURL = async (
  directory: string,
  filename: string,
  contentType: string,
  action = 'write',
  expiration = 7200,
  callbackConfig?: CallbackConfig,
): Promise<{ url?: string; error?: string }> => {
  if (!action || !filename) return { error: 'filename and action required' };

  try {
    // biome-ignore lint/suspicious/noImplicitAnyLet: assigned conditionally below
    let url;

    if (action === 'write') {
      const arr = filename.split('.');
      arr[0] = crypto
        .createHash('sha256')
        .update(arr[0] + Date.now())
        .digest('hex');
      const newFilename = arr.join('.');
      const fullPath = directory ? `${directory}/${newFilename}` : newFilename;

      url = await store?.signatureUrl(fullPath, {
        expires: expiration,
        method: 'PUT',
        'Content-Type': contentType,
        callback: {
          url: callbackConfig?.callback_url,
          body: JSON.stringify({ ...callbackConfig?.body, filename, filepath: fullPath }),
          contentType: 'application/json',
        },
      });
    } else {
      url = await store?.signatureUrl(filename);
    }

    return { url };
  } catch (e) {
    return { error: String(e) };
  }
};

// ─── Streaming / multipart upload — for files too large for putObject()'s ~10Mb comfort zone ──

/** Fired after each part is successfully uploaded to OSS, for callers that want to log/track progress without this module knowing about any app's logger. */
export interface MultipartPartInfo {
  partNumber: number;
  /** Byte size of this specific part. */
  bytes: number;
  /** Running total of bytes uploaded so far on this stream, across all parts including this one. */
  totalBytes: number;
}

export interface MultipartUploadStreamOptions {
  /**
   * Minimum size (bytes) an internal buffer must reach before it's flushed as a part — OSS/S3
   * multipart uploads require every part except the last to be at least 5MB. Defaults to 5MB.
   * The final part (flushed on `.end()`) is exempt and may be smaller.
   */
  minPartSize?: number;
  onPartUploaded?: (info: MultipartPartInfo) => void;
}

export interface MultipartUploadStream {
  /** Buffers a chunk; flushes an upload part once enough has accumulated. Never call after `.end()`/`.abort()`. */
  write(chunk: string | Buffer): void;
  /**
   * Flushes any buffered remainder as the final part and completes the multipart upload. If
   * nothing was ever written (zero parts), this is a no-op — it never calls
   * `completeMultipartUpload` with an empty part list, and no object is created in OSS. Callers
   * that need a real (possibly empty) object to always exist should fall back to `putObject()`
   * for that specific case instead of relying on this stream.
   */
  end(): Promise<OssResult>;
  /** Aborts the in-progress multipart upload (if one was ever started) so no orphaned incomplete upload is left in OSS. Safe to call even if nothing was ever written. */
  abort(): Promise<void>;
  /** Resolves once the underlying multipart upload has been initiated. Never resolves if `write()` is never called with non-empty content. */
  uploadId: Promise<string>;
}

const DEFAULT_MIN_PART_SIZE = 5 * 1024 * 1024; // 5MB — OSS/S3-family multipart minimum for a non-final part

type OssPart = { number: number; etag: string };

/**
 * Opens a streaming, multipart-upload-backed writer for `key` — the large-file counterpart to
 * `putObject()`. Buffers incoming `write()` calls until reaching `minPartSize`, then uploads
 * that buffer as one part via `store.uploadPart()`; `.end()` flushes whatever remains as the
 * (possibly smaller) final part and completes the upload. `.abort()` cleans up an in-progress
 * upload via `store.abortMultipartUpload()` so a failed job never leaves an orphaned incomplete
 * multipart upload sitting in the bucket.
 */
export const createMultipartUploadStream = (
  key: string,
  options: MultipartUploadStreamOptions = {},
): MultipartUploadStream => {
  const minPartSize = options.minPartSize ?? DEFAULT_MIN_PART_SIZE;

  let pending: Buffer[] = [];
  let pendingBytes = 0;
  let partNumber = 0;
  let totalBytesUploaded = 0;
  const parts: OssPart[] = [];
  let settled = false;
  let failure: Error | null = null;
  let resolvedUploadId: string | null = null;
  let initStarted = false;

  let uploadIdResolve!: (id: string) => void;
  let uploadIdReject!: (err: Error) => void;
  const uploadId = new Promise<string>((resolve, reject) => {
    uploadIdResolve = resolve;
    uploadIdReject = reject;
  });
  // A rejection here is already surfaced to callers through `failure` (see uploadPartBuffer())
  // and re-thrown by end()/abort(). Without this, a caller that never reads the `uploadId`
  // promise (e.g. export-storage.repository.ts) leaves its rejection completely unobserved,
  // which crashes the whole process as an unhandledRejection instead of just failing the job.
  uploadId.catch(() => {});

  const ensureInit = async (): Promise<string> => {
    if (resolvedUploadId) return resolvedUploadId;
    if (!initStarted) {
      initStarted = true;
      try {
        const result = await store?.initMultipartUpload(key);
        const id: string | undefined = result?.uploadId;
        if (!id) throw new Error(`ali-oss initMultipartUpload returned no uploadId for ${key}`);
        resolvedUploadId = id;
        uploadIdResolve(id);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        uploadIdReject(err);
        throw err;
      }
    }
    return uploadId;
  };

  // Serializes every part upload onto one chain so parts always upload (and are numbered) in
  // write order, even though write() itself is synchronous/non-blocking.
  let chain: Promise<void> = Promise.resolve();

  const uploadPartBuffer = (buf: Buffer): Promise<void> => {
    chain = chain.then(async () => {
      if (failure) return; // a prior part already failed — stop uploading further parts
      try {
        const id = await ensureInit();
        partNumber += 1;
        const thisPartNumber = partNumber;
        const result = await store?.uploadPart(key, id, thisPartNumber, buf, 0, buf.length);
        const etag: string | undefined = result?.etag;
        if (!etag) throw new Error(`ali-oss uploadPart returned no etag for ${key} part ${thisPartNumber}`);
        parts.push({ number: thisPartNumber, etag });
        totalBytesUploaded += buf.length;
        options.onPartUploaded?.({ partNumber: thisPartNumber, bytes: buf.length, totalBytes: totalBytesUploaded });
      } catch (e) {
        failure = e instanceof Error ? e : new Error(String(e));
      }
    });
    return chain;
  };

  const write = (chunk: string | Buffer): void => {
    if (settled) throw new Error(`cannot write to multipart upload stream for ${key} after end()/abort()`);
    const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : chunk;
    if (buf.length === 0) return;
    pending.push(buf);
    pendingBytes += buf.length;
    if (pendingBytes >= minPartSize) {
      const flushBuf = Buffer.concat(pending, pendingBytes);
      pending = [];
      pendingBytes = 0;
      void uploadPartBuffer(flushBuf);
    }
  };

  const end = async (): Promise<OssResult> => {
    settled = true;
    if (pendingBytes > 0) {
      const flushBuf = Buffer.concat(pending, pendingBytes);
      pending = [];
      pendingBytes = 0;
      await uploadPartBuffer(flushBuf);
    } else {
      await chain;
    }

    if (failure) throw failure;

    if (parts.length === 0) {
      // Nothing was ever written — never call completeMultipartUpload with zero parts (invalid),
      // and no multipart upload was ever even initiated. No-op; caller decides what to do next
      // (e.g. skip caching an empty bucket, or fall back to putObject() for a guaranteed object).
      return { status: 204 };
    }

    const id = await uploadId;
    const result = await store?.completeMultipartUpload(key, id, parts);
    const { status, statusMessage } = result?.res ?? {};
    return { status: status ?? 200, statusMessage };
  };

  const abort = async (): Promise<void> => {
    settled = true;
    failure = failure ?? new Error(`multipart upload for ${key} aborted`);
    try {
      await chain;
    } catch {
      // uploadPartBuffer never rejects the chain itself (errors are captured into `failure`),
      // but guard anyway so an abort can never itself throw before reaching abortMultipartUpload.
    }
    if (resolvedUploadId) {
      await store?.abortMultipartUpload(key, resolvedUploadId);
    }
  };

  return { write, end, abort, uploadId };
};

/**
 * Opens a streaming download of `key` — the large-file counterpart to `getObject()`. Wraps
 * `store.getStream()`, ali-oss's streaming-download API (`{ stream, res }`), and hands back just
 * the readable stream. Async because ali-oss has to issue the HTTP request before a stream is
 * available — there's no way to hand back a stream synchronously.
 */
export const getObjectStream = async (key: string): Promise<NodeJS.ReadableStream> => {
  const result = await store?.getStream(key);
  if (!result?.stream) throw new Error(`failed to open object stream for ${key}`);
  return result.stream;
};

export { countBucketObjects, deleteObjects, getObject, getSignedUrl, getUploadURL, listObjects, putObject };
