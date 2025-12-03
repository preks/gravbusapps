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
import { glob } from 'glob'
import { calculateScreenHash, loadHashFile, saveHashFile, configureGit } from './utils/componentHashUtils.js'

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
  const appIndexFiles = await glob('src/business-apps/**/apps/*/index.ts', { cwd: projectRoot, nodir: true })
  const formIndexFiles = await glob('src/business-apps/**/forms/*/index.ts', { cwd: projectRoot, nodir: true })
  const popupIndexFiles = await glob('src/business-apps/**/popups/*/index.ts', { cwd: projectRoot, nodir: true })
  const recordIndexFiles = await glob('src/business-apps/**/records/*/index.ts', { cwd: projectRoot, nodir: true })

  const allIndexFiles = [...appIndexFiles, ...formIndexFiles, ...popupIndexFiles, ...recordIndexFiles]
  const uniqueDirs = new Set()

  for (const filePath of allIndexFiles) {
    const dir = path.dirname(filePath)
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
    console.error('❌ Error: --env=dev|prod is required')
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

  console.log('🔧 Hash Calculator')
  console.log(`${'='.repeat(60)}`)
  console.log(`📁 Environment: ${args.env}`)
  console.log(`📄 Hash file: ${path.basename(hashFile)}`)
  console.log(`🌿 Target branch: ${branch}`)
  console.log(`💾 Commit changes: ${args.commit ? 'YES' : 'NO'}`)
  console.log(`🔍 Dry run: ${args.dryRun ? 'YES' : 'NO'}`)

  // Get screens to process
  let screens = args.screens
  if (!screens || screens.length === 0) {
    console.log('\n📋 Finding all screens in project...')
    screens = await findAllScreenDirectories()
  }

  console.log(`\n📊 Screens to process: ${screens.length}`)

  if (args.dryRun) {
    console.log('\n🔍 DRY RUN - Would process these screens:')
    screens.forEach(s => console.log(`   - ${s}`))
    console.log(`\nWould update: ${hashFile}`)
    return
  }

  // Load existing hashes
  const hashes = loadHashFile(hashFile)
  console.log(`📥 Loaded ${Object.keys(hashes).length} existing hash(es)`)

  // Process each screen
  let successCount = 0
  let failCount = 0
  const updatedScreens = []

  console.log(`\n${'='.repeat(60)}`)
  console.log('🔨 Building screens and calculating hashes...')
  console.log(`${'='.repeat(60)}`)

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
      process.stdout.write(`\r${progress} ✅ ${screen}: ${hash.substring(0, 16)}...`.padEnd(80) + '\n')
    } catch (error) {
      failCount++
      process.stdout.write(`\r${progress} ❌ ${screen}: ${error.message}`.padEnd(80) + '\n')
    }
  }

  // Save updated hashes
  console.log(`\n${'='.repeat(60)}`)
  console.log('💾 Saving hashes...')
  console.log(`${'='.repeat(60)}`)

  saveHashFile(hashFile, hashes)
  console.log(`✅ Saved ${Object.keys(hashes).length} hash(es) to ${path.basename(hashFile)}`)

  // Show changes
  if (updatedScreens.length > 0) {
    console.log(`\n📝 Updated hashes (${updatedScreens.length}):`)
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
    console.log(`\n${'='.repeat(60)}`)
    console.log('📤 Committing and pushing changes...')
    console.log(`${'='.repeat(60)}`)

    try {
      configureGit(projectRoot, execSync)
      execSync(`git add ${path.basename(hashFile)}`, { cwd: projectRoot })
      execSync(`git commit -m "chore(ci): calculate ${args.env} hashes (${successCount} screens) [skip ci]"`, {
        cwd: projectRoot
      })

      // Pull with rebase and push
      let pushSuccess = false
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          execSync(`git pull --rebase origin ${branch}`, { cwd: projectRoot, stdio: 'inherit' })
          execSync(`git push origin ${branch}`, { cwd: projectRoot, stdio: 'inherit' })
          pushSuccess = true
          console.log(`✅ Changes committed and pushed to ${branch}`)
          break
        } catch (error) {
          if (attempt < 3) {
            console.log(`🔄 Push failed (attempt ${attempt}/3), retrying...`)
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
          } else {
            throw error
          }
        }
      }

      if (!pushSuccess) {
        throw new Error('Failed to push after 3 retries')
      }
    } catch (error) {
      console.error(`❌ Failed to commit/push: ${error.message}`)
      console.log('ℹ️  Hashes were saved locally, you can commit manually')
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 SUMMARY')
  console.log(`${'='.repeat(60)}`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📝 Updated: ${updatedScreens.length}`)
  console.log(`📄 Hash file: ${path.basename(hashFile)}`)

  if (failCount > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ An unexpected error occurred:', error)
  process.exit(1)
})
