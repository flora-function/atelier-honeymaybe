import path from 'node:path';
import crypto from 'node:crypto';
import { HTTPException } from 'hono/http-exception';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config.js';

export const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
export const MAX_BYTES = 20 * 1024 * 1024;

// Neon Object Storage speaks S3 but requires path-style addressing.
// Credentials are read from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
const s3 = new S3Client({
  region: config.storage.region,
  endpoint: config.storage.endpoint,
  forcePathStyle: true,
});

export const imageUrl = (key) => (key ? `${config.storage.publicUrl}/${key}` : '');

// Validates the `image` field of a parsed multipart body. Returns
// { buffer, mimetype } or null when no file was sent.
export async function readImage(body) {
  const file = body?.image;
  if (!file || typeof file === 'string' || !file.size) return null;
  if (!EXT[file.type]) throw new HTTPException(400, { message: 'only jpg, png, webp or gif images' });
  if (file.size > MAX_BYTES) throw new HTTPException(413, { message: 'image is larger than 20 MB' });
  return { buffer: Buffer.from(await file.arrayBuffer()), mimetype: file.type };
}

// Uploads { buffer, mimetype } to Neon Object Storage and returns its object key.
export async function saveImage(file) {
  const key = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXT[file.mimetype]}`;
  await s3.send(new PutObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return key;
}

// Best-effort delete; never throws.
export async function removeImage(key) {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: path.basename(key) }));
  } catch (err) {
    console.warn('could not delete image', key, err.message);
  }
}
