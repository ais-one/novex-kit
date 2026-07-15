import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { sleep } from '@common/iso/sleep';
import { storageUpload } from '@common/node/express/upload';
import * as services from '@common/node/services';
import express from 'express';

// import PdfKit from 'pdfkit';

const { UPLOAD_STATIC = null } = globalThis.__config;

export default express
  .Router()
  .get('/', (req, res) => {
    res.json({
      endpoints: ['/stream', '/get-html'],
    });
  })
  .get('/python', (req, res) => {
    // spawn long running python process
    // Use an absolute path (or a path from a trusted env var) to avoid untrusted PATH lookups.
    const pythonBin = process.env.PYTHON_BIN ?? '/usr/bin/python3';
    const child = spawn(pythonBin, ['apps/sample-api/test.py'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    res.json({});
  })
  .post('/test-cors-post', (req, res) => {
    res.send('Cors Done');
  }) // check CORS
  .post('/test-post-json', (req, res) => {
    res.json(req.body);
  }) // check if send header as application/json but body is text
  .get('/outbound', async (req, res) => {
    // test outbound unblocked
    const rv = await fetch('https://httpbin.org/get');
    const data = await rv.json();
    res.json(data);
  })
  .get('/error', (req, res) => {
    // error caught by error middleware
    (req as unknown as { something: { missing: number } }).something.missing = 10;
    res.json({ message: 'OK' });
  })
  .get('/error-handled-rejection', async (req, res) => {
    // generate hanled promise rejection error
    await Promise.reject(new Error('handled rejection of promise'));
  })
  .get('/error-unhandled-rejection', async (req, res, next) => {
    // catching error in unhandledException
    Promise.reject(new Error('unhandled rejection of promise')); // call on.process unhandledRejection - promise rejection, unhandled
  })
  .get('/stream', async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Transfer-Encoding': 'chunked' });
    const chunks = 5;
    let count = 1;
    while (count <= chunks) {
      // logger.info('streaming', count)
      await sleep(1000); // eslint-disable-line
      res.write(`${JSON.stringify({ type: 'stream', chunk: count++ })}\n`);
    }
    res.end();
  })
  .get('/get-html', (req, res) => {
    // render a html page
    const myHtml = data => `<h1>Render html, data = ${data.username}</h1>`;
    res.type('text/html');
    res.status(200).send(myHtml({ username: 'test name' }));
  })
  .get('/download', (req, res, next) => {
    // serve a file download, you can add authorization here to control downloads
    const { filename } = req.query as { filename: string };
    // path.basename strips any directory traversal components (e.g. ../../etc/passwd)
    const safeFilename = path.basename(filename);
    const fullPath = path.join(UPLOAD_STATIC[0].folder, safeFilename);

    // Stream file instead
    const file = fs.createReadStream(fullPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    file.pipe(res);
  })

  // message queues
  .get('/mq-agenda', async (req, res) => {
    // test message queue - agenda
    res.json({ job: null, note: 'TODO' });
  })

  // test websocket broadcast
  .get('/ws-broadcast', async (req, res) => {
    services.get('ws')?.send('WS Broadcast');
    res.send('ws broadcast');
  })

  // TODO /esm/upload-fe-testing.js
  // test uploads
  // body action: 'read' | 'write', filename: 'my-file.txt', bucket: 'bucket name'
  .post('/upload-disk', storageUpload(UPLOAD_STATIC[0]).any(), (req, res) => {
    // avatar is form input name // single('filedata')
    logger.info('upload', { files: req.files });
    // body is string, need to parse if json
    res.json({
      ok: true, // success
      message: 'Uploaded',
      body: req.body,
    });
  });
