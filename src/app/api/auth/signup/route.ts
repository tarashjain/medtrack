import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { findUserByEmail, createUser } from '@/lib/db';
import { setSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existing = await findUserByEmail(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const hashed = await bcryptjs.hash(password, 12);
    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
    });

    await setSession(user.id);

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}