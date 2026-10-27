import {
  loginInput,
  registerOrganizationInput,
  requestCodeInput,
  verifyCodeInput,
  type AuthResponse,
  type RequestCodeResponse,
} from '@newreplica/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../db';
import { env } from '../env';
import { HttpError } from '../lib/http';
import { sendMail } from '../lib/mailer';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../lib/password';
import { isUniqueViolation } from '../lib/prisma-errors';
import { toPublicUser } from '../lib/serialize';
import { hashSecret, newLoginSecrets, signAccessToken } from '../lib/tokens';
import { loadUser, requireAuth, resolveAuth, usableMemberships, type UserWithMemberships } from '../middleware/auth';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

function canSignIn(user: UserWithMemberships) {
  return !user.disabled && (user.isPlatformAdmin || usableMemberships(user).length > 0);
}

async function issueSession(user: UserWithMemberships): Promise<AuthResponse> {
  const auth = resolveAuth(user);
  if (!auth) throw new HttpError(403, 'This account has been suspended');
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { token: await signAccessToken(user.id), user: toPublicUser(auth) };
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'org'
  );
}

async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await prisma.organization.findUnique({ where: { slug } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export const authRouter = Router();

authRouter.post('/register-organization', authLimiter, async (req, res) => {
  const input = registerOrganizationInput.parse(req.body);
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        memberships: {
          create: {
            role: 'ORG_ADMIN',
            organization: { create: { name: input.organizationName, slug: await uniqueSlug(input.organizationName) } },
          },
        },
      },
    });
    res.status(201).json(await issueSession((await loadUser({ id: user.id }))!));
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'An account with this email already exists');
    throw err;
  }
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = loginInput.parse(req.body);
  const user = await loadUser({ email });
  if (!user?.passwordHash) {
    await burnPasswordCheck(password);
    throw new HttpError(401, 'Invalid email or password');
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password');
  if (!canSignIn(user)) throw new HttpError(403, 'This account has been suspended');
  res.json(await issueSession(user));
});

authRouter.post('/request-code', authLimiter, async (req, res) => {
  const { email } = requestCodeInput.parse(req.body);
  const user = await loadUser({ email });
  const response: RequestCodeResponse = { ok: true };

  // Same response whether or not the account exists, so this can't be used to discover emails.
  if (user && canSignIn(user)) {
    const { token, code } = newLoginSecrets();
    await prisma.$transaction([
      prisma.loginCode.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.loginCode.create({
        data: {
          userId: user.id,
          tokenHash: hashSecret(token),
          codeHash: hashSecret(code),
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      }),
    ]);
    const link = `${env.WEB_APP_URL}/auth/verify?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: user.email,
      subject: `Your Replica sign-in code: ${code}`,
      text: `Hi ${user.name},\n\nYour sign-in code is ${code}. It expires in 15 minutes.\n\nOr sign in on the web with this link:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
    if (env.AUTH_DEV_EXPOSE_CODES) response.dev = { code, token };
  }
  res.json(response);
});

authRouter.post('/verify-code', authLimiter, async (req, res) => {
  const input = verifyCodeInput.parse(req.body);
  const invalid = new HttpError(401, 'That code is invalid or has expired');

  let loginCode;
  if ('token' in input) {
    loginCode = await prisma.loginCode.findUnique({ where: { tokenHash: hashSecret(input.token) } });
  } else {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw invalid;
    loginCode = await prisma.loginCode.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (loginCode && loginCode.codeHash !== hashSecret(input.code)) {
      const attempts = loginCode.attempts + 1;
      await prisma.loginCode.update({
        where: { id: loginCode.id },
        data: { attempts, ...(attempts >= MAX_CODE_ATTEMPTS ? { usedAt: new Date() } : {}) },
      });
      throw invalid;
    }
  }

  if (!loginCode || loginCode.usedAt || loginCode.expiresAt < new Date()) throw invalid;

  // Conditional update makes the code single-use even under concurrent requests.
  const consumed = await prisma.loginCode.updateMany({
    where: { id: loginCode.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) throw invalid;

  await prisma.membership.updateMany({
    where: { userId: loginCode.userId, status: 'INVITED' },
    data: { status: 'ACTIVE' },
  });
  const user = await loadUser({ id: loginCode.userId });
  if (!user || !canSignIn(user)) throw invalid;
  res.json(await issueSession(user));
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.auth!) });
});
