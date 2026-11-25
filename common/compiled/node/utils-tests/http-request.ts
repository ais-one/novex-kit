import http from 'node:http';

export type HttpResponse = { status: number; headers: http.IncomingHttpHeaders; body: string };

export function httpRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const { hostname, port, pathname, search } = new URL(url);
    const bodyBuf = options.body ? Buffer.from(options.body) : null;
    const req = http.request(
      {
        hostname,
        port: Number(port) || 80,
        path: pathname + search,
        method: options.method ?? 'GET',
        headers: { ...options.headers, ...(bodyBuf ? { 'Content-Length': bodyBuf.length } : {}) },
      },
      res => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: data }));
      },
    );
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}
