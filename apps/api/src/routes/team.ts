import { STAFF_ROLES, inviteStaffInput, updateStaffInput } from '@newreplica/shared';
import { Router } from 'express';
import { prisma } from '../db';
import { HttpError } from '../lib/http';
import { sendInviteEmail } from '../lib/invites';
import { assertNotLastAdmin, cleanupOrphanUser, userForNewMembership } from '../lib/members';
import { releaseFuturePlaces } from '../lib/schedule';
import { toTeamMember } from '../lib/serialize';
import { orgId, requireAuth, requireOrg, requirePermission } from '../middleware/auth';

export const teamRouter = Router();
teamRouter.use(requireAuth, requireOrg, requirePermission('org:manage'));

const staffWhere = (organizationId: string) => ({ organizationId, role: { in: [...STAFF_ROLES] } });

async function findStaff(organizationId: string, id: string) {
  const m = await prisma.membership.findFirst({ where: { id, ...staffWhere(organizationId) }, include: { user: true } });
  if (!m) throw new HttpError(404, 'Team member not found');
  return m;
}

teamRouter.get('/', async (req, res) => {
  const items = await prisma.membership.findMany({
    where: staffWhere(orgId(req)),
    include: { user: true },
    orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
  });
  res.json(items.map((m) => toTeamMember(m, req.auth!.user.id)));
});

teamRouter.post('/', async (req, res) => {
  const input = inviteStaffInput.parse(req.body);
  const organizationId = orgId(req);
  const user = await userForNewMembership(organizationId, input.email, input.name);
  const m = await prisma.membership.create({
    data: { userId: user.id, organizationId, role: input.role, status: 'INVITED' },
    include: { user: true },
  });
  await sendInviteEmail(user, req.auth!.membership!.organization.name, input.role);
  res.status(201).json(toTeamMember(m, req.auth!.user.id));
});

teamRouter.patch('/:id', async (req, res) => {
  const input = updateStaffInput.parse(req.body);
  const organizationId = orgId(req);
  const target = await findStaff(organizationId, req.params.id as string);
  if (target.userId === req.auth!.user.id) throw new HttpError(409, 'You can’t change your own role or status');
  await assertNotLastAdmin(organizationId, target.id, input);
  const m = await prisma.membership.update({ where: { id: target.id }, data: input, include: { user: true } });
  res.json(toTeamMember(m, req.auth!.user.id));
});

teamRouter.delete('/:id', async (req, res) => {
  const organizationId = orgId(req);
  const target = await findStaff(organizationId, req.params.id as string);
  if (target.userId === req.auth!.user.id) throw new HttpError(409, 'You can’t remove yourself');
  await assertNotLastAdmin(organizationId, target.id, 'remove');
  await releaseFuturePlaces(target.id, req.auth!.user.id, req.auth!.membership!.organization);
  await prisma.membership.delete({ where: { id: target.id } });
  await cleanupOrphanUser(target.userId);
  res.json({ ok: true });
});
