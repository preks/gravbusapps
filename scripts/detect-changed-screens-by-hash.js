#!/usr/bin/env node
/**
 * Detect changed screens by comparing current dist hashes with component-hashes.json.
 * Only screens with successful build artifacts are considered.
 *
 * Output:
 * - Writes changed screen paths to changed-tsx.txt (one per line, prefixed with src/business-apps/)
 * - Writes hash-only baseline map to hash-build-screen-hashes.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { getScreenDirectories } from './utils/screenDiscovery.js'
import { calculateScreenHash, loadHashFile } from './utils/componentHashUtils.js'
import {
  getSkippedScreensSummary,
  isScreenChanged,
  pickHashBaseline,
  shouldFailOnMissingBuildOutput
} from './utils/hashPipelineUtils.js'

function loadPreviousHashes(projectRootDir, hashFilePath) {
  let localHashes = null
  let remoteHashes = null

  // Prefer the checked-out pipeline commit baseline to keep detection deterministic.
  if (fs.existsSync(hashFilePath)) {
    try {
      const localHashContent = fs.readFileSync(hashFilePath, 'utf8')
      localHashes = JSON.parse(localHashContent)
    } catch (error) {
      console.log(`Local hash baseline is invalid (${error.message}). Falling back to origin/develop.`)
    }
  } else {
    console.log('Local component-hashes.json not found. Falling back to origin/develop.')
  }

  try {
    const remoteHashContent = execSync('git show origin/develop:component-hashes.json', {
      cwd: projectRootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })

    remoteHashes = JSON.parse(remoteHashContent)
  } catch (error) {
    console.log(`Could not load origin/develop hash baseline (${error.message}).`)
  }

  const selected = pickHashBaseline({ localHashes, remoteHashes })
  if (selected.source === 'local') {
    console.log('Using hash baseline from local component-hashes.json (checked-out commit)')
  } else if (selected.source === 'remote') {
    console.log('Using hash baseline from origin/develop:component-hashes.json')
  } else {
    console.log('Falling back to local loader result (or empty baseline).')
    selected.hashes = loadHashFile(hashFilePath)
  }

  return selected
}

async function main() {
  const projectRootDir = process.cwd()
  const hashFilePath = path.join(projectRootDir, 'component-hashes.json')
  const outputFilePath = path.join(projectRootDir, 'changed-tsx.txt')
  const hashBaselineOutputPath = path.join(projectRootDir, 'hash-build-screen-hashes.json')

  const { hashes: previousHashes, source: baselineSource } = loadPreviousHashes(projectRootDir, hashFilePath)
  const screenDirs = await getScreenDirectories({ cwd: projectRootDir })
  const currentBuildHashes = {}

  const changedScreens = []
  let checkedScreens = 0
  let skippedWithoutBuildOutput = 0
  const skippedScreens = []

  console.log('Detecting changed screens by hash...')
  console.log(`Total discovered screens: ${screenDirs.length}`)

  for (const screenDir of screenDirs) {
    const screenPath = screenDir.replace(/^src[\\/]+business-apps[\\/]+/, '').replace(/\\/g, '/')
    const buildOutputDir = path.join(projectRootDir, 'dist', screenPath)

    // Only consider screens that were successfully built.
    if (!fs.existsSync(buildOutputDir)) {
      skippedWithoutBuildOutput++
      skippedScreens.push(screenPath)
      continue
    }

    let currentHash
    try {
      currentHash = calculateScreenHash(buildOutputDir)
    } catch (error) {
      console.log(`Skipping ${screenPath}: could not hash artifacts (${error.message})`)
      continue
    }

    checkedScreens++
    currentBuildHashes[screenPath] = currentHash
    const previousHash = previousHashes[screenPath]
    if (isScreenChanged(previousHash, currentHash)) {
      changedScreens.push(`src/business-apps/${screenPath}`)
      const reason = !previousHash ? 'new_screen' : 'hash_mismatch'
      console.log(`Changed: ${screenPath} (${reason})`)
    }
  }

  if (changedScreens.length > 0) {
    fs.writeFileSync(outputFilePath, changedScreens.join('\n') + '\n', 'utf8')
  } else {
    fs.writeFileSync(outputFilePath, '', 'utf8')
  }
  fs.writeFileSync(hashBaselineOutputPath, JSON.stringify(currentBuildHashes, null, 2) + '\n', 'utf8')

  console.log('')
  console.log('Hash detection summary:')
  console.log(`  Screens with build artifacts checked: ${checkedScreens}`)
  console.log(`  Screens skipped (no build output): ${skippedWithoutBuildOutput}`)
  console.log(`  Screens to publish: ${changedScreens.length}`)
  console.log(`  Baseline source: ${baselineSource}`)
  console.log(`  Output file: ${outputFilePath}`)
  console.log(`  Hash baseline file: ${hashBaselineOutputPath}`)

  if (skippedWithoutBuildOutput > 0) {
    const skippedSummary = getSkippedScreensSummary(skippedScreens)
    console.warn('')
    console.warn(`WARNING: Missing build output for ${skippedSummary.total} screen(s).`)
    skippedSummary.sample.forEach(screen => console.warn(`  - ${screen}`))
    if (skippedSummary.remaining > 0) {
      console.warn(`  ... and ${skippedSummary.remaining} more`)
    }
  }

  const failOnMissingBuildOutput = shouldFailOnMissingBuildOutput(process.env)
  if (skippedWithoutBuildOutput > 0 && failOnMissingBuildOutput) {
    console.error('')
    console.error(
      `ERROR: Missing build output for ${skippedWithoutBuildOutput} screen(s). Failing to avoid silent under-publishing.`
    )
    process.exit(1)
  }
}

main().catch(error => {
  console.error(`Hash-based detection failed: ${error.message}`)
  process.exit(1)
})
