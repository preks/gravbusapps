/**
 * Build all screens in batches
 * Uses multi-entry Vite builds for each batch for speed
 */

import { execSync } from 'node:child_process'
import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BATCH_SIZE = 30

console.log('🚀 Building all screens in batches...')

const projectRootDir = path.resolve(__dirname, '..')

// Get all screen entries by reading the dist structure or discovering from source
function getAllScreens() {
  const businessAppsDir = path.join(projectRootDir, 'src', 'business-apps')
  const screens = []

  const validScreenTypes = ['apps', 'forms', 'popups', 'records', 'windows']

  function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const itemPath = path.join(dir, item)
      const newRelativePath = relativePath ? `${relativePath}/${item}` : item

      if (fs.statSync(itemPath).isDirectory()) {
        // Check if this directory has an index.ts (potential screen)
        const indexPath = path.join(itemPath, 'index.ts')
        if (fs.existsSync(indexPath)) {
          // Check if parent directory is a valid screen type
          const pathParts = newRelativePath.split('/')
          if (pathParts.length >= 2) {
            const screenType = pathParts[pathParts.length - 2]
            if (validScreenTypes.includes(screenType)) {
              screens.push(newRelativePath)
            }
          }
        }

        // Recurse into subdirectories
        scanDirectory(itemPath, newRelativePath)
      }
    }
  }

  scanDirectory(businessAppsDir)
  return screens
}

async function buildBatch(screens, batchNum, totalBatches) {
  let failureErrors = []
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📦 BATCH ${batchNum}/${totalBatches} - Building ${screens.length} screens`)
  console.log(`${'='.repeat(80)}`)
  screens.forEach(s => console.log(`   - ${s}`))

  // Create a temporary entry mapping for this batch
  const batchEntries = screens.reduce((acc, screen) => {
    acc[screen] = path.join(projectRootDir, 'src', 'business-apps', screen, 'index.ts')
    return acc
  }, {})

  // Write batch entries to a temp file for Vite to read
  const batchEntriesFile = path.join(projectRootDir, '.batch-entries.json')
  fs.writeFileSync(batchEntriesFile, JSON.stringify(batchEntries, null, 2))

  try {
    // Run Vite build with batch mode
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: projectRootDir,
      env: {
        ...process.env,
        VITE_BATCH_MODE: 'true',
        NODE_OPTIONS: '--max-old-space-size=14336' // 14GB heap for batch builds
      }
    })

    console.log(`✅ Batch ${batchNum}/${totalBatches} completed successfully`)

    // Clean up temp file
    if (fs.existsSync(batchEntriesFile)) {
      fs.unlinkSync(batchEntriesFile)
    }

    return { success: true, errors: [] }
  } catch (error) {
    console.error(`❌ Batch ${batchNum}/${totalBatches} failed:`, error.message)
    failureErrors.push(error.message)

    // Clean up temp file
    if (fs.existsSync(batchEntriesFile)) {
      fs.unlinkSync(batchEntriesFile)
    }

    return { success: false, errors: failureErrors }
  }
}

async function main() {
  const startTime = Date.now()

  // Discover all screens
  console.log('🔍 Discovering all screens...')
  const allScreens = getAllScreens()
  console.log(`📊 Found ${allScreens.length} screens to build`)

  // Split into batches
  const batches = []
  for (let i = 0; i < allScreens.length; i += BATCH_SIZE) {
    batches.push(allScreens.slice(i, i + BATCH_SIZE))
  }

  console.log(`📦 Split into ${batches.length} batches of ~${BATCH_SIZE} screens each`)

  // Build each batch
  let successCount = 0
  let failureCount = 0
  let failureErrors = []

  for (let i = 0; i < batches.length; i++) {
    const { success, errors } = await buildBatch(batches[i], i + 1, batches.length)
    if (success) {
      successCount++
    } else {
      failureCount++
      failureErrors.push(...errors)
      console.error(`\n⚠️  Batch ${i + 1} failed, but continuing with remaining batches...`)
    }
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 BUILD SUMMARY`)
  console.log(`${'='.repeat(80)}`)
  console.log(`⏱️  Total time: ${duration} minutes`)
  console.log(`📦 Total batches: ${batches.length}`)
  console.log(`✅ Successful batches: ${successCount}`)
  console.log(`❌ Failed batches: ${failureCount}`)
  console.log(`📈 Total screens: ${allScreens.length}`)

  if (failureCount > 0) {
    console.log(`\n💥 Build completed with ${failureCount} failed batch(es)`)
    console.log(`❌ Errors: ${failureErrors.join('\n')}`)
    process.exit(1)
  } else {
    console.log(`\n🎉 All batches completed successfully!`)
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
