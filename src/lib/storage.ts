import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import path from 'path';

// ── R2 client (S3-compatible) ────────────────────────────────

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

// ── Allowed file types ───────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

// Magic bytes for server-side file-type validation
const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },         // %PDF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },                     // JPEG
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a] },  // PNG
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Validation ───────────────────────────────────────────────

export function validateFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

export function validateMagicBytes(buffer: Buffer, claimedMime: string): boolean {
  const match = MAGIC_BYTES.find((m) => m.mime === claimedMime);
  if (!match) return false;
  if (buffer.length < match.bytes.length) return false;
  return match.bytes.every((byte, i) => buffer[i] === byte);
}

// ── Upload ───────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  category: 'prescription' | 'report',
  visitId: string
): Promise<{ storageKey: string; fileSize: number }> {
  // 1. Validate MIME
  if (!validateFileType(file.type)) {
    throw new Error('File type not allowed. Use PDF, JPG, or PNG.');
  }

  // 2. Validate size
  if (!validateFileSize(file.size)) {
    throw new Error('File must be between 1 byte and 10MB.');
  }

  // 3. Read bytes and validate magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!validateMagicBytes(buffer, file.type)) {
    throw new Error('File content does not match its declared type.');
  }

  // 4. Generate safe storage key
  const ext = MIME_TO_EXT[file.type] || path.extname(file.name) || '';
  const fileId = uuid();
  const storageKey = `${category}s/${visitId}/${fileId}${ext}`;

  // 5. Upload to R2
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: file.type,
      ContentDisposition: `inline; filename="${file.name.replace(/"/g, '_')}"`,
    })
  );

  return { storageKey, fileSize: file.size };
}

// ── Presigned URL for viewing (1 hour expiry) ────────────────

export async function getPresignedViewUrl(
  storageKey: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

// ── Delete ───────────────────────────────────────────────────

export async function deleteStorageFile(storageKey: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
    })
  );
}
