/**
 * The test PublishFast exists to pass.
 *
 * plan.txt §5: "tránh hai người lấy cùng một bài" — two workers must never end
 * up holding the same content item. Directus's free tier could not express
 * this, which is why the claim moved into application code.
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { eq, inArray } from 'drizzle-orm'
import { db, sqlite } from '../db/index.js'
import { migrate } from '../db/migrate.js'
import { contents, users } from '../db/schema.js'
import { claimContent, claimNext, releaseContent, releaseStaleClaims } from './claim.js'

const userIds: string[] = []
const contentIds: string[] = []

function makeUser(username: string) {
  const id = randomUUID()
  db.insert(users)
    .values({
      id,
      username: `${username}-${id.slice(0, 8)}`,
      email: null,
      passwordHash: 'x',
      displayName: username,
      role: 'kol',
      active: true,
    })
    .run()
  userIds.push(id)
  return id
}

function makeContent(status: 'READY' | 'DRAFT' = 'READY', assignedUserId?: string) {
  const id = randomUUID()
  db.insert(contents)
    .values({
      id,
      code: `T-${id.slice(0, 8)}`,
      title: 'test',
      status,
      assignedUserId: assignedUserId ?? null,
      // Distinct timestamps so "oldest first" ordering is deterministic.
      createdAt: new Date(Date.now() + contentIds.length).toISOString(),
    })
    .run()
  contentIds.push(id)
  return id
}

before(() => migrate())

after(() => {
  if (contentIds.length) db.delete(contents).where(inArray(contents.id, contentIds)).run()
  if (userIds.length) db.delete(users).where(inArray(users.id, userIds)).run()
  sqlite.close()
})

describe('claimContent', () => {
  it('lets exactly one of many racing workers win a single item', () => {
    const contentId = makeContent('READY')
    const workers = Array.from({ length: 20 }, (_, i) => makeUser(`race${i}`))

    const results = workers.map((uid) => claimContent(contentId, uid))
    const winners = results.filter((r) => r.ok)

    assert.equal(winners.length, 1, 'exactly one worker must win')
    assert.ok(
      results.filter((r) => !r.ok).every((r) => !r.ok && r.reason === 'already_claimed'),
      'every loser must be told the item was already claimed',
    )

    const row = db.select().from(contents).where(eq(contents.id, contentId)).get()!
    assert.equal(row.status, 'CLAIMED')
    assert.ok(workers.includes(row.claimedBy!), 'claimedBy must be one of the racers')
  })

  it('refuses to claim an item that is not READY', () => {
    const contentId = makeContent('DRAFT')
    const result = claimContent(contentId, makeUser('draft'))
    assert.equal(result.ok, false)
  })

  it('reports not_found for an unknown id', () => {
    const result = claimContent(randomUUID(), makeUser('ghost'))
    assert.equal(result.ok, false)
    assert.ok(!result.ok && result.reason === 'not_found')
  })

  it('only lets the assignee claim a pre-assigned item', () => {
    const assignee = makeUser('assignee')
    const stranger = makeUser('stranger')
    const contentId = makeContent('READY', assignee)

    assert.equal(claimContent(contentId, stranger).ok, false, 'stranger must be refused')
    assert.equal(claimContent(contentId, assignee).ok, true, 'assignee must succeed')
  })
})

describe('claimNext', () => {
  it('hands N items to N workers with no double-claim and no loss', () => {
    const itemCount = 12
    const workerCount = 30
    const items = new Set(Array.from({ length: itemCount }, () => makeContent('READY')))
    const workers = Array.from({ length: workerCount }, (_, i) => makeUser(`next${i}`))

    const results = workers.map((uid) => ({ uid, res: claimNext(uid) }))
    const claimed = results.filter((r) => r.res.ok)

    assert.equal(claimed.length, itemCount, 'every item must be handed out exactly once')
    assert.equal(
      results.length - claimed.length,
      workerCount - itemCount,
      'the remaining workers must come away empty',
    )

    const claimedIds = claimed.map((r) => (r.res.ok ? r.res.content.id : ''))
    assert.equal(new Set(claimedIds).size, itemCount, 'no item may be claimed twice')
    assert.ok(claimedIds.every((id) => items.has(id)), 'only our test items may be claimed')

    for (const { uid, res } of claimed) {
      assert.equal(res.ok && res.content.claimedBy, uid, 'claimedBy must match the winner')
    }
  })

  it('reports an empty queue when nothing is READY', () => {
    const result = claimNext(makeUser('empty'))
    assert.equal(result.ok, false)
    assert.ok(!result.ok && result.reason === 'empty_queue')
  })

  it('prefers items assigned to the caller over unassigned ones', () => {
    const user = makeUser('preferred')
    makeContent('READY') // older, unassigned
    const assigned = makeContent('READY', user) // newer, but assigned to them

    const result = claimNext(user)
    assert.ok(result.ok)
    assert.equal(result.ok && result.content.id, assigned)
  })
})

describe('releaseContent', () => {
  it('returns an item to the queue for its claimant, but not for a stranger', () => {
    const owner = makeUser('owner')
    const stranger = makeUser('thief')
    const contentId = makeContent('READY')
    assert.ok(claimContent(contentId, owner).ok)

    assert.equal(releaseContent(contentId, stranger), false, 'stranger must not release')
    assert.equal(releaseContent(contentId, owner), true, 'claimant may release')

    const row = db.select().from(contents).where(eq(contents.id, contentId)).get()!
    assert.equal(row.status, 'READY')
    assert.equal(row.claimedBy, null)
  })

  it('lets an admin release someone else’s claim', () => {
    const owner = makeUser('owner2')
    const contentId = makeContent('READY')
    assert.ok(claimContent(contentId, owner).ok)
    assert.equal(releaseContent(contentId, makeUser('admin'), true), true)
  })
})

describe('releaseStaleClaims', () => {
  it('reclaims items held longer than the cutoff and leaves fresh ones alone', () => {
    const user = makeUser('staler')
    const stale = makeContent('READY')
    const fresh = makeContent('READY')
    assert.ok(claimContent(stale, user).ok)
    assert.ok(claimContent(fresh, user).ok)

    // Backdate one claim by 48h.
    db.update(contents)
      .set({ claimedAt: new Date(Date.now() - 48 * 3_600_000).toISOString() })
      .where(eq(contents.id, stale))
      .run()

    const released = releaseStaleClaims(24)
    assert.equal(released, 1)
    assert.equal(db.select().from(contents).where(eq(contents.id, stale)).get()!.status, 'READY')
    assert.equal(db.select().from(contents).where(eq(contents.id, fresh)).get()!.status, 'CLAIMED')
  })
})
