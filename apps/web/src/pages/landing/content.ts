import type { IconName } from '../../components/icons';

export const NAV_LINKS = [
  { to: '/discover', label: 'Find opportunities' },
  { to: '/volunteers', label: 'For volunteers' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
] as const;

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Replica: volunteer rotas, reminders and check-ins',
  '/volunteers': 'For volunteers · Replica',
  '/how-it-works': 'How it works · Replica',
  '/features': 'Features · Replica',
  '/pricing': 'Pricing · Replica',
  '/faq': 'FAQ · Replica',
  '/discover': 'Find volunteer opportunities · Replica',
};

export const HERO = {
  title: 'Stop chasing volunteers in group chats',
  lines: [
    'Replica sends the reminders.',
    'Fills the gap from the waitlist when someone drops out.',
    'Logs hours with a QR scan at the door.',
    'You just show up.',
  ],
  cta: 'Create your first rota, free',
};

export const PAIN_POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'calendar',
    title: 'See the gaps days ahead, not on the morning',
    body: 'Every shift shows who is coming and how many spots are left, so a short-staffed Saturday is obvious on Tuesday.',
  },
  {
    icon: 'bell',
    title: 'Volunteers are reminded before every shift',
    body: 'Confirmation when they sign up, a reminder before they’re due. No more “I forgot it was this week”.',
  },
  {
    icon: 'refresh',
    title: 'The waitlist fills the seat, not you',
    body: 'When someone drops out, the next person on the waitlist is offered the spot automatically.',
  },
  {
    icon: 'grid',
    title: 'One rota, not seven spreadsheets',
    body: 'Programmes, shifts, sign-ups and hours live in one place your whole team can see.',
  },
];

export const COORDINATOR_FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'users', title: 'Attendance at a glance', body: 'See who is confirmed, waitlisted or missing for every shift.' },
  { icon: 'clock', title: 'Hours logged for you', body: 'Check-ins record hours automatically. Export them as CSV any time.' },
  { icon: 'edit', title: 'Edit future shifts', body: 'Change times, capacity or roles without rebuilding the rota.' },
  { icon: 'mail', title: 'Email your volunteers', body: 'Send updates to everyone, a programme, or a single shift.' },
  { icon: 'target', title: 'Fill gaps on purpose', body: 'Invite people who are free and haven’t volunteered recently.' },
  { icon: 'alert', title: 'Low-staffing alerts', body: 'Get warned when a shift is still short as it gets close.' },
  { icon: 'ban', title: 'Cancel a single date', body: 'Bank holiday? Cancel one session and everyone is told.' },
  { icon: 'userPlus', title: 'Invite in bulk', body: 'Share one link or import a CSV to bring your whole team in.' },
  { icon: 'lock', title: 'Invite-only rotas', body: 'Keep sensitive roles private to approved volunteers.' },
  { icon: 'check', title: 'Approve new joiners', body: 'Review applications before anyone can book a shift.' },
  { icon: 'chart', title: 'Reliability reports', body: 'Spot no-show patterns and thank your most reliable people.' },
  { icon: 'note', title: 'Notes on every shift', body: 'Leave parking info, door codes or kit lists where people will see them.' },
];

export const VOLUNTEER_FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'phone',
    title: 'One-tap sign-up',
    body: 'Pick a shift from your phone or browser. No password: we send a one-time code to your email.',
  },
  {
    icon: 'bell',
    title: 'Never miss a shift',
    body: 'A reminder lands before every shift, and your upcoming shifts are always in one list.',
  },
  {
    icon: 'refresh',
    title: 'Life happens',
    body: 'Can’t make it? Drop the shift in one tap. Your coordinator is told and the waitlist takes over.',
  },
];

export const STEPS = [
  { title: 'Create your rota', body: 'Add a one-off event or a recurring programme with roles and how many people you need.' },
  { title: 'Invite volunteers', body: 'Share a link or import your list. Volunteers pick the shifts that suit them.' },
  { title: 'Let it run', body: 'Reminders go out, drop-outs refill from the waitlist and check-ins log the hours.' },
];

export const BEFORE = [
  'Dozens of messages to fill one shift',
  'People forget they said yes',
  'Last-minute panic when someone drops out',
  'Hours tracked in a messy spreadsheet',
];

export const AFTER = [
  'Shifts filled days in advance',
  'Automatic reminders before every shift',
  'Drop-outs refilled from the waitlist',
  'One clear rota, with hours logged at the door',
];

export const CATEGORIES = [
  'Food banks',
  'Schools & PTAs',
  'Sports clubs',
  'Faith communities',
  'Mutual aid groups',
  'Community events',
  'Animal shelters',
  'Charity shops',
];

export const EXAMPLE_ROTAS = [
  { title: 'Food bank sorting', body: 'Sort donations and pack parcels before opening.', people: 6, cadence: 'Weekly' },
  { title: 'Match-day stewards', body: 'Gates, car park and first-aid cover for home games.', people: 10, cadence: 'Fortnightly' },
  { title: 'Community transport', body: 'Drivers for hospital and shopping runs.', people: 3, cadence: 'Weekly' },
  { title: 'Weekend services', body: 'Welcome team, refreshments and set-up.', people: 5, cadence: 'Weekly' },
];

export const TRUST_BADGES: { icon: IconName; label: string }[] = [
  { icon: 'phone', label: 'iOS, Android & web' },
  { icon: 'card', label: 'No credit card' },
  { icon: 'shield', label: 'Privacy first' },
  { icon: 'download', label: 'Export your data any time' },
];

export type FaqGroup = 'general' | 'volunteers' | 'coordinators' | 'privacy';
export type FaqPage = 'home' | 'pricing' | 'volunteers';

export interface FaqItem {
  q: string;
  a: string;
  group: FaqGroup;
  // Other pages that show this question besides /faq.
  pages?: FaqPage[];
}

export const FAQ_GROUPS: { key: FaqGroup; title: string }[] = [
  { key: 'general', title: 'General' },
  { key: 'volunteers', title: 'For volunteers' },
  { key: 'coordinators', title: 'For coordinators' },
  { key: 'privacy', title: 'Data & privacy' },
];

export const FAQS: FaqItem[] = [
  {
    group: 'general',
    pages: ['home', 'pricing'],
    q: 'Is Replica free?',
    a: 'Yes. Replica is free while it’s in beta, and you don’t need a credit card to start.',
  },
  {
    group: 'general',
    pages: ['pricing'],
    q: 'Do I need a credit card to sign up?',
    a: 'No. Create your organisation with just your name, email and a password.',
  },
  {
    group: 'general',
    pages: ['pricing'],
    q: 'What happens after the beta?',
    a: 'Pricing after the beta hasn’t been set yet. Beta organisations will hear about it first, well before anything changes.',
  },
  {
    group: 'general',
    pages: ['home'],
    q: 'Can I use it for one-off events?',
    a: 'Yes. Create a single event, or a recurring programme that repeats weekly, fortnightly or monthly.',
  },
  {
    group: 'general',
    q: 'Does it work on phones?',
    a: 'Yes. Replica works in any modern browser on phone, tablet or computer. Native iOS and Android apps are coming soon to the App Store and Google Play.',
  },
  {
    group: 'general',
    q: 'What kind of groups is Replica for?',
    a: 'Any team that runs a volunteer rota: food banks, schools and PTAs, sports clubs, faith communities, mutual aid groups, shelters and community events.',
  },
  {
    group: 'volunteers',
    pages: ['home', 'volunteers'],
    q: 'Do volunteers need a password?',
    a: 'No. Volunteers sign in with a one-time code sent to their email, on the web or in the iOS and Android apps.',
  },
  {
    group: 'volunteers',
    pages: ['pricing', 'volunteers'],
    q: 'Do volunteers have to pay?',
    a: 'No. Replica is free for everyone during the beta, volunteers included.',
  },
  {
    group: 'volunteers',
    pages: ['home', 'volunteers'],
    q: 'What happens if a volunteer can’t make it?',
    a: 'They drop the shift in one tap. The next person on the waitlist is offered the spot automatically, and the coordinator gets an alert if a shift is still short as it gets close.',
  },
  {
    group: 'volunteers',
    pages: ['home', 'volunteers'],
    q: 'How do reminders work?',
    a: 'Volunteers get an email confirmation when they sign up and a reminder before each shift. Text and push notifications are on the roadmap.',
  },
  {
    group: 'volunteers',
    pages: ['volunteers'],
    q: 'How do I check in to a shift?',
    a: 'Scan the QR code at the venue, or your coordinator checks you in. Your hours are logged automatically.',
  },
  {
    group: 'coordinators',
    pages: ['home'],
    q: 'Can I export volunteer hours?',
    a: 'Yes. Check-ins are recorded with a QR scan or manually, and you can export hours and attendance as a CSV file.',
  },
  {
    group: 'coordinators',
    q: 'Can I import my existing volunteer list?',
    a: 'Yes. Upload a CSV of names and emails and Replica invites everyone for you.',
  },
  {
    group: 'coordinators',
    q: 'Can other people help me run the rota?',
    a: 'Yes. Add coordinators, check-in operators and read-only auditors. Each role only sees what it needs.',
  },
  {
    group: 'coordinators',
    q: 'Can I approve volunteers before they book?',
    a: 'Yes. New applications wait for your review, and rotas can be invite-only for roles that need vetting.',
  },
  {
    group: 'privacy',
    q: 'Who can see volunteer details?',
    a: 'Only people in your organisation whose role allows it. Access is checked on the server for every request, and platform staff can’t view your organisation’s records by default.',
  },
  {
    group: 'privacy',
    pages: ['pricing'],
    q: 'Can I export my data?',
    a: 'Yes. Export volunteers, shifts, attendance and hours as CSV files whenever you like.',
  },
];

export function faqsFor(page: FaqPage) {
  return FAQS.filter((f) => f.pages?.includes(page));
}

export const PAGE_HEROES = {
  volunteers: {
    eyebrow: 'For volunteers',
    title: 'Volunteering that fits around your life',
    sub: 'Pick shifts in a tap, get reminded before you’re due, and drop out without awkward messages when plans change.',
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'From group-chat chaos to a rota that runs itself',
    sub: 'Set it up once. Replica handles the reminders, the drop-outs and the hours.',
  },
  features: {
    eyebrow: 'Features',
    title: 'Everything you need to run a volunteer rota',
    sub: 'Built for coordinators who are tired of chasing, and volunteers who just want to help.',
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Free while we’re in beta',
    sub: 'Every feature, for every organisation, at no cost during the beta.',
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions, answered',
    sub: 'Everything you might want to know about running your rota on Replica.',
  },
};

export const VOLUNTEER_STEPS = [
  { title: 'Open your invite link', body: 'Your coordinator shares a link, or you find their opportunities on Replica.' },
  { title: 'Sign in with an email code', body: 'Enter your email and type the 6-digit code we send. No password to remember.' },
  { title: 'Pick your shifts', body: 'Choose the dates that suit you. If a shift is full, join the waitlist.' },
  { title: 'Check in at the door', body: 'Scan the QR code when you arrive and your hours are logged for you.' },
];

export const WALKTHROUGH = [
  { title: 'Set up your organisation', body: 'Add your locations, departments and the people who help you run things.' },
  { title: 'Create programmes and shifts', body: 'One-off events or repeating rotas, with roles and the number of people each needs.' },
  { title: 'Invite volunteers', body: 'Share a link or import a CSV. Approve new joiners if a role needs vetting.' },
  { title: 'Reminders go out automatically', body: 'Volunteers get a confirmation when they book and a reminder before every shift.' },
  { title: 'Drop-outs refill from the waitlist', body: 'When someone cancels, the next person waiting is offered the spot, and you’re alerted if a shift is still short.' },
  { title: 'Check in at the door', body: 'Volunteers scan a QR code or your check-in team marks them in. Corrections are tracked.' },
  { title: 'Report and export', body: 'See coverage, attendance and hours on the dashboard, and export it all as CSV.' },
];

export const ROADMAP: { icon: IconName; title: string; body: string }[] = [
  { icon: 'target', title: 'Smart matching & auto-rota', body: 'Suggest volunteers by skills and availability, prevent double-booking, and share shifts fairly.' },
  { icon: 'message', title: 'Text & push reminders', body: 'Reach volunteers by SMS and app notifications, with delivery status.' },
  { icon: 'shield', title: 'Waivers & compliance', body: 'Collect documents and waiver signatures, and track expiry and screening status.' },
  { icon: 'check', title: 'Recognition & milestones', body: 'Certificates, milestones and feedback that thank your regulars.' },
  { icon: 'chart', title: 'Deeper analytics', body: 'No-show, utilisation and retention trends across programmes.' },
];

export const BETA_PLAN = {
  name: 'Beta',
  price: '£0',
  period: 'during beta',
  blurb: 'Everything included, for organisations of any size.',
  includes: [
    'Unlimited volunteers and rotas',
    'One-off events and recurring programmes',
    'Waitlists that refill drop-outs',
    'Email confirmations and reminders',
    'QR and manual check-in with logged hours',
    'Dashboards and CSV export',
    'Roles for coordinators, check-in staff and auditors',
    'Web, iOS and Android',
  ],
  note: 'Pricing after the beta hasn’t been set yet. Beta organisations will hear about it first, well before anything changes.',
};
