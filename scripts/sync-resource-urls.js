import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import {
  getAllNativeScreens,
  convertScreenKeyToUrl,
  getResourceUrlByPath,
  syncResourceUrlWithSameId
} from './api-client.js'
import { logPhase } from './utils/logPhase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const PUBLISHED_SCREENS_FILE = path.resolve(__dirname, '..', 'published-screens.txt')

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

async function main() {
  logPhase('MANUAL RESOURCE URL SYNC')
  console.log(`Artifact contract file: ${PUBLISHED_SCREENS_FILE}`)

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
  console.log(`Published screens listed in artifact: ${publishedScreens.length}`)

  if (publishedScreens.length === 0) {
    console.log('No published screens in artifact. Nothing to sync.')
    return
  }

  const devScreens = await getAllNativeScreens(process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API, {})
  const matchingDevScreens = getMatchingDevScreens(devScreens, publishedScreens)

  console.log(`Matching dev screens: ${matchingDevScreens.length}`)

  if (matchingDevScreens.length === 0) {
    console.log('No matching dev screens found for published-screens.txt entries.')
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

  let matchedInDev = 0
  let skippedMissingInDev = 0
  let synced = 0
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
        synced++
        console.log(`   [${target.label}] Synced (${syncResult.operation}): ${platformUrl}`)
      } else {
        failed++
        console.log(`   [${target.label}] Sync failed: ${syncResult.error}`)
      }
    }
  }

  logPhase('RESOURCE URL SYNC SUMMARY')
  console.log(`   Artifact screens: ${publishedScreens.length}`)
  console.log(`   Matching dev screens: ${matchingDevScreens.length}`)
  console.log(`   URL candidates: ${urlCandidates.size}`)
  console.log(`   Exact matches in dev: ${matchedInDev}`)
  console.log(`   Missing in dev (skipped): ${skippedMissingInDev}`)
  console.log(`   Sync operations succeeded: ${synced}`)
  console.log(`   Sync operations failed: ${failed}`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error(`Manual resource URL sync failed: ${error.message}`)
  process.exit(1)
})
