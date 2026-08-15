/**
 * Creates the first admin account (and optionally a KOL) so a fresh install is
 * usable immediately. Safe to re-run: existing usernames are left untouched.
 *
 *   npm run seed
 *   PF_ADMIN_USER=tom PF_ADMIN_PASS=... npm run seed
 */
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { migrate } from '../db/migrate.js'
import { users } from '../db/schema.js'
import { createApiToken, createUser } from '../lib/auth.js'

migrate()

function generatePassword() {
  return randomBytes(12).toString('base64url')
}

async function ensureUser(opts: {
  username: string
  password: string
  role: 'admin' | 'kol'
  email?: string | null
  displayName?: string
}) {
  const existing = db.select().from(users).where(eq(users.username, opts.username)).get()
  if (existing) {
    console.log(`- user "${opts.username}" already exists, skipped`)
    return null
  }
  await createUser(opts)
  console.log(`✓ created ${opts.role}: ${opts.username} / ${opts.password}`)
  return opts.password
}

const adminUser = process.env.PF_ADMIN_USER ?? 'admin'
const adminPass = process.env.PF_ADMIN_PASS ?? generatePassword()
await ensureUser({
  username: adminUser,
  password: adminPass,
  role: 'admin',
  email: process.env.PF_ADMIN_EMAIL || null,
  displayName: 'Admin',
})

if (process.env.PF_KOL_USER) {
  await ensureUser({
    username: process.env.PF_KOL_USER,
    password: process.env.PF_KOL_PASS ?? generatePassword(),
    role: 'kol',
    email: process.env.PF_KOL_EMAIL || null,
    displayName: process.env.PF_KOL_NAME || process.env.PF_KOL_USER,
  })
}

if (process.env.PF_CREATE_TOKEN) {
  const token = createApiToken(process.env.PF_CREATE_TOKEN)
  console.log(`✓ ingest token "${process.env.PF_CREATE_TOKEN}": ${token}`)
  console.log('  (shown once — store it somewhere safe)')
}

console.log('\nDone. Sign in with the username or the email above.')
process.exit(0)
