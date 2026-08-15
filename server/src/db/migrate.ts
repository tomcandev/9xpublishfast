/**
 * Schema is applied with plain idempotent DDL rather than a migration-file
 * generator. The schema is small and this keeps `npm run dev` a single step
 * with no extra CLI or codegen to install.
 */
import { sqlite } from './index.js'

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'kol',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`,

  `CREATE TABLE IF NOT EXISTS contents (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT,
    caption TEXT,
    content_type TEXT NOT NULL DEFAULT 'video',
    status TEXT NOT NULL DEFAULT 'DRAFT',
    assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    claimed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    claimed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS contents_code_unique ON contents (code)`,
  `CREATE INDEX IF NOT EXISTS contents_status_created_idx ON contents (status, created_at)`,
  `CREATE INDEX IF NOT EXISTS contents_claimed_by_idx ON contents (claimed_by)`,

  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS assets_content_sort_idx ON assets (content_id, sort_order)`,

  `CREATE TABLE IF NOT EXISTS publications (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PUBLISHED',
    published_url TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS publications_content_idx ON publications (content_id)`,
  `CREATE INDEX IF NOT EXISTS publications_user_idx ON publications (user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS publications_content_platform_unique ON publications (content_id, platform)`,

  `CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    last_used_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS api_tokens_hash_unique ON api_tokens (token_hash)`,
]

export function migrate() {
  sqlite.exec('BEGIN')
  try {
    for (const stmt of statements) sqlite.exec(stmt)
    sqlite.exec('COMMIT')
  } catch (err) {
    sqlite.exec('ROLLBACK')
    throw err
  }
}

// Allow running directly: `npm run migrate`
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
  console.log('Schema up to date.')
}
