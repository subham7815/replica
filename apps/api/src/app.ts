import cors from 'cors';
import express from 'express';
import type { Health } from '@newreplica/shared';
import { prisma } from './db';
import { env } from './env';
import { errorHandler } from './lib/http';
import { authRouter } from './routes/auth';
import { organizationRouter } from './routes/organization';
import { publicRouter } from './routes/public';
import { applicationsRouter, opportunitiesRouter } from './routes/recruitment';
import { teamRouter } from './routes/team';
import { volunteersRouter } from './routes/volunteers';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', async (_req, res) => {
    let db: Health['db'] = 'up';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    const body: Health = { status: 'ok', db, time: new Date().toISOString() };
    res.json(body);
  });

  app.use('/auth', authRouter);
  app.use('/team', teamRouter);
  app.use('/volunteers', volunteersRouter);
  app.use('/public', publicRouter);
  app.use('/opportunities', opportunitiesRouter);
  app.use('/applications', applicationsRouter);
  app.use(organizationRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);

  return app;
}
