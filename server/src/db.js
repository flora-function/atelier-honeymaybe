import pg from 'pg';
import { attachDatabasePool } from '@neon/functions';
import { config } from './config.js';

// Neon URLs carry ?sslmode=require; pg now warns about its changing meaning.
// Strip it and set TLS verification explicitly instead.
function pgConfig(url) {
  const u = new URL(url);
  u.searchParams.delete('sslmode');
  const local = /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
  return { connectionString: u.toString(), ssl: local ? false : { rejectUnauthorized: true } };
}

// Module-scope pool: reused across requests on the same isolate. Keep it small.
export const pool = new pg.Pool({ ...pgConfig(config.databaseUrl), max: 5 });
attachDatabasePool(pool);

export const query = (text, params) => pool.query(text, params);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS art (
    id          TEXT PRIMARY KEY,            -- slug, e.g. "honey-bees"
    title       TEXT NOT NULL,
    date        TEXT NOT NULL,               -- e.g. "2024-06"
    medium      TEXT NOT NULL,
    tags        TEXT[] NOT NULL DEFAULT '{}',
    image       TEXT NOT NULL DEFAULT '',    -- object key in the storage bucket
    description TEXT,
    featured    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Shop: a product may optionally be a print/original of an art piece.
  CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    art_id      TEXT REFERENCES art(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    currency    TEXT NOT NULL DEFAULT 'usd',
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

// Idempotent schema setup over the direct (non-pooled) connection, as Neon
// recommends for schema changes.
export async function initDb() {
  const direct = new pg.Client(pgConfig(config.databaseUrlDirect));
  await direct.connect();
  try {
    await direct.query(SCHEMA);
  } finally {
    await direct.end();
  }
}

// Runs once per isolate, lazily, before the first API request.
let ready;
export const ensureSchema = () =>
  (ready ??= initDb().catch((err) => { ready = undefined; throw err; }));
