import { Hono } from 'hono';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';

// Shop skeleton: catalogue only. Cart/checkout (e.g. Stripe) comes next.
const products = new Hono();

const toApi = (r) => ({
  id: r.id,
  artId: r.art_id,
  name: r.name,
  description: r.description,
  priceCents: r.price_cents,
  currency: r.currency,
  stock: r.stock,
  active: r.active,
});

const isId = (s) => /^\d{1,9}$/.test(s);
const validCurrency = (c) => typeof c === 'string' && /^[a-z]{3}$/i.test(c);
const readJson = (c) => c.req.json().catch(() => ({}));

products.get('/', async (c) => {
  const { rows } = await query('SELECT * FROM products WHERE active ORDER BY created_at DESC');
  return c.json(rows.map(toApi));
});

products.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!isId(id)) return c.json({ error: 'not found' }, 404);
  const { rows } = await query('SELECT * FROM products WHERE id = $1 AND active', [id]);
  if (!rows[0]) return c.json({ error: 'not found' }, 404);
  return c.json(toApi(rows[0]));
});

products.post('/', requireAdmin, async (c) => {
  const { name, description, artId, priceCents, currency = 'usd', stock = 0 } = await readJson(c);
  if (!name || !Number.isInteger(priceCents) || priceCents < 0)
    return c.json({ error: 'name and integer priceCents are required' }, 400);
  if (!validCurrency(currency)) return c.json({ error: 'currency must be a 3-letter code' }, 400);
  if (!Number.isInteger(stock) || stock < 0) return c.json({ error: 'stock must be a non-negative integer' }, 400);
  if (artId && !(await query('SELECT 1 FROM art WHERE id = $1', [artId])).rowCount)
    return c.json({ error: 'unknown artId' }, 400);
  const { rows } = await query(
    `INSERT INTO products (art_id, name, description, price_cents, currency, stock)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [artId ?? null, name, description ?? null, priceCents, currency.toLowerCase(), stock]
  );
  return c.json(toApi(rows[0]), 201);
});

products.put('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!isId(id)) return c.json({ error: 'not found' }, 404);
  const row = (await query('SELECT * FROM products WHERE id = $1', [id])).rows[0];
  if (!row) return c.json({ error: 'not found' }, 404);
  const b = await readJson(c);
  if (b.stock !== undefined && (!Number.isInteger(b.stock) || b.stock < 0))
    return c.json({ error: 'stock must be a non-negative integer' }, 400);
  if (b.priceCents !== undefined && (!Number.isInteger(b.priceCents) || b.priceCents < 0))
    return c.json({ error: 'priceCents must be a non-negative integer' }, 400);
  if (b.currency !== undefined && !validCurrency(b.currency))
    return c.json({ error: 'currency must be a 3-letter code' }, 400);
  if (b.artId && !(await query('SELECT 1 FROM art WHERE id = $1', [b.artId])).rowCount)
    return c.json({ error: 'unknown artId' }, 400);
  const { rows } = await query(
    `UPDATE products SET art_id=$1, name=$2, description=$3, price_cents=$4, currency=$5, stock=$6, active=$7
     WHERE id=$8 RETURNING *`,
    [
      b.artId !== undefined ? b.artId || null : row.art_id,
      b.name ?? row.name,
      b.description ?? row.description,
      b.priceCents ?? row.price_cents,
      b.currency ? b.currency.toLowerCase() : row.currency,
      b.stock ?? row.stock,
      b.active !== undefined ? !!b.active : row.active,
      row.id,
    ]
  );
  return c.json(toApi(rows[0]));
});

products.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (!isId(id)) return c.json({ error: 'not found' }, 404);
  const info = await query('DELETE FROM products WHERE id = $1', [id]);
  if (!info.rowCount) return c.json({ error: 'not found' }, 404);
  return c.body(null, 204);
});

export default products;
