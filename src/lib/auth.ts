import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { findUserById } from './db';

// ── Session shape ────────────────────────────────────────────

export interface SessionData {
  userId?: string;
}

// ── Config ───────────────────────────────────────────────────

const SESSION_OPTIONS = {
  password: process.env.AUTH_SECRET!,
  cookieName: 'medtrack_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

// ── Session helpers ──────────────────────────────────────────

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function setSession(userId: string): Promise<void> {
  const session = await getSession();
  session.userId = userId;
  await session.save();
}

export async function clearSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

// ── Auth helpers ─────────────────────────────────────────────

export async function getSessionUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId || null;
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await findUserById(userId);
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
