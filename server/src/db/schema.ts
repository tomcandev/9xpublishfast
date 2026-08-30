import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const CONTENT_STATUSES = ['DRAFT', 'READY', 'CLAIMED', 'PUBLISHED', 'FAILED'] as const
export const CONTENT_TYPES = ['video', 'carousel', 'text'] as const
export const PLATFORMS = ['x', 'facebook', 'instagram', 'tiktok', 'youtube_shorts', 'other'] as const
export const ROLES = ['admin', 'kol'] as const

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    /** Short login handle. Never contains '@' so it can't collide with an email. */
    username: text('username').notNull(),
    /** Optional — a KOL can exist with a username only. */
    email: text('email'),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role', { enum: ROLES }).notNull().default('kol'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    /** Optional admin notes (e.g. channel links, niche, posting schedule) */
    notes: text('notes'),
    /** Affiliate / Bio tracking link for app attribution (e.g. https://pteflow.com/?ref=yoga) */
    bioLink: text('bio_link'),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [
    uniqueIndex('users_username_unique').on(t.username),
    uniqueIndex('users_email_unique').on(t.email),
  ],
)

export const contents = sqliteTable(
  'contents',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    title: text('title'),
    caption: text('caption'),
    contentType: text('content_type', { enum: CONTENT_TYPES }).notNull().default('video'),
    status: text('status', { enum: CONTENT_STATUSES }).notNull().default('DRAFT'),
    /** Optional pre-assignment: only this user may claim it. */
    assignedUserId: text('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    claimedBy: text('claimed_by').references(() => users.id, { onDelete: 'set null' }),
    claimedAt: text('claimed_at'),
    /** Optional hook identifier from marketing templates (e.g. h_score_01) */
    hookId: text('hook_id'),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [
    uniqueIndex('contents_code_unique').on(t.code),
    // The claim query filters on status and orders by created_at.
    index('contents_status_created_idx').on(t.status, t.createdAt),
    index('contents_claimed_by_idx').on(t.claimedBy),
    index('contents_hook_id_idx').on(t.hookId),
  ],
)

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    contentId: text('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    /** Path relative to the uploads dir, never an absolute host path. */
    filePath: text('file_path').notNull(),
    originalName: text('original_name').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    type: text('type', { enum: ['video', 'image'] }).notNull(),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [index('assets_content_sort_idx').on(t.contentId, t.sortOrder)],
)

export const publications = sqliteTable(
  'publications',
  {
    id: text('id').primaryKey(),
    contentId: text('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform', { enum: PLATFORMS }).notNull(),
    status: text('status', { enum: ['PENDING', 'PUBLISHED', 'FAILED'] })
      .notNull()
      .default('PUBLISHED'),
    publishedUrl: text('published_url'),
    publishedAt: text('published_at'),
    views: integer('views').notNull().default(0),
    likes: integer('likes').notNull().default(0),
    comments: integer('comments').notNull().default(0),
    shares: integer('shares').notNull().default(0),
    lastCheckedAt: text('last_checked_at'),
    metricError: text('metric_error'),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [
    index('publications_content_idx').on(t.contentId),
    index('publications_user_idx').on(t.userId),
    // One row per (content, platform) — re-posting the same content to the
    // same platform updates the existing row instead of duplicating it.
    uniqueIndex('publications_content_platform_unique').on(t.contentId, t.platform),
  ],
)

export const apiTokens = sqliteTable(
  'api_tokens',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** SHA-256 of the token; the plaintext is shown once at creation. */
    tokenHash: text('token_hash').notNull(),
    role: text('role', { enum: ROLES }).notNull().default('admin'),
    createdAt: text('created_at').notNull().default(now),
    lastUsedAt: text('last_used_at'),
  },
  (t) => [uniqueIndex('api_tokens_hash_unique').on(t.tokenHash)],
)

export const reminderSettings = sqliteTable(
  'reminder_settings',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    /** Comma-separated times: e.g. "18:00" */
    reminderTimes: text('reminder_times').notNull().default('18:00'),
    timezone: text('timezone').notNull().default('Asia/Ho_Chi_Minh'),
    lastNotifiedDate: text('last_notified_date'),
    updatedAt: text('updated_at').notNull().default(now),
  },
)

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [
    uniqueIndex('push_subscriptions_endpoint_unique').on(t.endpoint),
    index('push_subscriptions_user_idx').on(t.userId),
  ],
)

export type User = typeof users.$inferSelect
export type Content = typeof contents.$inferSelect
export type Asset = typeof assets.$inferSelect
export type Publication = typeof publications.$inferSelect
export type ApiToken = typeof apiTokens.$inferSelect
export type ReminderSettings = typeof reminderSettings.$inferSelect
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect

