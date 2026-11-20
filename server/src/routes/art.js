import { Hono } from 'hono';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { readImage, saveImage, removeImage, imageUrl } from '../upload.js';
import { triggerRebuild } from '../util.js';

const art = new Hono();

const toApi = (r) => ({
  id: r.id,
  title: r.title,
  date: r.date,
  medium: r.medium,
  tags: r.tags,
  image: imageUrl(r.image),
  description: r.description,
  featured: r.featured,
});

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const parseTags = (t) => {
  if (Array.isArray(t)) return t;
  if (typeof t !== 'string' || !t) return [];
  try { const v = JSON.parse(t); if (Array.isArray(v)) return v; } catch {}
  return t.split(',').map((x) => x.trim()).filter(Boolean);
};

const bool = (v) => v === true || v === 'true' || v === '1' || v === 1;
const str = (v) => (typeof v === 'string' ? v : undefined); // ignore File values in text fields

art.get('/', async (c) => {
  const { rows } = await query('SELECT * FROM art ORDER BY date DESC, created_at DESC');
  let out = rows.map(toApi);
  const featured = c.req.query('featured');
  const tag = c.req.query('tag');
  if (featured !== undefined) out = out.filter((a) => a.featured === bool(featured));
  if (tag) out = out.filter((a) => a.tags.includes(tag));
  return c.json(out);
});

art.get('/:id', async (c) => {
  const { rows } = await query('SELECT * FROM art WHERE id = $1', [c.req.param('id')]);
  if (!rows[0]) return c.json({ error: 'not found' }, 404);
  return c.json(toApi(rows[0]));
});

// Create: multipart/form-data with optional `image` file.
art.post('/', requireAdmin, async (c) => {
  const body = await c.req.parseBody();
  const title = str(body.title), date = str(body.date), medium = str(body.medium);
  if (!title || !date || !medium)
    return c.json({ error: 'title, date and medium are required' }, 400);
  const id = slugify(str(body.id) || title);
  if (!id) return c.json({ error: 'could not make an id from that title' }, 400);
  const exists = await query('SELECT 1 FROM art WHERE id = $1', [id]);
  if (exists.rowCount) return c.json({ error: `"${id}" already exists` }, 409);

  const file = await readImage(body); // validates type and size before uploading
  const image = file ? await saveImage(file) : '';
  try {
    const { rows } = await query(
      `INSERT INTO art (id, title, date, medium, tags, image, description, featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, title, date, medium, parseTags(body.tags), image, str(body.description) ?? null, bool(body.featured)]
    );
    triggerRebuild();
    return c.json(toApi(rows[0]), 201);
  } catch (err) {
    await removeImage(image); // don't orphan the upload
    throw err;
  }
});

// Update: send only the fields you want to change; `image` file replaces the old one.
art.put('/:id', requireAdmin, async (c) => {
  const found = await query('SELECT * FROM art WHERE id = $1', [c.req.param('id')]);
  const row = found.rows[0];
  if (!row) return c.json({ error: 'not found' }, 404);

  const b = await c.req.parseBody();
  const file = await readImage(b);
  const newImage = file ? await saveImage(file) : null;
  try {
    const { rows } = await query(
      `UPDATE art SET title=$1, date=$2, medium=$3, tags=$4, description=$5, featured=$6, image=$7
       WHERE id=$8 RETURNING *`,
      [
        str(b.title) ?? row.title,
        str(b.date) ?? row.date,
        str(b.medium) ?? row.medium,
        b.tags !== undefined ? parseTags(b.tags) : row.tags,
        str(b.description) ?? row.description,
        b.featured !== undefined ? bool(b.featured) : row.featured,
        newImage ?? row.image,
        row.id,
      ]
    );
    if (newImage && row.image) await removeImage(row.image);
    triggerRebuild();
    return c.json(toApi(rows[0]));
  } catch (err) {
    await removeImage(newImage);
    throw err;
  }
});

art.delete('/:id', requireAdmin, async (c) => {
  const { rows } = await query('DELETE FROM art WHERE id = $1 RETURNING image', [c.req.param('id')]);
  if (!rows[0]) return c.json({ error: 'not found' }, 404);
  await removeImage(rows[0].image);
  triggerRebuild();
  return c.body(null, 204);
});

export default art;
