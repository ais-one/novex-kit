/**
 * S3 Large File Uploader (Client-Side)
 * Supports multipart upload for files > 5MB using pre-signed URLs
 *
 * Usage:
 *   const uploader = new S3Uploader({ getSignedUrlEndpoint: '/api/s3/sign' });
 *   await uploader.upload(file, { onProgress: (pct) => logger.info(pct) });
 */

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per part (min 5MB for S3 multipart)
const SINGLE_UPLOAD_LIMIT = 5 * 1024 * 1024; // Use multipart above 5MB

import type { S3UploaderOptions, S3UploadOpts } from './types.ts';

class S3Uploader {
  endpoint: string;
  chunkSize: number;
  maxConcurrent: number;
  /**
   * `getSignedUrlEndpoint` (required) — your backend endpoint that returns signed URLs.
   * `chunkSize` — bytes per part (default: 10MB). `maxConcurrent` — parallel part uploads (default: 3).
   */
  constructor(options: Partial<S3UploaderOptions> = {}) {
    const endpoint = options.getSignedUrlEndpoint;
    if (!endpoint) {
      throw new Error('getSignedUrlEndpoint is required');
    }
    this.endpoint = endpoint;
    this.chunkSize = options.chunkSize || CHUNK_SIZE;
    this.maxConcurrent = options.maxConcurrent || 3;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Upload a File or Blob to S3.
   * `opts.key` — S3 object key (defaults to file.name); `opts.onProgress` — called with 0–100;
   * `opts.signal` — AbortController signal to cancel the upload.
   */
  async upload(file: File | Blob, opts: S3UploadOpts = {}): Promise<{ key: string; location: string }> {
    const key = opts.key || (file instanceof File ? file.name : '');
    const onProgress = opts.onProgress || (() => {});
    const signal = opts.signal || null;

    if (file.size <= SINGLE_UPLOAD_LIMIT) {
      return this._singleUpload(file, key, onProgress, signal);
    }
    return this._multipartUpload(file, key, onProgress, signal);
  }

  // ─── Single-Part Upload (≤5MB) ───────────────────────────────────────────────

  async _singleUpload(
    file: File | Blob,
    key: string,
    onProgress: (pct: number) => void,
    signal: AbortSignal | null,
  ): Promise<{ key: string; location: string }> {
    onProgress(0);

    // 1. Get signed PUT URL from your backend
    const { signedUrl, location } = await this._requestSignedUrl({
      type: 'single',
      key,
      contentType: file.type,
      size: file.size,
    });

    // 2. PUT the file directly to S3
    await this._putToS3(signedUrl, file, file.type, pct => onProgress(pct), signal);

    onProgress(100);
    return { key, location };
  }

  // ─── Multipart Upload (>5MB) ─────────────────────────────────────────────────

  async _multipartUpload(
    file: File | Blob,
    key: string,
    onProgress: (pct: number) => void,
    signal: AbortSignal | null,
  ): Promise<{ key: string; location: string }> {
    // 1. Initiate multipart upload — get uploadId from your backend
    const { uploadId } = await this._requestSignedUrl({
      type: 'initiate',
      key,
      contentType: file.type,
    });

    const chunks = this._splitFile(file);
    const totalParts = chunks.length;
    const partProgress = new Array(totalParts).fill(0);

    const updateProgress = () => {
      const totalUploaded = partProgress.reduce((a, b) => a + b, 0);
      onProgress(Math.round((totalUploaded / file.size) * 100));
    };

    // 2. Upload parts with concurrency control
    const completedParts: Array<{ PartNumber: number; ETag: string | null }> = [];
    const queue = [...chunks.entries()]; // [[index, blob], ...]

    const uploadWorker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const [index, chunk] = item;
        const currentPart = index + 1;

        if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');

        // Get a signed URL for this part
        const { signedUrl } = await this._requestSignedUrl({
          type: 'part',
          key,
          uploadId,
          partNumber: currentPart,
        });

        // Upload the part and capture the ETag
        const etag = await this._putToS3(
          signedUrl,
          chunk,
          file.type,
          bytesDone => {
            partProgress[index] = bytesDone;
            updateProgress();
          },
          signal,
          true, // returnEtag
        );

        completedParts.push({ PartNumber: currentPart, ETag: etag });
      }
    };

    // Run N workers in parallel
    const workers = Array.from({ length: this.maxConcurrent }, () => uploadWorker());
    await Promise.all(workers);

    // 3. Complete the multipart upload
    completedParts.sort((a, b) => a.PartNumber - b.PartNumber);

    const { location } = await this._requestSignedUrl({
      type: 'complete',
      key,
      uploadId,
      parts: completedParts,
    });

    onProgress(100);
    return { key, location };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Split a File/Blob into chunks */
  _splitFile(file: File | Blob): Blob[] {
    const chunks: Blob[] = [];
    let offset = 0;
    while (offset < file.size) {
      chunks.push(file.slice(offset, offset + this.chunkSize));
      offset += this.chunkSize;
    }
    return chunks;
  }

  /**
   * Call your backend to get signed URLs / manage multipart lifecycle.
   * Adapt the request/response shape to match your backend API.
   */
  async _requestSignedUrl(payload: Record<string, unknown>) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Signed URL request failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  /**
   * PUT a blob to a pre-signed S3 URL, reporting progress.
   * Returns ETag if returnEtag=true (needed for multipart complete).
   */
  _putToS3(
    signedUrl: string,
    blob: Blob,
    contentType: string,
    onChunkProgress: (loaded: number) => void,
    signal: AbortSignal | null,
    returnEtag = false,
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', contentType);

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onChunkProgress(e.loaded);
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (returnEtag) {
            const etag = xhr.getResponseHeader('ETag');
            resolve(etag);
          } else {
            resolve(xhr.responseURL || signedUrl); // rough "location"
          }
        } else {
          reject(new Error(`S3 upload failed: HTTP ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new DOMException('Upload aborted', 'AbortError')));

      if (signal) {
        signal.addEventListener('abort', () => xhr.abort());
      }

      xhr.send(blob);
    });
  }
}

export default S3Uploader;
