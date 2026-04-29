import fs from 'node:fs';
import * as s from '@common/node/services';
import express from 'express';

function openMissingFile() {
  fs.readFile('somefile4.txt', (err, data) => {
    if (err) throw err; // will cause node JS to crash if throw error in error handler. just handle error inside here or "return next(err)"
  });
}
// openMissingFile() // test error handling

// How to Define Healthiness of an Application
// Server can respond to requests.
// Server can respond to requests and can connect to database.
// Server can respond to requests, can connect to database, and can connect with other third-party systems and integrations
export default express
  .Router()
  .get('/', (req, res) => res.send({ status: 'sample-api OK' }))
  .get('/healthcheck', (req, res) => res.send({ status: 'sample-api/healthcheck OK' }))
  .get('/check-db', async (req, res) => {
    const connectionName = (req.query.conn as string) || 'drizzle1';
    const db = s.get(connectionName);
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`SELECT 1`);
    return res.status(200).json({ connectionName, result: result.rows });
  });
