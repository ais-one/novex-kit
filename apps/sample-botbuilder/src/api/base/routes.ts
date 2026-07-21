import express from 'express';

export default express
  .Router()
  .get('/', (_req, res) => res.send({ status: 'sample-botbuilder OK' }))
  .get('/healthcheck', (_req, res) => res.send({ status: 'sample-botbuilder/healthcheck OK' }));
