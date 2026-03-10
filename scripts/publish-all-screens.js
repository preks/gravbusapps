#!/usr/bin/env node
/**
 * Publish ALL screens to DEV
 * - Uses the existing single-screen dev publisher
 * - Does NOT rely on change detection; iterates every screen
 * - Non-interactive: passes --ci to avoid prompts
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { getScreenDirectories } from './utils/screenDiscovery.js'
import { logPhase } from './utils/logPhase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function findAllScreenDirectories() {
  const uniqueDirs = new Set()

  const projectRootDir = path.resolve(__dirname, '..')
  const screenDirs = await getScreenDirectories({ cwd: projectRootDir })

  for (const dir of screenDirs) {
    // strip prefix 'src/business-apps/' to get publish path
    const publishPath = dir.replace(/^src[\\/]+business-apps[\\/]+/, '').replace(/\\/g, '/')
    if (publishPath) uniqueDirs.add(publishPath)
  }

  return Array.from(uniqueDirs).sort()
}

async function main() {
  logPhase('PUBLISH ALL SCREENS TO DEV')
  console.log('Publishing in non-interactive mode...')

  const allScreens = await findAllScreenDirectories()
  if (allScreens.length === 0) {
    console.log('No screens found under src/business-apps.')
    return
  }

  logPhase(`SCREENS TO PUBLISH (${allScreens.length})`)
  allScreens.forEach(s => console.log(' - ' + s))

  const failed = []
  const skipped = []

  for (const publishPath of allScreens) {
    const indexFile = path.join('src', 'business-apps', publishPath, 'index.ts')
    if (!fs.existsSync(indexFile)) {
      console.log(`WARNING: Skipping removed screen: ${publishPath} (${indexFile} not found)`)
      skipped.push(publishPath)
      continue
    }

    console.log(`Publishing: ${publishPath}`)
    try {
      execSync(`npm run publish:screen -- "${publishPath}" --ci`, {
        stdio: 'inherit'
      })
    } catch {
      console.log(`Publish failed for: ${publishPath}`)
      failed.push(publishPath)
      continue
    }
  }

  logPhase('PUBLISHING SUMMARY')
  if (skipped.length > 0) {
    console.log(`Skipped removed screens (${skipped.length}):`)
    skipped.forEach(s => console.log(' - ' + s))
  }
  if (failed.length > 0) {
    console.log(`Failed to publish (${failed.length}):`)
    failed.forEach(s => console.log(' - ' + s))
    process.exit(1)
  } else {
    console.log('All existing screens published successfully.')
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
