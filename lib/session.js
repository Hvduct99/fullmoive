
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.SESSION_SECRET || 'changethissecret12345';
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(userId, role) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);

  cookies().set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function updateSession() {
  const session = cookies().get('session')?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    
    // Refresh if needed, for now just verifying
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const session = cookies().get('session')?.value;
  if (!session) return null;
  
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export function deleteSession() {
  cookies().delete('session');
}
