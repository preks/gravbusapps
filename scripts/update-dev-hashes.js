#!/usr/bin/env node
/**
 * Update component-hashes.json after dev publishes
 * Called from detect-and-publish-changed-screens.sh
 */

import path from 'node:path'
import { execSync } from 'node:child_process'
import { calculateScreenHash, loadHashFile, saveHashFile, configureGit } from './utils/componentHashUtils.js'
import { mergeTouchedHashes } from './utils/hashPipelineUtils.js'

async function main() {
  // Read the list of successfully published screens from changed-tsx.txt
  const fs = await import('node:fs')
  const changedFile = 'changed-tsx.txt'
  const hashBaselineFile = 'hash-build-screen-hashes.json'

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
  const hashBaselinePath = path.join(projectRootDir, hashBaselineFile)

  let hashBuildBaseline = {}
  if (fs.existsSync(hashBaselinePath)) {
    try {
      hashBuildBaseline = JSON.parse(fs.readFileSync(hashBaselinePath, 'utf8'))
      console.log(
        `   ℹ️  Using hash-only baseline from ${hashBaselineFile} (${Object.keys(hashBuildBaseline).length} entries)`
      )
    } catch (error) {
      console.log(`   ⚠️  Could not parse ${hashBaselineFile}: ${error.message}`)
      hashBuildBaseline = {}
    }
  }

  // Load current hashes
  const componentHashes = loadHashFile(hashFilePath)
  const touchedHashes = {}

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
      const screenHash = hashBuildBaseline[screen] || calculateScreenHash(buildOutputDir)
      componentHashes[screen] = screenHash
      touchedHashes[screen] = screenHash
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

    // Keep only touched hashes for conflict-safe merge resolution.
    const ourTouchedHashes = { ...touchedHashes }
    const hashFileName = 'component-hashes.json'

    /**
     * Check if a rebase is currently in progress
     */
    const isRebaseInProgress = () => {
      const gitDir = path.join(projectRootDir, '.git')
      return fs.existsSync(path.join(gitDir, 'rebase-merge')) || fs.existsSync(path.join(gitDir, 'rebase-apply'))
    }

    /**
     * Abort any in-progress rebase
     */
    const abortRebaseIfNeeded = () => {
      if (isRebaseInProgress()) {
        console.log('   ⚠️  Aborting in-progress rebase...')
        try {
          execSync('git rebase --abort', { cwd: projectRootDir, stdio: 'pipe' })
        } catch {
          // Ignore errors during abort
        }
      }
    }

    /**
     * Resolve merge conflict in hash file by merging our changes with remote
     */
    const resolveHashConflict = () => {
      console.log('   ⚠️  Rebase conflict detected, merging hashes manually...')

      // During rebase: --ours = remote (origin/develop), --theirs = our local changes
      try {
        execSync(`git checkout --ours ${hashFileName}`, { cwd: projectRootDir, stdio: 'pipe' })
      } catch {
        console.log('   📄 Remote version not available, using local as base')
      }

      // Load whatever version we have now
      let remoteHashes = {}
      try {
        remoteHashes = loadHashFile(hashFilePath)
      } catch {
        // If file doesn't exist or is invalid, start fresh
      }

      // Merge only touched hashes into the remote version.
      // This prevents unrelated local keys from overwriting newer remote updates.
      const mergedHashes = mergeTouchedHashes(remoteHashes, ourTouchedHashes)

      // Save the merged result
      saveHashFile(hashFilePath, mergedHashes)
      console.log(
        `   🔀 Merged ${Object.keys(ourTouchedHashes).length} touched hash(es) with ${Object.keys(remoteHashes).length} remote hash(es)`
      )

      // Stage the resolved file
      execSync(`git add ${hashFileName}`, { cwd: projectRootDir, stdio: 'pipe' })

      // Continue the rebase
      try {
        execSync('git rebase --continue', {
          cwd: projectRootDir,
          stdio: 'pipe',
          env: { ...process.env, GIT_EDITOR: 'true' }
        })
      } catch {
        execSync('git -c core.editor=true rebase --continue', { cwd: projectRootDir, stdio: 'pipe' })
      }

      console.log('   ✅ Conflict resolved and rebase continued')
    }

    // Commit and push to develop
    const targetBranch = 'develop'
    const maxPushAttempts = Number(process.env.CI_GIT_PUSH_ATTEMPTS || '8')

    try {
      configureGit(projectRootDir, execSync)

      // Get the current branch name
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectRootDir,
        encoding: 'utf8'
      }).trim()
      console.log(`   Current branch: ${currentBranch}`)
      console.log(`   Target branch: ${targetBranch}`)

      // Check if we're already on the target branch
      const needsBranchSwitch = currentBranch !== targetBranch

      if (needsBranchSwitch) {
        console.log(`   📌 Switching from ${currentBranch} to ${targetBranch}...`)

        // Save the hash file content before switching
        const hashFileContent = fs.readFileSync(hashFilePath, 'utf8')

        // Fetch the target branch
        execSync(`git fetch origin ${targetBranch}:${targetBranch}`, { cwd: projectRootDir, stdio: 'pipe' })

        // Stash local hash file changes to avoid checkout conflicts when running on feature branches.
        let tempHashStashCreated = false
        try {
          const stashResult = execSync(`git stash push -m "ci-temp-hash-switch" -- ${hashFileName}`, {
            cwd: projectRootDir,
            encoding: 'utf8',
            stdio: 'pipe'
          })
          tempHashStashCreated = !stashResult.includes('No local changes to save')
        } catch {
          // Non-critical: continue and let checkout report a concrete error if it still cannot proceed.
        }

        // Checkout the target branch
        execSync(`git checkout ${targetBranch}`, { cwd: projectRootDir, stdio: 'pipe' })

        // Restore the hash file with our changes
        fs.writeFileSync(hashFilePath, hashFileContent, 'utf8')

        // We restore content from memory, so this temporary stash is no longer needed.
        // Drop it to avoid accumulating CI stashes across runs.
        if (tempHashStashCreated) {
          try {
            execSync('git stash drop stash@{0}', { cwd: projectRootDir, stdio: 'pipe' })
          } catch {
            // Non-critical: leftover stash does not block pipeline behavior.
          }
        }

        console.log(`   ✅ Switched to ${targetBranch} and restored hash file`)
      }

      execSync(`git add ${hashFileName}`, { cwd: projectRootDir })
      execSync(`git commit --no-verify -m "chore NO-TICKET: update component hashes [skip ci]"`, {
        cwd: projectRootDir
      })

      // Pull with rebase and push with retry logic
      let pushSuccess = false
      for (let attempt = 1; attempt <= maxPushAttempts; attempt++) {
        try {
          // Check if there's an incomplete rebase from a previous attempt
          if (isRebaseInProgress()) {
            console.log(`   🔄 Attempt ${attempt}/${maxPushAttempts}: Resolving in-progress rebase...`)
            resolveHashConflict()
          } else {
            console.log(`   🔄 Attempt ${attempt}/${maxPushAttempts}: Pulling and rebasing...`)
            execSync(`git pull --rebase --autostash origin ${targetBranch}`, { cwd: projectRootDir, stdio: 'pipe' })
          }

          // If we got here, rebase succeeded - try to push
          execSync(`git push origin HEAD:${targetBranch}`, { cwd: projectRootDir, stdio: 'pipe' })
          pushSuccess = true
          console.log(`   ✅ Component hashes committed and pushed to ${targetBranch}`)
          break
        } catch (error) {
          const errorOutput =
            (error.stdout?.toString() || '') + (error.stderr?.toString() || '') + (error.message || '')

          // Check if this is a rebase conflict or if rebase is in progress
          const isConflict =
            errorOutput.includes('CONFLICT') ||
            errorOutput.includes('Merge conflict') ||
            errorOutput.includes('unmerged files') ||
            errorOutput.includes('fix conflicts') ||
            isRebaseInProgress()

          if (isConflict) {
            try {
              resolveHashConflict()
              // After resolving, try to push
              execSync(`git push origin HEAD:${targetBranch}`, { cwd: projectRootDir, stdio: 'pipe' })
              pushSuccess = true
              console.log(`   ✅ Component hashes committed and pushed to ${targetBranch} (after conflict resolution)`)
              break
            } catch (pushError) {
              const pushErrorOutput =
                (pushError.stdout?.toString() || '') + (pushError.stderr?.toString() || '') + (pushError.message || '')
              if (pushErrorOutput.includes('rejected') || pushErrorOutput.includes('non-fast-forward')) {
                console.log('   ⚠️  More remote changes detected, retrying...')
                abortRebaseIfNeeded()
                execSync(`git add ${hashFileName}`, { cwd: projectRootDir, stdio: 'pipe' })
                try {
                  execSync(`git commit --no-verify -m "chore NO-TICKET: update component hashes [skip ci]"`, {
                    cwd: projectRootDir,
                    stdio: 'pipe'
                  })
                } catch {
                  // Commit might fail if no changes
                }
              } else {
                throw pushError
              }
            }
          } else if (attempt < maxPushAttempts) {
            console.log(`   🔄 Push failed (attempt ${attempt}/${maxPushAttempts}), retrying...`)
            console.log(errorOutput)
            abortRebaseIfNeeded()
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
          } else {
            abortRebaseIfNeeded()
            throw error
          }
        }
      }

      if (!pushSuccess) {
        abortRebaseIfNeeded()
        throw new Error('Failed to push after 3 retries')
      }
    } catch (error) {
      abortRebaseIfNeeded()
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
