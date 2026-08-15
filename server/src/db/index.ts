import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { config, ensureDataDirs } from '../lib/config.js'
import * as schema from './schema.js'

ensureDataDirs()

export const sqlite = new Database(config.dbPath)

// WAL lets readers run while a write is in flight; busy_timeout makes
// concurrent writers wait their turn instead of failing with SQLITE_BUSY.
// Together these are what make the compare-and-swap claim in lib/claim.ts
// safe under real concurrency.
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('busy_timeout = 5000')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export { schema }
