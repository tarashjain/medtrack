import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const member = await prisma.familyMember.findUnique({ where: { id } });
    if (!member || member.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { name, relationship, dateOfBirth } = await req.json();
    const updated = await prisma.familyMember.update({
      where: { id },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(relationship?.trim() && { relationship: relationship.trim() }),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    });
    return NextResponse.json({ member: updated });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const member = await prisma.familyMember.findUnique({ where: { id } });
    if (!member || member.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.familyMember.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
