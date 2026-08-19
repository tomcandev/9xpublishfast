/**
 * Daily Social Media Metric Tracking and Hook Performance Analyzer
 *
 * Usage:
 *   npm run track-metrics
 *   or: node --import tsx server/src/scripts/track-metrics.ts
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { migrate } from '../db/migrate.js'
import { repoRoot } from '../lib/config.js'
import { getHookPerformanceSummary, syncAllPublicationMetrics } from '../lib/metrics.js'

migrate()

console.log('🔄 Starting daily social media metrics crawler...')
const syncResult = await syncAllPublicationMetrics()
console.log(`✓ Checked ${syncResult.totalChecked} links, updated ${syncResult.updated}, errors: ${syncResult.errors}`)

const summary = getHookPerformanceSummary()
console.log('\n=================== 📊 HOOK PERFORMANCE SUMMARY ===================')
console.log(`Total Publications: ${summary.summary.totalPublications}`)
console.log(`Total Views:        ${summary.summary.totalViews.toLocaleString()}`)
console.log(`Total Likes:        ${summary.summary.totalLikes.toLocaleString()}`)
console.log(`Avg Views/Post:     ${summary.summary.avgViewsPerPost.toLocaleString()}`)
console.log('--------------------------------------------------------------------')

console.table(
  summary.hooks.map((h) => ({
    Hook: h.hookId,
    Category: h.category,
    Posts: h.totalPosts,
    TotalViews: h.totalViews,
    AvgViews: h.avgViews,
    Status: h.status.toUpperCase(),
    Recommendation: h.recommendation,
  })),
)

// Generate markdown report
const analyticsDir = join(repoRoot, 'docs/analytics')
if (!existsSync(analyticsDir)) mkdirSync(analyticsDir, { recursive: true })

const dateStr = new Date().toISOString().split('T')[0]
const reportPath = join(analyticsDir, `daily-metrics-${dateStr}.md`)

const mdContent = `# Social Media & Hook Performance Report (${dateStr})

## 1. Executive Summary
- **Total Published Posts**: ${summary.summary.totalPublications}
- **Total Tracked Views**: ${summary.summary.totalViews.toLocaleString()}
- **Total Likes / Interactions**: ${summary.summary.totalLikes.toLocaleString()}
- **Average Views Per Post**: ${summary.summary.avgViewsPerPost.toLocaleString()}

## 2. Hook Performance Ranking (Leaderboard)

| Rank | Hook ID | Category | Posts | Total Views | Avg Views | Action / Recommendation |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
${summary.hooks
  .map(
    (h, idx) =>
      `| ${idx + 1} | \`${h.hookId}\` | ${h.category} | ${h.totalPosts} | ${h.totalViews.toLocaleString()} | **${h.avgViews.toLocaleString()}** | ${h.recommendation} |`,
  )
  .join('\n')}

## 3. Detailed Post Verification Log

| Code | Title | Platform | Views | Likes | Last Checked | URL |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
${summary.posts
  .map(
    (p) =>
      `| ${p.code} | ${p.title} | ${p.platform} | **${(p.views || 0).toLocaleString()}** | ${p.likes || 0} | ${p.lastCheckedAt ? p.lastCheckedAt.split('T')[0] : 'N/A'} | [View Post](${p.publishedUrl}) |`,
  )
  .join('\n')}

---
*Generated automatically by PublishFast Metric Engine.*
`

writeFileSync(reportPath, mdContent, 'utf-8')
console.log(`\n✓ Saved daily performance report to: docs/analytics/daily-metrics-${dateStr}.md`)

process.exit(0)
