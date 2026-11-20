import crypto from 'node:crypto';
import { config } from './config.js';

// Admin-only endpoints: send `Authorization: Bearer <ADMIN_TOKEN>`.
// Runs before any body parsing or database work.
export async function requireAdmin(c, next) {
  const given = (c.req.header('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(given);
  const b = Buffer.from(config.adminToken);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return c.json({ error: 'unauthorized' }, 401);
  await next();
}
