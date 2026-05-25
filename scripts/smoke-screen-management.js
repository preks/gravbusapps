#!/usr/bin/env node
/**
 * Weekly SMS smoke (CI only — pipeline sms-smoke-weekly runs this script via node).
 * Read-only checks across dev / prod1 / prod2. One GET /screen per env; findings at end only.
 *
 * Release gate (exit 1): SETUP, FETCH, FATAL, E1 on dev, E2, E3 (full repo catalog RC).
 * Warnings: E1 on prod1/prod2, W1–W10 (prod dupes do not block; publish purges in-scope).
 */

import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'
import { fetchAllScreensPaginated } from './api-client.js'
import { getScreenDirectories } from './utils/screenDiscovery.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const RC_PREFIX = process.env.RC_PREFIX || 'release-candidates'
const MAX_EXAMPLES = 8

const REPORT_JSON = 'sms-smoke-report.json'
const REPORT_MD = 'sms-smoke-summary.md'

const ENV_LABEL = {
  dev: 'dev',
  prod1: 'prod1 (main prod)',
  prod2: 'prod2 (second prod)'
}

/** Plain-language text per check code (for logs + artifacts). */
const CHECK_COPY = {
  SETUP: {
    title: 'Pipeline not configured',
    plain: 'A required API URL or password env var is missing.',
    hint: 'Fix Bitbucket pipeline variables for this step.'
  },
  FETCH: {
    title: 'Could not load screens',
    plain: 'The API call to list screens failed or returned nothing.',
    hint: 'Check OAuth credentials and the screen-management URL for that env.'
  },
  FATAL: {
    title: 'Smoke script crashed',
    plain: 'Something threw before checks finished.',
    hint: 'See the stack trace above in the raw log.'
  },
  E1: {
    title: 'Duplicate screen in registry',
    plain: 'Same screen registered twice (or more) under one key. The app may open the wrong row.',
    hint: 'Dev: fix before release. Prod: optional cleanup; publish-manual-prod purges in-scope keys.'
  },
  E2: {
    title: 'Dev registry pick-a-winner bug',
    plain: 'More than one dev row shares the screenKey for a repo screen. Runtime uses the first row only.',
    hint: 'Remove duplicate dev rows for that screenKey.'
  },
  E3: {
    title: 'No release bundle in storage',
    plain: 'Azure has no release-candidate JS for this screen (dev publish may not have run).',
    hint: 'Run dev screen publish so release-candidates/<path>/index-<build>.js exists.'
  },
  W1: {
    title: 'Registry path not in this repo',
    plain: 'A registry row points at a git folder path we do not ship (many rows can share one path).',
    hint: 'Old or manual data — safe to ignore for releases; cleanup when bored.'
  },
  W2: {
    title: 'Repo screen not on dev registry yet',
    plain: 'Git has this screen but dev SMS has no native row — platform will not load it until published.',
    hint: 'Normal for WIP. Publish via develop pipeline when you want it on dev.'
  },
  W3: {
    title: 'Broken registry row',
    plain: 'Row missing screenKey, native without path, or weird builder type.',
    hint: 'Fix or delete the bad row in SMS.'
  },
  W4: {
    title: 'Legacy low-code / appId',
    plain: 'Row still uses old LOWCODER builder or appId field.',
    hint: 'We want native only — cleanup when possible.'
  },
  W5: {
    title: 'Prod junk not on dev',
    plain: 'Prod has a registry row dev does not recognize (by screen key or path).',
    hint: 'Does not block dev→prod publish; optional delete on prod.'
  },
  W6: {
    title: 'Prod-only screen in registry',
    plain: 'A screen exists on prod under a key that dev does not have at all.',
    hint: 'Subset of prod junk — optional cleanup.'
  },
  W7: {
    title: 'Prod duplicated, dev OK',
    plain: 'Prod has multiple rows for one screenKey but dev has only one.',
    hint: 'Prod cleanup — same class as E1 but only on prod.'
  },
  W8: {
    title: 'Old low-code rows on prod',
    plain: 'Prod still has legacy FORM/LOWCODER rows for a screen we ship as native.',
    hint: 'Can block prod publish with 409 until purged.'
  },
  W9: {
    title: 'Prod export would choke',
    plain: 'If you exported prod screens to JSON, duplicate names in that file would fail import.',
    hint: 'Fix dup screenKeys (or appIds) before using export/import between prods.'
  },
  W10: {
    title: 'Dev and prod disagree',
    plain: 'Same repo screen but dev vs prod registry fields differ (name, path, or prod missing build no).',
    hint: 'Often prod not promoted yet, or keys renamed on one side only.'
  }
}

/** @type {Array<object>} */
const errors = []
/** @type {Array<object>} */
const warnings = []

function envLabel(env) {
  return env ? ENV_LABEL[env] || env : ''
}

function enrichFinding(list, { code, env, message, details }) {
  const copy = CHECK_COPY[code] || { title: code, plain: message, hint: '' }
  list.push({
    code,
    env,
    message,
    title: copy.title,
    plain: copy.plain,
    hint: copy.hint,
    details
  })
}

function countFromDetails(details) {
  if (!details || typeof details !== 'object') return null
  if (typeof details.total === 'number') return details.total
  return null
}

function formatExamples(item) {
  const d = item.details
  if (!d || typeof d !== 'object') return []

  const lines = []
  const push = s => {
    if (s && lines.length < MAX_EXAMPLES) lines.push(s)
  }

  switch (item.code) {
    case 'E1':
      for (const x of d.duplicates || []) {
        push(`  • ${x.screenKey} (${x.count} rows)`)
      }
      break
    case 'E2':
      for (const x of d.samples || []) {
        push(`  • ${x.repoPath} → key ${x.screenKey} (${x.rowCount} rows)`)
      }
      break
    case 'E3':
      for (const x of d.samples || []) push(`  • ${formatPathAndKey(x)}`)
      break
    case 'W2':
      for (const p of d.samples || []) push(`  • ${p}`)
      break
    case 'W1':
    case 'W5':
    case 'W4':
      for (const x of d.samples || []) push(`  • ${formatPathAndKey(x)}`)
      break
    case 'W6':
      for (const k of d.samples || []) push(`  • ${k}`)
      break
    case 'W7':
      for (const x of d.samples || []) push(`  • ${x.screenKey} (prod ${x.prodCount} rows, dev 1)`)
      break
    case 'W10':
      for (const x of d.samples || []) {
        const label = formatPathAndKey(x)
        if (x.issue) {
          push(`  • ${label}: ${x.issue}`)
          continue
        }
        const bits = (x.fields || []).map(f => {
          if (f.issue) return `${f.field}: ${f.issue}`
          if (f.dev != null && f.prod != null) return `${f.field} dev=${f.dev} prod=${f.prod}`
          return f.field
        })
        push(`  • ${label}: ${bits.join('; ')}`)
      }
      break
    case 'W8':
      for (const x of d.samples || []) push(`  • ${formatPathAndKey(x)}`)
      break
    case 'W3':
      for (const x of d.samples || []) {
        push(`  • ${formatPathAndKey(x)}: ${x.issue}`)
      }
      break
    case 'W9': {
      const keys = d.duplicateScreenKeys || []
      const apps = d.duplicateAppIds || []
      for (const k of keys) push(`  • dup screenKey: ${k}`)
      for (const a of apps) push(`  • dup appId: ${a}`)
      break
    }
    default:
      break
  }

  const total = countFromDetails(d)
  if (total != null && total > MAX_EXAMPLES) {
    lines.push(`  … and ${total - MAX_EXAMPLES} more (see ${REPORT_JSON})`)
  }
  return lines
}

function formatFindingHeadline(item, severity) {
  const where = item.env ? `${envLabel(item.env)} — ` : ''
  const n = countFromDetails(item.details)
  const countBit = n != null ? ` (${n})` : ''
  return `${severity} ${where}${item.title}${countBit}`
}

function normalizeComponentPath(value) {
  if (!value || typeof value !== 'string') return ''
  return value.replace(/^\/+/, '').trim()
}

function screenKeyOf(screen) {
  return screen?.screenKey != null ? String(screen.screenKey).trim() : ''
}

function builderTypeOf(screen) {
  return screen?.screenComponents?.builderType != null ? String(screen.screenComponents.builderType) : ''
}

function componentPathOf(screen) {
  return normalizeComponentPath(screen?.screenComponents?.formDefinition?.componentPath)
}

/** Console line: path and screenKey together (many rows can share one path). */
function formatPathAndKey(x) {
  const path = x.componentPath || x.repoPath
  const key = x.screenKey
  const prodKey = x.prodScreenKey
  let line = path || key || (x.id != null ? `id ${x.id}` : '(unknown)')
  const keyBits = []
  if (key) keyBits.push(`key ${key}`)
  if (prodKey && prodKey !== key) keyBits.push(`prod key ${prodKey}`)
  if (keyBits.length) line = path ? `${path} — ${keyBits.join(', ')}` : keyBits.join(', ')
  if (x.builderType) line += ` (${x.builderType})`
  return line
}

/** Prod SMS only: Bitbucket build no written on prod sync (dev SMS leaves version empty). */
function versionOf(screen) {
  const v = screen?.screenComponents?.formDefinition?.version
  return v != null ? String(v).trim() : ''
}

function appIdOf(screen) {
  const id = screen?.screenComponents?.appId
  return id != null ? String(id).trim() : ''
}

function isNativeScreen(screen) {
  return builderTypeOf(screen) === 'NATIVE_SCREEN'
}

function pathMatchesRepo(componentPath, repoPath) {
  if (!componentPath || !repoPath) return false
  return componentPath === repoPath || componentPath.endsWith(`/${repoPath}`)
}

/**
 * @param {object[]} screens
 * @param {string} repoPath
 */
function screensForRepoPath(screens, repoPath) {
  return screens.filter(s => pathMatchesRepo(componentPathOf(s), repoPath))
}

/**
 * Prefer NATIVE_SCREEN when multiple rows share screenKey (publish-prod parity).
 * @param {object[]} screens
 */
function pickPreferredByScreenKey(screens) {
  const byKey = new Map()
  for (const screen of screens) {
    const key = screenKeyOf(screen)
    if (!key) continue
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, screen)
      continue
    }
    if (isNativeScreen(screen) && !isNativeScreen(existing)) {
      byKey.set(key, screen)
    }
  }
  return byKey
}

/**
 * @param {object[]} screens
 * @param {string} repoPath
 */
function pickDevNativeForRepoPath(screens, repoPath) {
  const matches = screensForRepoPath(screens, repoPath).filter(isNativeScreen)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]
  const withKey = pickPreferredByScreenKey(matches)
  return withKey.values().next().value ?? matches[0]
}

/**
 * @param {string} code
 * @param {(ctx: { addError: Function, addWarning: Function }) => void | Promise<void>} fn
 * @param {{ env?: string }} meta
 */
async function runCheck(code, fn, meta = {}) {
  const addError = (message, details) => enrichFinding(errors, { code, env: meta.env, message, details })
  const addWarning = (message, details) => enrichFinding(warnings, { code, env: meta.env, message, details })
  try {
    await fn({ addError, addWarning })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    enrichFinding(errors, {
      code,
      env: meta.env,
      message,
      details: { runtime: true }
    })
  }
}

function groupByScreenKey(screens) {
  /** @type {Map<string, object[]>} */
  const map = new Map()
  for (const screen of screens) {
    const key = screenKeyOf(screen)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(screen)
  }
  return map
}

function buildExportSet(screens) {
  return screens.filter(s => builderTypeOf(s) !== 'LOWCODER')
}

function resolveDevOauth() {
  return {
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    oauthUrl: process.env.OAUTH_URL,
    realm: process.env.OAUTH_REALM
  }
}

function resolveProdOauth(prefix = 'PROD') {
  return {
    clientId: process.env[`OAUTH_CLIENT_ID_${prefix}`],
    clientSecret: process.env[`OAUTH_CLIENT_SECRET_${prefix}`],
    oauthUrl: process.env[`OAUTH_URL_${prefix}`],
    realm: process.env[`OAUTH_REALM_${prefix}`]
  }
}

function oauthConfigured(oauth) {
  return Boolean(oauth.clientId && oauth.clientSecret)
}

function resolveSmsTargets() {
  /** @type {Array<{ label: string, api: string, oauth: object, optional: boolean }>} */
  const targets = []

  const devApi = process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API
  const devOauth = resolveDevOauth()
  if (devApi && oauthConfigured(devOauth)) {
    targets.push({ label: 'dev', api: devApi, oauth: devOauth, optional: false })
  }

  const prod1Api = process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD
  const prod1Oauth = resolveProdOauth('PROD')
  if (prod1Api && oauthConfigured(prod1Oauth)) {
    targets.push({ label: 'prod1', api: prod1Api, oauth: prod1Oauth, optional: false })
  }

  const prod2Api =
    process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY ||
    process.env.SCREEN_MANAGEMENT_SERVICE_API_SECOND ||
    process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD_2
  const prod2Oauth = {
    clientId:
      process.env.OAUTH_CLIENT_ID_PROD_SECONDARY ||
      process.env.OAUTH_CLIENT_ID_SECOND ||
      process.env.OAUTH_CLIENT_ID_PROD_2,
    clientSecret:
      process.env.OAUTH_CLIENT_SECRET_PROD_SECONDARY ||
      process.env.OAUTH_CLIENT_SECRET_SECOND ||
      process.env.OAUTH_CLIENT_SECRET_PROD_2,
    oauthUrl: process.env.OAUTH_URL_PROD_SECONDARY || process.env.OAUTH_URL_SECOND || process.env.OAUTH_URL_PROD_2,
    realm: process.env.OAUTH_REALM_PROD_SECONDARY || process.env.OAUTH_REALM_SECOND || process.env.OAUTH_REALM_PROD_2
  }
  if (prod2Api && oauthConfigured(prod2Oauth)) {
    targets.push({ label: 'prod2', api: prod2Api, oauth: prod2Oauth, optional: true })
  }

  return targets
}

function resolveRcAzure() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_PROD
  const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN_PROD
  const containerName = process.env.AZURE_BLOB_CONTAINER_NAME_PROD || 'screens'
  if (!accountName || !sasToken) return null
  const blobServiceUrl = `https://${accountName}.blob.core.windows.net/?${sasToken}`
  const containerClient = new BlobServiceClient(blobServiceUrl).getContainerClient(containerName)
  return { accountName, containerName, containerClient }
}

async function fetchEnvScreens(target) {
  return fetchAllScreensPaginated(target.api, target.oauth, {
    quiet: true,
    logLabel: `${target.label} screens (all builder types)`
  })
}

/**
 * RC artifacts use Bitbucket build number in blob names: release-candidates/<path>/index-<BITBUCKET_BUILD_NUMBER>.js
 * (see publish-dev-screen.js RC_VERSION / uploadReleaseCandidateArtifacts). One container list for all paths.
 * @param {import('@azure/storage-blob').ContainerClient} containerClient
 * @returns {Promise<Map<string, Set<string>>>} componentPath -> RC version strings from blob names
 */
async function buildRcVersionIndexByComponentPath(containerClient) {
  const index = new Map()
  const prefix = `${RC_PREFIX}/`.replace(/\\/g, '/')

  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    if (!blob.name.startsWith(prefix)) continue
    const relative = blob.name.slice(prefix.length)
    const match = relative.match(/^(.+)\/index-(.+)\.js$/)
    if (!match) continue
    const componentPath = match[1].replace(/\\/g, '/')
    const rcVersion = match[2]
    if (!index.has(componentPath)) index.set(componentPath, new Set())
    index.get(componentPath).add(rcVersion)
  }

  return index
}

function appendFindingBlock(lines, item, severityLabel) {
  lines.push(`### ${formatFindingHeadline(item, severityLabel)}`)
  lines.push('')
  lines.push(item.plain)
  if (item.hint) lines.push(`_${item.hint}_`)
  const examples = formatExamples(item)
  if (examples.length > 0) {
    lines.push('')
    lines.push('Examples:')
    lines.push(...examples)
  }
  lines.push('')
}

function writeReports(startedAt) {
  const finishedAt = new Date().toISOString()
  const report = {
    startedAt,
    finishedAt,
    errorCount: errors.length,
    warningCount: warnings.length,
    releaseGate: 'Exit 1 on SETUP, FETCH, FATAL, E1(dev), E2, E3. E1(prod) and W1–W10 are warnings only.',
    whatThisPipelineDoes:
      'Read-only release gate on screen registry (dev + prod). Does not publish or delete anything.',
    errors,
    warnings
  }
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  const lines = [
    '# Screen registry smoke — summary',
    '',
    'Quick check that screen lists in dev/prod look sane. **Read-only** — nothing was changed.',
    '',
    `Finished: ${finishedAt}`,
    `Release blockers: **${errors.length}**`,
    `Heads-up (does not block release): **${warnings.length}**`,
    ''
  ]

  if (errors.length > 0) {
    lines.push('## Release blockers (pipeline fails)', '')
    for (const item of errors) appendFindingBlock(lines, item, '❌')
  }

  if (warnings.length > 0) {
    lines.push('## Heads-up (does not fail pipeline)', '')
    for (const item of warnings) appendFindingBlock(lines, item, '⚠️')
  }

  if (errors.length === 0 && warnings.length === 0) {
    lines.push('All good — nothing to report.')
  }

  lines.push('', `Full detail: \`${REPORT_JSON}\` (for engineers).`)

  fs.writeFileSync(REPORT_MD, `${lines.join('\n')}\n`, 'utf8')
}

function printFindings() {
  console.log('')
  console.log('======== Screen registry smoke (read-only) ========')
  console.log('Checked dev + prod screen lists. Did not publish or delete anything.')
  console.log('')

  if (errors.length === 0 && warnings.length === 0) {
    console.log('All good. No problems found.')
    console.log('')
    console.log(`Artifacts: ${REPORT_MD}, ${REPORT_JSON}`)
    return
  }

  if (errors.length > 0) {
    console.log(`RELEASE BLOCKERS (${errors.length}) — pipeline fails until these are fixed`)
    console.log('')
    for (const item of errors) {
      console.log(formatFindingHeadline(item, '❌'))
      console.log(`   ${item.plain}`)
      if (item.hint) console.log(`   Tip: ${item.hint}`)
      for (const line of formatExamples(item)) console.log(line)
      console.log('')
    }
  }

  if (warnings.length > 0) {
    console.log(`HEADS-UP (${warnings.length}) — does not block release if only these`)
    console.log('')
    for (const item of warnings) {
      console.log(formatFindingHeadline(item, '⚠️'))
      console.log(`   ${item.plain}`)
      if (item.hint) console.log(`   Tip: ${item.hint}`)
      for (const line of formatExamples(item)) console.log(line)
      console.log('')
    }
  }

  console.log(`More rows: download ${REPORT_JSON}`)
  console.log(`Short summary: ${REPORT_MD}`)
  if (errors.length > 0) {
    console.log('')
    console.log('Pipeline marked failed — release blocked by RELEASE BLOCKERS above.')
  }
}

async function main() {
  const startedAt = new Date().toISOString()
  console.log('Screen registry smoke — running (read-only, no data changes)...')

  const projectRoot = path.resolve(__dirname, '..')
  const repoDirs = await getScreenDirectories({ cwd: projectRoot })
  const repoPaths = repoDirs
    .map(dir => dir.replace(/^src\/business-apps\//, '').replace(/\\/g, '/'))
    .filter(Boolean)
    .sort()
  const repoPathSet = new Set(repoPaths)

  const targets = resolveSmsTargets()
  if (!targets.some(t => t.label === 'dev')) {
    enrichFinding(errors, {
      code: 'SETUP',
      message: 'dev SMS not configured',
      details: { missing: 'NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API, OAUTH_CLIENT_ID/SECRET' }
    })
  }
  if (!targets.some(t => t.label === 'prod1')) {
    enrichFinding(errors, {
      code: 'SETUP',
      message: 'prod1 SMS not configured',
      details: { missing: 'SCREEN_MANAGEMENT_SERVICE_API_PROD, OAUTH_CLIENT_ID_PROD/SECRET_PROD' }
    })
  }

  /** @type {Map<string, object[]>} */
  const screensByEnv = new Map()
  /** @type {Map<string, object[]>} */
  const nativesByEnv = new Map()

  for (const target of targets) {
    await runCheck(
      'FETCH',
      async ({ addWarning }) => {
        const screens = await fetchEnvScreens(target)
        screensByEnv.set(target.label, screens)
        nativesByEnv.set(target.label, screens.filter(isNativeScreen))
        console.log(`  loaded ${envLabel(target.label)}: ${screens.length} screens`)
        if (screens.length === 0) {
          addWarning('SMS returned zero screens', { total: 0 })
        }
      },
      { env: target.label }
    )
  }

  const devScreens = screensByEnv.get('dev') || []
  const devFetchOk = devScreens.length > 0
  const devNatives = nativesByEnv.get('dev') || []
  const devKeys = new Set(devScreens.map(screenKeyOf).filter(Boolean))
  const devPaths = new Set(devNatives.map(componentPathOf).filter(Boolean))

  for (const target of targets) {
    const screens = screensByEnv.get(target.label)
    if (!screens) continue
    const env = target.label

    await runCheck(
      'E1',
      async ({ addError, addWarning }) => {
        const dupes = []
        for (const [key, rows] of groupByScreenKey(screens)) {
          if (rows.length > 1) {
            dupes.push({
              screenKey: key,
              count: rows.length,
              ids: rows.map(r => r.id),
              builderTypes: rows.map(builderTypeOf)
            })
          }
        }
        if (dupes.length > 0) {
          const details = {
            duplicates: dupes.slice(0, 50),
            total: dupes.length
          }
          const message = `Duplicate screenKey: ${dupes.length} key(s)`
          if (env === 'dev') addError(message, details)
          else addWarning(message, details)
        }
      },
      { env }
    )

    await runCheck(
      'W1',
      async ({ addWarning }) => {
        const orphans = []
        for (const screen of screens) {
          const cp = componentPathOf(screen)
          if (!cp || repoPathSet.has(cp)) continue
          const matchesRepo = repoPaths.some(rp => pathMatchesRepo(cp, rp))
          if (!matchesRepo) {
            orphans.push({
              screenKey: screenKeyOf(screen),
              componentPath: cp,
              builderType: builderTypeOf(screen),
              id: screen.id
            })
          }
        }
        if (orphans.length > 0) {
          addWarning(`componentPath not in repo: ${orphans.length} row(s)`, {
            samples: orphans.slice(0, 50),
            total: orphans.length
          })
        }
      },
      { env }
    )

    await runCheck(
      'W3',
      async ({ addWarning }) => {
        const bad = []
        for (const screen of screens) {
          const key = screenKeyOf(screen)
          const bt = builderTypeOf(screen)
          const cp = componentPathOf(screen)
          if (!key) {
            bad.push({ id: screen.id, componentPath: cp || null, issue: 'empty screenKey', builderType: bt })
          } else if (isNativeScreen(screen) && !cp) {
            bad.push({ id: screen.id, screenKey: key, issue: 'native missing componentPath', builderType: bt })
          } else if (bt && !['NATIVE_SCREEN', 'LOWCODER', 'FORM', 'FORMIO'].includes(bt)) {
            bad.push({
              id: screen.id,
              screenKey: key,
              componentPath: cp || null,
              issue: `unknown builderType ${bt}`,
              builderType: bt
            })
          }
        }
        if (bad.length > 0) {
          addWarning(`Malformed metadata: ${bad.length} row(s)`, { samples: bad.slice(0, 50), total: bad.length })
        }
      },
      { env }
    )

    await runCheck(
      'W4',
      async ({ addWarning }) => {
        const legacy = []
        for (const screen of screens) {
          const bt = builderTypeOf(screen)
          const appId = appIdOf(screen)
          if (bt === 'LOWCODER' || appId) {
            legacy.push({
              screenKey: screenKeyOf(screen),
              builderType: bt,
              appId: appId || null,
              id: screen.id,
              componentPath: componentPathOf(screen)
            })
          }
        }
        if (legacy.length > 0) {
          addWarning(`Legacy LOWCODER or appId present: ${legacy.length} row(s)`, {
            samples: legacy.slice(0, 50),
            total: legacy.length
          })
        }
      },
      { env }
    )

    if ((env === 'prod1' || env === 'prod2') && devFetchOk) {
      await runCheck(
        'W5',
        async ({ addWarning }) => {
          const orphans = []
          for (const screen of screens) {
            const key = screenKeyOf(screen)
            const cp = componentPathOf(screen)
            const keyOnDev = key && devKeys.has(key)
            const pathOnDev = cp && (devPaths.has(cp) || repoPaths.some(rp => pathMatchesRepo(cp, rp)))
            if (!keyOnDev && !pathOnDev) {
              orphans.push({
                screenKey: key,
                componentPath: cp,
                builderType: builderTypeOf(screen),
                id: screen.id
              })
            }
          }
          if (orphans.length > 0) {
            addWarning(`Prod row not on dev (orphan): ${orphans.length} row(s)`, {
              samples: orphans.slice(0, 50),
              total: orphans.length
            })
          }
        },
        { env }
      )

      await runCheck(
        'W6',
        async ({ addWarning }) => {
          const prodOnlyKeys = []
          for (const key of groupByScreenKey(screens).keys()) {
            if (!devKeys.has(key)) prodOnlyKeys.push(key)
          }
          if (prodOnlyKeys.length > 0) {
            addWarning(`screenKey on prod but not on dev: ${prodOnlyKeys.length} key(s)`, {
              samples: prodOnlyKeys.slice(0, 50),
              total: prodOnlyKeys.length
            })
          }
        },
        { env }
      )

      await runCheck(
        'W7',
        async ({ addWarning }) => {
          const mismatches = []
          for (const [key, prodRows] of groupByScreenKey(screens)) {
            const devRows = groupByScreenKey(devScreens).get(key) || []
            if (devRows.length === 1 && prodRows.length > 1) {
              mismatches.push({
                screenKey: key,
                devCount: 1,
                prodCount: prodRows.length,
                prodBuilderTypes: prodRows.map(builderTypeOf)
              })
            }
          }
          if (mismatches.length > 0) {
            addWarning(`Prod duplicate screenKey while dev clean: ${mismatches.length} key(s)`, {
              samples: mismatches.slice(0, 50),
              total: mismatches.length
            })
          }
        },
        { env }
      )

      await runCheck(
        'W8',
        async ({ addWarning }) => {
          const extras = []
          for (const repoPath of repoPaths) {
            const devNative = pickDevNativeForRepoPath(devNatives, repoPath)
            if (!devNative) continue
            const key = screenKeyOf(devNative)
            const prodRows = (groupByScreenKey(screens).get(key) || []).filter(
              r => builderTypeOf(r) === 'LOWCODER' || builderTypeOf(r) === 'FORM' || builderTypeOf(r) === 'FORMIO'
            )
            if (prodRows.length > 0) {
              extras.push({
                repoPath,
                screenKey: key,
                legacyRows: prodRows.map(r => ({ id: r.id, builderType: builderTypeOf(r) }))
              })
            }
          }
          if (extras.length > 0) {
            addWarning(`Legacy builder rows for repo screenKey on prod: ${extras.length} case(s)`, {
              samples: extras.slice(0, 50),
              total: extras.length
            })
          }
        },
        { env }
      )

      await runCheck(
        'W9',
        async ({ addWarning }) => {
          const exportSet = buildExportSet(screens)
          const keyCounts = new Map()
          const appIdCounts = new Map()
          for (const screen of exportSet) {
            const key = screenKeyOf(screen)
            if (key) keyCounts.set(key, (keyCounts.get(key) || 0) + 1)
            const aid = appIdOf(screen)
            if (aid) appIdCounts.set(aid, (appIdCounts.get(aid) || 0) + 1)
          }
          const dupKeys = [...keyCounts.entries()].filter(([, c]) => c > 1).map(([k]) => k)
          const dupAppIds = [...appIdCounts.entries()].filter(([, c]) => c > 1).map(([a]) => a)
          if (dupKeys.length > 0 || dupAppIds.length > 0) {
            addWarning('Simulated prod export/import would fail validateImportScreens', {
              duplicateScreenKeys: dupKeys.slice(0, 50),
              duplicateAppIds: dupAppIds.slice(0, 50),
              exportRowCount: exportSet.length
            })
          }
        },
        { env }
      )
    }
  }

  if (devScreens.length > 0) {
    await runCheck(
      'W2',
      async ({ addWarning }) => {
        const missing = []
        for (const repoPath of repoPaths) {
          const native = pickDevNativeForRepoPath(devNatives, repoPath)
          if (!native) missing.push(repoPath)
        }
        if (missing.length > 0) {
          addWarning(`Repo screen not registered on dev yet: ${missing.length} path(s)`, {
            samples: missing.slice(0, 50),
            total: missing.length
          })
        }
      },
      { env: 'dev' }
    )

    await runCheck(
      'E2',
      async ({ addError }) => {
        const lottery = []
        const byKey = groupByScreenKey(devScreens)
        for (const repoPath of repoPaths) {
          const native = pickDevNativeForRepoPath(devNatives, repoPath)
          if (!native) continue
          const key = screenKeyOf(native)
          const rows = byKey.get(key) || []
          if (rows.length > 1) {
            lottery.push({
              repoPath,
              screenKey: key,
              rowCount: rows.length,
              ids: rows.map(r => r.id),
              builderTypes: rows.map(builderTypeOf)
            })
          }
        }
        if (lottery.length > 0) {
          addError(`Dev screenKey lottery (data[0] risk): ${lottery.length} repo key(s)`, {
            samples: lottery.slice(0, 50),
            total: lottery.length
          })
        }
      },
      { env: 'dev' }
    )

    await runCheck(
      'E3',
      async ({ addError }) => {
        const rcAzure = resolveRcAzure()
        if (!rcAzure) {
          addError('RC Azure not configured (AZURE_STORAGE_ACCOUNT_PROD, AZURE_STORAGE_SAS_TOKEN_PROD)')
          return
        }

        const rcVersionIndex = await buildRcVersionIndexByComponentPath(rcAzure.containerClient)
        const noRcArtifact = []
        const checkedPaths = new Set()

        for (const repoPath of repoPaths) {
          const native = pickDevNativeForRepoPath(devNatives, repoPath)
          if (!native) continue
          const cp = componentPathOf(native) || repoPath
          if (checkedPaths.has(cp)) continue
          checkedPaths.add(cp)

          const rcVersions = rcVersionIndex.get(cp)
          if (!rcVersions || rcVersions.size === 0) {
            noRcArtifact.push({
              repoPath,
              screenKey: screenKeyOf(native),
              componentPath: cp,
              expectedBlobPattern: `${RC_PREFIX}/${cp}/index-<BITBUCKET_BUILD_NUMBER>.js`
            })
          }
        }

        if (noRcArtifact.length > 0) {
          addError(`No RC index-*.js in Azure for repo screen: ${noRcArtifact.length} path(s)`, {
            container: rcAzure.containerName,
            samples: noRcArtifact.slice(0, 50),
            total: noRcArtifact.length
          })
        }
      },
      { env: 'dev' }
    )

    for (const prodLabel of ['prod1', 'prod2']) {
      const prodScreens = screensByEnv.get(prodLabel)
      const prodNatives = nativesByEnv.get(prodLabel)
      if (!prodScreens) continue

      await runCheck(
        'W10',
        async ({ addWarning }) => {
          const drifts = []
          for (const repoPath of repoPaths) {
            const devNative = pickDevNativeForRepoPath(devNatives, repoPath)
            const prodNative = pickDevNativeForRepoPath(prodNatives, repoPath)
            if (!devNative) continue
            if (!prodNative) {
              drifts.push({
                repoPath,
                screenKey: screenKeyOf(devNative),
                issue: 'missing prod native for repo path'
              })
              continue
            }
            const fields = []
            if (screenKeyOf(devNative) !== screenKeyOf(prodNative)) {
              fields.push({
                field: 'screenKey',
                dev: screenKeyOf(devNative),
                prod: screenKeyOf(prodNative)
              })
            }
            if (componentPathOf(devNative) !== componentPathOf(prodNative)) {
              fields.push({
                field: 'componentPath',
                dev: componentPathOf(devNative),
                prod: componentPathOf(prodNative)
              })
            }
            if (!versionOf(prodNative)) {
              fields.push({ field: 'version', issue: 'prod missing version (expected Bitbucket build no)' })
            }
            if (fields.length > 0) {
              drifts.push({
                repoPath,
                screenKey: screenKeyOf(devNative),
                prodScreenKey: screenKeyOf(prodNative),
                fields
              })
            }
          }
          if (drifts.length > 0) {
            addWarning(`Dev vs ${prodLabel} drift (repo scope): ${drifts.length} path(s)`, {
              samples: drifts.slice(0, 50),
              total: drifts.length
            })
          }
        },
        { env: prodLabel }
      )
    }
  }

  writeReports(startedAt)
  printFindings()

  if (errors.length > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  enrichFinding(errors, {
    code: 'FATAL',
    message: err instanceof Error ? err.message : String(err)
  })
  try {
    writeReports(new Date().toISOString())
    printFindings()
  } catch {
    console.error(err)
  }
  process.exit(1)
})
