#!/usr/bin/env node
/**
 * Publish NEWWORK Main (THE ENTERPRISE AI) screen to /newwork path
 * Uses the standard publish-dev-screen.js pattern
 */
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'
import { glob } from 'glob'
import {
  addCustomResourceUrl,
  addScreenConfigToScreenManagement,
  getScreenByKey,
  updateScreenConfigInScreenManagement,
  generateScreenKeyFromPath,
  formatScreenNameFromPath,
  getResourceUrlByPath
} from './api-client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

// Screen configuration
const SCREEN_PATH = 'platform/apps/newwork-main'
const AZURE_DEST = 'newwork'
const CUSTOM_URL_PATH = 'newwork' // URL path without leading slash

// Azure config from env
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || 'screens'

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  switch (ext) {
    case '.js':
      return 'application/javascript'
    case '.css':
      return 'text/css'
    case '.html':
      return 'text/html'
    case '.json':
      return 'application/json'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

async function uploadDirectory(buildOutputDir, azureDestinationPath) {
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN) {
    console.error('Error: AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_SAS_TOKEN must be set in .env')
    process.exit(1)
  }

  const blobServiceUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/?${AZURE_STORAGE_SAS_TOKEN}`
  const blobServiceClient = new BlobServiceClient(blobServiceUrl)
  const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME)

  console.log(
    `☁️  Uploading to Azure Storage account: ${AZURE_STORAGE_ACCOUNT_NAME}, container: ${AZURE_CONTAINER_NAME}`
  )
  console.log(`   Source: ${buildOutputDir}`)
  console.log(`   Destination base path: ${azureDestinationPath}`)

  const filesToUpload = await glob('**/*', {
    cwd: buildOutputDir,
    nodir: true
  })

  if (filesToUpload.length === 0) {
    console.log('   No files found in build output directory to upload.')
    return
  }

  for (const file of filesToUpload) {
    const localFilePath = path.join(buildOutputDir, file)
    const blobName = path.join(azureDestinationPath, file).replace(/\\/g, '/')
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    const contentType = getContentType(file)

    try {
      console.log(`   Uploading: ${file} as ${blobName} (Content-Type: ${contentType})`)
      await blockBlobClient.uploadFile(localFilePath, {
        blobHTTPHeaders: {
          blobContentType: contentType,
          blobCacheControl: 'no-cache, no-store, must-revalidate'
        }
      })
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error.message)
    }
  }
  console.log('✅ All files uploaded successfully.')
}

async function main() {
  console.log('🚀 Publishing NEWWORK Main (THE ENTERPRISE AI) screen to /newwork...\n')

  const projectRootDir = path.resolve(__dirname, '..')
  console.log(`   Project Root Dir: ${projectRootDir}`)

  // Use the standard screen path structure
  const sourceEntryFile = path.join('src', 'business-apps', SCREEN_PATH, 'index.ts')
  const viteEntryKey = SCREEN_PATH
  const buildOutputDir = path.join(projectRootDir, 'dist', SCREEN_PATH)
  const azureDestinationPath = AZURE_DEST

  console.log(`   Source Entry File: ${sourceEntryFile}`)
  console.log(`   Vite Entry Key: ${viteEntryKey}`)
  console.log(`   Build Output Dir: ${buildOutputDir}`)
  console.log(`   Azure Destination: ${AZURE_CONTAINER_NAME}/${azureDestinationPath}`)

  // Verify entry file exists
  const entryFilePath = path.join(projectRootDir, sourceEntryFile)
  if (!fs.existsSync(entryFilePath)) {
    console.error(`❌ Error: Entry file not found: ${entryFilePath}`)
    process.exit(1)
  }

  console.log('\n⚙️  Building screen with Vite...')

  // Clean up existing build output
  if (fs.existsSync(buildOutputDir)) {
    console.log(`🗑️  Deleting existing output directory: ${buildOutputDir}`)
    fs.rmSync(buildOutputDir, { recursive: true, force: true })
    console.log('✅ Directory deleted successfully.')
  }

  // Create a temporary directory for build files
  const tempDir = path.join(projectRootDir, 'temp_build')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const originalIndexCssPath = path.join(projectRootDir, 'src', 'index.css')
  const tempIndexCssPath = path.join(tempDir, 'index.css')

  // Create a modified index.css (following standard pattern)
  console.log('📝 Creating screen-specific index.css...')

  const indexCssContent = fs.readFileSync(originalIndexCssPath, 'utf8')
  const product = SCREEN_PATH.split('/')[0] // 'platform'
  const modifiedIndexCss = indexCssContent
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

  // Build environment variables
  const buildEnv = {
    ...process.env,
    PROJECT_ROOT_DIR: projectRootDir,
    VITE_GIT_USER: process.env.VITE_GIT_USER || execSync('git config user.name').toString().trim(),
    VITE_PUBLISH_TIME: new Date().toISOString(),
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey,
    TEMP_INDEX_CSS: tempIndexCssPath.replace(/\\/g, '/'),
    SINGLE_SCREEN_CSS: 'true',
    NODE_ENV: 'production',
    VITE_BUILD_FOR_DEPLOYMENT: 'false'
  }

  const viteBuildCommand = `npx vite build`

  console.log(`   Executing: ${viteBuildCommand} with environment variables`)
  try {
    execSync(viteBuildCommand, {
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
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    // Clean up temp directory on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    process.exit(1)
  }

  // Verify build output exists
  if (!fs.existsSync(buildOutputDir)) {
    console.error(`❌ Build output not found: ${buildOutputDir}`)
    process.exit(1)
  }

  // Upload JS files
  console.log('\n☁️  Uploading JS files to Azure...')
  try {
    await uploadDirectory(buildOutputDir, azureDestinationPath)
  } catch (error) {
    console.error('❌ JS upload failed:', error.message)
    process.exit(1)
  }

  // Upload CSS files
  console.log('\n☁️  Uploading CSS files to Azure...')
  const cssOutputDir = path.join(projectRootDir, 'dist', 'assets')
  if (fs.existsSync(cssOutputDir)) {
    try {
      await uploadDirectory(cssOutputDir, azureDestinationPath)
    } catch (error) {
      console.error('❌ CSS upload failed:', error.message)
      process.exit(1)
    }
  } else {
    console.log('   ℹ️  No CSS assets directory found, skipping CSS upload.')
  }

  // Register custom resource URL
  console.log('\n🔗 Registering /newwork URL...')
  try {
    const existingResourceUrl = await getResourceUrlByPath(`/platform/${CUSTOM_URL_PATH}`)

    if (existingResourceUrl) {
      console.log(`   ℹ️  Resource URL already exists: ${existingResourceUrl.url}`)
      console.log(`   Resource URL ID: ${existingResourceUrl.id}`)
    } else {
      const resourceAdded = await addCustomResourceUrl(CUSTOM_URL_PATH)
      if (resourceAdded) {
        console.log('   ✅ Resource URL registered.')
      } else {
        console.log('   ℹ️  Resource URL registration attempted.')
      }
    }
  } catch (error) {
    console.error('   ⚠️  Resource URL registration failed:', error.message)
  }

  // Register with Screen Management
  console.log('\n📱 Registering screen configuration...')
  try {
    const screenKey = generateScreenKeyFromPath(CUSTOM_URL_PATH)
    const screenName = formatScreenNameFromPath(CUSTOM_URL_PATH) || 'NEWWORK - The Enterprise AI'

    // Check if screen already exists
    const existingScreen = await getScreenByKey(screenKey)

    if (existingScreen) {
      console.log(`   ℹ️  Screen already exists (ID: ${existingScreen.id}), updating componentPath...`)
      console.log(`   Current componentPath: ${existingScreen.screenComponents?.formDefinition?.componentPath}`)
      console.log(`   New componentPath: /${azureDestinationPath}`)

      // Update the existing screen to point to the correct componentPath
      const updateData = {
        ...existingScreen,
        screenComponents: {
          ...existingScreen.screenComponents,
          formDefinition: {
            ...existingScreen.screenComponents.formDefinition,
            componentPath: `/${azureDestinationPath}`
          }
        }
      }

      const updateSuccess = await updateScreenConfigInScreenManagement(existingScreen.id, updateData)

      if (updateSuccess) {
        console.log('   ✅ Screen configuration updated successfully.')
      } else {
        console.log('   ⚠️  Screen configuration update failed.')
      }
    } else {
      // Create new screen configuration
      const addResult = await addScreenConfigToScreenManagement(
        azureDestinationPath,
        CUSTOM_URL_PATH,
        '',
        null,
        {},
        {
          nameOverride: screenName,
          screenKeyOverride: screenKey
        }
      )
      if (addResult && addResult.success) {
        console.log('   ✅ Screen configuration registered.')
      } else {
        console.log('   ℹ️  Screen configuration registration skipped.')
      }
    }
  } catch (error) {
    console.error('   ⚠️  Screen configuration failed:', error.message)
  }

  console.log('\n🎉 NEWWORK Main (THE ENTERPRISE AI) screen published successfully!')
  console.log(`   URL: /${CUSTOM_URL_PATH}`)
}

main().catch(error => {
  console.error('❌ An unexpected error occurred:', error)
  process.exit(1)
})
