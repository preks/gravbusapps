#!/usr/bin/env node

import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import { getAllNativeScreens } from './api-client.js'
import { getScreenDirectories } from './utils/screenDiscovery.js'
import { logPhase } from './utils/logPhase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRootDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.resolve(projectRootDir, '.env') })

const PUBLISHED_SCREENS_FILE = path.join(projectRootDir, 'published-screens.txt')
const SCREEN_RELEASE_RESULT_FILE = path.join(projectRootDir, 'screen-release-result.json')
const MANUAL_SCREENS_FILE = path.join(projectRootDir, 'manual-screens.txt')
const ALL_SCREENS_FILE = path.join(projectRootDir, 'all-screens.txt')

function normalizeScreenPath(value) {
  let normalized = String(value || '').replace(/\\/g, '/')
  normalized = normalized.replace(/^\/+/, '')
  normalized = normalized.replace(/^src\/business-apps\//, '')
  normalized = normalized.replace(/\.tsx?$/, '')

  const screenMatch = normalized.match(/^(.*?\/(?:apps|forms|popups|records|windows)\/[^/]+)/)
  if (screenMatch) {
    normalized = screenMatch[1]
  }

  return normalized.trim()
}

function splitInputList(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/[,\n;]+/)
        .map(normalizeScreenPath)
        .filter(Boolean)
    )
  ).sort()
}

function splitScreenKeyList(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/[,\n;]+/)
        .map(key => key.trim())
        .filter(Boolean)
    )
  ).sort()
}

async function findAllScreenDirectories() {
  const uniqueDirs = new Set()
  const screenDirs = await getScreenDirectories({ cwd: projectRootDir })

  for (const dir of screenDirs) {
    const publishPath = dir.replace(/^src[\\/]+business-apps[\\/]+/, '').replace(/\\/g, '/')
    if (publishPath) {
      uniqueDirs.add(publishPath)
    }
  }

  return Array.from(uniqueDirs).sort()
}

function getComponentPathForScreen(screen) {
  const componentPath = screen?.screenComponents?.formDefinition?.componentPath
  if (!componentPath) {
    return ''
  }

  return normalizeScreenPath(componentPath)
}

async function resolveScreenKeys(screenKeysToPublish) {
  logPhase('RESOURCE URL RERUN INPUTS (SCREEN KEYS)')

  const requestedKeys = splitScreenKeyList(screenKeysToPublish)
  const devScreens = await getAllNativeScreens(process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API, {})
  const screenPathByKey = new Map()

  for (const screen of devScreens) {
    const screenKey = String(screen?.screenKey || '').trim()
    const componentPath = getComponentPathForScreen(screen)

    if (screenKey && componentPath) {
      screenPathByKey.set(screenKey, componentPath)
    }
  }

  const resolvedScreens = []
  const unresolvedKeys = []

  for (const screenKey of requestedKeys) {
    const screenPath = screenPathByKey.get(screenKey)
    if (screenPath) {
      resolvedScreens.push(screenPath)
    } else {
      unresolvedKeys.push(screenKey)
    }
  }

  if (unresolvedKeys.length > 0) {
    console.log('WARNING: Could not resolve these screen key(s) in dev screen management:')
    unresolvedKeys.forEach(screenKey => console.log(`   - ${screenKey}`))
  }

  return Array.from(new Set(resolvedScreens)).sort()
}

function screenExists(screen) {
  return fs.existsSync(path.join(projectRootDir, 'src', 'business-apps', screen, 'index.ts'))
}

function writeLines(filePath, lines) {
  const content = lines.length > 0 ? `${lines.join('\n')}\n` : ''
  fs.writeFileSync(filePath, content, 'utf8')
}

function writeScreenReleaseResult(screens) {
  const result = {
    status: 'success',
    processedScreens: screens.length,
    publishedScreens: screens,
    skippedScreens: [],
    failedScreens: [],
    comprehensiveSyncResults: []
  }

  fs.writeFileSync(SCREEN_RELEASE_RESULT_FILE, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
}

async function resolveScreens() {
  const screensToPublish = process.env.SCREENS_TO_PUBLISH || ''
  const screenKeysToPublish = process.env.SCREEN_KEYS_TO_PUBLISH || ''
  const publishAllScreens = process.env.PUBLISH_ALL_SCREENS !== 'false'

  if (screensToPublish.trim() && screenKeysToPublish.trim()) {
    throw new Error('Set either SCREENS_TO_PUBLISH or SCREEN_KEYS_TO_PUBLISH, not both.')
  }

  if (screenKeysToPublish.trim()) {
    return {
      screens: await resolveScreenKeys(screenKeysToPublish),
      source: 'screen keys'
    }
  }

  if (screensToPublish.trim()) {
    logPhase('RESOURCE URL RERUN INPUTS (MANUAL SCREENS)')
    return {
      screens: splitInputList(screensToPublish),
      source: 'screen paths'
    }
  }

  if (publishAllScreens) {
    logPhase('RESOURCE URL RERUN INPUTS (ALL SCREENS)')
    return {
      screens: await findAllScreenDirectories(),
      source: 'all screens'
    }
  }

  throw new Error(
    'Set SCREENS_TO_PUBLISH, SCREEN_KEYS_TO_PUBLISH, or use PUBLISH_ALL_SCREENS=true to prepare resource URL rerun inputs.'
  )
}

async function main() {
  const resolvedInput = await resolveScreens()
  const existingScreens = resolvedInput.screens.filter(screen => {
    const exists = screenExists(screen)
    if (!exists) {
      console.log(`WARNING: Skipping non-existent screen: ${screen}`)
    }
    return exists
  })

  if (resolvedInput.source !== 'all screens' && existingScreens.length === 0) {
    throw new Error(`No valid screen paths were resolved from ${resolvedInput.source}.`)
  }

  writeLines(PUBLISHED_SCREENS_FILE, existingScreens)
  writeLines(MANUAL_SCREENS_FILE, existingScreens)
  writeLines(ALL_SCREENS_FILE, existingScreens)
  writeScreenReleaseResult(existingScreens)

  console.log(`Prepared ${existingScreens.length} screen(s) for resource URL creation rerun.`)
  console.log(`Wrote ${path.basename(PUBLISHED_SCREENS_FILE)} and ${path.basename(SCREEN_RELEASE_RESULT_FILE)}.`)
}

main().catch(error => {
  console.error(`Failed to prepare resource URL rerun inputs: ${error.message}`)
  process.exit(1)
})
