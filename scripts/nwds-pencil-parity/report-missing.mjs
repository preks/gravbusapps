import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const WORKSPACE_ROOT =
  process.env.WORKSPACE_ROOT || '/Users/denisprekrat/Documents/APPS/NEWWORK Apps/BusinessApps/gravity-business-apps'

const COVERAGE_PATH = path.join(WORKSPACE_ROOT, 'designs', 'nw-design-system-coverage.json')

const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf8'))

const missing = (coverage.exports || []).filter(e => e.status === 'missing')
const byModule = new Map()
const variantMissingRows = []
const storyMissingRows = []

for (const e of missing) {
  const key = e.moduleFrom || 'unknown'
  const entry = byModule.get(key) || { moduleFrom: key, count: 0, names: [] }
  entry.count += 1
  if (entry.names.length < 12) entry.names.push(e.name)
  byModule.set(key, entry)
}

const rows = [...byModule.values()].sort((a, b) => b.count - a.count)

for (const e of coverage.exports || []) {
  if (e.status !== 'mapped') continue
  const missingVariants = (e.requiredVariantKeys || []).filter(k => !e.variantCoverage?.[k])
  const missingStories = (e.requiredStoryKeys || []).filter(k => !e.storyCoverage?.[k])
  if (missingVariants.length) {
    variantMissingRows.push({
      moduleFrom: e.moduleFrom,
      name: e.name,
      count: missingVariants.length,
      keys: missingVariants.slice(0, 8)
    })
  }
  if (missingStories.length) {
    storyMissingRows.push({
      moduleFrom: e.moduleFrom,
      name: e.name,
      count: missingStories.length,
      keys: missingStories.slice(0, 8)
    })
  }
}

variantMissingRows.sort((a, b) => b.count - a.count)
storyMissingRows.sort((a, b) => b.count - a.count)

console.log(`Missing exports: ${missing.length}`)

console.log('Top modules by missing count:')

for (const r of rows.slice(0, 30)) {
  console.log(
    `- ${r.count.toString().padStart(3, ' ')}  ${r.moduleFrom}  ` +
      `(${r.names.join(', ')}${r.count > r.names.length ? ', …' : ''})`
  )
}

const totalVariantMissing = variantMissingRows.reduce((acc, r) => acc + r.count, 0)
const totalStoryMissing = storyMissingRows.reduce((acc, r) => acc + r.count, 0)

console.log(`Missing variant keys: ${totalVariantMissing}`)

console.log(`Missing story-state keys: ${totalStoryMissing}`)

if (variantMissingRows.length) {
  console.log('Top exports by missing variant keys:')
  for (const r of variantMissingRows.slice(0, 20)) {
    console.log(`- ${r.moduleFrom}::${r.name} (${r.count}) [${r.keys.join(', ')}]`)
  }
}

if (storyMissingRows.length) {
  console.log('Top exports by missing story-state keys:')
  for (const r of storyMissingRows.slice(0, 20)) {
    console.log(`- ${r.moduleFrom}::${r.name} (${r.count}) [${r.keys.join(', ')}]`)
  }
}
