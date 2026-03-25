/**
 * Calculate screen hashes manually
 *
 * Usage:
 *   node scripts/calculate-hashes.js --env=dev|prod [--screens=screen1,screen2] [--commit]
 *
 * Options:
 *   --env=dev|prod    Target environment (required)
 *   --screens=...     Comma-separated list of screens (optional, defaults to all)
 *   --commit          Commit and push changes to git (optional)
 *   --dry-run         Show what would be done without making changes
 *
 * This script builds screens and calculates their artifact hashes.
 * Useful for bootstrapping hash files without actual deployment.
 */

import { execSync } from 'node:child_process'
import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { calculateScreenHash, loadHashFile, saveHashFile, configureGit } from './utils/componentHashUtils.js'
import { getScreenDirectories } from './utils/screenDiscovery.js'
import { logPhase } from './utils/logPhase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Parse command line arguments
function parseArgs() {
  const args = {
    env: null,
    screens: null,
    commit: false,
    dryRun: false
  }

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--env=')) {
      args.env = arg.replace('--env=', '')
    } else if (arg.startsWith('--screens=')) {
      args.screens = arg
        .replace('--screens=', '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    } else if (arg === '--commit') {
      args.commit = true
    } else if (arg === '--dry-run') {
      args.dryRun = true
    }
  }

  return args
}

/**
 * Find all screen directories in the project
 */
async function findAllScreenDirectories() {
  const uniqueDirs = new Set()

  const screenDirs = await getScreenDirectories({ cwd: projectRoot })

  for (const dir of screenDirs) {
    const publishPath = dir.replace(/^src[\\/]+business-apps[\\/]+/, '').replace(/\\/g, '/')
    if (publishPath) uniqueDirs.add(publishPath)
  }

  return Array.from(uniqueDirs).sort()
}

/**
 * Build a single screen with Vite
 */
function buildScreen(screenPath) {
  const sourceEntryFile = path.join('src', 'business-apps', screenPath, 'index.ts')
  const buildOutputDir = path.join(projectRoot, 'dist', screenPath)

  // Clean existing build
  if (fs.existsSync(buildOutputDir)) {
    fs.rmSync(buildOutputDir, { recursive: true, force: true })
  }

  // Create temp directory for modified CSS
  const tempDir = path.join(projectRoot, 'temp_build')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const screenPathParts = screenPath.split('/')
  const product = screenPathParts[0]

  const originalIndexCssPath = path.join(projectRoot, 'src', 'index.css')
  const tempIndexCssPath = path.join(tempDir, 'index.css')

  // Create modified index.css
  const indexCssContent = fs.readFileSync(originalIndexCssPath, 'utf8')
  const modifiedIndexCss = indexCssContent
    .split('\n')
    .filter(line => {
      if (line.includes("@import '@newwork/gravity-ui-catalog")) return false
      if (line.includes("@import './business-apps/")) {
        return line.includes(`/business-apps/${product}/`)
      }
      return true
    })
    .map(line => {
      if (line.includes("@import './business-apps/")) {
        return line.replace("@import './business-apps/", "@import '../src/business-apps/")
      } else if (line.includes("@import './common/")) {
        return line.replace("@import './common/", "@import '../src/common/")
      } else if (line.includes("@import './") && !line.includes("@import './tailwind.config.js'")) {
        return line.replace("@import './", "@import '../src/")
      }
      return line
    })
    .join('\n')

  fs.writeFileSync(tempIndexCssPath, modifiedIndexCss, 'utf8')

  // Build environment
  const buildEnv = {
    ...process.env,
    PROJECT_ROOT_DIR: projectRoot,
    VITE_GIT_USER: 'hash-calculator',
    VITE_PUBLISH_TIME: new Date().toISOString(),
    VITE_BUILD_VERSION: 'hash-calc',
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: screenPath,
    TEMP_INDEX_CSS: tempIndexCssPath.replace(/\\/g, '/'),
    SINGLE_SCREEN_CSS: 'true',
    NODE_ENV: 'production',
    VITE_BUILD_FOR_DEPLOYMENT: 'false',
    VITE_BUILD_NUMBER: 'hash-calc'
  }

  try {
    execSync('npx vite build', {
      stdio: 'pipe',
      cwd: projectRoot,
      env: buildEnv
    })

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    return buildOutputDir
  } catch (error) {
    // Clean up temp directory on error too
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    throw error
  }
}

async function main() {
  const args = parseArgs()

  // Validate arguments
  if (!args.env || !['dev', 'prod'].includes(args.env)) {
    console.error('Error: --env=dev|prod is required')
    console.error('\nUsage:')
    console.error(
      '  node scripts/calculate-hashes.js --env=dev|prod [--screens=screen1,screen2] [--commit] [--dry-run]'
    )
    console.error('\nExamples:')
    console.error('  node scripts/calculate-hashes.js --env=prod')
    console.error('  node scripts/calculate-hashes.js --env=dev --screens=hr/core/apps/employee-directory')
    console.error('  node scripts/calculate-hashes.js --env=prod --commit')
    process.exit(1)
  }

  const hashFile =
    args.env === 'dev'
      ? path.join(projectRoot, 'component-hashes.json')
      : path.join(projectRoot, 'component-hashes-prod.json')

  const branch = args.env === 'dev' ? 'develop' : 'main'

  logPhase('HASH CALCULATOR')
  console.log(`Environment: ${args.env}`)
  console.log(`Hash file: ${path.basename(hashFile)}`)
  console.log(`Target branch: ${branch}`)
  console.log(`Commit changes: ${args.commit ? 'YES' : 'NO'}`)
  console.log(`Dry run: ${args.dryRun ? 'YES' : 'NO'}`)

  // Get screens to process
  let screens = args.screens
  if (!screens || screens.length === 0) {
    console.log('\nFinding all screens in project...')
    screens = await findAllScreenDirectories()
  }

  console.log(`\nScreens to process: ${screens.length}`)

  if (args.dryRun) {
    console.log('\nDRY RUN - Would process these screens:')
    screens.forEach(s => console.log(`   - ${s}`))
    console.log(`\nWould update: ${hashFile}`)
    return
  }

  // Load existing hashes
  const hashes = loadHashFile(hashFile)
  console.log(`Loaded ${Object.keys(hashes).length} existing hash(es)`)

  // Process each screen
  let successCount = 0
  let failCount = 0
  const updatedScreens = []

  logPhase('BUILD AND CALCULATE HASHES')

  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i]
    const progress = `[${i + 1}/${screens.length}]`

    process.stdout.write(`\r${progress} Building: ${screen}...`.padEnd(80))

    try {
      const buildOutputDir = buildScreen(screen)
      const hash = calculateScreenHash(buildOutputDir)

      const oldHash = hashes[screen]
      hashes[screen] = hash

      if (oldHash !== hash) {
        updatedScreens.push({ screen, oldHash, newHash: hash })
      }

      successCount++
      process.stdout.write(`\r${progress} OK ${screen}: ${hash.substring(0, 16)}...`.padEnd(80) + '\n')
    } catch (error) {
      failCount++
      process.stdout.write(`\r${progress} FAIL ${screen}: ${error.message}`.padEnd(80) + '\n')
    }
  }

  // Save updated hashes
  logPhase('SAVE HASHES')

  saveHashFile(hashFile, hashes)
  console.log(`Saved ${Object.keys(hashes).length} hash(es) to ${path.basename(hashFile)}`)

  // Show changes
  if (updatedScreens.length > 0) {
    console.log(`\nUpdated hashes (${updatedScreens.length}):`)
    for (const { screen, oldHash, newHash } of updatedScreens.slice(0, 10)) {
      console.log(`   ${screen}`)
      if (oldHash) {
        console.log(`      Old: ${oldHash.substring(0, 16)}...`)
      }
      console.log(`      New: ${newHash.substring(0, 16)}...`)
    }
    if (updatedScreens.length > 10) {
      console.log(`   ... and ${updatedScreens.length - 10} more`)
    }
  }

  // Commit if requested
  if (args.commit && updatedScreens.length > 0) {
    logPhase('COMMIT AND PUSH HASHES')

    // Keep our new hashes for merge conflict resolution
    const ourNewHashes = { ...hashes }
    const hashFileName = path.basename(hashFile)

    /**
     * Check if a rebase is currently in progress
     */
    const isRebaseInProgress = () => {
      const gitDir = path.join(projectRoot, '.git')
      return fs.existsSync(path.join(gitDir, 'rebase-merge')) || fs.existsSync(path.join(gitDir, 'rebase-apply'))
    }

    /**
     * Abort any in-progress rebase
     */
    const abortRebaseIfNeeded = () => {
      if (isRebaseInProgress()) {
        console.log('   WARNING: Aborting in-progress rebase...')
        try {
          execSync('git rebase --abort', { cwd: projectRoot, stdio: 'pipe' })
        } catch {
          // Ignore errors during abort
        }
      }
    }

    /**
     * Resolve merge conflict in hash file by merging our changes with remote
     */
    const resolveHashConflict = () => {
      console.log('   WARNING: Rebase conflict detected, merging hashes manually...')

      // During rebase: --ours = remote (the branch we're rebasing onto), --theirs = our local changes
      // We want the remote version as base, then merge our new hashes on top
      try {
        execSync(`git checkout --ours ${hashFileName}`, { cwd: projectRoot, stdio: 'pipe' })
      } catch {
        // File might not exist on remote, start with empty
        console.log('   Remote version not available, using local as base')
      }

      // Load whatever version we have now (remote or empty)
      let remoteHashes = {}
      try {
        remoteHashes = loadHashFile(hashFile)
      } catch {
        // If file doesn't exist or is invalid, start fresh
      }

      // Merge our new hashes into the remote version (our changes take priority)
      const mergedHashes = { ...remoteHashes, ...ourNewHashes }

      // Save the merged result
      saveHashFile(hashFile, mergedHashes)
      console.log(
        `   Merged ${Object.keys(ourNewHashes).length} local hash(es) with ${Object.keys(remoteHashes).length} remote hash(es)`
      )

      // Stage the resolved file
      execSync(`git add ${hashFileName}`, { cwd: projectRoot, stdio: 'pipe' })

      // Continue the rebase
      try {
        execSync('git rebase --continue', {
          cwd: projectRoot,
          stdio: 'pipe',
          env: { ...process.env, GIT_EDITOR: 'true' }
        })
      } catch {
        // Try alternative approach
        execSync('git -c core.editor=true rebase --continue', { cwd: projectRoot, stdio: 'pipe' })
      }

      console.log('   Conflict resolved and rebase continued')
    }

    try {
      configureGit(projectRoot, execSync)

      // Get the current branch name
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim()
      console.log(`   Current branch: ${currentBranch}`)
      console.log(`   Target branch: ${branch}`)

      // Check if we're already on the target branch
      const needsBranchSwitch = currentBranch !== branch

      if (needsBranchSwitch) {
        console.log(`   Switching from ${currentBranch} to ${branch}...`)

        // Stash any uncommitted changes (the hash file we just modified)
        // We'll use a different approach: copy the hash file, switch branch, then restore
        const hashFileContent = fs.readFileSync(hashFile, 'utf8')

        // Fetch the target branch
        execSync(`git fetch origin ${branch}:${branch}`, { cwd: projectRoot, stdio: 'pipe' })

        // Checkout the target branch
        execSync(`git checkout ${branch}`, { cwd: projectRoot, stdio: 'pipe' })

        // Restore the hash file with our changes
        fs.writeFileSync(hashFile, hashFileContent, 'utf8')
        console.log(`   Switched to ${branch} and restored hash file`)
      }

      execSync(`git add ${hashFileName}`, { cwd: projectRoot })
      execSync(`git commit -m "chore(ci): update ${args.env} component hashes (manual calculation) [skip ci]"`, {
        cwd: projectRoot
      })

      // Pull with rebase and push
      let pushSuccess = false
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Check if there's an incomplete rebase from a previous attempt
          if (isRebaseInProgress()) {
            console.log(`Attempt ${attempt}/3: Resolving in-progress rebase...`)
            resolveHashConflict()
          } else {
            console.log(`Attempt ${attempt}/3: Pulling and rebasing...`)
            // Capture output to detect conflicts
            execSync(`git pull --rebase origin ${branch}`, { cwd: projectRoot, stdio: 'pipe' })
          }

          // If we got here, rebase succeeded - try to push
          execSync(`git push origin ${branch}`, { cwd: projectRoot, stdio: 'pipe' })
          pushSuccess = true
          console.log(`Changes committed and pushed to ${branch}`)
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
              execSync(`git push origin ${branch}`, { cwd: projectRoot, stdio: 'pipe' })
              pushSuccess = true
              console.log(`Changes committed and pushed to ${branch} (after conflict resolution)`)
              break
            } catch (pushError) {
              const pushErrorOutput =
                (pushError.stdout?.toString() || '') + (pushError.stderr?.toString() || '') + (pushError.message || '')
              // If push failed due to more remote changes, we need to retry the whole process
              if (pushErrorOutput.includes('rejected') || pushErrorOutput.includes('non-fast-forward')) {
                console.log('   WARNING: More remote changes detected, retrying...')
                abortRebaseIfNeeded()
                // Re-commit our changes
                execSync(`git add ${hashFileName}`, { cwd: projectRoot, stdio: 'pipe' })
                try {
                  execSync(
                    `git commit -m "chore(ci): update ${args.env} component hashes (manual calculation) [skip ci]"`,
                    {
                      cwd: projectRoot,
                      stdio: 'pipe'
                    }
                  )
                } catch {
                  // Commit might fail if no changes, that's ok
                }
              } else {
                throw pushError
              }
            }
          } else if (attempt < 3) {
            console.log(`Push failed (attempt ${attempt}/3), retrying...`)
            abortRebaseIfNeeded()
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
          } else {
            // On final attempt failure, abort any in-progress rebase
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
      // Clean up on failure
      abortRebaseIfNeeded()
      console.error(`Failed to commit/push: ${error.message}`)
      console.log('INFO: Hashes were saved locally, you can commit manually')
    }
  }

  // Summary
  logPhase('SUMMARY')
  console.log(`Successful: ${successCount}`)
  console.log(`Failed: ${failCount}`)
  console.log(`Updated: ${updatedScreens.length}`)
  console.log(`Hash file: ${path.basename(hashFile)}`)

  if (failCount > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error('An unexpected error occurred:', error)
  process.exit(1)
})
