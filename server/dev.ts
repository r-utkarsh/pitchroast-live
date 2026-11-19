import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { loadEnvFiles } from './env';
import joinHandler from './handlers/join';
import tokenHandler from './handlers/token';

loadEnvFiles();

const app = express();
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.json({ limit: '2kb' }));

app.all('/api/token', (req, res) => {
  void tokenHandler(req, res);
});

app.all('/api/join', (req, res) => {
  void joinHandler(req, res);
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const type =
    typeof error === 'object' && error !== null && 'type' in error
      ? (error as { type?: unknown }).type
      : undefined;
  const status = type === 'entity.too.large' ? 413 : 400;
  res.status(status).json({
    error: status === 413 ? 'Request body is too large' : 'Invalid JSON body',
  });
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
