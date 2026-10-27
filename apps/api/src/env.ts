import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().optional(),
  WEB_APP_URL: z.string().default('http://localhost:5173'),
  AUTH_DEV_EXPOSE_CODES: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === 'production' && parsed.AUTH_DEV_EXPOSE_CODES) {
  throw new Error('AUTH_DEV_EXPOSE_CODES must not be enabled in production');
}

export const env = parsed;
