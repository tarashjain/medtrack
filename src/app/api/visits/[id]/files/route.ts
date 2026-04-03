import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getVisitById, createPrescription, createReport } from '@/lib/db';
import { uploadFile } from '@/lib/storage';

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const visit = await getVisitById(id);

    if (!visit || visit.userId !== user.id) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!category || !['prescription', 'report'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category. Must be "prescription" or "report".' }, { status: 400 });
    }

    // uploadFile validates MIME, size, and magic bytes, then uploads to S3
    const { storageKey, fileSize } = await uploadFile(
      file,
      category as 'prescription' | 'report',
      id
    );

    // Save metadata to database
    const data = {
      originalName: file.name,
      storageKey,
      fileType: file.type,
      fileSize,
      visitId: id,
    };

    const record =
      category === 'prescription'
        ? await createPrescription(data)
        : await createReport(data);

    return NextResponse.json({ file: record }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    // Known validation errors from storage.ts
    if (
      message.includes('not allowed') ||
      message.includes('does not match') ||
      message.includes('10MB')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}