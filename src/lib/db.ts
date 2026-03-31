import { prisma } from './prisma';

// ── User operations ──────────────────────────────────────────

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
}) {
  return prisma.user.create({ data });
}

// ── Visit operations ─────────────────────────────────────────

export async function getVisitsByUserId(userId: string) {
  return prisma.visit.findMany({
    where: { userId },
    orderBy: { visitDate: 'desc' },
    include: {
      _count: {
        select: { prescriptions: true, reports: true },
      },
    },
  });
}

export async function getVisitById(id: string) {
  return prisma.visit.findUnique({ where: { id } });
}

export async function getVisitWithFiles(id: string) {
  return prisma.visit.findUnique({
    where: { id },
    include: {
      prescriptions: { orderBy: { uploadedAt: 'desc' } },
      reports: { orderBy: { uploadedAt: 'desc' } },
    },
  });
}

export async function createVisit(data: {
  visitDate: Date;
  doctorName: string;
  hospital: string;
  reason: string;
  notes: string;
  userId: string;
}) {
  return prisma.visit.create({ data });
}

const ALLOWED_VISIT_FIELDS = new Set([
  'visitDate',
  'doctorName',
  'hospital',
  'reason',
  'notes',
]);

export async function updateVisit(
  id: string,
  raw: Record<string, unknown>
) {
  // Only allow known fields — strip everything else
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (ALLOWED_VISIT_FIELDS.has(key)) {
      sanitized[key] = raw[key];
    }
  }
  if (sanitized.visitDate && typeof sanitized.visitDate === 'string') {
    sanitized.visitDate = new Date(sanitized.visitDate as string);
  }
  return prisma.visit.update({ where: { id }, data: sanitized });
}

export async function deleteVisit(id: string) {
  // Cascade deletes files via schema
  return prisma.visit.delete({ where: { id } });
}

// ── Prescription file operations ─────────────────────────────

export async function createPrescription(data: {
  originalName: string;
  storageKey: string;
  fileType: string;
  fileSize: number;
  visitId: string;
}) {
  return prisma.prescriptionFile.create({ data });
}

export async function getPrescriptionById(id: string) {
  return prisma.prescriptionFile.findUnique({ where: { id } });
}

export async function deletePrescription(id: string) {
  return prisma.prescriptionFile.delete({ where: { id } });
}

// ── Report file operations ───────────────────────────────────

export async function createReport(data: {
  originalName: string;
  storageKey: string;
  fileType: string;
  fileSize: number;
  visitId: string;
}) {
  return prisma.reportFile.create({ data });
}

export async function getReportById(id: string) {
  return prisma.reportFile.findUnique({ where: { id } });
}

export async function deleteReport(id: string) {
  return prisma.reportFile.delete({ where: { id } });
}

// ── Helper to find any file by ID + category ─────────────────

export async function findFileById(fileId: string, category: 'prescription' | 'report') {
  if (category === 'prescription') {
    return prisma.prescriptionFile.findUnique({ where: { id: fileId } });
  }
  return prisma.reportFile.findUnique({ where: { id: fileId } });
}

export async function findAnyFileById(fileId: string) {
  const rx = await prisma.prescriptionFile.findUnique({ where: { id: fileId } });
  if (rx) return { ...rx, category: 'prescription' as const };
  const rpt = await prisma.reportFile.findUnique({ where: { id: fileId } });
  if (rpt) return { ...rpt, category: 'report' as const };
  return null;
}

export async function deleteAnyFile(fileId: string) {
  // Try prescription first, then report
  try {
    await prisma.prescriptionFile.delete({ where: { id: fileId } });
    return true;
  } catch {
    // not a prescription — try report
  }
  try {
    await prisma.reportFile.delete({ where: { id: fileId } });
    return true;
  } catch {
    return false;
  }
}
