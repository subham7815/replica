import { ROLE_PERMISSIONS, ROLES, type Permission } from '@newreplica/shared';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { errorHandler } from '../src/lib/http';
import { signAccessToken } from '../src/lib/tokens';
import { orgId, requireAuth, requireOrg, requirePermission } from '../src/middleware/auth';
import { createUser, resetDb } from './helpers';

// A probe app exercising the same middleware real routes use.
const app = express();
app.get('/probe/:permission', requireAuth, (req, res, next) =>
  requirePermission(req.params.permission as Permission)(req, res, next), (_req, res) => {
  res.json({ ok: true });
});
app.get('/org-scoped', requireAuth, requireOrg, (req, res) => {
  res.json({ organizationId: orgId(req) });
});
app.use(errorHandler);

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('role permissions are enforced by the API', () => {
  for (const role of ROLES) {
    it(`${role} gets exactly its permissions`, async () => {
      const user = await createUser(role);
      const token = await signAccessToken(user.id);
      const granted = new Set(ROLE_PERMISSIONS[role]);
      const all: Permission[] = [
        'tenants:manage', 'org:manage', 'programmes:manage', 'volunteers:manage', 'shifts:manage',
        'attendance:manage', 'attendance:checkin', 'communications:send', 'reports:view', 'audit:view', 'self:manage',
      ];
      for (const permission of all) {
        const res = await request(app).get(`/probe/${permission}`).set('Authorization', `Bearer ${token}`);
        expect(res.status, `${role} → ${permission}`).toBe(granted.has(permission) ? 200 : 403);
      }
    });
  }
});

describe('organisation scoping', () => {
  it('scopes members to their own organisation', async () => {
    const user = await createUser('COORDINATOR');
    const res = await request(app).get('/org-scoped').set('Authorization', `Bearer ${await signAccessToken(user.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.organizationId).toBe(user.organizationId);
  });

  it('gives platform super-admins no default access to tenant data', async () => {
    const admin = await createUser('PLATFORM_SUPER_ADMIN');
    const res = await request(app).get('/org-scoped').set('Authorization', `Bearer ${await signAccessToken(admin.id)}`);
    expect(res.status).toBe(403);
  });
});
