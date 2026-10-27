export interface Mail {
  to: string;
  subject: string;
  text: string;
}

// Console transport until the communications module (Phase 1, step 6) adds a real provider.
export async function sendMail(mail: Mail) {
  if (process.env.NODE_ENV === 'test') return;
  console.log(`\n--- email to ${mail.to} ---\nSubject: ${mail.subject}\n\n${mail.text}\n---\n`);
}
