#!/usr/bin/env node
/**
 * Publish EveryAI with automatic cache busting
 * Usage: node publish-everyai-nocache.js
 *
 * This script:
 * 1. Builds EveryAI
 * 2. Uploads to a timestamped path to bypass CDN cache
 * 3. Updates Screen Management to point to the new path
 */

import dotenv from '@dotenvx/dotenvx'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { BlobServiceClient } from '@azure/storage-blob'
import fs from 'fs'
import { getScreenByKey, updateScreenConfigInScreenManagement } from './scripts/api-client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || 'screens'

async function publishWithCacheBusting() {
  try {
    const timestamp = Date.now()
    const newPath = `/platform/apps/every-ai-${timestamp}`
    const azurePath = `platform/apps/every-ai-${timestamp}`

    console.log('🚀 Publishing EveryAI with cache busting...')
    console.log('   New path:', newPath)
    console.log()

    // Step 1: Build
    console.log('⚙️  Step 1/3: Building...')
    execSync('npm run publish:screen -- /platform/apps/every-ai', {
      cwd: __dirname,
      stdio: 'inherit'
    })

    // Step 2: Get built files
    console.log('\n📦 Step 2/3: Uploading to timestamped path...')
    const distDir = path.join(__dirname, 'dist', 'platform', 'apps', 'every-ai')
    const assetsDir = path.join(__dirname, 'dist', 'assets')

    if (!fs.existsSync(distDir)) {
      console.error('❌ Build failed - no dist files found')
      process.exit(1)
    }

    const blobServiceUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/?${AZURE_STORAGE_SAS_TOKEN}`
    const blobServiceClient = new BlobServiceClient(blobServiceUrl)
    const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME)

    // Upload index.js
    const jsFile = path.join(distDir, 'index.js')
    if (fs.existsSync(jsFile)) {
      const jsBlobName = `${azurePath}/index.js`
      const jsClient = containerClient.getBlockBlobClient(jsBlobName)
      console.log('   Uploading: index.js')
      await jsClient.uploadFile(jsFile, {
        blobHTTPHeaders: {
          blobContentType: 'application/javascript',
          blobCacheControl: 'no-cache, no-store, must-revalidate'
        }
      })
    }

    // Upload main.css
    const cssFile = path.join(assetsDir, 'main.css')
    if (fs.existsSync(cssFile)) {
      const cssBlobName = `${azurePath}/main.css`
      const cssClient = containerClient.getBlockBlobClient(cssBlobName)
      console.log('   Uploading: main.css')
      await cssClient.uploadFile(cssFile, {
        blobHTTPHeaders: {
          blobContentType: 'text/css',
          blobCacheControl: 'no-cache, no-store, must-revalidate'
        }
      })
    }

    console.log('✅ Files uploaded to:', azurePath)

    // Step 3: Update Screen Management
    console.log('\n🔄 Step 3/3: Updating Screen Management...')
    const screen = await getScreenByKey('url_every-ai')

    if (!screen) {
      console.error('❌ Screen not found in Screen Management!')
      process.exit(1)
    }

    await updateScreenConfigInScreenManagement(screen.id, {
      ...screen,
      screenComponents: {
        ...screen.screenComponents,
        formDefinition: {
          ...screen.screenComponents.formDefinition,
          componentPath: newPath,
          version: ''
        }
      }
    })

    console.log('✅ Screen Management updated')
    console.log()
    console.log('🎉 Done! EveryAI published successfully!')
    console.log('   Path:', newPath)
    console.log('   Refresh the platform to see changes.')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

publishWithCacheBusting()
