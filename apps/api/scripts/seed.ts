import 'dotenv/config';
import { ROLES, type Role } from '@newreplica/shared';
import { prisma } from '../src/db';
import { hashPassword } from '../src/lib/password';

const DEMO_PASSWORD = 'Password123!';

const DEMO_USERS: Record<Role, { email: string; name: string }> = {
  PLATFORM_SUPER_ADMIN: { email: 'superadmin@demo.test', name: 'Sam Super' },
  ORG_ADMIN: { email: 'admin@demo.test', name: 'Alex Admin' },
  COORDINATOR: { email: 'coordinator@demo.test', name: 'Casey Coordinator' },
  VOLUNTEER: { email: 'volunteer@demo.test', name: 'Val Volunteer' },
  CHECKIN_OPERATOR: { email: 'checkin@demo.test', name: 'Chris Checkin' },
  AUDITOR: { email: 'auditor@demo.test', name: 'Avery Auditor' },
};

const SAMPLE_VOLUNTEERS = [
  { name: 'Priya Shah', email: 'priya@demo.test', phone: '07700 900123', skills: ['First aid', 'Driving'], depts: ['Warehouse'] },
  { name: 'Tom Mitchell', email: 'tom@demo.test', phone: '07700 900456', skills: ['Lifting'], depts: ['Warehouse', 'Deliveries'] },
  { name: 'Ana Kowalski', email: 'ana@demo.test', phone: null, skills: ['Polish speaker'], depts: ['Front desk'] },
  { name: 'Jordan Okafor', email: 'jordan@demo.test', phone: '07700 900789', skills: ['Driving'], depts: ['Deliveries'] },
];

const org = await prisma.organization.upsert({
  where: { slug: 'demo-food-bank' },
  update: {},
  create: {
    name: 'Demo Food Bank',
    slug: 'demo-food-bank',
    contactEmail: 'hello@demo.test',
    description: 'Community food bank running weekly sorting and distribution sessions.',
  },
});

for (const [name, address] of [
  ['Main hall', '12 Riverside Road'],
  ['Warehouse', 'Unit 4, Mill Lane'],
] as const) {
  await prisma.location.upsert({
    where: { organizationId_name: { organizationId: org.id, name } },
    update: {},
    create: { organizationId: org.id, name, address },
  });
}

const depts = new Map<string, string>();
for (const name of ['Warehouse', 'Front desk', 'Deliveries']) {
  const d = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: org.id, name } },
    update: {},
    create: { organizationId: org.id, name },
  });
  depts.set(name, d.id);
}

const passwordHash = await hashPassword(DEMO_PASSWORD);

for (const role of ROLES) {
  const { email, name } = DEMO_USERS[role];
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash, isPlatformAdmin: role === 'PLATFORM_SUPER_ADMIN' },
  });
  if (role !== 'PLATFORM_SUPER_ADMIN') {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: {},
      create: { userId: user.id, organizationId: org.id, role },
    });
  }
}

for (const v of SAMPLE_VOLUNTEERS) {
  const user = await prisma.user.upsert({ where: { email: v.email }, update: {}, create: { email: v.email, name: v.name } });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'VOLUNTEER',
      status: 'INVITED',
      phone: v.phone,
      skills: v.skills,
      availability: { sat: ['morning'], tue: ['evening'] },
      departments: { connect: v.depts.map((d) => ({ id: depts.get(d)! })) },
    },
  });
}

console.log(`Seeded "${org.name}" with one user per role. Password for all: ${DEMO_PASSWORD}`);
for (const role of ROLES) console.log(`  ${role.padEnd(22)} ${DEMO_USERS[role].email}`);

await prisma.$disconnect();
