import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await requireAuth();
    const members = await prisma.familyMember.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { name, relationship, dateOfBirth } = await req.json();

    if (!name?.trim() || !relationship?.trim()) {
      return NextResponse.json({ error: 'Name and relationship are required' }, { status: 400 });
    }

    const member = await prisma.familyMember.create({
      data: {
        name: name.trim(),
        relationship: relationship.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        userId: user.id,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
