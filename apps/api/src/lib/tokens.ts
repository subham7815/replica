import { createHmac, randomBytes, randomInt } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../env';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function newLoginSecrets() {
  return {
    token: randomBytes(32).toString('base64url'),
    code: randomInt(0, 1_000_000).toString().padStart(6, '0'),
  };
}

// Keyed hash: a leaked LoginCode table can't be brute-forced offline without the server secret.
export function hashSecret(value: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(value).digest('hex');
}
