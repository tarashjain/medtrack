import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteStorageFile } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No visit IDs provided' }, { status: 400 });
    }

    // Verify all visits belong to this user
    const visits = await prisma.visit.findMany({
      where: { id: { in: ids }, userId: user.id },
      include: { prescriptions: true, reports: true },
    });

    if (visits.length !== ids.length) {
      return NextResponse.json({ error: 'Some visits not found' }, { status: 404 });
    }

    // Delete all files from R2
    const allKeys = visits.flatMap(v => [
      ...v.prescriptions.map(f => f.storageKey),
      ...v.reports.map(f => f.storageKey),
    ]);
    await Promise.allSettled(allKeys.map(key => deleteStorageFile(key)));

    // Delete all visits (cascade deletes files in DB)
    await prisma.visit.deleteMany({ where: { id: { in: ids }, userId: user.id } });

    return NextResponse.json({ deleted: visits.length });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
