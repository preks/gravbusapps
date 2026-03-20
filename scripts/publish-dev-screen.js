import { execSync } from 'node:child_process'
import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'
import { glob } from 'glob'
import inquirer from 'inquirer'
import {
  addCustomResourceUrl,
  addFormAsLandingScreen,
  addFormAsUserTaskScreen,
  addScreenConfigToScreenManagement
} from './api-client.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || 'screens'
const RC_UPLOAD_ENABLED = process.env.RC_UPLOAD === 'true'
const RC_VERSION = process.env.RC_VERSION || process.env.BITBUCKET_BUILD_NUMBER || ''
const RC_AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_PROD
const RC_AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN_PROD
const RC_AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME_PROD || 'screens'
const RC_PREFIX = process.env.RC_PREFIX || 'release-candidates'

// Helper function to detect if the screen is a form
function isFormScreen(screenPath) {
  return screenPath.includes('/forms/') || screenPath.includes('/popups/') || screenPath.includes('/windows/')
}

// Helper function to handle form screen publishing
// Note: This function requires user interaction and should not be called in no-interaction mode
async function handleFormScreenPublishing(azureDestinationPath) {
  console.log('📋 Form detected - using form-specific publishing flow')

  // Ask if it's a landing screen or user task screen
  const formTypeAnswer = await inquirer.prompt([
    {
      type: 'list',
      name: 'formType',
      message: 'Is this a landing screen or a user task screen?',
      choices: ['Landing Screen', 'User Task Screen']
    }
  ])

  if (formTypeAnswer.formType === 'Landing Screen') {
    // Handle landing screen
    const processNameAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'processName',
        message: 'Please enter the name of the process in camelCase:',
        validate: input => !!input.trim() || 'Process name cannot be empty'
      }
    ])

    const processName = processNameAnswer.processName.trim()
    // Use api-client.js function instead of local logic
    await addFormAsLandingScreen(processName, azureDestinationPath)
  } else {
    // Handle user task screen
    const processNameAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'processName',
        message: 'Please enter the name of the process in camelCase:',
        validate: input => !!input.trim() || 'Process name cannot be empty'
      }
    ])

    const taskNameAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'taskName',
        message: 'Please enter the name of the user task in camelCase:',
        validate: input => !!input.trim() || 'Task name cannot be empty'
      }
    ])

    const processName = processNameAnswer.processName.trim()
    const taskName = taskNameAnswer.taskName.trim()
    // Use api-client.js function instead of local logic
    await addFormAsUserTaskScreen(processName, taskName, azureDestinationPath)
  }
}

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

async function checkIfFirstTimePublish(azureDestinationPath) {
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN) {
    console.error('Error: AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_SAS_TOKEN must be set in .env for SDK upload.')
    process.exit(1)
  }

  const blobServiceUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/?${AZURE_STORAGE_SAS_TOKEN}`
  const blobServiceClient = new BlobServiceClient(blobServiceUrl)
  const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME)

  try {
    // Check if index.js exists at the target path
    const blobName = `${azureDestinationPath}/index.js`.replace(/\\/g, '/')
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    const exists = await blockBlobClient.exists()
    return !exists // Return true if the file doesn't exist (first time publish)
  } catch {
    console.log('🔍 Checking if first time publish: error occurred, assuming first time')
    return true // If error occurs, assume it's first time publish
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
    const blobName = path.join(azureDestinationPath, file).replace(/\\/g, '/')
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    const contentType = getContentType(file)

    try {
      console.log(`   Uploading: ${file} as ${blobName} (Content-Type: ${contentType})`)
      await blockBlobClient.uploadFile(localFilePath, {
        blobHTTPHeaders: {
          blobContentType: contentType,
          blobCacheControl: 'no-cache'
        }
      })
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error.message)
    }
  }
  console.log('✅ All files uploaded successfully.')
}

async function uploadDirectoryToContainer(
  buildOutputDir,
  azureDestinationPath,
  containerClient,
  cacheControl = 'no-cache'
) {
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
    const blobName = path.join(azureDestinationPath, file).replace(/\\/g, '/')
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    const contentType = getContentType(file)

    try {
      console.log(`   Uploading: ${file} as ${blobName} (Content-Type: ${contentType})`)
      await blockBlobClient.uploadFile(localFilePath, {
        blobHTTPHeaders: {
          blobContentType: contentType,
          blobCacheControl: cacheControl
        }
      })
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error.message)
    }
  }
  console.log('✅ All files uploaded successfully.')
}

async function clearBlobPrefix(containerClient, prefix) {
  let deletedCount = 0
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    await containerClient.deleteBlob(blob.name)
    deletedCount += 1
  }
  return deletedCount
}

function getRcContainerClient() {
  if (!RC_AZURE_STORAGE_ACCOUNT_NAME || !RC_AZURE_STORAGE_SAS_TOKEN) {
    console.error('Error: RC upload requires AZURE_STORAGE_ACCOUNT_PROD and AZURE_STORAGE_SAS_TOKEN_PROD to be set.')
    process.exit(1)
  }

  const blobServiceUrl = `https://${RC_AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/?${RC_AZURE_STORAGE_SAS_TOKEN}`
  const blobServiceClient = new BlobServiceClient(blobServiceUrl)
  return blobServiceClient.getContainerClient(RC_AZURE_CONTAINER_NAME)
}

async function uploadReleaseCandidateArtifacts({
  buildOutputDir,
  cssOutputDir,
  azureDestinationPath,
  projectRootDir,
  rcVersion
}) {
  if (!rcVersion) {
    console.error('Error: RC upload requires RC_VERSION or BITBUCKET_BUILD_NUMBER to be set.')
    process.exit(1)
  }

  const containerClient = getRcContainerClient()
  const rcDestinationPath = `${RC_PREFIX}/${azureDestinationPath}`.replace(/\\/g, '/')
  const rcPrefix = `${rcDestinationPath}/`

  console.log(`🧹 Clearing RC folder: ${RC_AZURE_CONTAINER_NAME}/${rcDestinationPath}`)
  const deletedCount = await clearBlobPrefix(containerClient, rcPrefix)
  console.log(`   Deleted ${deletedCount} blob(s)`)

  const rcTempDir = fs.mkdtempSync(path.join(projectRootDir, 'temp_rc_'))
  try {
    fs.cpSync(buildOutputDir, rcTempDir, { recursive: true })

    const indexJsPath = path.join(rcTempDir, 'index.js')
    if (!fs.existsSync(indexJsPath)) {
      console.error(`❌ Error: index.js not found in ${buildOutputDir}`)
      process.exit(1)
    }

    const rcIndexJsPath = path.join(rcTempDir, `index-${rcVersion}.js`)
    fs.renameSync(indexJsPath, rcIndexJsPath)

    const cssFilesInScreenDir = await glob('**/*.css', {
      cwd: rcTempDir,
      nodir: true
    })
    for (const file of cssFilesInScreenDir) {
      const cssFilePath = path.join(rcTempDir, file)
      const parsed = path.parse(cssFilePath)
      const renamedCssPath = path.join(parsed.dir, `${parsed.name}-${rcVersion}${parsed.ext}`)
      fs.renameSync(cssFilePath, renamedCssPath)
    }

    const globalCssFiles = await glob('**/*.css', {
      cwd: cssOutputDir,
      nodir: true
    })
    for (const file of globalCssFiles) {
      const sourceCssPath = path.join(cssOutputDir, file)
      const parsed = path.parse(file)
      const targetCssPath = path.join(rcTempDir, `${parsed.name}-${rcVersion}${parsed.ext}`)
      fs.copyFileSync(sourceCssPath, targetCssPath)
    }

    console.log(`☁️  Uploading RC artifacts to ${RC_AZURE_STORAGE_ACCOUNT_NAME}/${rcDestinationPath}`)
    await uploadDirectoryToContainer(rcTempDir, rcDestinationPath, containerClient, 'no-cache')
  } finally {
    if (fs.existsSync(rcTempDir)) {
      fs.rmSync(rcTempDir, { recursive: true, force: true })
    }
  }
}

async function publishMainCss() {
  console.log('🚀 Publishing main CSS file: assets/main.css')
  const projectRootDir = path.resolve(__dirname, '..')
  console.log(`   Project Root Dir: ${projectRootDir}`)

  // Paths
  const sourceDir = path.join(projectRootDir, 'dist', 'assets')
  const sourceCssPath = path.join(sourceDir, 'main.css')
  const azureDestination = 'assets'

  // Check if the CSS file exists
  if (!fs.existsSync(sourceCssPath)) {
    console.error(`❌ Error: Main CSS file not found at ${sourceCssPath}. Did you run 'npm run build' first?`)
    process.exit(1)
  }

  console.log(`   Source CSS File: ${sourceCssPath}`)
  console.log(`   Azure Destination: ${azureDestination}`)

  // Create a temporary directory with just the main.css file to use with uploadDirectory
  const tempDir = path.join(projectRootDir, 'temp_upload_dir')
  try {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Copy the CSS file to the temp directory
    fs.copyFileSync(sourceCssPath, path.join(tempDir, 'main.css'))

    // Upload using the existing uploadDirectory function
    await uploadDirectory(tempDir, azureDestination)

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true })

    console.log('✅ Main CSS file published successfully to Azure!')
  } catch (error) {
    // Clean up temp directory if it exists
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    console.error('❌ Error during publishing:', error)
    process.exit(1)
  }
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('resource', {
    alias: 'r',
    description: 'Resource URL mode - enable prompts for creating resource URLs',
    type: 'boolean',
    default: false
  })
  .option('no-interaction', {
    alias: 'ci',
    description: 'Disable all user prompts for CI/CD pipeline usage',
    type: 'boolean',
    default: false
  })
  .help().argv

async function main() {
  let screenPathArg = process.argv[2]

  if (!screenPathArg) {
    console.error('Error: Screen path argument is missing.')
    console.log('Usage: npm run publish:screen -- /<product>/[path/to/]/<ScreenName> [options]')
    console.log('Example: npm run publish:screen -- /irm/overview-screens/LeadOverview')
    console.log('Example: npm run publish:screen -- /.debug/apps/debug-view')
    console.log('Example: npm run publish:screen -- /assets/main.css (to publish the main CSS file)')
    console.log('')
    console.log('Options:')
    console.log('  --resource, -r     Enable resource URL prompts')
    console.log('  --no-interaction, --ci  Disable all prompts for CI/CD usage')
    process.exit(1)
  }

  // Normalize no-interaction flag (handle both camelCase and kebab-case)
  const noInteraction = argv.noInteraction || argv['no-interaction'] || false
  const resourceMode = argv.resource || argv.r || false

  if (noInteraction) {
    console.log('🤖 Running in no-interaction mode - all prompts will be skipped')
  } else {
    console.log('👤 Interactive mode - prompts may appear for new screens')
  }

  console.log(`Original screenPathArg: ${screenPathArg}`)

  // Remove leading slash if present
  if (screenPathArg.startsWith('/')) {
    screenPathArg = screenPathArg.substring(1)
  }

  // Fix Git Bash path issue: detect and handle C:/Program Files/Git prefix
  if (screenPathArg.startsWith('C:/Program Files/Git/')) {
    screenPathArg = screenPathArg.substring('C:/Program Files/Git/'.length)
  }

  // Special case for publishing main.css
  if (screenPathArg === 'assets/main.css') {
    return publishMainCss()
  }

  const screenPathParts = screenPathArg.split('/')
  if (screenPathParts.length < 2) {
    console.error('Error: Invalid screen path format. Expected at least /<product>/<ScreenName>')
    console.log('Example: npm run publish:screen -- /irm/overview-screens/LeadOverview')
    console.log('Example: npm run publish:screen -- /.debug/apps/debug-view')
    process.exit(1)
  }

  const product = screenPathParts[0]
  console.log(`🚀 Publishing screen: ${screenPathArg}`)

  const projectRootDir = path.resolve(__dirname, '..')
  console.log(`   Project Root Dir: ${projectRootDir}`)

  // Use the full screenPathArg for paths to maintain the directory structure
  const sourceEntryFile = path.join('src', 'business-apps', screenPathArg, 'index.ts')
  const viteEntryKey = screenPathArg
  const buildOutputDir = path.join(projectRootDir, 'dist', screenPathArg)
  const azureDestinationPath = screenPathArg.replace(/\\/g, '/')

  console.log(`   Source Entry File: ${sourceEntryFile}`)
  console.log(`   Vite Entry Key: ${viteEntryKey}`)
  console.log(`   Build Output Dir: ${buildOutputDir}`)
  console.log(`   Azure Destination: ${AZURE_CONTAINER_NAME}/${azureDestinationPath}`)

  console.log('\n⚙️  Building screen with Vite...')

  if (fs.existsSync(buildOutputDir)) {
    console.log(`🗑️  Deleting existing output directory: ${buildOutputDir}`)
    fs.rmSync(buildOutputDir, { recursive: true, force: true })
    console.log('✅ Directory deleted successfully.')
  } else {
    console.log(`ℹ️  Output directory ${buildOutputDir} does not exist, no need to delete.`)
  }

  // Create a temporary directory for build files
  const tempDir = path.join(projectRootDir, 'temp_build')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

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

  // The temp directory is already created and files are directly written there

  // Use cross-env compatible approach for Windows with additional env vars for temp files
  // Create an object with all environment variables to pass to execSync
  const buildEnv = {
    ...process.env,
    PROJECT_ROOT_DIR: projectRootDir,
    // Use the author of the last non-merge commit as the "Built by" identity.
    // In CI this is the person whose code change triggered the publish, which is
    // more meaningful than the generic CI git-config user.name (often a bot name).
    VITE_GIT_USER:
      process.env.VITE_GIT_USER ||
      (() => {
        try {
          return execSync('git log --no-merges -1 --pretty=format:%an', { encoding: 'utf8' }).trim()
        } catch {
          return execSync('git config user.name', { encoding: 'utf8' }).trim()
        }
      })(),
    VITE_PUBLISH_TIME: new Date().toISOString(),
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey,
    TEMP_INDEX_CSS: tempIndexCssPath.replace(/\\/g, '/'),
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
    console.log('✅ Screen built successfully.')

    // Clean up temporary directory
    console.log('🧹 Cleaning up temporary build files...')
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    process.exit(1)
  }

  // Check if this is the first time publishing the screen
  const isFirstTimePublish = await checkIfFirstTimePublish(azureDestinationPath)

  await uploadDirectory(buildOutputDir, azureDestinationPath)
  console.log('✅ Screen JS published successfully to Azure!')

  const cssOutputDir = path.join(projectRootDir, 'dist', 'assets')
  await uploadDirectory(cssOutputDir, azureDestinationPath)
  console.log('✅ Screen CSS published successfully to Azure!')

  if (RC_UPLOAD_ENABLED) {
    await uploadReleaseCandidateArtifacts({
      buildOutputDir,
      cssOutputDir,
      azureDestinationPath,
      projectRootDir,
      rcVersion: RC_VERSION
    })
    console.log('✅ Release candidate artifacts uploaded successfully.')
  }

  // Handle different publishing flows for forms vs regular screens
  if (isFormScreen(screenPathArg)) {
    // For forms, use form-specific publishing flow only on first-time publish or with --resource flag
    if ((isFirstTimePublish || resourceMode) && !noInteraction) {
      console.log(
        isFirstTimePublish
          ? '🆕 First time publishing this form - prompting for screen type'
          : '🔄 Resource flag enabled - prompting for screen type'
      )
      await handleFormScreenPublishing(azureDestinationPath)
    } else {
      console.log(
        noInteraction
          ? '⏩ Skipping form screen configuration (no-interaction mode)'
          : '⏩ Skipping form screen configuration (not first-time publish and no --resource flag)'
      )
    }
  } else {
    // Handle custom URL addition on first-time publish or if resource flag is provided
    let shouldAddCustomUrl = false

    if ((isFirstTimePublish || resourceMode) && !noInteraction) {
      // Ask user if they want to add a custom URL
      const addCustomUrlAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldAdd',
          message: 'You can add this screen as a resource URL with any URL path you want. Would you like to add it?',
          default: false
        }
      ])
      shouldAddCustomUrl = addCustomUrlAnswer.shouldAdd
    } else {
      console.log(
        noInteraction
          ? '⏩ Skipping custom URL addition (no-interaction mode)'
          : '⏩ Skipping custom URL addition (not first-time publish and no --resource flag)'
      )
    }

    if (shouldAddCustomUrl) {
      const customUrlInput = await inquirer.prompt([
        {
          type: 'input',
          name: 'customUrl',
          message: 'Please enter the custom URL path (e.g., "/hr/employee-directory"):',
          validate: input => {
            if (input.trim() === '') {
              return 'Path cannot be empty'
            }
            return true
          }
        }
      ])

      const customUrlPath = customUrlInput.customUrl.trim()

      try {
        // Add custom URL to navigation
        const resourceAdded = await addCustomResourceUrl(
          customUrlPath.startsWith('/') ? customUrlPath.substring(1) : customUrlPath
        )

        // If resource was added or already exists, add screen config
        if (resourceAdded) {
          await addScreenConfigToScreenManagement(
            azureDestinationPath,
            customUrlPath.startsWith('/') ? customUrlPath.substring(1) : customUrlPath
          )
        }
      } catch (error) {
        console.error('Failed to set up custom URL:', error.message)
      }
    }
  }
}

main().catch(error => {
  console.error('❌ An unexpected error occurred:', error)
  process.exit(1)
})
