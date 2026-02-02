#!/usr/bin/env node
/**
 * Publish ALL screens to DEV
 * - Uses the existing single-screen dev publisher
 * - Does NOT rely on change detection; iterates every screen
 * - Non-interactive: passes --no-interaction to avoid prompts
 */

import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { glob } from 'glob'

async function findAllScreenDirectories() {
  const appIndexFiles = await glob('src/business-apps/**/apps/*/index.ts', {
    nodir: true,
    dot: true
  })
  const formIndexFiles = await glob('src/business-apps/**/forms/*/index.ts', {
    nodir: true,
    dot: true
  })
  const popupIndexFiles = await glob('src/business-apps/**/popups/*/index.ts', {
    nodir: true,
    dot: true
  })
  const recordIndexFiles = await glob('src/business-apps/**/records/*/index.ts', {
    nodir: true,
    dot: true
  })
  const windowIndexFiles = await glob('src/business-apps/**/windows/*/index.ts', {
    nodir: true,
    dot: true
  })

  const allIndexFiles = [
    ...appIndexFiles,
    ...formIndexFiles,
    ...popupIndexFiles,
    ...recordIndexFiles,
    ...windowIndexFiles
  ]
  const uniqueDirs = new Set()

  for (const filePath of allIndexFiles) {
    const dir = path.dirname(filePath)
    // strip prefix 'src/business-apps/' to get publish path
    const publishPath = dir.replace(/^src[\\/]+business-apps[\\/]+/, '').replace(/\\/g, '/')
    if (publishPath) uniqueDirs.add(publishPath)
  }

  return Array.from(uniqueDirs).sort()
}

async function main() {
  console.log('🚀 Publishing ALL screens to DEV (non-interactive)...')

  const allScreens = await findAllScreenDirectories()
  if (allScreens.length === 0) {
    console.log('✅ No screens found under src/business-apps.')
    return
  }

  console.log('Screens to publish:')
  allScreens.forEach(s => console.log(' - ' + s))
  console.log('---')

  const failed = []
  const skipped = []

  for (const publishPath of allScreens) {
    const indexFile = path.join('src', 'business-apps', publishPath, 'index.ts')
    if (!fs.existsSync(indexFile)) {
      console.log(`⚠️  Skipping removed screen: ${publishPath} (${indexFile} not found)`)
      skipped.push(publishPath)
      continue
    }

    console.log(`Publishing: ${publishPath}`)
    try {
      execSync(`npm run publish:screen -- "${publishPath}" --no-interaction`, {
        stdio: 'inherit'
      })
    } catch {
      console.log(`Publish failed for: ${publishPath}`)
      failed.push(publishPath)
      continue
    }
  }

  console.log('---')
  console.log('Publishing Summary:')
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
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
