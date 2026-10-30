import 'dotenv/config';
import { ROLES, addDays, todayIn, zonedParts, zonedToUtc, type Role } from '@newreplica/shared';
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

const hall = await prisma.location.findFirstOrThrow({ where: { organizationId: org.id, name: 'Main hall' } });
const SAMPLE_OPPORTUNITIES = [
  {
    title: 'Saturday food sorting',
    summary: 'Sort donations and pack food parcels before we open to the public.',
    description: 'Join a friendly team every Saturday morning. No experience needed: we will show you everything on your first shift. Comfortable shoes recommended.',
    commitment: 'Saturdays 9:00–12:00, weekly',
    dept: 'Warehouse',
    signupMode: 'OPEN' as const,
    questions: [{ id: 'q_lift', label: 'Are you comfortable lifting boxes up to 10 kg?', type: 'yesno', required: true }],
  },
  {
    title: 'Delivery driver',
    summary: 'Deliver food parcels to people who can’t get to the food bank.',
    description: 'Use your own car to deliver 6–10 parcels around town. Mileage is reimbursed.',
    commitment: 'Tuesdays or Thursdays, 2–3 hours',
    dept: 'Deliveries',
    signupMode: 'APPROVAL' as const,
    questions: [
      { id: 'q_licence', label: 'Do you hold a full UK driving licence?', type: 'yesno', required: true },
      { id: 'q_day', label: 'Which day suits you best?', type: 'select', required: true, options: ['Tuesday', 'Thursday', 'Either'] },
      { id: 'q_why', label: 'Tell us a little about yourself', type: 'textarea', required: false },
    ],
  },
];

for (const o of SAMPLE_OPPORTUNITIES) {
  const existing = await prisma.opportunity.findFirst({ where: { organizationId: org.id, title: o.title } });
  if (existing) continue;
  await prisma.opportunity.create({
    data: {
      organizationId: org.id,
      title: o.title,
      summary: o.summary,
      description: o.description,
      commitment: o.commitment,
      locationId: hall.id,
      departmentId: depts.get(o.dept)!,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      signupMode: o.signupMode,
      questions: o.questions,
    },
  });
}

const driving = await prisma.opportunity.findFirstOrThrow({ where: { organizationId: org.id, title: 'Delivery driver' } });
for (const a of [
  { name: 'Sam Patel', email: 'sam.applicant@demo.test', answers: { q_licence: true, q_day: 'Tuesday', q_why: 'Retired and have a free car most weekdays.' } },
  { name: 'Leah Brooks', email: 'leah.applicant@demo.test', answers: { q_licence: true, q_day: 'Either' } },
]) {
  const user = await prisma.user.upsert({ where: { email: a.email }, update: {}, create: { email: a.email, name: a.name } });
  await prisma.application.upsert({
    where: { opportunityId_userId: { opportunityId: driving.id, userId: user.id } },
    update: {},
    create: { opportunityId: driving.id, organizationId: org.id, userId: user.id, answers: a.answers },
  });
}

// Events and shifts: next Saturday's sorting session (one shift full with a waitlist) and a weekday delivery round.
const today = todayIn(org.timezone);
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const daysUntil = (day: string) => {
  const from = DAYS.indexOf(zonedParts(new Date(), org.timezone).weekday);
  return ((DAYS.indexOf(day) - from + 7) % 7) || 7;
};
const saturday = addDays(today, daysUntil('sat'));
const tuesday = addDays(today, daysUntil('tue'));
const at = (date: string, time: string) => zonedToUtc(date, time, org.timezone);
const memberId = async (email: string) =>
  (await prisma.membership.findFirstOrThrow({ where: { organizationId: org.id, user: { email } } })).id;

const SAMPLE_EVENTS = [
  {
    title: 'Saturday food sorting',
    description: 'Weekly sorting session before the food bank opens. Wear comfortable shoes.',
    location: 'Warehouse',
    dept: 'Warehouse',
    shifts: [
      { title: 'Sorting', date: saturday, start: '09:00', end: '12:00', capacity: 4, people: ['priya@demo.test', 'tom@demo.test', 'volunteer@demo.test'] },
      { title: 'Packing', date: saturday, start: '12:30', end: '15:00', capacity: 2, people: ['ana@demo.test', 'jordan@demo.test', 'priya@demo.test'] },
    ],
  },
  {
    title: 'Tuesday delivery round',
    description: 'Deliver parcels to people who can’t get to the food bank. Mileage reimbursed.',
    location: 'Main hall',
    dept: 'Deliveries',
    shifts: [{ title: 'Driver', date: tuesday, start: '17:30', end: '19:30', capacity: 3, people: ['jordan@demo.test'] }],
  },
];

for (const e of SAMPLE_EVENTS) {
  if (await prisma.event.findFirst({ where: { organizationId: org.id, title: e.title } })) continue;
  const location = await prisma.location.findFirstOrThrow({ where: { organizationId: org.id, name: e.location } });
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      title: e.title,
      description: e.description,
      locationId: location.id,
      departmentId: depts.get(e.dept)!,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
  for (const s of e.shifts) {
    const shift = await prisma.shift.create({
      data: { eventId: event.id, organizationId: org.id, title: s.title, startsAt: at(s.date, s.start), endsAt: at(s.date, s.end), capacity: s.capacity },
    });
    for (const [i, email] of s.people.entries()) {
      await prisma.shiftAssignment.create({
        data: {
          shiftId: shift.id,
          organizationId: org.id,
          membershipId: await memberId(email),
          status: i < s.capacity ? 'CONFIRMED' : 'WAITLISTED',
          joinedAt: new Date(Date.now() + i * 1000),
        },
      });
    }
  }
}

console.log(`Seeded "${org.name}" with one user per role. Password for all: ${DEMO_PASSWORD}`);
for (const role of ROLES) console.log(`  ${role.padEnd(22)} ${DEMO_USERS[role].email}`);

await prisma.$disconnect();
