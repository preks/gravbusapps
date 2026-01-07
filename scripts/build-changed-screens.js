/**
 * Build script for screens
 * - If screens file is provided: Builds those specific screens individually
 * - If no screens file: Builds all screens with multi-entry Vite build
 * - Does NOT upload to Azure or register in screen management
 * - Fails fast if any screen has build errors
 *
 * Usage:
 *   node scripts/build-changed-screens.js                    # Build all screens (fast)
 *   node scripts/build-changed-screens.js screens-list.txt   # Build specific screens
 */

import { execSync } from 'node:child_process'
import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { exec } from 'node:child_process'
import dotenv from '@dotenvx/dotenvx'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

// Use a simple build version for validation
const BUILD_VERSION = 'validation'

console.log('🔍 Starting build validation for changed screens...')
console.log(`🎯 Build version: ${BUILD_VERSION}`)

async function buildScreenOnly(screenPath) {
  console.log(`🔨 Building screen for validation: ${screenPath}`)

  const projectRootDir = path.resolve(__dirname, '..')
  console.log(`   Project Root Dir: ${projectRootDir}`)

  // Use the full screenPath for paths to maintain the directory structure
  const sourceEntryFile = path.join('src', 'business-apps', screenPath, 'index.ts')
  const viteEntryKey = screenPath
  const buildOutputDir = path.join(projectRootDir, 'dist', screenPath)

  console.log(`   Source Entry File: ${sourceEntryFile}`)
  console.log(`   Vite Entry Key: ${viteEntryKey}`)
  console.log(`   Build Output Dir: ${buildOutputDir}`)

  // Check if source file exists
  if (!fs.existsSync(path.join(projectRootDir, sourceEntryFile))) {
    throw new Error(`Source file not found: ${sourceEntryFile}`)
  }

  console.log('\n⚙️  Building screen with Vite (validation only)...')

  if (fs.existsSync(buildOutputDir)) {
    console.log(`🗑️  Deleting existing output directory: ${buildOutputDir}`)
    fs.rmSync(buildOutputDir, { recursive: true, force: true })
    console.log('✅ Directory deleted successfully.')
  } else {
    console.log(`ℹ️  Output directory ${buildOutputDir} does not exist, no need to delete.`)
  }

  // Create a temporary directory for build files
  const tempDir = path.join(projectRootDir, 'temp_build_validation')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const screenPathParts = screenPath.split('/')
  const product = screenPathParts[0]

  const originalIndexCssPath = path.join(projectRootDir, 'src', 'index.css')
  const tempIndexCssPath = path.join(tempDir, 'index.css')

  // Create a modified index.css
  console.log('📝 Creating screen-specific index.css...')

  const indexCssContent = fs.readFileSync(originalIndexCssPath, 'utf8')
  const modifiedIndexCss = indexCssContent
    // Process each line
    .split('\n')
    .filter(line => {
      // Remove @newwork/gravity-ui-catalog import as it will already be loaded in the browser
      if (line.includes("@import '@newwork/gravity-ui-catalog")) {
        return false
      }
      // Keep all lines except specific CSS imports not relevant to this screen
      if (line.includes("@import './business-apps/")) {
        // Only keep imports related to this screen's product
        return line.includes(`/business-apps/${product}/`)
      }
      return true
    })
    // Fix relative import paths by adding ../src prefix
    .map(line => {
      // Fix business-apps imports
      if (line.includes("@import './business-apps/")) {
        return line.replace("@import './business-apps/", "@import '../src/business-apps/")
      }
      // Fix common imports
      else if (line.includes("@import './common/")) {
        return line.replace("@import './common/", "@import '../src/common/")
      }
      // Fix any other relative imports from src
      else if (line.includes("@import './") && !line.includes("@import './tailwind.config.js'")) {
        return line.replace("@import './", "@import '../src/")
      }
      return line
    })
    .join('\n')

  fs.writeFileSync(tempIndexCssPath, modifiedIndexCss, 'utf8')
  console.log(`   Created: ${tempIndexCssPath}`)

  // Build environment with validation-specific variables
  const buildEnv = {
    ...process.env,
    PROJECT_ROOT_DIR: projectRootDir,
    VITE_GIT_USER: process.env.VITE_GIT_USER || (await execAsync('git config user.name')).toString().trim(),
    VITE_PUBLISH_TIME: new Date().toISOString(),
    VITE_BUILD_VERSION: BUILD_VERSION,
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey,
    TEMP_INDEX_CSS: tempIndexCssPath.replace(/\\/g, '/'),
    SINGLE_SCREEN_CSS: 'true',
    NODE_ENV: 'production',
    // Use simple build number for validation
    VITE_BUILD_NUMBER: 'validation'
  }

  const viteBuildCommand = `npx vite build`

  console.log(`   Executing: ${viteBuildCommand} for validation`)
  console.log(`   Build version: ${BUILD_VERSION}`)

  try {
    await execAsync(viteBuildCommand, {
      stdio: 'inherit',
      cwd: projectRootDir,
      env: buildEnv
    })
    console.log('✅ Screen built successfully.')

    // Clean up temporary directory
    console.log('🧹 Cleaning up temporary build files...')
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    // Clean up build output since this is validation only
    console.log('🧹 Cleaning up build output (validation only)...')
    if (fs.existsSync(buildOutputDir)) {
      fs.rmSync(buildOutputDir, { recursive: true, force: true })
    }

    return {
      success: true,
      screen: screenPath
    }
  } catch (error) {
    console.error('❌ Build validation failed:', error.message)

    // Clean up temporary directory even on failure
    console.log('🧹 Cleaning up temporary build files...')
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    throw error
  }
}

async function main() {
  console.log('🔍 Starting build screens...')

  // Check if manual screen list file is provided as command line argument
  const manualScreensFile = process.argv[2]

  if (!manualScreensFile) {
    console.log('ℹ️  No specific screens file provided.')
    console.log('🚀 Building all screens with batched multi-build...')

    try {
      execSync('npm run build:batched', { stdio: 'inherit' })
      console.log('✅ All screens built successfully with batched build.')
      return
    } catch (error) {
      console.error('❌ Batched build failed:', error.message)
      process.exit(1)
    }
  }

  // Manual screens file provided
  const screensFile = manualScreensFile

  if (!fs.existsSync(screensFile)) {
    console.error(`❌ Screens file not found: ${screensFile}`)
    process.exit(1)
  }

  if (!fs.statSync(screensFile).size) {
    console.log('✅ Screens file is empty. Nothing to build.')
    return
  }

  console.log(`📋 Building screens from: ${screensFile}`)

  // Read the screens to build
  const specifiedScreens = fs
    .readFileSync(screensFile, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^src\/business-apps\//, ''))

  console.log(`📋 Found ${specifiedScreens.length} screen(s) in file:`)
  specifiedScreens.forEach(screen => console.log(`   - ${screen}`))

  // Filter out screens that don't exist
  const projectRootDir = path.resolve(__dirname, '..')
  const existingScreens = specifiedScreens.filter(screen => {
    const sourceEntryFile = path.join(projectRootDir, 'src', 'business-apps', screen, 'index.ts')
    const exists = fs.existsSync(sourceEntryFile)
    if (!exists) {
      console.log(`   ⚠️  Skipping non-existent screen: ${screen} (${sourceEntryFile} not found)`)
    }
    return exists
  })

  const skippedCount = specifiedScreens.length - existingScreens.length
  if (skippedCount > 0) {
    console.log(`📋 Filtered out ${skippedCount} non-existent screen(s).`)
  }

  console.log(`📋 Building ${existingScreens.length} screen(s):`)
  existingScreens.forEach(screen => console.log(`   - ${screen}`))

  const screensToBuild = existingScreens

  // Validate each screen by building it
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🔨 SCREEN BUILD`)
  console.log(`${'='.repeat(80)}`)

  const buildResults = []
  let successCount = 0
  const failedScreens = []

  // Build screens in parallel chunks for faster builds
  const CHUNK_SIZE = 2
  let buildAborted = false

  for (let i = 0; i < screensToBuild.length && !buildAborted; i += CHUNK_SIZE) {
    const chunk = screensToBuild.slice(i, i + CHUNK_SIZE)
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
    const totalChunks = Math.ceil(screensToBuild.length / CHUNK_SIZE)

    console.log(`\n${'─'.repeat(60)}`)
    console.log(`🔨 Building chunk ${chunkNum}/${totalChunks} (${chunk.length} screen${chunk.length > 1 ? 's' : ''})`)
    chunk.forEach(s => console.log(`   - ${s}`))
    console.log(`${'─'.repeat(60)}`)

    // Build all screens in this chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(async screen => {
        try {
          const result = await buildScreenOnly(screen)
          return { screen, success: true, result }
        } catch (error) {
          return { screen, success: false, error: error.message }
        }
      })
    )

    // Process results and check for failures
    for (const result of chunkResults) {
      if (result.success) {
        console.log(`   ✅ ${result.screen}: Build successful`)
        buildResults.push({
          screen: result.screen,
          success: true,
          result: result.result
        })
        successCount++
      } else {
        console.error(`   ❌ ${result.screen}: Build failed - ${result.error}`)
        failedScreens.push({
          screen: result.screen,
          error: result.error,
          stage: 'build_validation'
        })
      }
    }

    // If any screen in this chunk failed, abort the build
    const chunkHasFailure = chunkResults.some(r => !r.success)
    if (chunkHasFailure) {
      console.error(`\n🛑 Chunk ${chunkNum} had failures - aborting build`)
      buildAborted = true
    }
  }

  // Print final summary
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 BUILD SUMMARY`)
  console.log(`${'='.repeat(80)}`)
  console.log(`🎯 Build version: ${BUILD_VERSION}`)
  console.log(`📈 Total screens: ${screensToBuild.length}`)
  console.log(`✅ Successfully built: ${successCount}`)
  console.log(`❌ Failed: ${failedScreens.length}`)

  if (failedScreens.length > 0) {
    console.log(`\n❌ FAILED SCREEN BUILD:`)
    console.log(`${'='.repeat(50)}`)

    failedScreens.forEach((failure, index) => {
      console.log(`\n${index + 1}. Screen: ${failure.screen}`)
      console.log(`   Stage: ${failure.stage}`)
      console.log(`   Error: ${failure.error}`)
      console.log(`   ${'─'.repeat(40)}`)
    })

    console.log(`\n💥 Build completed with ${failedScreens.length} failure(s)!`)
    console.log(`🚨 Please fix the build errors.`)
    console.log(`⚠️  The following screen(s) failed to compile:`)
    failedScreens.forEach(f => console.log(`     - ${f.screen}`))

    // Exit with error code to fail the pipeline
    process.exit(1)
  } else {
    console.log(`\n🎉 Build completed successfully!`)
    console.log(`✨ All ${successCount} screen(s) compiled without errors.`)
    console.log(`🚀 Screens are ready for deployment after merge.`)
  }
}

main().catch(error => {
  console.error('❌ An unexpected error occurred during build:', error)
  process.exit(1)
})
