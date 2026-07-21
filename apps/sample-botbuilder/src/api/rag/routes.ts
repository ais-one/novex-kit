import express from 'express';
import * as ctrl from './controller.ts';

export default express
  .Router()
  .post('/upload', async (req, res) => {
    try {
      const { title, content } = req.body as { title?: string; content?: string };
      if (!title || !content) return res.status(400).json({ ok: false, error: 'title and content required' });
      const result = await ctrl.uploadDocument(title, content);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('[rag] upload error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  })
  .get('/documents', async (_req, res) => {
    try {
      const documents = await ctrl.getDocuments();
      res.json({ ok: true, documents });
    } catch (err) {
      logger.error('[rag] list documents error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  })
  .delete('/documents/:id', async (req, res) => {
    try {
      await ctrl.deleteDocument(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      logger.error('[rag] delete document error:', (err as Error).message);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });
