#!/usr/bin/env node
/**
 * Publish Space hero background video to Azure Blob Storage.
 * Uses same Azure env as screen publishing: AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_SAS_TOKEN, AZURE_BLOB_CONTAINER_NAME.
 * Uploads to container path: assets/space-hero-background.mp4
 * After running, set VITE_SPACE_HERO_VIDEO_URL in .env to the printed URL (or enable public read on container).
 */

import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || 'screens'

const BLOB_PATH = 'assets/space-hero-background.mp4'

async function main() {
  const projectRoot = path.resolve(__dirname, '..')
  const defaultVideoPath = path.join(projectRoot, 'public', 'space-hero-background.mp4')
  const videoPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultVideoPath

  if (!fs.existsSync(videoPath)) {
    console.error(`Error: Video file not found at ${videoPath}`)
    console.log('Place the video at public/space-hero-background.mp4 or run:')
    console.log('  npm run publish:space-hero-video -- /path/to/your-video.mp4')
    process.exit(1)
  }

  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN) {
    console.error('Error: AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_SAS_TOKEN must be set in .env')
    process.exit(1)
  }

  const blobServiceUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/?${AZURE_STORAGE_SAS_TOKEN}`
  const blobServiceClient = new BlobServiceClient(blobServiceUrl)
  const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME)

  console.log(`Uploading Space hero video to Azure...`)
  console.log(`  Source: ${videoPath}`)
  console.log(`  Container: ${AZURE_CONTAINER_NAME}`)
  console.log(`  Blob: ${BLOB_PATH}`)

  const blockBlobClient = containerClient.getBlockBlobClient(BLOB_PATH)

  try {
    await blockBlobClient.uploadFile(videoPath, {
      blobHTTPHeaders: {
        blobContentType: 'video/mp4',
        blobCacheControl: 'public, max-age=31536000'
      }
    })
  } catch (err) {
    console.error('Upload failed:', err.message)
    process.exit(1)
  }

  const baseUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_CONTAINER_NAME}/${BLOB_PATH}`
  const urlWithSas = `${baseUrl}?${AZURE_STORAGE_SAS_TOKEN}`

  console.log('')
  console.log('Upload complete.')
  console.log('')
  console.log('Set in .env (or deployment env):')
  console.log(`  VITE_SPACE_HERO_VIDEO_URL=${urlWithSas}`)
  console.log('')
  console.log('If your container has "Public read access for blobs", you can use:')
  console.log(`  VITE_SPACE_HERO_VIDEO_URL=${baseUrl}`)
}

main()
