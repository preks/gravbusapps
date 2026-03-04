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

function loadPreviousHashes(projectRootDir, hashFilePath) {
  try {
    const remoteHashContent = execSync('git show origin/develop:component-hashes.json', {
      cwd: projectRootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const parsed = JSON.parse(remoteHashContent)
    console.log('Using hash baseline from origin/develop:component-hashes.json')
    return parsed
  } catch (error) {
    console.log(`Could not load origin/develop hash baseline (${error.message}). Falling back to local file.`)
    return loadHashFile(hashFilePath)
  }
}

async function main() {
  const projectRootDir = process.cwd()
  const hashFilePath = path.join(projectRootDir, 'component-hashes.json')
  const outputFilePath = path.join(projectRootDir, 'changed-tsx.txt')
  const hashBaselineOutputPath = path.join(projectRootDir, 'hash-build-screen-hashes.json')

  const previousHashes = loadPreviousHashes(projectRootDir, hashFilePath)
  const screenDirs = await getScreenDirectories({ cwd: projectRootDir })
  const currentBuildHashes = {}

  const changedScreens = []
  let checkedScreens = 0
  let skippedWithoutBuildOutput = 0

  console.log('Detecting changed screens by hash...')
  console.log(`Total discovered screens: ${screenDirs.length}`)

  for (const screenDir of screenDirs) {
    const screenPath = screenDir.replace(/^src[\\/]+business-apps[\\/]+/, '').replace(/\\/g, '/')
    const buildOutputDir = path.join(projectRootDir, 'dist', screenPath)

    // Only consider screens that were successfully built.
    if (!fs.existsSync(buildOutputDir)) {
      skippedWithoutBuildOutput++
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
    if (!previousHash || previousHash !== currentHash) {
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
  console.log(`  Output file: ${outputFilePath}`)
  console.log(`  Hash baseline file: ${hashBaselineOutputPath}`)
}

main().catch(error => {
  console.error(`Hash-based detection failed: ${error.message}`)
  process.exit(1)
})
