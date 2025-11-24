/**
 * Production screen publishing script
 * - Publishes only changed screens detected by detect-changed-screens.sh
 * - Uses Bitbucket build number as version
 * - Includes screen management registrations with build number versioning
 * - Executed on master merge
 */

import { execSync } from 'child_process'
import path, { dirname } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'
import { glob } from 'glob'
import axios from 'axios'
import crypto from 'crypto'
import {
  OAuthClient,
  getResourceUrls,
  getResourceUrlByPath,
  addScreenConfigToScreenManagement,
  getScreenByKey,
  addFormAsLandingScreen,
  formatScreenNameFromPath,
  generateScreenKeyFromPath,
  getAllNativeScreens,
  convertScreenKeyToUrl,
  syncResourceUrlWithSameId,
  syncScreenFromDevToProd,
  isLowcoderScreen,
  deleteScreenInScreenManagement,
  updateScreenConfigInScreenManagementDetailed
} from './api-client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_PROD
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN_PROD
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME_PROD
// Optional secondary target (deploy to a 2nd system)
const AZURE_STORAGE_ACCOUNT_NAME_SECONDARY =
  process.env.AZURE_STORAGE_ACCOUNT_PROD_SECONDARY ||
  process.env.AZURE_STORAGE_ACCOUNT_SECOND ||
  process.env.AZURE_STORAGE_ACCOUNT_PROD_2 ||
  null
const AZURE_STORAGE_SAS_TOKEN_SECONDARY =
  process.env.AZURE_STORAGE_SAS_TOKEN_PROD_SECONDARY ||
  process.env.AZURE_STORAGE_SAS_TOKEN_SECOND ||
  process.env.AZURE_STORAGE_SAS_TOKEN_PROD_2 ||
  null
const AZURE_CONTAINER_NAME_SECONDARY =
  process.env.AZURE_BLOB_CONTAINER_NAME_PROD_SECONDARY ||
  process.env.AZURE_BLOB_CONTAINER_NAME_SECOND ||
  process.env.AZURE_BLOB_CONTAINER_NAME_PROD_2 ||
  null
const BITBUCKET_BUILD_NUMBER = process.env.BITBUCKET_BUILD_NUMBER
const SCREEN_MANAGEMENT_SERVICE_API_PROD = process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD
const NAVIGATION_SERVICE_API_PROD = process.env.NAVIGATION_SERVICE_API_PROD
// Optional secondary target services
const SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY =
  process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY ||
  process.env.SCREEN_MANAGEMENT_SERVICE_API_SECOND ||
  process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD_2
const NAVIGATION_SERVICE_API_PROD_SECONDARY =
  process.env.NAVIGATION_SERVICE_API_PROD_SECONDARY ||
  process.env.NAVIGATION_SERVICE_API_SECOND ||
  process.env.NAVIGATION_SERVICE_API_PROD_2

// Use only the Bitbucket build number as the publish version
const PUBLISH_VERSION = BITBUCKET_BUILD_NUMBER

console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`)
console.log(`🎯 Publish version: ${PUBLISH_VERSION}`)

// Production OAuth configuration
const OAUTH_CLIENT_ID_PROD = process.env.OAUTH_CLIENT_ID_PROD
const OAUTH_CLIENT_SECRET_PROD = process.env.OAUTH_CLIENT_SECRET_PROD
const OAUTH_URL_PROD = process.env.OAUTH_URL_PROD
const OAUTH_REALM_PROD = process.env.OAUTH_REALM_PROD
// Optional secondary target OAuth
const OAUTH_CLIENT_ID_PROD_SECONDARY =
  process.env.OAUTH_CLIENT_ID_PROD_SECONDARY || process.env.OAUTH_CLIENT_ID_SECOND || process.env.OAUTH_CLIENT_ID_PROD_2
const OAUTH_CLIENT_SECRET_PROD_SECONDARY =
  process.env.OAUTH_CLIENT_SECRET_PROD_SECONDARY ||
  process.env.OAUTH_CLIENT_SECRET_SECOND ||
  process.env.OAUTH_CLIENT_SECRET_PROD_2
const OAUTH_URL_PROD_SECONDARY =
  process.env.OAUTH_URL_PROD_SECONDARY || process.env.OAUTH_URL_SECOND || process.env.OAUTH_URL_PROD_2
const OAUTH_REALM_PROD_SECONDARY =
  process.env.OAUTH_REALM_PROD_SECONDARY || process.env.OAUTH_REALM_SECOND || process.env.OAUTH_REALM_PROD_2

// Validate required environment variables
const requiredEnvVars = [
  { name: 'AZURE_STORAGE_ACCOUNT_PROD', value: AZURE_STORAGE_ACCOUNT_NAME },
  { name: 'AZURE_STORAGE_SAS_TOKEN_PROD', value: AZURE_STORAGE_SAS_TOKEN },
  { name: 'AZURE_BLOB_CONTAINER_NAME_PROD', value: AZURE_CONTAINER_NAME },
  { name: 'BITBUCKET_BUILD_NUMBER', value: BITBUCKET_BUILD_NUMBER },
  { name: 'SCREEN_MANAGEMENT_SERVICE_API_PROD', value: SCREEN_MANAGEMENT_SERVICE_API_PROD },
  { name: 'NAVIGATION_SERVICE_API_PROD', value: NAVIGATION_SERVICE_API_PROD },
  { name: 'OAUTH_CLIENT_ID_PROD', value: OAUTH_CLIENT_ID_PROD },
  { name: 'OAUTH_CLIENT_SECRET_PROD', value: OAUTH_CLIENT_SECRET_PROD }
]

const missingVars = requiredEnvVars.filter(envVar => !envVar.value)

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(envVar => {
    console.error(`   - ${envVar.name}`)
  })
  console.error('\nThis production script requires all environment variables to be set.')
  console.error('Please ensure your Bitbucket pipeline has the necessary environment variables configured.')
  process.exit(1)
}

// Compose target configs (primary is required, secondary optional)
const PRIMARY_TARGET = {
  label: 'primary',
  azure: {
    accountName: AZURE_STORAGE_ACCOUNT_NAME,
    sasToken: AZURE_STORAGE_SAS_TOKEN,
    containerName: AZURE_CONTAINER_NAME
  },
  services: {
    screenManagementApi: SCREEN_MANAGEMENT_SERVICE_API_PROD,
    navigationApi: NAVIGATION_SERVICE_API_PROD
  },
  oauth: {
    clientId: OAUTH_CLIENT_ID_PROD,
    clientSecret: OAUTH_CLIENT_SECRET_PROD,
    oauthUrl: OAUTH_URL_PROD,
    realm: OAUTH_REALM_PROD
  }
}

const SECONDARY_TARGET =
  SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY &&
  NAVIGATION_SERVICE_API_PROD_SECONDARY &&
  OAUTH_CLIENT_ID_PROD_SECONDARY &&
  OAUTH_CLIENT_SECRET_PROD_SECONDARY &&
  OAUTH_URL_PROD_SECONDARY &&
  OAUTH_REALM_PROD_SECONDARY
    ? {
        label: 'secondary',
        azure:
          AZURE_STORAGE_ACCOUNT_NAME_SECONDARY && AZURE_STORAGE_SAS_TOKEN_SECONDARY && AZURE_CONTAINER_NAME_SECONDARY
            ? {
                accountName: AZURE_STORAGE_ACCOUNT_NAME_SECONDARY,
                sasToken: AZURE_STORAGE_SAS_TOKEN_SECONDARY,
                containerName: AZURE_CONTAINER_NAME_SECONDARY
              }
            : null,
        services: {
          screenManagementApi: SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY,
          navigationApi: NAVIGATION_SERVICE_API_PROD_SECONDARY
        },
        oauth: {
          clientId: OAUTH_CLIENT_ID_PROD_SECONDARY,
          clientSecret: OAUTH_CLIENT_SECRET_PROD_SECONDARY,
          oauthUrl: OAUTH_URL_PROD_SECONDARY,
          realm: OAUTH_REALM_PROD_SECONDARY
        }
      }
    : null

// ============================================================================
// Hash-based Publishing Utility Functions
// ============================================================================

/**
 * Calculate MD5 hash of a single file
 * @param {string} filePath - Absolute path to file
 * @returns {string} MD5 hash in hex format
 */
function calculateFileMd5(filePath) {
  const content = fs.readFileSync(filePath)
  const hash = crypto.createHash('md5')
  hash.update(content)
  return hash.digest('hex')
}

/**
 * Get MD5 hashes for all source artifacts (per-file)
 * @param {string} directory - Build output directory
 * @returns {Promise<Object>} Object with filename -> hash mapping
 */
async function getSourceArtifactsHashes(directory) {
  const files = await glob('**/*', { cwd: directory, nodir: true })
  const hashes = {}

  for (const file of files) {
    const filePath = path.join(directory, file)
    const md5 = calculateFileMd5(filePath)

    // Store with relative filename as key
    hashes[file] = md5
  }

  return hashes
}

/**
 * Convert Azure's contentMD5 (Uint8Array) to hex string
 * @param {Uint8Array} contentMD5 - Content-MD5 from Azure blob properties
 * @returns {string|null} MD5 hash in hex or null
 */
function convertContentMd5ToHex(contentMD5) {
  if (!contentMD5) {
    return null
  }
  try {
    // contentMD5 is already a Uint8Array (base64-decoded bytes), convert to hex
    return Buffer.from(contentMD5).toString('hex')
  } catch (error) {
    console.log(`   ⚠️  Error converting MD5: ${error.message}`)
    return null
  }
}

/**
 * Dynamically discover and get per-file MD5 hashes from Azure
 * @param {string} azureDestinationPath - Azure blob path
 * @param {Object} azureTarget - Azure configuration object
 * @param {string} deployedVersion - Currently deployed version
 * @returns {Promise<Object|null>} Object with filename -> hash mapping or null
 */
async function getTargetArtifactsHashes(azureDestinationPath, azureTarget, deployedVersion) {
  try {
    const { accountName, sasToken, containerName } = azureTarget
    const blobServiceUrl = `https://${accountName}.blob.core.windows.net/?${sasToken}`
    const blobServiceClient = new BlobServiceClient(blobServiceUrl)
    const containerClient = blobServiceClient.getContainerClient(containerName)

    const hashes = {}

    // List all blobs with the screen path prefix
    const prefix = `${azureDestinationPath}/`
    const versionSuffix = `-${deployedVersion}.`

    // Iterate through blobs matching the prefix
    // Note: contentMD5 is already included in the list response, no separate API calls needed!
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      // Check if blob name contains the version suffix (e.g., "-1233.js" or "-1233.css")
      if (blob.name.includes(versionSuffix)) {
        // Extract just the filename (not the full path)
        const filename = blob.name.substring(prefix.length)

        // Get the Content-MD5 directly from blob properties (already in list response!)
        const md5 = convertContentMd5ToHex(blob.properties?.contentMD5)

        if (md5) {
          hashes[filename] = md5
        }
      }
    }

    return Object.keys(hashes).length > 0 ? hashes : null
  } catch (error) {
    console.log(`   ⚠️  Error listing target artifacts: ${error.message}`)
    return null
  }
}

/**
 * Compare source and target hashes file-by-file
 * @param {Object} sourceHashes - Source file hashes
 * @param {Object} targetHashes - Target file hashes
 * @param {string} sourceVersion - Source version for filename mapping
 * @param {string} targetVersion - Target version for filename mapping
 * @returns {Object} Comparison result with allMatch boolean and differences array
 */
function compareArtifactHashes(sourceHashes, targetHashes, sourceVersion, targetVersion) {
  const differences = []

  // Map source filenames to target filenames (version numbers differ)
  const sourceToTargetMap = {}
  for (const sourceFile of Object.keys(sourceHashes)) {
    const targetFile = sourceFile.replace(`-${sourceVersion}.`, `-${targetVersion}.`)
    sourceToTargetMap[sourceFile] = targetFile
  }

  // Check each source file
  for (const sourceFile of Object.keys(sourceHashes)) {
    const targetFile = sourceToTargetMap[sourceFile]
    const sourceHash = sourceHashes[sourceFile]
    const targetHash = targetHashes[targetFile]

    if (!targetHash) {
      differences.push({
        file: sourceFile,
        reason: 'new_file',
        sourceHash,
        targetHash: null
      })
    } else if (sourceHash !== targetHash) {
      differences.push({
        file: sourceFile,
        reason: 'content_changed',
        sourceHash,
        targetHash
      })
    }
  }

  // Check for removed files (in target but not in source)
  for (const targetFile of Object.keys(targetHashes)) {
    const sourceFile = targetFile.replace(`-${targetVersion}.`, `-${sourceVersion}.`)
    if (!sourceHashes[sourceFile]) {
      differences.push({
        file: sourceFile,
        reason: 'file_removed',
        sourceHash: null,
        targetHash: targetHashes[targetFile]
      })
    }
  }

  return {
    allMatch: differences.length === 0,
    differences
  }
}

/**
 * Query Screen Management API for deployed version (FIRST STEP)
 * Uses the same pattern as comprehensive sync: get screen from dev first to get correct key
 * @param {string} screenPath - Screen path
 * @param {Object} target - Target configuration
 * @returns {Promise<string|null>} Version string or null
 */
async function getCurrentDeployedVersion(screenPath, target) {
  try {
    // Step 1: Get all NATIVE_SCREEN screens from dev environment
    const devOauthConfig = {} // Use dev environment variables (default)
    const devScreens = await getAllNativeScreens(process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API, devOauthConfig)

    // Step 2: Find the screen that matches our component path
    const componentPath = screenPath // e.g., "hr/core/apps/employee-directory"
    const matchingScreen = devScreens.find(screen => {
      if (!screen.screenComponents?.formDefinition?.componentPath) {
        return false
      }
      const screenComponentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')
      return screenComponentPath === componentPath || screenComponentPath.endsWith(`/${componentPath}`)
    })

    if (!matchingScreen) {
      console.log(`   No screen found in dev for path: ${componentPath}`)
      return null
    }

    const screenKey = matchingScreen.screenKey
    console.log(`   Found screen key from dev: ${screenKey}`)

    // Step 3: Query prod using the correct screen key from dev
    const prodOauthConfig = {
      clientId: target.oauth.clientId,
      clientSecret: target.oauth.clientSecret,
      oauthUrl: target.oauth.oauthUrl,
      realm: target.oauth.realm
    }

    const prodScreen = await getScreenByKey(screenKey, target.services.screenManagementApi, prodOauthConfig)

    if (prodScreen?.screenComponents?.formDefinition?.version) {
      const version = prodScreen.screenComponents.formDefinition.version
      console.log(`   Found deployed version in prod: ${version}`)
      return version
    }

    console.log(`   Screen exists in dev but not in prod (new screen)`)
    return null
  } catch (error) {
    console.log(`   ⚠️  Unable to get deployed version: ${error.message}`)
    return null
  }
}

// ============================================================================
// End of Hash-based Publishing Utility Functions
// ============================================================================

// Helper function to detect if the screen is a form
function isFormScreen(screenPath) {
  return screenPath.includes('/forms/')
}

// Helper function to convert camelCase to natural language with spaces
function camelCaseToNaturalLanguageWithWhiteSpaces(camelCase) {
  if (!camelCase) return ''

  // Replace camelCase with spaces and capitalize first letter
  const withSpaces = camelCase.replace(/([A-Z])/g, ' $1').trim()
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

// Helper function to search for resource URLs with progressive search strategy
async function searchResourceUrlInDev(urlOrPath, devOauthConfig) {
  const devNavigationApi = process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API

  // Normalize the input - handle both full URLs and component paths
  let searchPath = urlOrPath
  if (urlOrPath.startsWith('/platform/')) {
    searchPath = urlOrPath.replace(/^\/platform\//, '')
  }

  // Strategy 1: Search with full URL (if it's a platform URL)
  if (urlOrPath.startsWith('/platform/')) {
    console.log(`   Strategy 1: Searching with full platform URL: ${urlOrPath}`)
    try {
      const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
        search: urlOrPath,
        sort: '-updatedAt'
      })
      if (resourceUrls.length > 0) {
        const foundResource = resourceUrls[0] // Take the first (most recently updated) result
        console.log(`   ✅ Found with full URL: ${foundResource.url}`)
        return foundResource
      }
    } catch (error) {
      console.log(`   Strategy 1 failed: ${error.message}`)
    }
  }

  // Strategy 2: Search with component path (without /platform/)
  console.log(`   Strategy 2: Searching with component path: ${searchPath}`)
  try {
    const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
      search: searchPath,
      sort: '-updatedAt'
    })
    if (resourceUrls.length > 0) {
      const foundResource = resourceUrls[0] // Take the first (most recently updated) result
      console.log(`   ✅ Found with component path: ${foundResource.url}`)
      return foundResource
    }
  } catch (error) {
    console.log(`   Strategy 2 failed: ${error.message}`)
  }

  // Strategy 3: Search without "apps" or "forms" terms
  const pathWithoutAppsOrForms = searchPath
    .replace(/\/apps\//g, '/')
    .replace(/^apps\//, '')
    .replace(/\/forms\//g, '/')
    .replace(/^forms\//, '')
  if (pathWithoutAppsOrForms !== searchPath) {
    console.log(`   Strategy 3: Searching without 'apps'/'forms' terms: ${pathWithoutAppsOrForms}`)
    try {
      const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
        search: pathWithoutAppsOrForms,
        sort: '-updatedAt'
      })
      if (resourceUrls.length > 0) {
        const foundResource = resourceUrls[0] // Take the first (most recently updated) result
        console.log(`   ✅ Found without 'apps'/'forms': ${foundResource.url}`)
        return foundResource
      }
    } catch (error) {
      console.log(`   Strategy 3 failed: ${error.message}`)
    }
  }

  // Strategy 4: Search with only component name (last segment)
  const pathSegments = searchPath.split('/')
  const componentName = pathSegments[pathSegments.length - 1]
  console.log(`   Strategy 4: Searching with component name only: ${componentName}`)
  try {
    const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
      search: componentName,
      sort: '-updatedAt'
    })
    if (resourceUrls.length > 0) {
      const foundResource = resourceUrls[0] // Take the first (most recently updated) result
      console.log(`   ✅ Found with component name: ${foundResource.url}`)
      return foundResource
    }
  } catch (error) {
    console.log(`   Strategy 4 failed: ${error.message}`)
  }

  console.log('   ❌ No resource URL found with any search strategy')
  return null
}

// Helper function to generate screen key from URL
function generateScreenKeyFromUrl(url) {
  // Remove /platform or platform prefix and replace / with ~
  let cleanUrl = url.replace(/^\/platform\//, '').replace(/^platform\//, '')
  return `url_${cleanUrl.replace(/\//g, '~')}`
}

// Helper function to synchronize resource URLs from dev to a specific target
async function handleResourceUrlSynchronization(screenPath, azureDestinationPath, target) {
  console.log('🔗 Checking resource URL synchronization from dev to prod...')

  // Create OAuth configurations
  const devOauthConfig = {} // Use dev environment variables (default)
  const prodOauthConfig = {
    clientId: target.oauth.clientId,
    clientSecret: target.oauth.clientSecret,
    oauthUrl: target.oauth.oauthUrl,
    realm: target.oauth.realm
  }

  try {
    // Search for resource URL in dev using progressive strategy
    const devResourceUrl = await searchResourceUrlInDev(azureDestinationPath, devOauthConfig)

    if (!devResourceUrl) {
      console.log('   No resource URL found in dev with any strategy, skipping synchronization')
      return { success: true, operation: 'skip', resourceUrl: null }
    }

    console.log(`   Found resource URL in dev: ${devResourceUrl.url} (code: ${devResourceUrl.code})`)

    // Check if the same resource URL already exists in prod
    console.log('   Checking if resource URL already exists in prod...')
    const prodResourceUrl = await getResourceUrlByPath(
      devResourceUrl.url,
      target.services.navigationApi,
      prodOauthConfig
    )

    if (prodResourceUrl) {
      console.log(`   ✅ Resource URL already exists in prod (ID: ${prodResourceUrl.id || 'unknown'})`)
      console.log('   ⏩ Skipping resource URL registration - proceeding to screen config')
      return { success: true, operation: 'exists', resourceUrl: devResourceUrl }
    }

    // Resource URL doesn't exist in prod, proceed with registration
    console.log('   Resource URL not found in prod, proceeding with registration...')

    try {
      const prodNavigationApi = target.services.navigationApi
      const oauthClient = new OAuthClient(prodOauthConfig)
      const accessToken = await oauthClient.getAccessToken()

      const payload = {
        code: devResourceUrl.code,
        name: devResourceUrl.name,
        url: devResourceUrl.url,
        roles: devResourceUrl.roles || [],
        features: devResourceUrl.features || [],
        name_i18n: devResourceUrl.name_i18n || {},
        description_i18n: devResourceUrl.description_i18n || {},
        isSearchable: devResourceUrl.isSearchable || false
      }

      console.log(`   Registering resource URL: ${devResourceUrl.url}`)
      await axios.post(`${prodNavigationApi}/resource-url`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        },
        timeout: 10000
      })

      console.log(`   ✅ Resource URL successfully registered in prod: ${devResourceUrl.url}`)
      return { success: true, operation: 'created', resourceUrl: devResourceUrl }
    } catch (error) {
      console.error(`   ❌ Failed to register resource URL in prod: ${error.message}`)
      // Even if resource URL registration fails, continue with screen config
      console.log('   ⚠️  Continuing with screen config despite resource URL registration failure')
      return { success: false, operation: 'error', error: error.message, resourceUrl: devResourceUrl }
    }
  } catch (error) {
    console.error('❌ Error during resource URL synchronization:', error.message)
    return { success: false, operation: 'error', error: error.message, resourceUrl: null }
  }
}

// Helper function to handle screen management registration for production
async function handleScreenManagement(screenPath, azureDestinationPath, resourceUrlInfo = null, target) {
  console.log('📋 Registering screen in Screen Management system...')

  // Create OAuth configuration for production
  const oauthConfig = {
    clientId: target.oauth.clientId,
    clientSecret: target.oauth.clientSecret,
    oauthUrl: target.oauth.oauthUrl,
    realm: target.oauth.realm
  }

  try {
    if (isFormScreen(screenPath)) {
      // Handle form screens with resource URL info
      console.log('   Detected form - registering as production form screen')

      // Extract process name from path for forms
      const pathParts = screenPath.split('/')
      const formName = pathParts[pathParts.length - 1] // Get the form name
      const processName = formName.replace(/-form$/, '') // Remove "-form" suffix if present

      // Generate screen name and key
      let screenName, screenKey

      if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
        // Use resource URL info if available
        screenName = resourceUrlInfo.resourceUrl.name
        screenKey = generateScreenKeyFromUrl(resourceUrlInfo.resourceUrl.url)
        console.log(`   Using resource URL info for form - Name: ${screenName}, Key: ${screenKey}`)
      } else {
        // Fallback to form-specific generation
        screenName = camelCaseToNaturalLanguageWithWhiteSpaces(processName)
        screenKey = `frm_${processName}`
        console.log(`   Using form-based generation - Name: ${screenName}, Key: ${screenKey}`)
      }

      // First, check if the form already exists
      console.log(`🔍 Checking if form exists with key: ${screenKey}`)
      try {
        const existingForm = await getScreenByKey(screenKey, target.services.screenManagementApi, oauthConfig)

        if (existingForm && existingForm.id) {
          // Strict LOWCODER form detection → delete and recreate
          if (isLowcoderScreen(existingForm)) {
            console.log('   🔎 LOWCODER form detected - deleting before recreation')
            await deleteScreenInScreenManagement(existingForm.id, target.services.screenManagementApi, oauthConfig)

            // Fetch dev screen for namespace
            const devForm = await getScreenByKey(screenKey)
            const ns = devForm
              ? {
                  namespaceId: devForm.namespaceId,
                  namespaceCode: devForm.namespaceCode,
                  namespaceDescription: devForm.namespaceDescription
                }
              : null

            if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
              const customUrlPath = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '')
              const result = await addScreenConfigToScreenManagement(
                azureDestinationPath,
                customUrlPath,
                PUBLISH_VERSION,
                target.services.screenManagementApi,
                oauthConfig,
                ns ? { namespace: ns, idOverride: devForm?.id } : {}
              )
              if (result.success) {
                console.log(`✅ Form screen recreated successfully with ID: ${result.id}`)
                return { success: true, operation: 'recreate' }
              }
              console.error(`❌ Form screen recreation failed`)
              return { success: false, operation: 'recreate', error: 'Form screen recreation failed' }
            } else {
              // Use landing screen creation (cannot override namespace via current helper)
              const result = await addFormAsLandingScreen(
                processName,
                azureDestinationPath,
                PUBLISH_VERSION,
                target.services.screenManagementApi,
                oauthConfig,
                ns ? { namespace: ns, idOverride: devForm?.id } : {}
              )
              if (result.success) {
                console.log(`✅ Form screen recreated successfully with ID: ${result.id}`)
                return { success: true, operation: 'recreate' }
              }
              console.error(`❌ Form screen recreation failed`)
              return { success: false, operation: 'recreate', error: 'Form screen recreation failed' }
            }
          }

          // Form exists, update it (overwrite namespace from dev)
          console.log(`📝 Form exists with ID: ${existingForm.id}, updating version to ${PUBLISH_VERSION}`)

          const devForm = await getScreenByKey(screenKey)
          const namespaceOverwrite = devForm
            ? {
                namespaceId: devForm.namespaceId,
                namespaceCode: devForm.namespaceCode,
                namespaceDescription: devForm.namespaceDescription
              }
            : {}

          const updateData = {
            screenKey: screenKey,
            name: screenName,
            type: 'SCREEN',
            ...namespaceOverwrite,
            screenComponents: {
              key: screenKey,
              name: screenName,
              builderType: 'NATIVE_SCREEN',
              formDefinition: {
                componentPath: `/${azureDestinationPath}`,
                version: PUBLISH_VERSION
              },
              release: 'true'
            }
          }

          const updateResult = await updateScreenConfigInScreenManagementDetailed(
            existingForm.id,
            updateData,
            target.services.screenManagementApi,
            oauthConfig
          )
          if (updateResult.success) {
            console.log(`✅ Form version updated to ${PUBLISH_VERSION}`)
            return { success: true, operation: 'update' }
          }
          const msg = (updateResult.message || '').toLowerCase()
          if ([400, 409, 422].includes(updateResult.status) || msg.includes('namespace')) {
            console.log('🔁 Form update failed due to namespace mismatch → deleting and recreating')
            await deleteScreenInScreenManagement(existingForm.id, target.services.screenManagementApi, oauthConfig)

            const devForm2 = devForm || (await getScreenByKey(screenKey))
            const ns2 = devForm2
              ? {
                  namespaceId: devForm2.namespaceId,
                  namespaceCode: devForm2.namespaceCode,
                  namespaceDescription: devForm2.namespaceDescription
                }
              : null

            if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
              const customUrlPath = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '')
              const result = await addScreenConfigToScreenManagement(
                azureDestinationPath,
                customUrlPath,
                PUBLISH_VERSION,
                target.services.screenManagementApi,
                oauthConfig,
                ns2 ? { namespace: ns2, idOverride: devForm2?.id } : {}
              )
              if (result.success) {
                console.log(`✅ Form screen recreated successfully with ID: ${result.id}`)
                return { success: true, operation: 'recreate' }
              }
              console.error(`❌ Form screen recreation failed`)
              return { success: false, operation: 'recreate', error: 'Form screen recreation failed' }
            } else {
              const result = await addFormAsLandingScreen(
                processName,
                azureDestinationPath,
                PUBLISH_VERSION,
                target.services.screenManagementApi,
                oauthConfig,
                ns2 ? { namespace: ns2, idOverride: devForm2?.id } : {}
              )
              if (result.success) {
                console.log(`✅ Form screen recreated successfully with ID: ${result.id}`)
                return { success: true, operation: 'recreate' }
              }
              console.error(`❌ Form screen recreation failed`)
              return { success: false, operation: 'recreate', error: 'Form screen recreation failed' }
            }
          }
          console.error(`❌ Form version update failed`)
          return { success: false, operation: 'update', error: updateResult.message || 'Form version update failed' }
        } else {
          // Form doesn't exist, create it
          console.log(`🆕 Form doesn't exist, creating new form with key: ${screenKey}`)

          if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
            // Create form using screen management API directly when we have resource URL info
            // Use the resource URL path without /platform/ prefix as customUrlPath
            const customUrlPath = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '')
            const result = await addScreenConfigToScreenManagement(
              azureDestinationPath,
              customUrlPath,
              PUBLISH_VERSION,
              target.services.screenManagementApi,
              oauthConfig
            )

            if (result.success) {
              console.log(`✅ Form screen created successfully with ID: ${result.id}`)
              return { success: true, operation: 'add' }
            } else {
              console.error(`❌ Form screen creation failed`)
              return { success: false, operation: 'add', error: 'Form screen creation failed' }
            }
          } else {
            // Use traditional form creation method when no resource URL info
            const result = await addFormAsLandingScreen(
              processName,
              azureDestinationPath,
              PUBLISH_VERSION,
              target.services.screenManagementApi,
              oauthConfig
            )
            if (result.success) {
              console.log(`✅ Form screen created successfully with ID: ${result.id}`)
              return { success: true, operation: 'add' }
            } else {
              console.error(`❌ Form screen creation failed`)
              return { success: false, operation: 'add', error: 'Form screen creation failed' }
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  Error checking existing form: ${error.message}, attempting to create new form`)

        // If lookup fails, try to create the form
        if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
          // Create form using screen management API directly when we have resource URL info
          // Use the resource URL path without /platform/ prefix as customUrlPath
          const customUrlPath = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '')
          const result = await addScreenConfigToScreenManagement(
            azureDestinationPath,
            customUrlPath,
            PUBLISH_VERSION,
            target.services.screenManagementApi,
            oauthConfig
          )

          if (result.success) {
            console.log(`✅ Form screen created successfully with ID: ${result.id}`)
            return { success: true, operation: 'add' }
          } else {
            console.error(`❌ Form screen creation failed`)
            return { success: false, operation: 'add', error: 'Form screen creation failed' }
          }
        } else {
          // Use traditional form creation method when no resource URL info
          const result = await addFormAsLandingScreen(
            processName,
            azureDestinationPath,
            PUBLISH_VERSION,
            target.services.screenManagementApi,
            oauthConfig
          )
          if (result.success) {
            console.log(`✅ Form screen created successfully with ID: ${result.id}`)
            return { success: true, operation: 'add' }
          } else {
            console.error(`❌ Form screen creation failed`)
            return { success: false, operation: 'add', error: 'Form screen creation failed' }
          }
        }
      }
    } else {
      // For regular screens, register with build number as version
      console.log('   Detected app screen - registering as production app screen')

      // Generate screen name and key
      let screenName, screenKey

      if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
        // Use resource URL info if available
        screenName = resourceUrlInfo.resourceUrl.name
        screenKey = generateScreenKeyFromUrl(resourceUrlInfo.resourceUrl.url)
        console.log(`   Using resource URL info - Name: ${screenName}, Key: ${screenKey}`)
      } else {
        // Fallback to path-based generation
        const customUrlPath = `apps/${azureDestinationPath}`
        screenName = formatScreenNameFromPath(customUrlPath)
        screenKey = generateScreenKeyFromPath(customUrlPath)
        console.log(`   Using path-based generation - Name: ${screenName}, Key: ${screenKey}`)
      }

      // First, check if the screen already exists
      console.log(`🔍 Checking if screen exists with key: ${screenKey}`)
      try {
        const existingScreen = await getScreenByKey(screenKey, target.services.screenManagementApi, oauthConfig)

        if (existingScreen && existingScreen.id) {
          // Strict LOWCODER screen detection → delete and recreate
          if (isLowcoderScreen(existingScreen)) {
            console.log('   🔎 LOWCODER screen detected - deleting before recreation')
            await deleteScreenInScreenManagement(existingScreen.id, target.services.screenManagementApi, oauthConfig)

            // Fetch dev screen for namespace
            const devScreen = await getScreenByKey(screenKey)
            const ns = devScreen
              ? {
                  namespaceId: devScreen.namespaceId,
                  namespaceCode: devScreen.namespaceCode,
                  namespaceDescription: devScreen.namespaceDescription
                }
              : null

            // Generate custom URL path for screen creation
            let customUrlPathForCreation
            if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
              customUrlPathForCreation = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '')
            } else {
              customUrlPathForCreation = `apps/${azureDestinationPath}`
            }

            const result = await addScreenConfigToScreenManagement(
              azureDestinationPath,
              customUrlPathForCreation,
              PUBLISH_VERSION,
              target.services.screenManagementApi,
              oauthConfig,
              ns ? { namespace: ns, idOverride: devScreen?.id } : {}
            )

            if (result.success) {
              console.log(`✅ Screen recreated successfully with ID: ${result.id}`)
              return { success: true, operation: 'recreate' }
            }
            console.error(`❌ Screen recreation failed`)
            return { success: false, operation: 'recreate', error: 'Screen recreation failed' }
          }

          // Screen exists, update it (overwrite namespace from dev)
          console.log(`📝 Screen exists with ID: ${existingScreen.id}, updating version to ${PUBLISH_VERSION}`)

          const devScreen = await getScreenByKey(screenKey)
          const namespaceOverwrite = devScreen
            ? {
                namespaceId: devScreen.namespaceId,
                namespaceCode: devScreen.namespaceCode,
                namespaceDescription: devScreen.namespaceDescription
              }
            : {}

          const updateData = {
            screenKey: screenKey,
            name: screenName,
            type: 'SCREEN',
            ...namespaceOverwrite,
            screenComponents: {
              key: screenKey,
              name: screenName,
              builderType: 'NATIVE_SCREEN',
              formDefinition: {
                componentPath: `/${azureDestinationPath}`,
                version: PUBLISH_VERSION
              },
              release: 'true'
            }
          }

          const updateResult = await updateScreenConfigInScreenManagementDetailed(
            existingScreen.id,
            updateData,
            target.services.screenManagementApi,
            oauthConfig
          )
          if (updateResult.success) {
            console.log(`✅ Screen version updated to ${PUBLISH_VERSION}`)
            return { success: true, operation: 'update' }
          }
          const msg = (updateResult.message || '').toLowerCase()
          if ([400, 409, 422].includes(updateResult.status) || msg.includes('namespace')) {
            console.log('🔁 Screen update failed due to namespace mismatch → deleting and recreating')
            await deleteScreenInScreenManagement(existingScreen.id, target.services.screenManagementApi, oauthConfig)

            // Generate custom URL path for screen creation
            let customUrlPathForCreation
            if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
              customUrlPathForCreation = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '')
            } else {
              customUrlPathForCreation = `apps/${azureDestinationPath}`
            }

            const devScreen2 = devScreen || (await getScreenByKey(screenKey))
            const ns2 = devScreen2
              ? {
                  namespaceId: devScreen2.namespaceId,
                  namespaceCode: devScreen2.namespaceCode,
                  namespaceDescription: devScreen2.namespaceDescription
                }
              : null

            const result = await addScreenConfigToScreenManagement(
              azureDestinationPath,
              customUrlPathForCreation,
              PUBLISH_VERSION,
              target.services.screenManagementApi,
              oauthConfig,
              ns2 ? { namespace: ns2, idOverride: devScreen2?.id } : {}
            )

            if (result.success) {
              console.log(`✅ Screen recreated successfully with ID: ${result.id}`)
              return { success: true, operation: 'recreate' }
            }
            console.error(`❌ Screen recreation failed`)
            return { success: false, operation: 'recreate', error: 'Screen recreation failed' }
          }
          console.error(`❌ Screen version update failed`)
          return { success: false, operation: 'update', error: updateResult.message || 'Screen version update failed' }
        } else {
          // Screen doesn't exist, create it
          console.log(`🆕 Screen doesn't exist, creating new screen with key: ${screenKey}`)

          // Generate custom URL path for screen creation
          let customUrlPathForCreation
          if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
            // Use resource URL path without /platform/ prefix
            customUrlPathForCreation = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '')
          } else {
            // Use traditional apps path
            customUrlPathForCreation = `apps/${azureDestinationPath}`
          }

          const result = await addScreenConfigToScreenManagement(
            azureDestinationPath,
            customUrlPathForCreation,
            PUBLISH_VERSION,
            target.services.screenManagementApi,
            oauthConfig
          )

          if (result.success) {
            console.log(`✅ Screen created successfully with ID: ${result.id}`)
            return { success: true, operation: 'add' }
          } else {
            console.error(`❌ Screen creation failed`)
            return { success: false, operation: 'add', error: 'Screen creation failed' }
          }
        }
      } catch (error) {
        console.log(`⚠️  Error checking existing screen: ${error.message}, attempting to create new screen`)

        // If lookup fails, try to create the screen
        // Generate custom URL path for screen creation
        let customUrlPathForCreation
        if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
          // Use resource URL path without /platform/ prefix
          customUrlPathForCreation = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '')
        } else {
          // Use traditional apps path
          customUrlPathForCreation = `apps/${azureDestinationPath}`
        }

        const result = await addScreenConfigToScreenManagement(
          azureDestinationPath,
          customUrlPathForCreation,
          PUBLISH_VERSION,
          target.services.screenManagementApi,
          oauthConfig
        )

        if (result.success) {
          console.log(`✅ Screen created successfully with ID: ${result.id}`)
          return { success: true, operation: 'add' }
        } else {
          console.error(`❌ Screen creation failed`)
          return { success: false, operation: 'add', error: 'Screen creation failed' }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error during screen management registration:', error.message)
    return { success: false, operation: 'error', error: error.message }
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

async function uploadDirectory(buildOutputDir, azureDestinationPath, azureTarget, version) {
  const { accountName, sasToken, containerName } = azureTarget
  if (!accountName || !sasToken) {
    console.error('Error: Missing Azure Storage account or SAS token for the target upload.')
    process.exit(1)
  }

  const blobServiceUrl = `https://${accountName}.blob.core.windows.net/?${sasToken}`
  const blobServiceClient = new BlobServiceClient(blobServiceUrl)
  const containerClient = blobServiceClient.getContainerClient(containerName)

  console.log(`☁️  Uploading to Azure Storage account: ${accountName}, container: ${containerName}`)
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
    const isVersioned =
      !!version &&
      (file.endsWith(`index-${version}.js`) ||
        (path.extname(file).toLowerCase() === '.css' && path.basename(file).includes(`-${version}`)))

    const cacheControl = isVersioned ? 'public, max-age=31536000, immutable' : undefined

    try {
      console.log(`   Uploading: ${file} as ${blobName} (Content-Type: ${contentType})`)
      await blockBlobClient.uploadFile(localFilePath, {
        blobHTTPHeaders: {
          blobContentType: contentType,
          ...(cacheControl ? { blobCacheControl: cacheControl } : {})
        }
      })
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error.message)
    }
  }
  console.log('✅ All files uploaded successfully.')
}

async function publishScreen(screenPath, options = {}) {
  console.log(`🚀 Publishing screen: ${screenPath} (Version: ${PUBLISH_VERSION})`)

  const projectRootDir = path.resolve(__dirname, '..')
  console.log(`   Project Root Dir: ${projectRootDir}`)

  // Use the full screenPath for paths to maintain the directory structure
  const sourceEntryFile = path.join('src', 'business-apps', screenPath, 'index.ts')
  const viteEntryKey = screenPath
  const buildOutputDir = path.join(projectRootDir, 'dist', screenPath)
  const azureDestinationPath = screenPath.replace(/\\/g, '/')

  console.log(`   Source Entry File: ${sourceEntryFile}`)
  console.log(`   Vite Entry Key: ${viteEntryKey}`)
  console.log(`   Build Output Dir: ${buildOutputDir}`)

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

  // Build environment with production-specific variables
  const buildEnv = {
    ...process.env,
    PROJECT_ROOT_DIR: projectRootDir,
    VITE_GIT_USER: process.env.VITE_GIT_USER || execSync('git config user.name').toString().trim(),
    VITE_PUBLISH_TIME: new Date().toISOString(),
    VITE_BUILD_VERSION: PUBLISH_VERSION,
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey,
    TEMP_INDEX_CSS: tempIndexCssPath.replace(/\\/g, '/'),
    SINGLE_SCREEN_CSS: 'true',
    NODE_ENV: 'production',
    // Add build number to filename
    VITE_BUILD_NUMBER: BITBUCKET_BUILD_NUMBER
  }

  const viteBuildCommand = `npx vite build`

  console.log(`   Executing: ${viteBuildCommand} with production environment`)
  console.log(`   Publish version: ${PUBLISH_VERSION}`)
  console.log(`   Build number: ${BITBUCKET_BUILD_NUMBER}`)

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
    throw error
  }

  await renameFilesWithBuildNumber(buildOutputDir, PUBLISH_VERSION)

  // ============================================================================
  // HASH COMPARISON STEP - Optimized order: target first, then source
  // ============================================================================
  console.log('🔍 Checking if content changed...')

  const targets = options.targets && options.targets.length > 0 ? options.targets : [PRIMARY_TARGET]

  // STEP 1: Get deployed version from Screen Management API
  let deployedVersion = null
  let targetHashes = null

  for (const target of targets) {
    deployedVersion = await getCurrentDeployedVersion(screenPath, target)

    if (deployedVersion) {
      console.log(`   Current deployed version: ${deployedVersion}`)
      console.log(`   New build version: ${PUBLISH_VERSION}`)

      // STEP 2: Dynamically discover and get target hashes from Azure
      const azureTarget = target.azure || PRIMARY_TARGET.azure
      targetHashes = await getTargetArtifactsHashes(azureDestinationPath, azureTarget, deployedVersion)

      if (targetHashes) {
        console.log(`   Found ${Object.keys(targetHashes).length} deployed artifact(s):`)
        for (const [file, hash] of Object.entries(targetHashes)) {
          console.log(`     - ${file}: ${hash.substring(0, 8)}...`)
        }
        break // Use first successful result
      }
    }
  }

  // STEP 3: If no target version exists, this is a new screen - skip hash calculation
  if (!deployedVersion || !targetHashes) {
    console.log('   ✅ New screen or unable to retrieve target - proceeding with publish')
    // Continue with upload...
  } else {
    // STEP 4: Calculate source hashes (per-file, matching Azure format)
    console.log('   Calculating source artifact hashes...')
    const sourceHashes = await getSourceArtifactsHashes(buildOutputDir)

    console.log(`   Found ${Object.keys(sourceHashes).length} source artifact(s):`)
    for (const [file, hash] of Object.entries(sourceHashes)) {
      console.log(`     - ${file}: ${hash.substring(0, 8)}...`)
    }

    // STEP 5: Compare file-by-file
    const comparison = compareArtifactHashes(sourceHashes, targetHashes, PUBLISH_VERSION, deployedVersion)

    if (comparison.allMatch) {
      console.log('✅ All artifact hashes match - content unchanged, skipping publish')

      return {
        success: true,
        skipped: true,
        reason: 'content_unchanged',
        outputPath: buildOutputDir,
        sourceHashes,
        targetHashes,
        sourceVersion: PUBLISH_VERSION,
        targetVersion: deployedVersion
      }
    } else {
      console.log(`   ⚠️  Content changed - found ${comparison.differences.length} difference(s):`)
      for (const diff of comparison.differences) {
        if (diff.reason === 'new_file') {
          console.log(`     - ${diff.file}: NEW FILE`)
        } else if (diff.reason === 'file_removed') {
          console.log(`     - ${diff.file}: REMOVED FILE`)
        } else {
          console.log(`     - ${diff.file}: CHANGED`)
          console.log(`       Source: ${diff.sourceHash.substring(0, 16)}...`)
          console.log(`       Target: ${diff.targetHash.substring(0, 16)}...`)
        }
      }
      console.log('   Proceeding with publish...')
    }
  }

  // Continue with existing upload logic
  const azureTargets =
    options.azureTargets && options.azureTargets.length > 0 ? options.azureTargets : [PRIMARY_TARGET.azure]
  for (const target of azureTargets) {
    try {
      await uploadDirectory(buildOutputDir, azureDestinationPath, target, PUBLISH_VERSION)
    } catch (err) {
      err.targetLabel = target.label || 'unknown'
      throw err
    }
  }
  console.log('✅ Screen JS published successfully to Azure targets!')

  // Handle CSS files - check both screen directory and global assets directory
  console.log('🎨 Handling CSS files...')

  // Check for CSS in screen directory first
  console.log(`   Checking screen directory: ${buildOutputDir}`)
  const screenCssFiles = await glob('**/*.css', {
    cwd: buildOutputDir,
    nodir: true
  })
  console.log(`   Found ${screenCssFiles.length} CSS file(s) in screen directory`)

  // Check for CSS in global assets directory
  const globalAssetsDir = path.join(projectRootDir, 'dist', 'assets')
  let globalCssFiles = []
  if (fs.existsSync(globalAssetsDir)) {
    globalCssFiles = await glob('**/*.css', {
      cwd: globalAssetsDir,
      nodir: true
    })
    console.log(`   Checking global assets directory: ${globalAssetsDir}`)
    console.log(`   Found ${globalCssFiles.length} CSS file(s) in global assets directory`)
  } else {
    console.log(`   Global assets directory does not exist: ${globalAssetsDir}`)
  }

  // Handle screen-specific CSS
  if (screenCssFiles.length > 0) {
    console.log(`   Found ${screenCssFiles.length} CSS file(s) in screen directory:`)
    screenCssFiles.forEach(file => console.log(`     - ${file}`))

    await renameCssFilesInDirectory(buildOutputDir, PUBLISH_VERSION)
    console.log('✅ Screen-specific CSS processed!')
  }

  // Handle global CSS (main.css) by moving it to screen directory
  if (globalCssFiles.length > 0) {
    console.log(`   Found ${globalCssFiles.length} global CSS file(s):`)
    globalCssFiles.forEach(file => console.log(`     - ${file}`))

    // Copy global CSS to screen directory and rename with publish version
    for (const file of globalCssFiles) {
      const globalCssPath = path.join(globalAssetsDir, file)
      const parsedPath = path.parse(file)
      const newName = `${parsedPath.name}-${PUBLISH_VERSION}${parsedPath.ext}`
      const targetPath = path.join(buildOutputDir, newName)

      console.log(`   Moving and renaming: ${file} → ${newName}`)
      fs.copyFileSync(globalCssPath, targetPath)
    }

    // Upload the CSS files to all targets
    for (const target of azureTargets) {
      try {
        await uploadDirectory(buildOutputDir, azureDestinationPath, target, PUBLISH_VERSION)
      } catch (err) {
        err.targetLabel = target.label || 'unknown'
        throw err
      }
    }
    console.log('✅ Global CSS moved to screen directory and uploaded to all targets!')
  }

  if (screenCssFiles.length === 0 && globalCssFiles.length === 0) {
    console.log('   No CSS files found')
  }

  // Handle both forms and regular screens with resource URL synchronization across targets

  // Check if resource URL sync should be skipped
  const skipResourceUrlSync = options.skipResourceUrlSync || process.env.SKIP_RESOURCE_URL_SYNC === 'true'
  const skipScreenRegistration = options.skipScreenRegistration || false

  for (const target of targets) {
    let resourceUrlResult
    if (!skipResourceUrlSync) {
      console.log(`🔗 Step 3 [${target.label}]: Handling resource URL synchronization...`)
      resourceUrlResult = await handleResourceUrlSynchronization(screenPath, azureDestinationPath, target)
    } else {
      console.log(`🔗 Step 3 [${target.label}]: Skipping resource URL synchronization (handled by comprehensive sync)`)
      resourceUrlResult = { success: true, operation: 'skip_comprehensive_sync', resourceUrl: null }
    }

    if (!resourceUrlResult.success) {
      throw new Error(`[${target.label}] Resource URL synchronization failed: ${resourceUrlResult.error}`)
    }

    console.log(`📱 Step 4 [${target.label}]: Registering screen in Screen Management...`)

    if (!skipScreenRegistration) {
      const registrationResult = await handleScreenManagement(
        screenPath,
        azureDestinationPath,
        resourceUrlResult,
        target
      )

      if (!registrationResult.success) {
        throw new Error(`[${target.label}] Screen Management registration failed: ${registrationResult.error}`)
      }
    } else {
      console.log(`📱 Step 4 [${target.label}]: Skipping screen registration (handled by comprehensive sync)`)
    }
  }

  return {
    success: true,
    outputPath: buildOutputDir,
    azureUrls: azureTargets.map(
      t =>
        `https://${t.accountName}.blob.core.windows.net/${t.containerName}/${azureDestinationPath}/index-${PUBLISH_VERSION}.js`
    )
  }
}

async function renameFilesWithBuildNumber(buildOutputDir, version) {
  console.log(`🔄 Renaming JS files with version: ${version}`)
  const files = await glob('**/*', {
    cwd: buildOutputDir,
    nodir: true
  })

  for (const file of files) {
    const filePath = path.join(buildOutputDir, file)
    const parsedPath = path.parse(filePath)

    // Rename index.js to index-{version}.js
    if (parsedPath.name === 'index' && parsedPath.ext === '.js') {
      const newName = `index-${version}${parsedPath.ext}`
      const newPath = path.join(parsedPath.dir, newName)

      console.log(`   Renaming: ${file} → ${path.relative(buildOutputDir, newPath)}`)
      fs.renameSync(filePath, newPath)
    }
  }
}

async function renameCssFilesInDirectory(targetDir, version) {
  console.log(`🎨 Renaming CSS files in directory with version: ${version}`)
  const files = await glob('**/*.css', {
    cwd: targetDir,
    nodir: true
  })

  for (const file of files) {
    const filePath = path.join(targetDir, file)
    const parsedPath = path.parse(filePath)

    // Rename any CSS file (main.css or others) to include version
    const newName = `${parsedPath.name}-${version}${parsedPath.ext}`
    const newPath = path.join(parsedPath.dir, newName)

    console.log(`   Renaming CSS: ${file} → ${path.relative(targetDir, newPath)}`)
    fs.renameSync(filePath, newPath)
  }
}

// Helper function to handle comprehensive screen and resource URL synchronization
async function handleComprehensiveScreenSyncForTarget(changedScreens, target) {
  console.log('🔄 Starting comprehensive screen synchronization from dev to prod...')
  console.log(`📋 Changed screens to process: ${changedScreens.length}`)

  // Create OAuth configurations
  const devOauthConfig = {} // Use dev environment variables (default)
  const prodOauthConfig = {
    clientId: target.oauth.clientId,
    clientSecret: target.oauth.clientSecret,
    oauthUrl: target.oauth.oauthUrl,
    realm: target.oauth.realm
  }

  try {
    // Step 1: Get all NATIVE_SCREEN screens from dev environment (done once for efficiency)
    console.log('\n📥 Step 1: Fetching all NATIVE_SCREEN screens from dev environment...')
    const devScreens = await getAllNativeScreens(process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API, devOauthConfig)

    if (devScreens.length === 0) {
      console.log('   No NATIVE_SCREEN screens found in dev environment')
      return { success: true, processedScreens: 0, syncedResources: 0, syncedScreens: 0 }
    }

    // Step 2: Filter screens that match changed screen paths and separate forms from apps
    console.log('\n🔍 Step 2: Filtering and categorizing matching screens...')
    const matchingScreens = devScreens.filter(screen => {
      if (
        !screen.screenComponents ||
        !screen.screenComponents.formDefinition ||
        !screen.screenComponents.formDefinition.componentPath
      ) {
        return false
      }

      // Remove leading slash and normalize path
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')

      // Check if this component path is in our changed screens list
      const isMatching = changedScreens.some(changedScreen => {
        return componentPath === changedScreen || componentPath.endsWith(`/${changedScreen}`)
      })

      if (isMatching) {
        console.log(`   ✅ Match found: ${screen.screenKey} -> ${componentPath}`)
      }

      return isMatching
    })

    // Separate form screens from app screens
    const formScreens = matchingScreens.filter(screen => {
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')
      return isFormScreen(componentPath)
    })

    const appScreens = matchingScreens.filter(screen => {
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')
      return !isFormScreen(componentPath)
    })

    console.log(`   Found ${matchingScreens.length} total matching screens:`)
    console.log(`   📝 Form screens: ${formScreens.length}`)
    console.log(`   📱 App screens: ${appScreens.length}`)

    if (matchingScreens.length === 0) {
      console.log('   No screens match the changed component paths')
      return { success: true, processedScreens: 0, syncedResources: 0, syncedScreens: 0 }
    }

    let syncedResources = 0
    let syncedScreens = 0
    let failedSyncScreens = []

    // Step 3: Process Form Screens (NO resource URL sync, preserve exact screenKey)
    if (formScreens.length > 0) {
      console.log(`\n📝 Step 3a: Processing ${formScreens.length} form screens (no resource URL sync)...`)

      for (const screen of formScreens) {
        console.log(`\n   📌 Processing form screen: ${screen.screenKey}`)
        console.log(`   ℹ️  Form screens skip resource URL sync and preserve exact screenKey from dev`)

        // Sync screen to prod with preserved screenKey
        const screenSyncResult = await syncScreenFromDevToProd(
          screen,
          target.services.screenManagementApi,
          prodOauthConfig,
          PUBLISH_VERSION
        )

        if (screenSyncResult.success) {
          syncedScreens++
          console.log(`   ✅ Form screen sync: ${screenSyncResult.operation} (screenKey: ${screen.screenKey})`)
        } else {
          console.log(`   ❌ Form screen sync failed: ${screenSyncResult.error}`)
          failedSyncScreens.push({
            screen: screen.screenComponents?.formDefinition?.componentPath?.replace(/^\//, '') || screen.screenKey,
            error: screenSyncResult.error,
            stage: 'comprehensive_sync_form'
          })
        }
      }
    }

    // Step 4: Process App Screens (WITH resource URL sync and URL conversion)
    if (appScreens.length > 0) {
      console.log(`\n📱 Step 3b: Processing ${appScreens.length} app screens (with resource URL sync)...`)

      for (const screen of appScreens) {
        console.log(`\n   📌 Processing app screen: ${screen.screenKey}`)

        // Convert screen key to URL
        const platformUrl = convertScreenKeyToUrl(screen.screenKey)

        if (platformUrl) {
          console.log(`   🔗 Generated URL: ${platformUrl}`)

          // Search for resource URL in dev using full platform URL
          const devResourceUrl = await searchResourceUrlInDev(platformUrl, devOauthConfig)

          if (devResourceUrl) {
            console.log(`   📍 Found resource URL in dev: ${devResourceUrl.url}`)

            // Sync resource URL to prod with same ID
            const resourceSyncResult = await syncResourceUrlWithSameId(
              devResourceUrl,
              target.services.navigationApi,
              prodOauthConfig
            )

            if (resourceSyncResult.success) {
              if (resourceSyncResult.operation === 'created') {
                syncedResources++
              }
              console.log(`   ✅ Resource URL sync: ${resourceSyncResult.operation}`)
            } else {
              console.log(`   ⚠️  Resource URL sync failed: ${resourceSyncResult.error}`)
            }
          } else {
            console.log(`   ℹ️  No resource URL found in dev for: ${platformUrl}`)
          }
        } else {
          console.log(`   ⚠️  Could not convert screen key to URL: ${screen.screenKey}`)
        }

        // Sync screen to prod
        const screenSyncResult = await syncScreenFromDevToProd(
          screen,
          target.services.screenManagementApi,
          prodOauthConfig,
          PUBLISH_VERSION
        )

        if (screenSyncResult.success) {
          syncedScreens++
          console.log(`   ✅ App screen sync: ${screenSyncResult.operation}`)
        } else {
          console.log(`   ❌ App screen sync failed: ${screenSyncResult.error}`)
          failedSyncScreens.push({
            screen: screen.screenComponents?.formDefinition?.componentPath?.replace(/^\//, '') || screen.screenKey,
            error: screenSyncResult.error,
            stage: 'comprehensive_sync_app'
          })
        }
      }
    }

    // Summary
    console.log(`\n📊 Comprehensive Sync Summary:`)
    console.log(`   📋 Total processed screens: ${matchingScreens.length}`)
    console.log(`   📝 Form screens processed: ${formScreens.length} (no resource URL sync)`)
    console.log(`   📱 App screens processed: ${appScreens.length} (with resource URL sync)`)
    console.log(`   🔗 Resource URLs synced: ${syncedResources}`)
    console.log(`   📱 Total screens synced: ${syncedScreens}`)
    console.log(`   ❌ Failed screen syncs: ${failedSyncScreens.length}`)

    // Determine overall success - true only if no failures occurred
    const overallSuccess = failedSyncScreens.length === 0

    return {
      success: overallSuccess,
      processedScreens: matchingScreens.length,
      formScreens: formScreens.length,
      appScreens: appScreens.length,
      syncedResources,
      syncedScreens,
      failedSyncScreens
    }
  } catch (error) {
    console.error('❌ Error during comprehensive screen synchronization:', error.message)
    return {
      success: false,
      error: error.message,
      processedScreens: 0,
      syncedResources: 0,
      syncedScreens: 0,
      failedSyncScreens: []
    }
  }
}

async function main() {
  console.log('🚀 Starting production screen publishing...')
  console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`)
  console.log(`🎯 Publish version: ${PUBLISH_VERSION}`)
  console.log(`🔗 Resource URL sync: ${process.env.SKIP_RESOURCE_URL_SYNC === 'true' ? 'DISABLED' : 'ENABLED'}`)
  console.log(`🌐 Secondary target ${SECONDARY_TARGET ? 'DETECTED' : 'NOT configured'}`)

  // Check if manual screen list file is provided as command line argument
  const manualScreensFile = process.argv[2]
  let screensFile

  if (manualScreensFile && fs.existsSync(manualScreensFile)) {
    console.log(`📋 Using manually specified screens from: ${manualScreensFile}`)
    screensFile = manualScreensFile
  } else {
    console.log('🔍 Using change detection to find screens to publish...')

    try {
      execSync('bash scripts/detect-changed-screens.sh', { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Failed to detect changed screens:', error.message)
      process.exit(1)
    }

    screensFile = 'changed-tsx.txt'
  }

  // Check if any screens were found
  if (!fs.existsSync(screensFile) || !fs.statSync(screensFile).size) {
    console.log('✅ No screens found to publish. Nothing to publish.')
    return
  }

  // Read the screens to publish
  const detectedScreens = fs
    .readFileSync(screensFile, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^src\/business-apps\//, ''))

  console.log(`📋 Detected ${detectedScreens.length} screen(s) from change detection:`)
  detectedScreens.forEach(screen => console.log(`   - ${screen}`))

  // Filter out screens that don't exist (were removed)
  const projectRootDir = path.resolve(__dirname, '..')
  const existingScreens = detectedScreens.filter(screen => {
    const sourceEntryFile = path.join(projectRootDir, 'src', 'business-apps', screen, 'index.ts')
    const exists = fs.existsSync(sourceEntryFile)
    if (!exists) {
      console.log(`   ⚠️  Skipping removed screen: ${screen} (${sourceEntryFile} not found)`)
    }
    return exists
  })

  const removedCount = detectedScreens.length - existingScreens.length
  if (removedCount > 0) {
    console.log(`📋 Filtered out ${removedCount} removed screen(s).`)
  }

  console.log(`📋 Found ${existingScreens.length} existing screen(s) to publish:`)
  existingScreens.forEach(screen => console.log(`   - ${screen}`))

  const changedScreens = existingScreens
  const targets = [PRIMARY_TARGET]
  if (SECONDARY_TARGET) targets.push(SECONDARY_TARGET)

  // ============================================================================
  // STEP 1: Build all screens and check hashes (before comprehensive sync)
  // ============================================================================
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🔨 STEP 1: BUILD AND HASH CHECK (${changedScreens.length} screens)`)
  console.log(`${'='.repeat(80)}`)

  const failedScreens = []
  const skippedScreens = []
  const screensToPublish = [] // Only screens with actual content changes

  for (const screen of changedScreens) {
    console.log(`\n📦 Building and checking: ${screen}`)

    try {
      const azureTargets = targets.map(t => t.azure).filter(t => t !== null)
      console.log(`   Building screen...`)

      // Run simplified build (without hash check and upload)
      try {
        // Simplified build call - we'll handle hash check separately
        const result = await publishScreen(screen, {
          skipResourceUrlSync: true,
          skipScreenRegistration: true,
          azureTargets,
          targets
        })

        if (result.skipped) {
          console.log(`   ⏩ Content unchanged - skipping publish`)
          console.log(`   Build ${result.sourceVersion} matches deployed ${result.targetVersion}`)
          skippedScreens.push({
            screen,
            reason: result.reason,
            fileCount: Object.keys(result.sourceHashes || {}).length,
            sourceVersion: result.sourceVersion,
            targetVersion: result.targetVersion
          })
        } else {
          console.log(`   ✅ Content changed or new screen - will publish`)
          screensToPublish.push(screen)
        }
      } catch (buildError) {
        console.error(`   ❌ Build/check failed: ${buildError.message}`)
        failedScreens.push({
          screen,
          error: buildError.message,
          stage: 'build_check',
          target: buildError.targetLabel || 'unknown'
        })
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${screen}: ${error.message}`)
      failedScreens.push({
        screen,
        error: error.message,
        stage: 'build_check',
        target: error.targetLabel || 'unknown'
      })
    }
  }

  console.log(`\n📊 Hash Check Summary:`)
  console.log(`   📝 Total screens: ${changedScreens.length}`)
  console.log(`   ✅ Changed screens: ${screensToPublish.length}`)
  console.log(`   ⏩ Unchanged screens: ${skippedScreens.length}`)
  console.log(`   ❌ Failed: ${failedScreens.length}`)

  // ============================================================================
  // STEP 2: Comprehensive Sync - ONLY for screens that actually changed
  // ============================================================================
  let comprehensiveSyncResults = []

  if (screensToPublish.length > 0) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔄 STEP 2: COMPREHENSIVE SYNC (${screensToPublish.length} changed screens)`)
    console.log(`${'='.repeat(80)}`)

    for (const target of targets) {
      console.log(
        `\n▶️ Target: ${target.label.toUpperCase()} | ScreenMgmt: ${target.services.screenManagementApi} | Nav: ${target.services.navigationApi}`
      )
      const result = await handleComprehensiveScreenSyncForTarget(screensToPublish, target)
      comprehensiveSyncResults.push({ label: target.label, result })
      if (result.success) {
        console.log(`✅ [${target.label}] Comprehensive sync completed successfully!`)
        console.log(`   📋 Processed screens: ${result.processedScreens}`)
        console.log(`   🔗 Synced resource URLs: ${result.syncedResources}`)
        console.log(`   📱 Synced screens: ${result.syncedScreens}`)
      } else {
        console.error(`❌ [${target.label}] Comprehensive sync failed: ${result.error}`)
        console.log('⚠️  Continuing with individual screen uploads as fallback...')
      }
    }

    // Add comprehensive sync failures to failed screens list
    for (const { result, label } of comprehensiveSyncResults) {
      if (result.failedSyncScreens && result.failedSyncScreens.length > 0) {
        failedScreens.push(...result.failedSyncScreens.map(f => ({ ...f, target: label })))
        console.log(`⚠️  [${label}] ${result.failedSyncScreens.length} screen(s) failed during comprehensive sync`)
      }
    }
  } else {
    console.log(`\n⏩ No screens need comprehensive sync - all ${skippedScreens.length} screen(s) unchanged!`)
  }

  // Print final summary
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 PRODUCTION PUBLISHING SUMMARY`)
  console.log(`${'='.repeat(80)}`)
  console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`)
  console.log(`🎯 Publish version: ${PUBLISH_VERSION}`)
  console.log(`🔗 Resource URL sync: ${process.env.SKIP_RESOURCE_URL_SYNC === 'true' ? 'DISABLED' : 'ENABLED'}`)
  console.log(`📈 Total screens processed: ${changedScreens.length}`)

  const totalFailures = failedScreens.length
  const totalSkipped = skippedScreens.length
  const actualSuccessCount = changedScreens.length - totalFailures - totalSkipped

  console.log(`✅ Successfully published: ${actualSuccessCount}`)
  console.log(`⏩ Skipped (unchanged): ${totalSkipped}`)
  console.log(`❌ Failed: ${totalFailures}`)

  // Add comprehensive sync summary per target
  console.log(`\n🔄 COMPREHENSIVE SYNC RESULTS (per target):`)
  for (const { label, result } of comprehensiveSyncResults) {
    console.log(`\n   ▶️ Target: ${label}`)
    console.log(`   📋 Total screens processed: ${result.processedScreens || 0}`)
    console.log(`   📝 Form screens processed: ${result.formScreens || 0} (no resource URL sync)`)
    console.log(`   📱 App screens processed: ${result.appScreens || 0} (with resource URL sync)`)
    console.log(`   🔗 Resource URLs synced: ${result.syncedResources || 0}`)
    console.log(`   📱 Screen configs synced: ${result.syncedScreens || 0}`)
    console.log(`   ❌ Screen sync failures: ${result.failedSyncScreens?.length || 0}`)
    if (result.success) {
      console.log(`   ✅ Comprehensive sync: SUCCESSFUL`)
    } else {
      console.log(`   ❌ Comprehensive sync: FAILED${result.error ? ` (${result.error})` : ''}`)
    }
  }

  // Display skipped screens details
  if (skippedScreens.length > 0) {
    console.log(`\n⏩ SKIPPED SCREENS (all artifact hashes matched):`)
    console.log(`${'='.repeat(50)}`)
    skippedScreens.forEach((skip, index) => {
      console.log(`\n${index + 1}. Screen: ${skip.screen}`)
      console.log(`   Files checked: ${skip.fileCount}`)
      console.log(`   New build: ${skip.sourceVersion}`)
      console.log(`   Deployed: ${skip.targetVersion}`)
      console.log(`   ${'─'.repeat(40)}`)
    })
  }

  if (failedScreens.length > 0) {
    console.log(`\n❌ FAILED SCREENS:`)
    console.log(`${'='.repeat(50)}`)

    // Group failures by stage for better readability
    const syncFailures = failedScreens.filter(f => f.stage?.includes('comprehensive_sync'))
    const buildFailures = failedScreens.filter(f => f.stage === 'build_upload')

    if (syncFailures.length > 0) {
      console.log(`\n🔄 COMPREHENSIVE SYNC FAILURES (${syncFailures.length}):`)
      syncFailures.forEach((failure, index) => {
        console.log(`\n${index + 1}. Screen: ${failure.screen}`)
        console.log(`   Target: ${failure.target || 'unknown'}`)
        console.log(`   Stage: ${failure.stage}`)
        console.log(`   Error: ${failure.error}`)
        console.log(`   ${'─'.repeat(40)}`)
      })
    }

    if (buildFailures.length > 0) {
      console.log(`\n🔨 BUILD/UPLOAD FAILURES (${buildFailures.length}):`)
      buildFailures.forEach((failure, index) => {
        console.log(`\n${syncFailures.length + index + 1}. Screen: ${failure.screen}`)
        console.log(`   Target: ${failure.target || 'unknown'}`)
        console.log(`   Stage: ${failure.stage}`)
        console.log(`   Error: ${failure.error}`)
        console.log(`   ${'─'.repeat(40)}`)
      })
    }

    console.log(`\n💥 Production publishing completed with ${failedScreens.length} failure(s)!`)
    console.log(`🚨 Please review the failed screens and fix the issues before next deployment.`)
    if (syncFailures.length > 0) {
      console.log(`⚠️  ${syncFailures.length} screen(s) failed during comprehensive sync (screen management)`)
    }
    if (buildFailures.length > 0) {
      console.log(`⚠️  ${buildFailures.length} screen(s) failed during build/upload (Azure deployment)`)
    }

    // Exit with error code to fail the pipeline
    process.exit(1)
  } else {
    console.log(`\n🎉 Production publishing completed successfully!`)
    console.log(`✨ All ${actualSuccessCount} screen(s) were published without errors.`)
  }
}

main().catch(error => {
  console.error('❌ An unexpected error occurred:', error)
  process.exit(1)
})
