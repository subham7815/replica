import { ROLE_LABELS, type Role } from '@newreplica/shared';
import { env } from '../env';
import { sendMail } from './mailer';

export async function sendInviteEmail(to: { email: string; name: string }, organizationName: string, role: Role) {
  const article = role === 'ORG_ADMIN' || role === 'AUDITOR' ? 'an' : 'a';
  await sendMail({
    to: to.email,
    subject: `You've been added to ${organizationName} on DexServe`,
    text: `Hi ${to.name},\n\n${organizationName} has added you to DexServe as ${article} ${ROLE_LABELS[role].toLowerCase()}.\n\nSign in with your email address. We'll send you a one-time code, no password needed:\n${env.WEB_APP_URL}/login\n`,
  });
}
