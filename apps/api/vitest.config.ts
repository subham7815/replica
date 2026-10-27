import { defineConfig } from 'vitest/config';

const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/newreplica_test',
  JWT_SECRET: 'test-secret-test-secret-test-secret-123456',
  AUTH_DEV_EXPOSE_CODES: 'true',
};

// globalSetup runs in this process and doesn't receive `test.env`, so set it here too.
Object.assign(process.env, testEnv);

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    env: testEnv,
  },
});
