import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import {
  getAllNativeScreens,
  convertScreenKeyToUrl,
  getResourceUrlByPath,
  getAllResourceUrls,
  syncResourceUrlWithSameId
} from './api-client.js'
import { logPhase } from './utils/logPhase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const PUBLISHED_SCREENS_FILE = path.resolve(__dirname, '..', 'published-screens.txt')
const RESOURCE_URL_RESULT_FILE = path.resolve(__dirname, '..', 'resource-url-result.json')

const NAVIGATION_SERVICE_API_PROD_SECONDARY =
  process.env.NAVIGATION_SERVICE_API_PROD_SECONDARY ||
  process.env.NAVIGATION_SERVICE_API_SECOND ||
  process.env.NAVIGATION_SERVICE_API_PROD_2
const OAUTH_CLIENT_ID_PROD_SECONDARY =
  process.env.OAUTH_CLIENT_ID_PROD_SECONDARY || process.env.OAUTH_CLIENT_ID_SECOND || process.env.OAUTH_CLIENT_ID_PROD_2
const OAUTH_CLIENT_SECRET_PROD_SECONDARY =
  process.env.OAUTH_CLIENT_SECRET_PROD_SECONDARY ||
  process.env.OAUTH_CLIENT_SECRET_SECOND ||
  process.env.OAUTH_CLIENT_SECRET_PROD_2
const OAUTH_URL_PROD_SECONDARY =
  process.env.OAUTH_URL_PROD_SECONDARY || process.env.OAUTH_URL_SECOND || process.env.OAUTH_URL_PROD_2
const OAUTH_REALM_PROD_SECONDARY =
  process.env.OAUTH_REALM_PROD_SECONDARY || process.env.OAUTH_REALM_SECOND || process.env.OAUTH_REALM_PROD_2

const PRIMARY_TARGET = {
  label: 'primary',
  navigationApi: process.env.NAVIGATION_SERVICE_API_PROD,
  oauth: {
    clientId: process.env.OAUTH_CLIENT_ID_PROD,
    clientSecret: process.env.OAUTH_CLIENT_SECRET_PROD,
    oauthUrl: process.env.OAUTH_URL_PROD,
    realm: process.env.OAUTH_REALM_PROD
  }
}

const SECONDARY_TARGET =
  NAVIGATION_SERVICE_API_PROD_SECONDARY &&
  OAUTH_CLIENT_ID_PROD_SECONDARY &&
  OAUTH_CLIENT_SECRET_PROD_SECONDARY &&
  OAUTH_URL_PROD_SECONDARY &&
  OAUTH_REALM_PROD_SECONDARY
    ? {
        label: 'secondary',
        navigationApi: NAVIGATION_SERVICE_API_PROD_SECONDARY,
        oauth: {
          clientId: OAUTH_CLIENT_ID_PROD_SECONDARY,
          clientSecret: OAUTH_CLIENT_SECRET_PROD_SECONDARY,
          oauthUrl: OAUTH_URL_PROD_SECONDARY,
          realm: OAUTH_REALM_PROD_SECONDARY
        }
      }
    : null

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function normalizeComponentPath(pathValue) {
  return pathValue.replace(/\\/g, '/').replace(/^\//, '').trim()
}

function loadPublishedScreens() {
  if (!fs.existsSync(PUBLISHED_SCREENS_FILE)) {
    throw new Error(`Missing required artifact file: ${PUBLISHED_SCREENS_FILE}`)
  }

  let raw
  try {
    raw = fs.readFileSync(PUBLISHED_SCREENS_FILE, 'utf8')
  } catch (error) {
    throw new Error(`Could not read required artifact file: ${error.message}`)
  }

  const screens = Array.from(
    new Set(
      raw
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(normalizeComponentPath)
    )
  )

  return screens
}

function getMatchingDevScreens(devScreens, publishedScreens) {
  const publishedSet = new Set(publishedScreens)

  return devScreens.filter(screen => {
    const componentPath = screen?.screenComponents?.formDefinition?.componentPath
    if (!componentPath) return false

    const normalizedPath = normalizeComponentPath(componentPath)
    return publishedSet.has(normalizedPath)
  })
}

function writeResourceUrlResult(result) {
  fs.writeFileSync(RESOURCE_URL_RESULT_FILE, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`Wrote resource URL result artifact: ${path.basename(RESOURCE_URL_RESULT_FILE)}`)
}

function createEmptyResult(status = 'success') {
  return {
    status,
    created: [],
    failed: [],
    duplicateNameWarnings: [],
    summary: {
      artifactScreens: 0,
      matchingDevScreens: 0,
      urlCandidates: 0,
      devResourceUrlMatches: 0,
      missingInDev: 0,
      createOperationsFailed: 0
    }
  }
}

function findDuplicateResourceUrlNames(resourceUrls, targetLabel) {
  const byName = new Map()

  for (const resourceUrl of resourceUrls) {
    const name = typeof resourceUrl?.name === 'string' ? resourceUrl.name.trim() : ''
    if (!name) {
      continue
    }

    const entries = byName.get(name) || []
    entries.push({
      id: resourceUrl.id || '',
      url: resourceUrl.url || '',
      code: resourceUrl.code || ''
    })
    byName.set(name, entries)
  }

  return Array.from(byName.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([name, entries]) => ({
      target: targetLabel,
      name,
      count: entries.length,
      entries
    }))
}

async function collectDuplicateNameWarnings(targets) {
  const warnings = []

  for (const target of targets) {
    try {
      const resourceUrls = await getAllResourceUrls(target.navigationApi, target.oauth)
      warnings.push(...findDuplicateResourceUrlNames(resourceUrls, target.label))
    } catch (error) {
      warnings.push({
        target: target.label,
        name: '<duplicate check failed>',
        count: 0,
        error: error.message,
        entries: []
      })
    }
  }

  return warnings
}

function printCreatedResourceUrls(created) {
  logPhase('CREATED RESOURCE URLS')

  if (created.length === 0) {
    console.log('No resource URLs were created.')
    return
  }

  const byTarget = new Map()
  for (const item of created) {
    const items = byTarget.get(item.target) || []
    items.push(item)
    byTarget.set(item.target, items)
  }

  for (const [target, items] of byTarget.entries()) {
    console.log(`\n${target}:`)
    items.forEach(item => {
      const id = item.id ? ` (id: ${item.id})` : ''
      console.log(`   - ${item.url}${id}`)
    })
  }
}

function printDuplicateNameWarnings(warnings) {
  logPhase('RESOURCE URL DUPLICATE NAME WARNINGS')

  if (warnings.length === 0) {
    console.log('No duplicate resource URL names found.')
    return
  }

  for (const warning of warnings) {
    if (warning.error) {
      console.log(`\n${warning.target}: duplicate check failed (${warning.error})`)
      continue
    }

    console.log(`\n${warning.target}: ${warning.name} (${warning.count})`)
    warning.entries.forEach(entry => {
      const id = entry.id ? ` [${entry.id}]` : ''
      console.log(`   - ${entry.url}${id}`)
    })
  }
}

async function main() {
  logPhase('RESOURCE URL CREATION')
  console.log(`Artifact contract file: ${PUBLISHED_SCREENS_FILE}`)

  const result = createEmptyResult()

  requireEnv('NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API')
  requireEnv('NEXT_PUBLIC_NAVIGATION_SERVICE_API')
  requireEnv('OAUTH_CLIENT_ID')
  requireEnv('OAUTH_CLIENT_SECRET')
  requireEnv('OAUTH_URL')
  requireEnv('OAUTH_REALM')

  if (!PRIMARY_TARGET.navigationApi) {
    throw new Error('Missing required production NAVIGATION_SERVICE_API_PROD')
  }
  if (
    !PRIMARY_TARGET.oauth.clientId ||
    !PRIMARY_TARGET.oauth.clientSecret ||
    !PRIMARY_TARGET.oauth.oauthUrl ||
    !PRIMARY_TARGET.oauth.realm
  ) {
    throw new Error('Missing required production OAuth configuration')
  }

  const targets = [PRIMARY_TARGET]
  if (SECONDARY_TARGET) {
    targets.push(SECONDARY_TARGET)
  }

  const publishedScreens = loadPublishedScreens()
  result.summary.artifactScreens = publishedScreens.length
  console.log(`Published screens listed in artifact: ${publishedScreens.length}`)

  if (publishedScreens.length === 0) {
    console.log('No published screens in artifact. Nothing to create.')
    result.duplicateNameWarnings = await collectDuplicateNameWarnings(targets)
    printCreatedResourceUrls(result.created)
    printDuplicateNameWarnings(result.duplicateNameWarnings)
    writeResourceUrlResult(result)
    return
  }

  const devScreens = await getAllNativeScreens(process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API, {})
  const matchingDevScreens = getMatchingDevScreens(devScreens, publishedScreens)
  result.summary.matchingDevScreens = matchingDevScreens.length

  console.log(`Matching dev screens: ${matchingDevScreens.length}`)

  if (matchingDevScreens.length === 0) {
    console.log('No matching dev screens found for published-screens.txt entries.')
    result.duplicateNameWarnings = await collectDuplicateNameWarnings(targets)
    printCreatedResourceUrls(result.created)
    printDuplicateNameWarnings(result.duplicateNameWarnings)
    writeResourceUrlResult(result)
    return
  }

  const urlCandidates = new Map()
  for (const screen of matchingDevScreens) {
    const platformUrl = convertScreenKeyToUrl(screen.screenKey)
    if (!platformUrl) {
      continue
    }
    if (!urlCandidates.has(platformUrl)) {
      urlCandidates.set(platformUrl, screen)
    }
  }

  console.log(`Exact URL candidates from screen keys: ${urlCandidates.size}`)
  result.summary.urlCandidates = urlCandidates.size

  let matchedInDev = 0
  let skippedMissingInDev = 0
  let failed = 0

  for (const [platformUrl, screen] of urlCandidates.entries()) {
    console.log(`\nProcessing: ${screen.screenKey} -> ${platformUrl}`)

    const devResourceUrl = await getResourceUrlByPath(
      platformUrl,
      process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API,
      {}
    ).catch(() => null)

    if (!devResourceUrl) {
      skippedMissingInDev++
      console.log(`   No exact dev resource URL found for ${platformUrl}. Skipping.`)
      continue
    }

    matchedInDev++
    for (const target of targets) {
      const syncResult = await syncResourceUrlWithSameId(devResourceUrl, target.navigationApi, target.oauth)

      if (syncResult.success) {
        console.log(`   [${target.label}] Create missing result (${syncResult.operation}): ${platformUrl}`)
        if (syncResult.operation === 'created') {
          result.created.push({
            target: target.label,
            url: platformUrl,
            id: syncResult.resourceUrl?.id || devResourceUrl.id || '',
            name: syncResult.resourceUrl?.name || devResourceUrl.name || ''
          })
        }
      } else {
        failed++
        result.failed.push({
          target: target.label,
          url: platformUrl,
          screenKey: screen.screenKey,
          error: syncResult.error
        })
        console.log(`   [${target.label}] Create failed: ${syncResult.error}`)
      }
    }
  }

  result.summary.devResourceUrlMatches = matchedInDev
  result.summary.missingInDev = skippedMissingInDev
  result.summary.createOperationsFailed = failed
  result.status = failed > 0 ? 'failed' : 'success'
  result.duplicateNameWarnings = await collectDuplicateNameWarnings(targets)

  logPhase('RESOURCE URL CREATION SUMMARY')
  console.log(`   Artifact screens: ${publishedScreens.length}`)
  console.log(`   Matching dev screens: ${matchingDevScreens.length}`)
  console.log(`   URL candidates: ${urlCandidates.size}`)
  console.log(`   Exact matches in dev: ${matchedInDev}`)
  console.log(`   Missing in dev (skipped): ${skippedMissingInDev}`)
  console.log(`   Resource URLs created: ${result.created.length}`)
  console.log(`   Resource URL create failures: ${failed}`)

  printCreatedResourceUrls(result.created)
  printDuplicateNameWarnings(result.duplicateNameWarnings)
  writeResourceUrlResult(result)
}

main().catch(error => {
  const result = createEmptyResult('failed')
  result.failed.push({
    target: 'unknown',
    url: '',
    screenKey: '',
    error: error.message
  })
  writeResourceUrlResult(result)
  console.error(`Resource URL creation failed: ${error.message}`)
})
