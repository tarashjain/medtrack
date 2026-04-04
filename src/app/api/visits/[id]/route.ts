import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getVisitById, getVisitWithFiles, updateVisit, deleteVisit } from '@/lib/db';
import { getPresignedViewUrl, deleteStorageFile } from '@/lib/storage';

// Helper: enrich file records with presigned view URLs
async function enrichFiles<T extends { storageKey: string }>(files: T[]) {
  return Promise.all(
    files.map(async (f) => ({
      ...f,
      viewUrl: await getPresignedViewUrl(f.storageKey),
    }))
  );
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const visit = await getVisitWithFiles(id);

    if (!visit || visit.userId !== user.id) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Add presigned URLs so frontend can view/download files
    const prescriptions = await enrichFiles(visit.prescriptions);
    const reports = await enrichFiles(visit.reports);

    return NextResponse.json({
      visit: {
        id: visit.id,
        visitDate: visit.visitDate.toISOString(),
        doctorName: visit.doctorName,
        hospital: visit.hospital,
        reason: visit.reason,
        notes: visit.notes,
        tags: visit.tags || [],
        followUpDate: visit.followUpDate ? visit.followUpDate.toISOString() : null,
        followUpNote: visit.followUpNote || '',
        memberId: visit.memberId || null,
        memberName: (visit as any).member?.name || null,
        createdAt: visit.createdAt.toISOString(),
        updatedAt: visit.updatedAt.toISOString(),
      },
      prescriptions,
      reports,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const visit = await getVisitById(id);

    if (!visit || visit.userId !== user.id) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const body = await req.json();

    // updateVisit internally sanitizes to only allowed fields
    const updated = await updateVisit(id, body);
    return NextResponse.json({ visit: updated });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const visit = await getVisitWithFiles(id);

    if (!visit || visit.userId !== user.id) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Delete all files from S3 before removing DB records
    const allKeys = [
      ...visit.prescriptions.map((f: { storageKey: string }) => f.storageKey),
      ...visit.reports.map((f: { storageKey: string }) => f.storageKey),
    ];
    await Promise.allSettled(allKeys.map((key) => deleteStorageFile(key)));

    // Cascade delete in DB
    await deleteVisit(id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}