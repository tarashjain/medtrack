import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPresignedViewUrl } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { ids } = await req.json() as { ids?: string[] };

    let visits;

    if (ids && ids.length > 0) {
      // Export selected visits
      visits = await prisma.visit.findMany({
        where: { id: { in: ids }, userId: user.id },
        orderBy: { visitDate: 'desc' },
        include: { prescriptions: true, reports: true, member: true },
      });
    } else {
      // Export all visits
      visits = await prisma.visit.findMany({
        where: { userId: user.id },
        orderBy: { visitDate: 'desc' },
        include: { prescriptions: true, reports: true, member: true },
      });
    }

    // Fetch and embed image attachments as base64
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visitsWithImages = await Promise.all(visits.map(async (v: any) => {
      const allFiles = [...v.prescriptions, ...v.reports];
      const filesWithData = await Promise.all(allFiles.map(async (f: any) => {
        const isImage = f.fileType?.startsWith('image/');
        let base64 = null;
        if (isImage) {
          try {
            const url = await getPresignedViewUrl(f.storageKey);
            const res = await fetch(url);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              base64 = `data:${f.fileType};base64,${Buffer.from(buf).toString('base64')}`;
            }
          } catch {
            // Skip if fetch fails
          }
        }
        return { ...f, base64, isPdf: f.fileType === 'application/pdf' };
      }));
      return { ...v, allFiles: filesWithData };
    }));

    const html = generateHTML(visitsWithImages, user.name);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

// Keep GET for backwards compat (exports all)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const visitId = searchParams.get('visitId');

    let visits;
    if (visitId) {
      const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        include: { prescriptions: true, reports: true, member: true },
      });
      if (!visit || visit.userId !== user.id) {
        return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
      }
      visits = [visit];
    } else {
      visits = await prisma.visit.findMany({
        where: { userId: user.id },
        orderBy: { visitDate: 'desc' },
        include: { prescriptions: true, reports: true, member: true },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visitsWithImages = await Promise.all(visits.map(async (v: any) => {
      const allFiles = [...v.prescriptions, ...v.reports];
      const filesWithData = await Promise.all(allFiles.map(async (f: any) => {
        const isImage = f.fileType?.startsWith('image/');
        let base64 = null;
        if (isImage) {
          try {
            const url = await getPresignedViewUrl(f.storageKey);
            const res = await fetch(url);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              base64 = `data:${f.fileType};base64,${Buffer.from(buf).toString('base64')}`;
            }
          } catch { /* skip */ }
        }
        return { ...f, base64, isPdf: f.fileType === 'application/pdf' };
      }));
      return { ...v, allFiles: filesWithData };
    }));

    const html = generateHTML(visitsWithImages, user.name);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateHTML(visits: any[], userName: string) {
  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visitsHTML = visits.map((v: any) => {
    const images = v.allFiles?.filter((f: any) => f.base64) || [];
    const pdfs = v.allFiles?.filter((f: any) => f.isPdf) || [];

    return `
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
      ${v.tags?.length > 0 ? `<div class="tags">${v.tags.map((t: string) => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
      ${v.notes ? `<div class="notes"><span class="label">Notes</span><p>${v.notes.replace(/\n/g, '<br/>')}</p></div>` : ''}
      ${v.followUpNote ? `<div class="notes"><span class="label">Follow-up Note</span><p>${v.followUpNote}</p></div>` : ''}
      ${images.length > 0 ? `
      <div class="attachments">
        <span class="label">Attachments (${images.length} image${images.length > 1 ? 's' : ''})</span>
        <div class="images">
          ${images.map((f: any) => `
            <div class="img-wrap">
              <img src="${f.base64}" alt="${f.originalName}" />
              <p class="img-name">${f.originalName}</p>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
      ${pdfs.length > 0 ? `
      <div class="pdf-list">
        <span class="label">PDF Documents</span>
        ${pdfs.map((f: any) => `<div class="pdf-item">📄 ${f.originalName}</div>`).join('')}
      </div>` : ''}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MedTrack – Medical Records Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: white; padding: 40px; max-width: 860px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; margin-bottom: 32px; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon { width: 40px; height: 40px; background: #16a34a; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
    .logo-text { font-size: 22px; font-weight: 700; color: #0f172a; }
    .meta { text-align: right; font-size: 13px; color: #64748b; line-height: 1.6; }
    .visit { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
    .visit-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .visit h2 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
    .date { font-size: 13px; color: #64748b; }
    .member-badge { background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .field { display: flex; flex-direction: column; gap: 3px; }
    .label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
    .value { font-size: 14px; color: #334155; font-weight: 500; }
    .follow-up { color: #d97706; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .tag { background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .notes { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .notes p { font-size: 13px; color: #475569; line-height: 1.6; margin-top: 4px; }
    .attachments { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .images { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 8px; }
    .img-wrap { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: white; }
    .img-wrap img { width: 100%; height: 200px; object-fit: contain; display: block; background: #f8fafc; }
    .img-name { font-size: 11px; color: #64748b; padding: 6px 8px; border-top: 1px solid #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pdf-list { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .pdf-item { font-size: 13px; color: #475569; padding: 4px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; }
    @media print {
      body { padding: 20px; }
      .visit { break-inside: avoid; }
      .img-wrap img { max-height: 280px; }
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
      <strong>${userName}</strong><br/>
      ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
      ${visits.length} visit${visits.length !== 1 ? 's' : ''}
    </div>
  </div>
  ${visitsHTML}
  <div class="footer">Generated by MedTrack · Private & Confidential</div>
  <script>setTimeout(() => window.print(), 800);</script>
</body>
</html>`;
}