import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getVisitById, findAnyFileById, deleteAnyFile } from '@/lib/db';
import { deleteStorageFile } from '@/lib/storage';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const user = await requireAuth();
    const visit = await getVisitById(params.id);

    if (!visit || visit.userId !== user.id) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const file = await findAnyFileById(params.fileId);
    if (!file || file.visitId !== params.id) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from S3 first
    try {
      await deleteStorageFile(file.storageKey);
    } catch (err) {
      console.error('S3 delete error (continuing with DB delete):', err);
    }

    // Delete DB record
    await deleteAnyFile(params.fileId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
