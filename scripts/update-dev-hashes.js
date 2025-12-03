#!/usr/bin/env node
/**
 * Update component-hashes.json after dev publishes
 * Called from detect-and-publish-changed-screens.sh
 */

import path from 'node:path'
import { execSync } from 'node:child_process'
import { calculateScreenHash, loadHashFile, saveHashFile, configureGit } from './utils/componentHashUtils.js'

async function main() {
  // Read the list of successfully published screens from changed-tsx.txt
  const fs = await import('node:fs')
  const changedFile = 'changed-tsx.txt'

  if (!fs.existsSync(changedFile)) {
    console.log('⚠️  No changed-tsx.txt file found, skipping hash update')
    return
  }

  const content = fs.readFileSync(changedFile, 'utf8')
  const publishedScreens = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^src\/business-apps\//, ''))
    .map(line => line.replace(/^\/+/, ''))

  if (publishedScreens.length === 0) {
    console.log('⚠️  No screens to update hashes for')
    return
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 UPDATING COMPONENT HASHES`)
  console.log(`${'='.repeat(80)}`)

  const projectRootDir = process.cwd()
  const hashFilePath = path.join(projectRootDir, 'component-hashes.json')

  // Load current hashes
  const componentHashes = loadHashFile(hashFilePath)

  // Update hashes for all successfully published screens
  let updatedCount = 0
  for (const screen of publishedScreens) {
    const buildOutputDir = path.join(projectRootDir, 'dist', screen)

    // Check if build output exists
    if (!fs.existsSync(buildOutputDir)) {
      console.log(`   ⚠️  Skipping ${screen}: build output not found`)
      continue
    }

    try {
      const screenHash = calculateScreenHash(buildOutputDir)
      componentHashes[screen] = screenHash
      updatedCount++
      console.log(`   ✅ ${screen}: ${screenHash}`)
    } catch (error) {
      console.log(`   ⚠️  Failed to calculate hash for ${screen}: ${error.message}`)
    }
  }

  if (updatedCount > 0) {
    // Save updated hashes
    saveHashFile(hashFilePath, componentHashes)
    console.log(`\n   📝 Updated ${updatedCount} component hash(es)`)

    // Commit and push to develop
    try {
      configureGit(projectRootDir, execSync)
      execSync('git add component-hashes.json', { cwd: projectRootDir })
      execSync(`git commit -m "chore(ci): update component hashes [skip ci]"`, { cwd: projectRootDir })

      // Pull with rebase in case of concurrent updates
      try {
        execSync('git pull --rebase origin develop', { cwd: projectRootDir, stdio: 'inherit' })
      } catch {
        console.log('   ⚠️  Rebase conflict detected, keeping our changes')
        // Conflicts are unlikely since we're only adding/updating keys
        // If conflict occurs, keep our version
        execSync('git checkout --ours component-hashes.json', { cwd: projectRootDir })
        execSync('git add component-hashes.json', { cwd: projectRootDir })
        execSync('git rebase --continue', { cwd: projectRootDir })
      }

      execSync('git push origin develop', { cwd: projectRootDir, stdio: 'inherit' })
      console.log('   ✅ Component hashes committed and pushed to develop')
    } catch (error) {
      console.log(`   ⚠️  Failed to commit/push hashes: ${error.message}`)
      console.log('   ℹ️  Screens were published successfully, hash update is non-critical')
    }
  } else {
    console.log('   ℹ️  No hashes to update')
  }
}

main().catch(err => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
