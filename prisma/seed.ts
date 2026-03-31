import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  // Clear existing data
  await prisma.reportFile.deleteMany();
  await prisma.prescriptionFile.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcryptjs.hash('password123', 12);

  const user = await prisma.user.create({
    data: {
      email: 'patient@medtrack.com',
      name: 'Alex Thompson',
      password: hashedPassword,
    },
  });

  // Visit 1 — Annual Physical
  const visit1 = await prisma.visit.create({
    data: {
      visitDate: new Date('2026-03-15T10:00:00Z'),
      doctorName: 'Dr. Sarah Mitchell',
      hospital: 'Mount Sinai Hospital',
      reason: 'Annual Physical Examination',
      notes:
        'Blood work ordered. Cholesterol slightly elevated at 215 mg/dL. Doctor recommended dietary changes and follow-up in 3 months. Flu vaccine administered. All other vitals within normal range.',
      userId: user.id,
    },
  });

  await prisma.reportFile.createMany({
    data: [
      {
        originalName: 'blood_panel_results.pdf',
        storageKey: 'reports/' + visit1.id + '/blood_panel_results.pdf',
        fileType: 'application/pdf',
        fileSize: 245000,
        visitId: visit1.id,
      },
      {
        originalName: 'flu_vaccine_record.pdf',
        storageKey: 'reports/' + visit1.id + '/flu_vaccine_record.pdf',
        fileType: 'application/pdf',
        fileSize: 52000,
        visitId: visit1.id,
      },
    ],
  });

  await prisma.prescriptionFile.create({
    data: {
      originalName: 'cholesterol_medication_rx.pdf',
      storageKey: 'prescriptions/' + visit1.id + '/cholesterol_medication_rx.pdf',
      fileType: 'application/pdf',
      fileSize: 89000,
      visitId: visit1.id,
    },
  });

  // Visit 2 — Knee Pain
  const visit2 = await prisma.visit.create({
    data: {
      visitDate: new Date('2026-02-28T14:30:00Z'),
      doctorName: 'Dr. James Chen',
      hospital: 'NYU Langone Orthopedics',
      reason: 'Knee Pain - Follow Up',
      notes:
        'MRI reviewed showing mild meniscus wear. Physical therapy 2x/week for 6 weeks recommended. Prescribed anti-inflammatory as needed. No surgical intervention required at this time.',
      userId: user.id,
    },
  });

  await prisma.reportFile.create({
    data: {
      originalName: 'knee_mri_report.pdf',
      storageKey: 'reports/' + visit2.id + '/knee_mri_report.pdf',
      fileType: 'application/pdf',
      fileSize: 1200000,
      visitId: visit2.id,
    },
  });

  await prisma.prescriptionFile.createMany({
    data: [
      {
        originalName: 'pt_referral.pdf',
        storageKey: 'prescriptions/' + visit2.id + '/pt_referral.pdf',
        fileType: 'application/pdf',
        fileSize: 67000,
        visitId: visit2.id,
      },
      {
        originalName: 'anti_inflammatory_rx.pdf',
        storageKey: 'prescriptions/' + visit2.id + '/anti_inflammatory_rx.pdf',
        fileType: 'application/pdf',
        fileSize: 45000,
        visitId: visit2.id,
      },
    ],
  });

  // Visit 3 — Urgent Care
  const visit3 = await prisma.visit.create({
    data: {
      visitDate: new Date('2026-01-10T09:00:00Z'),
      doctorName: 'Dr. Lisa Patel',
      hospital: 'CityMD Urgent Care - Chelsea',
      reason: 'Persistent Cough & Sore Throat',
      notes:
        'Rapid strep test negative. Likely viral upper respiratory infection. Prescribed cough suppressant and recommended rest, fluids, and OTC pain relief. Return if symptoms persist beyond 10 days.',
      userId: user.id,
    },
  });

  await prisma.prescriptionFile.create({
    data: {
      originalName: 'cough_suppressant_rx.pdf',
      storageKey: 'prescriptions/' + visit3.id + '/cough_suppressant_rx.pdf',
      fileType: 'application/pdf',
      fileSize: 38000,
      visitId: visit3.id,
    },
  });

  // Visit 4 — Eye Exam
  const visit4 = await prisma.visit.create({
    data: {
      visitDate: new Date('2025-11-20T11:00:00Z'),
      doctorName: 'Dr. Robert Kimura',
      hospital: 'Manhattan Eye & Ear',
      reason: 'Annual Eye Exam',
      notes:
        'Vision stable at -2.50 both eyes. No signs of glaucoma or retinal issues. New prescription for updated lenses. Next exam in 12 months.',
      userId: user.id,
    },
  });

  await prisma.prescriptionFile.create({
    data: {
      originalName: 'eye_exam_prescription.pdf',
      storageKey: 'prescriptions/' + visit4.id + '/eye_exam_prescription.pdf',
      fileType: 'application/pdf',
      fileSize: 72000,
      visitId: visit4.id,
    },
  });

  // Visit 5 — Dermatology
  const visit5 = await prisma.visit.create({
    data: {
      visitDate: new Date('2025-09-05T16:00:00Z'),
      doctorName: 'Dr. Maria Gonzalez',
      hospital: 'NewYork-Presbyterian Dermatology',
      reason: 'Skin Check - Mole Evaluation',
      notes:
        'Full body skin examination performed. One suspicious mole on upper back biopsied. Results came back benign. Advised sun protection and annual skin checks.',
      userId: user.id,
    },
  });

  await prisma.reportFile.create({
    data: {
      originalName: 'biopsy_results.pdf',
      storageKey: 'reports/' + visit5.id + '/biopsy_results.pdf',
      fileType: 'application/pdf',
      fileSize: 156000,
      visitId: visit5.id,
    },
  });

  console.log('✓ Database seeded successfully');
  console.log('  Email:    patient@medtrack.com');
  console.log('  Password: password123');
  console.log(`  User ID:  ${user.id}`);
  console.log(`  Visits:   5`);
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
