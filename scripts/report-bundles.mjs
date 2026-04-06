#!/usr/bin/env node
/**
 * Full bundle report: builds each listed entry with VITE_ANALYZE, patches only those keys in
 * bundle-top-dependencies.json (other screens and _meta are left unchanged).
 *
 * Usage:
 *   npm run report:bundles -- core/office/apps/slides,platform/apps/chat
 *   npm run report:bundles -- core/office/apps/slides, /core/office/apps/spreadsheets, platform/apps/bundle-dashboard
 *
 * Paths are comma-separated (or separate argv tokens). Leading slashes optional; optional prefix
 * src/business-apps/ is stripped. Each entry resolves to src/business-apps/<path>/index.ts.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOP_COMBINED_DEFAULT, buildBundleEntryPayload } from './utils/bundleTopDependenciesFromRaw.mjs'
import { getBitbucketPipelineMetadata } from './utils/bitbucketPipelineUrl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_FILE = path.join(ROOT, 'bundle-top-dependencies.json')
const LOG_DIR = path.join(ROOT, 'logs')
const RAW_ARCHIVE_DIR = path.join(LOG_DIR, 'bundle-raw-json')
const BA_PREFIX = 'src/business-apps/'

const MAINTAINER_NOTE = 'Updated by CI after screen publishes; hand-edit only for schema fixes or emergencies.'

/**
 * @param {string[]} argv process.argv.slice(2)
 * @returns {{ key: string, file: string }[]}
 */
function resolveReportEntriesFromArgv(argv) {
  const tokens = argv
    .join(',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const seen = new Set()
  const out = []

  for (let p of tokens) {
    p = p.replace(/^\/+/, '')
    if (p.startsWith(BA_PREFIX)) {
      p = p.slice(BA_PREFIX.length)
    }
    p = p.replace(/\/+$/, '')
    if (!p || seen.has(p)) continue
    seen.add(p)
    const file = `${BA_PREFIX}${p}/index.ts`
    out.push({ key: p, file })
  }

  return out
}

function runBuild(entryKey, entryFile) {
  const env = {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=8192',
    PROJECT_ROOT_DIR: ROOT,
    TARGET_ENTRY_KEY: entryKey,
    TARGET_ENTRY_FILE: entryFile,
    VITE_ANALYZE: 'true',
    NODE_ENV: 'production'
  }
  execSync('npx vite build', {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    shell: true
  })
}

function loadExistingDoc() {
  if (!fs.existsSync(OUT_FILE)) return null
  try {
    const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
    return prev && typeof prev === 'object' ? prev : null
  } catch {
    return null
  }
}

function main() {
  const argv = process.argv.slice(2)
  const reportEntries = resolveReportEntriesFromArgv(argv)

  if (reportEntries.length === 0) {
    console.error(`Usage: npm run report:bundles -- <paths>
  Example: npm run report:bundles -- core/office/apps/slides,platform/apps/chat
  Paths: comma-separated, with or without a leading slash; optional prefix src/business-apps/ is stripped.
  Each path is relative to src/business-apps/ and must have index.ts.`)
    process.exit(1)
  }

  const { bitbucketBuildNumber, pipelineUrl } = getBitbucketPipelineMetadata(process.env)

  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.mkdirSync(RAW_ARCHIVE_DIR, { recursive: true })

  const entries = {}
  let failures = 0

  for (const { key, file } of reportEntries) {
    const indexPath = path.join(ROOT, file)
    if (!fs.existsSync(indexPath)) {
      console.warn(`\nSKIP ${key}: missing ${file}`)
      failures++
      continue
    }

    console.log(`\n>>> Building analyze for ${key} ...\n`)
    try {
      runBuild(key, file)
    } catch (e) {
      console.error(`BUILD FAILED ${key}:`, e?.message || e)
      failures++
      continue
    }

    const jsonPath = path.join(ROOT, 'dist', 'bundle-stats.json')
    if (!fs.existsSync(jsonPath)) {
      console.error(`SKIP ${key}: dist/bundle-stats.json not found after build`)
      failures++
      continue
    }

    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    const safeName = key.replace(/\//g, '__')
    fs.copyFileSync(jsonPath, path.join(RAW_ARCHIVE_DIR, `${safeName}.json`))

    entries[key] = buildBundleEntryPayload({
      raw,
      projectRoot: ROOT,
      entryKey: key,
      topN: TOP_COMBINED_DEFAULT,
      bitbucketBuildNumber,
      pipelineUrl
    })
  }

  if (Object.keys(entries).length === 0) {
    console.error('\nNo bundle entries were analyzed successfully; bundle-top-dependencies.json was not modified.')
    process.exit(1)
  }

  const prev = loadExistingDoc()
  const doc = {
    ...(prev && typeof prev === 'object' ? prev : {}),
    ...entries
  }
  if (!doc._meta || typeof doc._meta !== 'object') {
    doc._meta = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      maintainerNote: MAINTAINER_NOTE
    }
  }

  fs.writeFileSync(OUT_FILE, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
  console.log(`\nUpdated ${Object.keys(entries).length} entry key(s) in ${OUT_FILE}`)
  if (failures > 0) {
    console.error(`\nCompleted with ${failures} skipped/failed entry(ies).`)
    process.exit(1)
  }
}

main()
