#!/usr/bin/env node
/**
 * Update bundle-top-dependencies.json after dev publishes (when BUNDLE_REPORT_IN_PIPELINE=true).
 * Mirrors update-dev-hashes.js git flow; merges only touched entry keys via mergeTouchedBundleDeps.
 *
 * Git commit/push to `develop` runs only when the checkout is already on `develop` (no branch switching).
 * In Bitbucket, if BITBUCKET_BRANCH is set and is not `develop`, the script exits before merging or pushing
 * so feature/custom pipelines cannot rewrite `develop` history.
 */

import path from 'node:path'
import { execSync } from 'node:child_process'
import { CI_GIT_AUTHOR_NAME_BUNDLE, configureGit } from './utils/componentHashUtils.js'
import { mergeTouchedBundleDeps } from './utils/hashPipelineUtils.js'
import { TOP_COMBINED_DEFAULT, buildBundleEntryPayload } from './utils/bundleTopDependenciesFromRaw.mjs'
import { getBitbucketPipelineMetadata } from './utils/bitbucketPipelineUrl.js'

const BUNDLE_FILE = 'bundle-top-dependencies.json'

function loadBundleFile(fs, filePath) {
  if (!fs.existsSync(filePath)) {
    return { _meta: { schemaVersion: 1, generatedAt: new Date().toISOString() } }
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return { _meta: { schemaVersion: 1, generatedAt: new Date().toISOString() } }
  }
}

function saveBundleFile(fs, filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

async function main() {
  const fs = await import('node:fs')

  if (process.env.BUNDLE_REPORT_IN_PIPELINE !== 'true') {
    console.log('ℹ️  BUNDLE_REPORT_IN_PIPELINE not set — skipping bundle-top-dependencies update')
    return
  }

  const bbBranch = process.env.BITBUCKET_BRANCH
  if (bbBranch && bbBranch !== 'develop') {
    console.log(`ℹ️  BITBUCKET_BRANCH=${bbBranch} — skipping bundle-top-dependencies update (only runs on develop)`)
    return
  }

  const changedFile = 'changed-tsx.txt'
  if (!fs.existsSync(changedFile)) {
    console.log('⚠️  No changed-tsx.txt file found, skipping bundle dependencies update')
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
    console.log('⚠️  No screens for bundle dependencies update')
    return
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`📦 UPDATING BUNDLE TOP DEPENDENCIES`)
  console.log(`${'='.repeat(80)}`)

  const projectRootDir = process.cwd()
  const bundlePath = path.join(projectRootDir, BUNDLE_FILE)
  const logDir = path.join(projectRootDir, 'logs', 'bundle-raw')
  const pipelineMeta = getBitbucketPipelineMetadata(process.env)

  const bundleDoc = loadBundleFile(fs, bundlePath)
  const touchedEntries = {}
  let updatedCount = 0

  for (const screen of publishedScreens) {
    const safeName = screen.replace(/\//g, '__')
    const rawPath = path.join(logDir, `${safeName}.json`)
    if (!fs.existsSync(rawPath)) {
      console.log(`   ⚠️  Skipping ${screen}: no saved raw stats at ${rawPath} (analyze may be off)`)
      continue
    }
    try {
      const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'))
      let chunkJsBytesOverride = null
      const chunkPath = path.join(logDir, `${safeName}.chunk.json`)
      if (fs.existsSync(chunkPath)) {
        try {
          chunkJsBytesOverride = JSON.parse(fs.readFileSync(chunkPath, 'utf8')).chunkJsBytes
        } catch {
          chunkJsBytesOverride = null
        }
      }
      touchedEntries[screen] = buildBundleEntryPayload({
        raw,
        projectRoot: projectRootDir,
        entryKey: screen,
        topN: TOP_COMBINED_DEFAULT,
        bitbucketBuildNumber: pipelineMeta.bitbucketBuildNumber,
        pipelineUrl: pipelineMeta.pipelineUrl,
        ...(chunkJsBytesOverride != null ? { chunkJsBytes: chunkJsBytesOverride } : {})
      })
      updatedCount++
      console.log(`   ✅ ${screen}: chunkJsBytes=${touchedEntries[screen].chunkJsBytes}`)
    } catch (error) {
      console.log(`   ⚠️  Failed to process bundle stats for ${screen}: ${error.message}`)
    }
  }

  if (updatedCount === 0) {
    console.log('   ℹ️  No bundle raw JSON files to merge — skipping commit')
    return
  }

  const merged = mergeTouchedBundleDeps(bundleDoc, touchedEntries)
  saveBundleFile(fs, bundlePath, merged)
  console.log(`\n   📝 Updated ${updatedCount} bundle entr(y/ies)`)

  const ourTouchedBundle = { ...touchedEntries }
  const bundleFileName = BUNDLE_FILE

  const isRebaseInProgress = () => {
    const gitDir = path.join(projectRootDir, '.git')
    return fs.existsSync(path.join(gitDir, 'rebase-merge')) || fs.existsSync(path.join(gitDir, 'rebase-apply'))
  }

  const abortRebaseIfNeeded = () => {
    if (isRebaseInProgress()) {
      console.log('   ⚠️  Aborting in-progress rebase...')
      try {
        execSync('git rebase --abort', { cwd: projectRootDir, stdio: 'pipe' })
      } catch {
        // ignore
      }
    }
  }

  const resolveBundleConflict = () => {
    console.log('   ⚠️  Rebase conflict detected, merging bundle JSON manually...')

    try {
      execSync(`git checkout --ours ${bundleFileName}`, { cwd: projectRootDir, stdio: 'pipe' })
    } catch {
      console.log('   📄 Remote version not available, using local as base')
    }

    let remoteBundle = {}
    try {
      remoteBundle = loadBundleFile(fs, bundlePath)
    } catch {
      // empty
    }

    const mergedBundle = mergeTouchedBundleDeps(remoteBundle, ourTouchedBundle)
    saveBundleFile(fs, bundlePath, mergedBundle)
    console.log(`   🔀 Merged ${Object.keys(ourTouchedBundle).length} touched bundle entr(y/ies) with remote`)

    execSync(`git add ${bundleFileName}`, { cwd: projectRootDir, stdio: 'pipe' })

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

  const targetBranch = 'develop'

  let currentBranch = ''
  try {
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRootDir,
      encoding: 'utf8'
    }).trim()
  } catch {
    currentBranch = ''
  }

  if (currentBranch !== targetBranch) {
    console.log(
      `   ⚠️  Refusing git commit/push: on "${currentBranch || 'unknown'}" (need ${targetBranch}). bundle-top-dependencies.json was written locally only.`
    )
    return
  }

  try {
    configureGit(projectRootDir, execSync, { userName: CI_GIT_AUTHOR_NAME_BUNDLE })

    console.log(`   Current branch: ${currentBranch}`)
    console.log(`   Target branch: ${targetBranch}`)

    execSync(`git add ${bundleFileName}`, { cwd: projectRootDir })
    execSync(`git commit --no-verify -m "chore(ci): update bundle-top-dependencies [skip ci]"`, {
      cwd: projectRootDir
    })

    let pushSuccess = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (isRebaseInProgress()) {
          console.log(`   🔄 Attempt ${attempt}/3: Resolving in-progress rebase...`)
          resolveBundleConflict()
        } else {
          console.log(`   🔄 Attempt ${attempt}/3: Pulling and rebasing...`)
          execSync(`git pull --rebase origin ${targetBranch}`, { cwd: projectRootDir, stdio: 'pipe' })
        }

        execSync(`git push origin ${targetBranch}`, { cwd: projectRootDir, stdio: 'pipe' })
        pushSuccess = true
        console.log(`   ✅ Bundle dependencies committed and pushed to ${targetBranch}`)
        break
      } catch (error) {
        const errorOutput = (error.stdout?.toString() || '') + (error.stderr?.toString() || '') + (error.message || '')

        const isConflict =
          errorOutput.includes('CONFLICT') ||
          errorOutput.includes('Merge conflict') ||
          errorOutput.includes('unmerged files') ||
          errorOutput.includes('fix conflicts') ||
          isRebaseInProgress()

        if (isConflict) {
          try {
            resolveBundleConflict()
            execSync(`git push origin ${targetBranch}`, { cwd: projectRootDir, stdio: 'pipe' })
            pushSuccess = true
            console.log(`   ✅ Bundle dependencies pushed (after conflict resolution)`)
            break
          } catch (pushError) {
            const pushErrorOutput =
              (pushError.stdout?.toString() || '') + (pushError.stderr?.toString() || '') + (pushError.message || '')
            if (pushErrorOutput.includes('rejected') || pushErrorOutput.includes('non-fast-forward')) {
              console.log('   ⚠️  More remote changes detected, retrying...')
              abortRebaseIfNeeded()
              execSync(`git add ${bundleFileName}`, { cwd: projectRootDir, stdio: 'pipe' })
              try {
                execSync(`git commit --no-verify -m "chore(ci): update bundle-top-dependencies [skip ci]"`, {
                  cwd: projectRootDir,
                  stdio: 'pipe'
                })
              } catch {
                // no changes
              }
            } else {
              throw pushError
            }
          }
        } else if (attempt < 3) {
          console.log(`   🔄 Push failed (attempt ${attempt}/3), retrying...`)
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
    console.log(`   ⚠️  Failed to commit/push bundle dependencies: ${error.message}`)
    console.log('   ℹ️  Screens were published successfully; bundle JSON update is non-critical')
  }
}

main().catch(err => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
