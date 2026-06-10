#!/usr/bin/env node

import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getScreenDirectories } from './utils/screenDiscovery.js'
import { logPhase } from './utils/logPhase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRootDir = path.resolve(__dirname, '..')

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
  const publishAllScreens = process.env.PUBLISH_ALL_SCREENS !== 'false'

  if (screensToPublish.trim()) {
    logPhase('RESOURCE URL RERUN INPUTS (MANUAL SCREENS)')
    return Array.from(new Set(screensToPublish.split(',').map(normalizeScreenPath).filter(Boolean))).sort()
  }

  if (publishAllScreens) {
    logPhase('RESOURCE URL RERUN INPUTS (ALL SCREENS)')
    return findAllScreenDirectories()
  }

  throw new Error('Set SCREENS_TO_PUBLISH or use PUBLISH_ALL_SCREENS=true to prepare resource URL rerun inputs.')
}

async function main() {
  const requestedScreens = await resolveScreens()
  const existingScreens = requestedScreens.filter(screen => {
    const exists = screenExists(screen)
    if (!exists) {
      console.log(`WARNING: Skipping non-existent screen: ${screen}`)
    }
    return exists
  })

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
