The only meaningful change was replacing `_putBlob` — everything else stayed identical. Here's what changed and why:

**The core swap — `XMLHttpRequest` → `fetch`**

The old `xhr.send(blob)` becomes `fetch(url, { method: 'PUT', body: progressStream, duplex: 'half' })`.

**The progress tracking problem**

`fetch` has no `upload.onprogress` event like XHR does. The workaround is wrapping the blob in a `ReadableStream` that increments a counter as bytes flow through it:

```js
const progressStream = new ReadableStream({
  async start(controller) {
    const reader = blob.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        break;
      }
      uploadedBytes += value.byteLength; // ← count bytes here
      onProgress(uploadedBytes);
      controller.enqueue(value); // ← pass them along unchanged
    }
  },
});
```

**Two things required for streaming bodies in fetch:**

1. `duplex: 'half'` — required by the spec when passing a `ReadableStream` as the body (Chrome 105+, Firefox 112+). Without it, some browsers throw a `TypeError`.
2. `Content-Length` set explicitly — fetch can't infer the size from a stream, and OSS requires it for part uploads.

**Error handling** is cleaner with fetch since `response.ok` + `response.text()` replaces checking `xhr.status` and reading `xhr.responseText`.
