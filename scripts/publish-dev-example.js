import { execSync } from 'node:child_process'
import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'
import { glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

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
    console.error('Error: AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_SAS_TOKEN must be set in .env for SDK upload.')
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
    console.log('No files found in build output directory to upload.')
    return
  }

  for (const file of filesToUpload) {
    const localFilePath = path.join(buildOutputDir, file)
    const blobName = path.join(azureDestinationPath, file).replaceAll('\\', '/')
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    const contentType = getContentType(file)

    try {
      console.log(`   Uploading: ${file} as ${blobName} (Content-Type: ${contentType})`)
      await blockBlobClient.uploadFile(localFilePath, {
        blobHTTPHeaders: { blobContentType: contentType }
      })
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error.message)
    }
  }
  console.log('✅ All files uploaded successfully.')
}

async function main() {
  let examplePathArg = process.argv[2]

  if (!examplePathArg) {
    console.error('Error: Example path argument is missing.')
    console.log('Usage: npm run publish:example -- /<example-name>')
    console.log('Example: npm run publish:example -- /app-action-component-example')
    process.exit(1)
  }

  console.log(`Original examplePathArg: ${examplePathArg}`)

  // Remove leading slash if present
  if (examplePathArg.startsWith('/')) {
    examplePathArg = examplePathArg.substring(1)
  }

  // Fix Git Bash path issue: detect and handle C:/Program Files/Git prefix
  if (examplePathArg.startsWith('C:/Program Files/Git/')) {
    examplePathArg = examplePathArg.substring('C:/Program Files/Git/'.length)
  }

  const exampleName = examplePathArg
  console.log(`🚀 Publishing example: ${exampleName}`)

  const projectRootDir = path.resolve(__dirname, '..')
  console.log(`   Project Root Dir: ${projectRootDir}`)

  // Examples are in src/common/examples/
  const sourceEntryFile = path.join('src', 'common', 'examples', exampleName, 'index.ts')

  // Check if the example exists
  const sourceEntryFullPath = path.join(projectRootDir, sourceEntryFile)
  if (!fs.existsSync(sourceEntryFullPath)) {
    console.error(`❌ Error: Example not found at ${sourceEntryFile}`)
    console.log(`   Looking for: ${sourceEntryFullPath}`)
    process.exit(1)
  }

  // Use examples/ prefix for Azure destination
  const viteEntryKey = `examples/${exampleName}`
  const buildOutputDir = path.join(projectRootDir, 'dist', 'examples', exampleName)
  const azureDestinationPath = `examples/${exampleName}`.replaceAll('\\', '/')

  console.log(`   Source Entry File: ${sourceEntryFile}`)
  console.log(`   Vite Entry Key: ${viteEntryKey}`)
  console.log(`   Build Output Dir: ${buildOutputDir}`)
  console.log(`   Azure Destination: ${AZURE_CONTAINER_NAME}/${azureDestinationPath}`)

  console.log('\n⚙️  Building example with Vite...')

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

  // Create a modified index.css for examples
  console.log('📝 Creating example-specific index.css...')

  const indexCssContent = fs.readFileSync(originalIndexCssPath, 'utf8')
  const modifiedIndexCss = indexCssContent
    .split('\n')
    .filter(line => {
      // Remove @newwork/gravity-ui-catalog import as it will already be loaded in the browser
      if (
        line.includes("@import '@newwork/gravity-ui-catalog") ||
        line.includes('@import "@newwork/gravity-ui-catalog')
      ) {
        return false
      }
      // Keep common imports but not business-apps specific imports
      if (line.includes("@import './business-apps/") || line.includes('@import "./business-apps/')) {
        return false
      }
      return true
    })
    // Fix relative import paths by adding ../src prefix
    .map(line => {
      // Fix common imports (handle both quote styles)
      if (line.includes("@import './common/")) {
        return line.replaceAll("@import './common/", "@import '../src/common/")
      }
      if (line.includes('@import "./common/')) {
        return line.replaceAll('@import "./common/', '@import "../src/common/')
      }
      // Fix any other relative imports from src (handle both quote styles)
      if (line.includes("@import './") && !line.includes("@import './tailwind.config.js'")) {
        return line.replaceAll("@import './", "@import '../src/")
      }
      if (line.includes('@import "./') && !line.includes('@import "./tailwind.config.js"')) {
        return line.replaceAll('@import "./', '@import "../src/')
      }
      return line
    })
    .join('\n')

  fs.writeFileSync(tempIndexCssPath, modifiedIndexCss, 'utf8')
  console.log(`   Created: ${tempIndexCssPath}`)

  const buildEnv = {
    ...process.env,
    PROJECT_ROOT_DIR: projectRootDir,
    VITE_GIT_USER: process.env.VITE_GIT_USER || execSync('git config user.name').toString().trim(),
    VITE_PUBLISH_TIME: new Date().toISOString(),
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey,
    TEMP_INDEX_CSS: tempIndexCssPath.replaceAll('\\', '/'),
    SINGLE_SCREEN_CSS: 'true',
    NODE_ENV: 'production',
    VITE_BUILD_FOR_DEPLOYMENT: 'false'
  }

  const viteBuildCommand = `vite build`

  console.log(`   Executing: ${viteBuildCommand} with environment variables`)
  try {
    execSync(viteBuildCommand, {
      stdio: 'inherit',
      cwd: projectRootDir,
      env: buildEnv
    })
    console.log('✅ Example built successfully.')

    // Clean up temporary directory
    console.log('🧹 Cleaning up temporary build files...')
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    process.exit(1)
  }

  await uploadDirectory(buildOutputDir, azureDestinationPath)
  console.log('✅ Example JS published successfully to Azure!')

  const cssOutputDir = path.join(projectRootDir, 'dist', 'assets')
  await uploadDirectory(cssOutputDir, azureDestinationPath)
  console.log('✅ Example CSS published successfully to Azure!')

  console.log('\n🎉 Example publishing complete!')
  console.log(
    `   Access your example at: https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_CONTAINER_NAME}/${azureDestinationPath}/index.js`
  )
}

try {
  await main()
} catch (error) {
  console.error('❌ An unexpected error occurred:', error)
  process.exit(1)
}
