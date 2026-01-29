#!/usr/bin/env node
/**
 * Publish ALL screens (apps and forms) to PRODUCTION
 * - Discovers all screens in src/business-apps/
 * - Generates a list and passes it to the existing production publisher
 * - Uses the same comprehensive sync and production publishing logic
 * - ⚠️  WARNING: This will publish EVERY screen in the repository!
 */

import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function findAllScreenDirectories() {
  console.log('🔍 Discovering all screens in repository...')

  const appIndexFiles = await glob('src/business-apps/**/apps/*/index.ts', {
    nodir: true
  })
  const formIndexFiles = await glob('src/business-apps/**/forms/*/index.ts', {
    nodir: true
  })
  const popupIndexFiles = await glob('src/business-apps/**/popups/*/index.ts', {
    nodir: true
  })
  const recordIndexFiles = await glob('src/business-apps/**/records/*/index.ts', {
    nodir: true
  })
  const windowIndexFiles = await glob('src/business-apps/**/windows/*/index.ts', {
    nodir: true
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
  console.log('🚀 Publishing ALL screens to PRODUCTION...')
  console.log('⚠️  WARNING: This will publish EVERY screen in the repository!')
  console.log('')

  // Discover all screens
  const allScreens = await findAllScreenDirectories()

  if (allScreens.length === 0) {
    console.log('✅ No screens found under src/business-apps.')
    return
  }

  console.log(`📋 Found ${allScreens.length} screens to publish:`)
  console.log('─'.repeat(80))

  // Categorize screens
  const apps = allScreens.filter(s => s.includes('/apps/'))
  const forms = allScreens.filter(s => s.includes('/forms/'))
  const popups = allScreens.filter(s => s.includes('/popups/'))
  const records = allScreens.filter(s => s.includes('/records/'))
  const windows = allScreens.filter(s => s.includes('/windows/'))

  console.log(`📱 Apps: ${apps.length}`)
  apps.forEach(s => console.log(`   - ${s}`))
  console.log('')
  console.log(`📝 Forms: ${forms.length}`)
  forms.forEach(s => console.log(`   - ${s}`))
  console.log('')
  console.log(`🪟 Popups: ${popups.length}`)
  popups.forEach(s => console.log(`   - ${s}`))
  console.log('')
  console.log(`📄 Records: ${records.length}`)
  records.forEach(s => console.log(`   - ${s}`))
  console.log('')
  console.log(`🪟 Windows: ${windows.length}`)
  windows.forEach(s => console.log(`   - ${s}`))
  console.log('─'.repeat(80))
  console.log('')

  // Filter out screens that don't exist (safety check)
  const projectRootDir = path.resolve(__dirname, '..')
  const existingScreens = allScreens.filter(screen => {
    const sourceEntryFile = path.join(projectRootDir, 'src', 'business-apps', screen, 'index.ts')
    const exists = fs.existsSync(sourceEntryFile)
    if (!exists) {
      console.log(`⚠️  Skipping: ${screen} (${sourceEntryFile} not found)`)
    }
    return exists
  })

  const skippedCount = allScreens.length - existingScreens.length
  if (skippedCount > 0) {
    console.log(`⚠️  Skipped ${skippedCount} missing screen(s)`)
    console.log('')
  }

  console.log(`✅ Verified ${existingScreens.length} existing screens`)
  console.log('')

  // Write all screens to a temporary file
  const allScreensFile = 'all-screens.txt'
  fs.writeFileSync(allScreensFile, existingScreens.join('\n'))
  console.log(`📄 Screen list written to: ${allScreensFile}`)
  console.log('')

  // Call the existing production publisher with the all-screens file
  console.log('🚀 Starting production publishing process...')
  console.log('─'.repeat(80))
  console.log('')

  try {
    // Use the existing publish-prod-screens.js script which handles:
    // - Comprehensive screen synchronization
    // - Resource URL synchronization
    // - Building and uploading to Azure
    // - Screen management registration
    execSync(`node scripts/publish-prod-screens.js ${allScreensFile}`, {
      stdio: 'inherit',
      env: process.env
    })

    console.log('')
    console.log('─'.repeat(80))
    console.log('🎉 All screens published successfully to production!')
    console.log(`✨ Total screens published: ${existingScreens.length}`)
  } catch (error) {
    console.error('')
    console.error('─'.repeat(80))
    console.error('❌ Production publishing failed!')
    console.error('Please check the output above for details.', error)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
