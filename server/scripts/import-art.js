// One-off: load the legacy src/content/art/*.json into Postgres and upload
// matching images from public/ to object storage. Safe to re-run (existing ids are skipped).
// Run with: npm run import-art   (loads ../.env.local for the Neon variables)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, query, pool } from '../src/db.js';
import { saveImage } from '../src/upload.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.resolve(serverRoot, '..');
const contentDir = path.join(siteRoot, 'src/content/art');
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

await initDb();
let added = 0, imgs = 0;
for (const f of fs.readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
  const a = JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8'));
  const id = path.basename(f, '.json');
  if ((await query('SELECT 1 FROM art WHERE id = $1', [id])).rowCount) continue;

  let image = '';
  const src = path.join(siteRoot, 'public', a.image || '');
  const mimetype = MIME[path.extname(src).toLowerCase()];
  if (a.image && mimetype && fs.existsSync(src)) {
    image = await saveImage({ buffer: fs.readFileSync(src), mimetype });
    imgs++;
  } else if (a.image) {
    console.warn(`  no image file for "${id}" (${a.image}) — imported without one`);
  }
  await query(
    `INSERT INTO art (id, title, date, medium, tags, image, description, featured)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, a.title, a.date, a.medium, a.tags ?? [], image, a.description ?? null, !!a.featured]
  );
  added++;
}
console.log(`imported ${added} pieces, uploaded ${imgs} images`);
await pool.end();
