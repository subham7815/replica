import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { createUser, resetDb } from './helpers';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('register organisation', () => {
  it('creates an org and an ORG_ADMIN, and returns a working session', async () => {
    const res = await request(app).post('/auth/register-organization').send({
      organizationName: 'Riverside Food Bank',
      name: 'Rita',
      email: 'Rita@Example.com',
      password: 'longenough1',
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: 'rita@example.com',
      role: 'ORG_ADMIN',
      organization: { name: 'Riverside Food Bank', slug: 'riverside-food-bank' },
    });

    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('rita@example.com');
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser('VOLUNTEER', { email: 'taken@example.com' });
    const res = await request(app).post('/auth/register-organization').send({
      organizationName: 'Another Org',
      name: 'X',
      email: 'taken@example.com',
      password: 'longenough1',
    });
    expect(res.status).toBe(409);
  });

  it('validates input', async () => {
    const res = await request(app).post('/auth/register-organization').send({ email: 'nope' });
    expect(res.status).toBe(400);
  });
});

describe('password login', () => {
  it('logs in with correct credentials', async () => {
    await createUser('COORDINATOR', { email: 'c@example.com', password: 'Password123!' });
    const res = await request(app).post('/auth/login').send({ email: 'c@example.com', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('COORDINATOR');
    expect(res.body.token).toBeTypeOf('string');
  });

  it('gives the same error for wrong password and unknown email', async () => {
    await createUser('COORDINATOR', { email: 'c@example.com' });
    const wrong = await request(app).post('/auth/login').send({ email: 'c@example.com', password: 'nope' });
    const unknown = await request(app).post('/auth/login').send({ email: 'ghost@example.com', password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  it('refuses passwordless accounts', async () => {
    await createUser('VOLUNTEER', { email: 'v@example.com', password: null });
    const res = await request(app).post('/auth/login').send({ email: 'v@example.com', password: 'anything' });
    expect(res.status).toBe(401);
  });

  it('refuses suspended accounts and invalidates their existing sessions', async () => {
    const user = await createUser('VOLUNTEER', { email: 'v@example.com' });
    const login = await request(app).post('/auth/login').send({ email: 'v@example.com', password: 'Password123!' });
    await prisma.membership.update({ where: { id: user.membershipId! }, data: { status: 'SUSPENDED' } });

    const again = await request(app).post('/auth/login').send({ email: 'v@example.com', password: 'Password123!' });
    expect(again.status).toBe(403);
    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(401);
  });
});

describe('passwordless code login', () => {
  it('signs in with the emailed 6-digit code, once only', async () => {
    await createUser('VOLUNTEER', { email: 'v@example.com', password: null });
    const req1 = await request(app).post('/auth/request-code').send({ email: 'v@example.com' });
    expect(req1.status).toBe(200);
    const { code } = req1.body.dev;

    const ok = await request(app).post('/auth/verify-code').send({ email: 'v@example.com', code });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe('VOLUNTEER');

    const reuse = await request(app).post('/auth/verify-code').send({ email: 'v@example.com', code });
    expect(reuse.status).toBe(401);
  });

  it('signs in with the magic-link token', async () => {
    await createUser('VOLUNTEER', { email: 'v@example.com', password: null });
    const { body } = await request(app).post('/auth/request-code').send({ email: 'v@example.com' });
    const res = await request(app).post('/auth/verify-code').send({ token: body.dev.token });
    expect(res.status).toBe(200);
  });

  it('does not reveal whether an email exists', async () => {
    const res = await request(app).post('/auth/request-code').send({ email: 'ghost@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('locks the code after 5 wrong attempts', async () => {
    await createUser('VOLUNTEER', { email: 'v@example.com', password: null });
    const { body } = await request(app).post('/auth/request-code').send({ email: 'v@example.com' });
    const wrong = body.dev.code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/verify-code').send({ email: 'v@example.com', code: wrong });
    }
    const right = await request(app).post('/auth/verify-code').send({ email: 'v@example.com', code: body.dev.code });
    expect(right.status).toBe(401);
  });

  it('rejects expired codes', async () => {
    await createUser('VOLUNTEER', { email: 'v@example.com', password: null });
    const { body } = await request(app).post('/auth/request-code').send({ email: 'v@example.com' });
    await prisma.loginCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).post('/auth/verify-code').send({ email: 'v@example.com', code: body.dev.code });
    expect(res.status).toBe(401);
  });

  it('a new code invalidates the previous one', async () => {
    await createUser('VOLUNTEER', { email: 'v@example.com', password: null });
    const first = await request(app).post('/auth/request-code').send({ email: 'v@example.com' });
    await request(app).post('/auth/request-code').send({ email: 'v@example.com' });
    const res = await request(app).post('/auth/verify-code').send({ token: first.body.dev.token });
    expect(res.status).toBe(401);
  });

  it('activates invited users on first sign-in', async () => {
    const user = await createUser('VOLUNTEER', { email: 'v@example.com', password: null, status: 'INVITED' });
    const { body } = await request(app).post('/auth/request-code').send({ email: 'v@example.com' });
    await request(app).post('/auth/verify-code').send({ token: body.dev.token });
    const after = await prisma.membership.findUniqueOrThrow({ where: { id: user.membershipId! } });
    expect(after.status).toBe('ACTIVE');
  });
});

describe('/auth/me', () => {
  it('rejects missing and forged tokens', async () => {
    expect((await request(app).get('/auth/me')).status).toBe(401);
    expect((await request(app).get('/auth/me').set('Authorization', 'Bearer not.a.jwt')).status).toBe(401);
  });
});
