import express from 'express';

export default express
  .Router()
  .get('/', (req, res) => res.send('Webhooks OK'))
  // TODO need to handle the Nexmo MO-SNS
  .post('/nexmo-mo-sms', async (req, res) => {
    const { body, query, params } = req;
    res.json({
      body,
      query,
      params,
    });
  });
