// Neon Function entry point: a Hono app exported as the default `fetch` handler.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { MAX_BYTES } from './upload.js';
import adminAssets from './admin-assets.js';
import artRoutes from './routes/art.js';
import productRoutes from './routes/products.js';

const app = new Hono();

app.use('*', secureHeaders({
  crossOriginResourcePolicy: 'cross-origin',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    // admin page previews images served from the storage bucket
    imgSrc: ["'self'", 'data:', 'blob:', config.storage.publicUrl],
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
}));
if (config.clientOrigin) app.use('/api/*', cors({ origin: config.clientOrigin }));

// Admin UI (inlined by scripts/build-admin.js)
app.get('/admin', (c) => c.redirect('/admin/'));
app.get('/admin/', (c) => c.body(adminAssets['admin.html'].body, 200, { 'Content-Type': adminAssets['admin.html'].type }));
app.get('/admin/:file', (c) => {
  const asset = adminAssets[c.req.param('file')];
  return asset ? c.body(asset.body, 200, { 'Content-Type': asset.type }) : c.json({ error: 'not found' }, 404);
});

app.get('/api/health', (c) => c.json({ ok: true }));

// Everything under /api needs the tables to exist (once per isolate).
app.use('/api/*', async (_c, next) => { await ensureSchema(); await next(); });
app.use('/api/*', bodyLimit({
  maxSize: MAX_BYTES + 1024 * 1024, // image + form fields
  onError: (c) => c.json({ error: 'request body too large' }, 413),
}));
app.route('/api/art', artRoutes);
app.route('/api/products', productRoutes);

app.notFound((c) => c.json({ error: 'not found' }, 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: 'server error' }, 500);
});

export default app;
