import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const visitId = searchParams.get('visitId');

    let visits;

    if (visitId) {
      // Export single visit
      const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        include: {
          prescriptions: true,
          reports: true,
          member: true,
        },
      });
      if (!visit || visit.userId !== user.id) {
        return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
      }
      visits = [visit];
    } else {
      // Export all visits
      visits = await prisma.visit.findMany({
        where: { userId: user.id },
        orderBy: { visitDate: 'desc' },
        include: { prescriptions: true, reports: true, member: true },
      });
    }

    // Generate HTML for PDF
    const html = generateHTML(visits, user.name, !!visitId);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateHTML(visits: any[], userName: string, single: boolean) {
  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const visitsHTML = visits.map(v => `
    <div class="visit">
      <div class="visit-header">
        <div>
          <h2>${v.reason}</h2>
          <p class="date">${formatDate(v.visitDate)}</p>
        </div>
        ${v.member ? `<span class="member-badge">${v.member.name}</span>` : ''}
      </div>
      <div class="grid">
        <div class="field">
          <span class="label">Doctor</span>
          <span class="value">${v.doctorName}</span>
        </div>
        <div class="field">
          <span class="label">Hospital / Clinic</span>
          <span class="value">${v.hospital}</span>
        </div>
        ${v.followUpDate ? `
        <div class="field">
          <span class="label">Follow-up Date</span>
          <span class="value follow-up">${formatDate(v.followUpDate)}</span>
        </div>` : ''}
      </div>
      ${v.tags && v.tags.length > 0 ? `
      <div class="tags">
        ${v.tags.map((t: string) => `<span class="tag">${t}</span>`).join('')}
      </div>` : ''}
      ${v.notes ? `
      <div class="notes">
        <span class="label">Notes</span>
        <p>${v.notes.replace(/\n/g, '<br/>')}</p>
      </div>` : ''}
      ${v.followUpNote ? `
      <div class="notes">
        <span class="label">Follow-up Note</span>
        <p>${v.followUpNote}</p>
      </div>` : ''}
      <div class="files">
        ${v.prescriptions.length > 0 ? `<span class="file-count">📄 ${v.prescriptions.length} Prescription${v.prescriptions.length > 1 ? 's' : ''}</span>` : ''}
        ${v.reports.length > 0 ? `<span class="file-count">📋 ${v.reports.length} Report${v.reports.length > 1 ? 's' : ''}</span>` : ''}
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MedTrack – Medical Records${single ? '' : ' Export'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: white; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; margin-bottom: 32px; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon { width: 40px; height: 40px; background: #16a34a; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
    .logo-text { font-size: 22px; font-weight: 700; color: #0f172a; }
    .meta { text-align: right; font-size: 13px; color: #64748b; }
    .visit { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
    .visit-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .visit h2 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
    .date { font-size: 13px; color: #64748b; }
    .member-badge { background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 14px; color: #334155; font-weight: 500; }
    .follow-up { color: #d97706; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .tag { background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .notes { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .notes p { font-size: 13px; color: #475569; line-height: 1.6; margin-top: 4px; }
    .files { display: flex; gap: 12px; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .file-count { font-size: 12px; color: #64748b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; }
    @media print {
      body { padding: 20px; }
      .visit { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">M</div>
      <span class="logo-text">MedTrack</span>
    </div>
    <div class="meta">
      <div><strong>${userName}</strong></div>
      <div>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div>${visits.length} visit${visits.length !== 1 ? 's' : ''}</div>
    </div>
  </div>
  ${visitsHTML}
  <div class="footer">Generated by MedTrack · Private & Confidential</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}