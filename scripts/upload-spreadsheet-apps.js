import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || 'screens'

async function upload() {
  const projectRootDir = path.resolve(__dirname, '..')
  const sourceFile = path.join(projectRootDir, 'dist', 'platform', 'apps', 'spreadsheet-apps', 'index.js')
  const destPath = 'spreadsheet-apps/index.js'

  if (!fs.existsSync(sourceFile)) {
    console.error('Source file not found:', sourceFile)
    process.exit(1)
  }

  console.log('Uploading to:', destPath)

  const blobServiceClient = new BlobServiceClient(
    `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net?${AZURE_STORAGE_SAS_TOKEN}`
  )
  const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME)
  const blockBlobClient = containerClient.getBlockBlobClient(destPath)

  const fileContent = fs.readFileSync(sourceFile)
  await blockBlobClient.uploadData(fileContent, {
    blobHTTPHeaders: {
      blobContentType: 'application/javascript',
      blobCacheControl: 'no-cache, no-store, must-revalidate'
    }
  })

  console.log('✅ Uploaded successfully!')
}

upload().catch(console.error)
