import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getVisitsByUserId, createVisit } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireAuth();
    const visits = await getVisitsByUserId(user.id);

    // Map Prisma _count to the flat shape the frontend expects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched = visits.map((v: any) => ({
      id: v.id,
      visitDate: v.visitDate.toISOString(),
      doctorName: v.doctorName,
      hospital: v.hospital,
      reason: v.reason,
      notes: v.notes,
      prescriptionCount: v._count.prescriptions,
      reportCount: v._count.reports,
    }));

    return NextResponse.json({ visits: enriched });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const { visitDate, doctorName, hospital, reason, notes } = body;

    if (!visitDate || !doctorName?.trim() || !hospital?.trim() || !reason?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const visit = await createVisit({
      visitDate: new Date(visitDate),
      doctorName: doctorName.trim(),
      hospital: hospital.trim(),
      reason: reason.trim(),
      notes: (notes || '').trim(),
      userId: user.id,
    });

    return NextResponse.json({ visit }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
