#!/usr/bin/env node
/**
 * migrate.js — Run database migrations against Supabase
 * Usage: node scripts/migrate.js [up|down|status]
 */
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../src/db/migrations');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Ensure migrations table exists ────────────────────────────────────────────
async function ensureMigrationsTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `CREATE TABLE IF NOT EXISTS _migrations (
      id         serial primary key,
      filename   text unique not null,
      applied_at timestamptz default now()
    );`
  });
  if (error && !error.message.includes('already exists')) {
    // Fallback: check if table exists
    const { error: check } = await supabase.from('_migrations').select('id').limit(1);
    if (check) throw new Error(`Cannot create migrations table: ${error.message}`);
  }
}

// ── Get list of applied migrations ───────────────────────────────────────────
async function getApplied() {
  const { data, error } = await supabase.from('_migrations').select('filename').order('id');
  if (error) throw error;
  return new Set(data.map(r => r.filename));
}

// ── Get all migration files ───────────────────────────────────────────────────
async function getMigrationFiles() {
  let files;
  try { files = await readdir(MIGRATIONS_DIR); }
  catch { return []; }
  return files.filter(f => f.endsWith('.sql')).sort();
}

// ── Run a single migration ────────────────────────────────────────────────────
async function runMigration(filename) {
  const sql = await readFile(join(MIGRATIONS_DIR, filename), 'utf-8');
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
    if (error) throw new Error(`Migration ${filename} failed: ${error.message}`);
  }
  await supabase.from('_migrations').insert({ filename });
}

// ── Commands ──────────────────────────────────────────────────────────────────
async function up() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = await getMigrationFiles();
  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log('✅ All migrations already applied.');
    return;
  }

  console.log(`📦 Applying ${pending.length} pending migration(s)...\n`);
  for (const file of pending) {
    process.stdout.write(`  ⏳ ${file} ...`);
    try {
      await runMigration(file);
      console.log(' ✓');
    } catch (err) {
      console.log(' ✗');
      throw err;
    }
  }
  console.log('\n✅ All migrations applied.');
}

async function status() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = await getMigrationFiles();

  console.log('\nMigration Status\n' + '─'.repeat(60));
  if (files.length === 0) {
    console.log('No migration files found in', MIGRATIONS_DIR);
    return;
  }
  for (const f of files) {
    const state = applied.has(f) ? '✓ applied' : '○ pending';
    console.log(`  ${state}  ${f}`);
  }
  const pending = files.filter(f => !applied.has(f)).length;
  console.log(`\n${files.length} total, ${applied.size} applied, ${pending} pending`);
}

async function down() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = await getMigrationFiles();
  const toRollback = files.filter(f => applied.has(f)).at(-1);

  if (!toRollback) { console.log('Nothing to roll back.'); return; }

  const downFile = toRollback.replace('.sql', '.down.sql');
  console.log(`Rolling back: ${toRollback}`);
  try {
    const sql = await readFile(join(MIGRATIONS_DIR, downFile), 'utf-8');
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) throw error;
    await supabase.from('_migrations').delete().eq('filename', toRollback);
    console.log('✅ Rolled back successfully.');
  } catch {
    console.error(`❌ No down migration file found: ${downFile}`);
    process.exit(1);
  }
}

// ── Entry ─────────────────────────────────────────────────────────────────────
const cmd = process.argv[2] || 'up';
const commands = { up, down, status };

if (!commands[cmd]) {
  console.error(`Unknown command: ${cmd}. Use: up | down | status`);
  process.exit(1);
}

commands[cmd]().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
