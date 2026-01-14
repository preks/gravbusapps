/**
 * Production screen publishing script
 * - Publishes only changed screens detected by detect-changed-screens.sh
 * - Uses Bitbucket build number as version
 * - Includes screen management registrations with build number versioning
 * - Executed on master merge
 */

import { execSync } from 'node:child_process'
import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'
import { glob } from 'glob'
import axios from 'axios'
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
import { compareScreenHashes, loadHashFile, saveHashFile, configureGit } from './utils/componentHashUtils.js'

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
        timeout: 30000
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

async function publishScreen(
  screenPath,
  { skipResourceUrlSync = false, skipScreenRegistration = false, azureTargets = [], targets = [] } = {}
) {
  if (!skipResourceUrlSync) {
    skipResourceUrlSync = process.env.SKIP_RESOURCE_URL_SYNC === 'true'
  }

  if (!skipScreenRegistration) {
    skipScreenRegistration = false
  }

  if (!azureTargets || azureTargets.length === 0) {
    azureTargets = [PRIMARY_TARGET.azure]
  }

  if (!targets || targets.length === 0) {
    targets = [PRIMARY_TARGET]
  }

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
    VITE_BUILD_FOR_DEPLOYMENT: 'false',
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

  // Upload to Azure
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

// Detect manual publish mode from pipeline

/**
 * Find all screen directories in the project
 */
async function findAllScreenDirectories() {
  const appIndexFiles = await glob('src/business-apps/**/apps/*/index.ts', { nodir: true })
  const formIndexFiles = await glob('src/business-apps/**/forms/*/index.ts', { nodir: true })
  const popupIndexFiles = await glob('src/business-apps/**/popups/*/index.ts', { nodir: true })
  const recordIndexFiles = await glob('src/business-apps/**/records/*/index.ts', { nodir: true })

  const allIndexFiles = [...appIndexFiles, ...formIndexFiles, ...popupIndexFiles, ...recordIndexFiles]
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
  console.log('🚀 Starting production screen publishing...')
  console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`)
  console.log(`🎯 Publish version: ${PUBLISH_VERSION}`)
  console.log(`🔗 Resource URL sync: ${process.env.SKIP_RESOURCE_URL_SYNC === 'true' ? 'DISABLED' : 'ENABLED'}`)
  console.log(`🌐 Secondary target ${SECONDARY_TARGET ? 'DETECTED' : 'NOT configured'}`)

  // Determine which screens to publish
  let candidateScreens = []
  let isManualScreenList = false
  const manualScreensFile = process.argv[2]

  if (manualScreensFile && fs.existsSync(manualScreensFile)) {
    // Manual screen list provided - use these screens directly (force deploy)
    console.log(`📋 MANUAL MODE: Using specified screens from: ${manualScreensFile}`)
    isManualScreenList = true

    const specifiedScreens = fs
      .readFileSync(manualScreensFile, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Convert all backslashes to forward slashes (Windows paths)
        let normalized = line.replace(/\\/g, '/')
        // Remove any leading slashes that might remain
        normalized = normalized.replace(/^\/+/, '')
        // Remove src/business-apps/ prefix if present (handles both original and converted paths)
        normalized = normalized.replace(/^src\/business-apps\//, '')
        // Remove .ts or .tsx extension if present
        normalized = normalized.replace(/\.tsx?$/, '')
        // Extract screen directory (module/sub-module/.../app-name) - remove subfolders
        // e.g., hr/core/apps/employee-record/components/Foo -> hr/core/apps/employee-record
        const screenMatch = normalized.match(/^(.*?\/(?:apps|forms|popups|records)\/[^/]+)/)
        if (screenMatch) {
          normalized = screenMatch[1]
        }
        return normalized
      })

    console.log(`📋 Found ${specifiedScreens.length} manually specified screen(s):`)
    specifiedScreens.forEach(screen => console.log(`   - ${screen}`))

    // Filter out screens that don't exist
    const projectRootDir = path.resolve(__dirname, '..')
    candidateScreens = specifiedScreens.filter(screen => {
      const sourceEntryFile = path.join(projectRootDir, 'src', 'business-apps', screen, 'index.ts')
      const exists = fs.existsSync(sourceEntryFile)
      if (!exists) {
        console.log(`   ⚠️  Skipping non-existent screen: ${screen}`)
      }
      return exists
    })

    console.log(`✅ Will force-deploy ${candidateScreens.length} screen(s) (no hash comparison)`)
  } else {
    // No manual list - compare ALL screens' dev hashes vs prod hashes
    console.log('🔍 AUTO MODE: Comparing dev vs prod hashes for ALL screens...')
    candidateScreens = await findAllScreenDirectories()
    console.log(`📋 Found ${candidateScreens.length} total screen(s) in project`)
  }

  const changedScreens = candidateScreens
  const useHashComparison = !isManualScreenList // Skip hash comparison for manual deploys
  const targets = [PRIMARY_TARGET]
  if (SECONDARY_TARGET) targets.push(SECONDARY_TARGET)

  const projectRootDirForHashes = path.resolve(__dirname, '..')
  const devHashFile = path.join(projectRootDirForHashes, 'component-hashes.json')
  const prodHashFile = path.join(projectRootDirForHashes, 'component-hashes-prod.json')

  // Load hash files ONCE at the beginning (keep in memory throughout)
  const devHashes = loadHashFile(devHashFile)
  const prodHashes = loadHashFile(prodHashFile)

  // ============================================================================
  // STEP 1: PRE-BUILD HASH COMPARISON (skip if manual screen list provided)
  // ============================================================================
  let screensToPublish = []
  const skippedScreens = []
  const failedScreens = []

  if (useHashComparison) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔍 STEP 1: PRE-BUILD HASH COMPARISON`)
    console.log(`${'='.repeat(80)}`)

    console.log(`   Dev hashes loaded: ${Object.keys(devHashes).length} screens`)
    console.log(`   Prod hashes loaded: ${Object.keys(prodHashes).length} screens`)

    for (const screen of changedScreens) {
      const comparison = compareScreenHashes(screen, devHashes, prodHashes)

      if (comparison.changed) {
        console.log(`   🔨 ${screen}: ${comparison.reason}`)
        screensToPublish.push(screen)
      } else {
        skippedScreens.push({
          screen,
          hash: comparison.devHash,
          reason: 'hash_match'
        })
      }
    }

    console.log(`\n   📊 Pre-build comparison results:`)
    console.log(`      Changed screens (will build): ${screensToPublish.length}`)
    console.log(`      Unchanged screens (skip build): ${skippedScreens.length}`)
    console.log(`      Time saved: ~${skippedScreens.length * 10} minutes ⚡`)
  } else {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🎯 MANUAL SCREEN LIST - SKIPPING HASH COMPARISON`)
    console.log(`${'='.repeat(80)}`)
    console.log(`   All ${changedScreens.length} specified screen(s) will be force-deployed`)
    screensToPublish = changedScreens
  }

  // ============================================================================
  // STEP 2: BUILD AND PUBLISH (only changed screens or all if manual)
  // ============================================================================
  if (screensToPublish.length === 0) {
    console.log(`\n✅ No screens need publishing - all unchanged!`)
    return
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`🔨 STEP 2: BUILD AND PUBLISH (${screensToPublish.length} screens)`)
  console.log(`${'='.repeat(80)}`)

  const successfulScreens = []

  for (const screen of screensToPublish) {
    console.log(`\n📦 Publishing: ${screen}`)

    try {
      const azureTargets = targets.map(t => t.azure).filter(t => t !== null)
      await publishScreen(screen, {
        skipResourceUrlSync: true,
        skipScreenRegistration: true,
        azureTargets,
        targets
      })

      successfulScreens.push(screen)
      console.log(`   ✅ Published successfully`)
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`)
      failedScreens.push({
        screen,
        error: error.message,
        stage: 'build_upload',
        target: error.targetLabel || 'unknown'
      })
    }
  }

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

  // ============================================================================
  // STEP 3: UPDATE PROD HASH FILE
  // ============================================================================
  if (useHashComparison && successfulScreens.length > 0) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📝 STEP 3: UPDATE PROD HASH FILE`)
    console.log(`${'='.repeat(80)}`)

    // Update in-memory prod hashes with dev hashes for successfully published screens
    let updatedCount = 0
    for (const screen of successfulScreens) {
      if (devHashes[screen]) {
        prodHashes[screen] = devHashes[screen]
        updatedCount++
        console.log(`   ✅ ${screen}: ${devHashes[screen].substring(0, 16)}...`)
      } else {
        console.log(`   ⚠️  ${screen}: No dev hash found (screen not in component-hashes.json)`)
      }
    }

    if (updatedCount > 0) {
      // Save updated prod hashes
      saveHashFile(prodHashFile, prodHashes)
      console.log(`\n   📝 Updated ${updatedCount} prod hash(es)`)

      // Keep our new hashes for merge conflict resolution
      const ourNewProdHashes = { ...prodHashes }
      const hashFileName = 'component-hashes-prod.json'

      /**
       * Check if a rebase is currently in progress
       */
      const isRebaseInProgress = () => {
        const gitDir = path.join(projectRootDirForHashes, '.git')
        return fs.existsSync(path.join(gitDir, 'rebase-merge')) || fs.existsSync(path.join(gitDir, 'rebase-apply'))
      }

      /**
       * Abort any in-progress rebase
       */
      const abortRebaseIfNeeded = () => {
        if (isRebaseInProgress()) {
          console.log('   ⚠️  Aborting in-progress rebase...')
          try {
            execSync('git rebase --abort', { cwd: projectRootDirForHashes, stdio: 'pipe' })
          } catch {
            // Ignore errors during abort
          }
        }
      }

      /**
       * Resolve merge conflict in hash file by merging our changes with remote
       */
      const resolveHashConflict = () => {
        console.log('   ⚠️  Rebase conflict detected, merging hashes manually...')

        // During rebase: --ours = remote (origin/main), --theirs = our local changes
        try {
          execSync(`git checkout --ours ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
        } catch {
          console.log('   📄 Remote version not available, using local as base')
        }

        // Load whatever version we have now
        let remoteHashes = {}
        try {
          remoteHashes = loadHashFile(prodHashFile)
        } catch {
          // If file doesn't exist or is invalid, start fresh
        }

        // Merge our new hashes into the remote version
        const mergedHashes = { ...remoteHashes, ...ourNewProdHashes }

        // Save the merged result
        saveHashFile(prodHashFile, mergedHashes)
        console.log(
          `   🔀 Merged ${Object.keys(ourNewProdHashes).length} local hash(es) with ${Object.keys(remoteHashes).length} remote hash(es)`
        )

        // Stage the resolved file
        execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })

        // Continue the rebase
        try {
          execSync('git rebase --continue', {
            cwd: projectRootDirForHashes,
            stdio: 'pipe',
            env: { ...process.env, GIT_EDITOR: 'true' }
          })
        } catch {
          execSync('git -c core.editor=true rebase --continue', { cwd: projectRootDirForHashes, stdio: 'pipe' })
        }

        console.log('   ✅ Conflict resolved and rebase continued')
      }

      // Commit and push to main
      const targetBranch = 'main'

      try {
        configureGit(projectRootDirForHashes, execSync)

        // Get the current branch name
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: projectRootDirForHashes,
          encoding: 'utf8'
        }).trim()
        console.log(`   Current branch: ${currentBranch}`)
        console.log(`   Target branch: ${targetBranch}`)

        // Check if we're already on the target branch
        const needsBranchSwitch = currentBranch !== targetBranch

        if (needsBranchSwitch) {
          console.log(`   📌 Switching from ${currentBranch} to ${targetBranch}...`)

          // Save the hash file content before switching
          const hashFileContent = fs.readFileSync(prodHashFile, 'utf8')

          // Fetch the target branch
          execSync(`git fetch origin ${targetBranch}:${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })

          // Checkout the target branch
          execSync(`git checkout ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })

          // Restore the hash file with our changes
          fs.writeFileSync(prodHashFile, hashFileContent, 'utf8')
          console.log(`   ✅ Switched to ${targetBranch} and restored hash file`)
        }

        execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes })
        execSync(`git commit -m "chore(ci): update prod component hashes [skip ci]"`, {
          cwd: projectRootDirForHashes
        })

        // Pull with rebase and push with retry logic
        let pushSuccess = false
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Check if there's an incomplete rebase from a previous attempt
            if (isRebaseInProgress()) {
              console.log(`   🔄 Attempt ${attempt}/3: Resolving in-progress rebase...`)
              resolveHashConflict()
            } else {
              console.log(`   🔄 Attempt ${attempt}/3: Pulling and rebasing...`)
              execSync(`git pull --rebase origin ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
            }

            // If we got here, rebase succeeded - try to push
            execSync(`git push origin ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
            pushSuccess = true
            console.log(`   ✅ Prod hashes committed and pushed to ${targetBranch}`)
            break
          } catch (error) {
            const errorOutput =
              (error.stdout?.toString() || '') + (error.stderr?.toString() || '') + (error.message || '')

            // Check if this is a rebase conflict or if rebase is in progress
            const isConflict =
              errorOutput.includes('CONFLICT') ||
              errorOutput.includes('Merge conflict') ||
              errorOutput.includes('unmerged files') ||
              errorOutput.includes('fix conflicts') ||
              isRebaseInProgress()

            if (isConflict) {
              try {
                resolveHashConflict()
                // After resolving, try to push
                execSync(`git push origin ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
                pushSuccess = true
                console.log(`   ✅ Prod hashes committed and pushed to ${targetBranch} (after conflict resolution)`)
                break
              } catch (pushError) {
                const pushErrorOutput =
                  (pushError.stdout?.toString() || '') +
                  (pushError.stderr?.toString() || '') +
                  (pushError.message || '')
                if (pushErrorOutput.includes('rejected') || pushErrorOutput.includes('non-fast-forward')) {
                  console.log('   ⚠️  More remote changes detected, retrying...')
                  abortRebaseIfNeeded()
                  execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
                  try {
                    execSync(`git commit -m "chore(ci): update prod component hashes [skip ci]"`, {
                      cwd: projectRootDirForHashes,
                      stdio: 'pipe'
                    })
                  } catch {
                    // Commit might fail if no changes
                  }
                } else {
                  throw pushError
                }
              }
            } else if (attempt < 3) {
              console.log(`   🔄 Push failed (attempt ${attempt}/3), retrying with rebase...`)
              abortRebaseIfNeeded()
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
            } else {
              abortRebaseIfNeeded()
              throw error
            }
          }
        }

        if (!pushSuccess) {
          abortRebaseIfNeeded()
          throw new Error('Failed to push after 3 retries')
        }

        // ---------------------------------------------------------------------
        // ALSO COMMIT & PUSH THE FINAL (PUBLISH-GENERATED) HASH FILE TO develop
        // Requirement: always commit the current state from this publish run,
        // regardless of whatever is currently on develop (overwrite/force file).
        // ---------------------------------------------------------------------
        const developBranch = 'develop'
        try {
          // Capture the final state (may include conflict-resolution merges)
          execSync(`git pull origin ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
          const finalHashFileContent = fs.readFileSync(prodHashFile, 'utf8')

          console.log(`\n   🔁 Also syncing ${hashFileName} back to ${developBranch} (overwrite) ...`)

          // Fetch + checkout develop
          execSync(`git fetch origin ${developBranch}:${developBranch}`, {
            cwd: projectRootDirForHashes,
            stdio: 'pipe'
          })
          execSync(`git checkout ${developBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })

          // Overwrite the file with the publish-generated content (force)
          fs.writeFileSync(prodHashFile, finalHashFileContent, 'utf8')

          // Commit (if there are changes)
          execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
          try {
            execSync(`git commit -m "chore(ci): sync prod component hashes to develop [skip ci]"`, {
              cwd: projectRootDirForHashes,
              stdio: 'pipe'
            })
          } catch {
            // No changes to commit is fine
            console.log(`   ℹ️  No ${hashFileName} changes to commit on ${developBranch}`)
          }

          // Pull with rebase and push with retry logic.
          // If there is a conflict, ALWAYS re-apply the publish-generated file content.
          const resolveHashConflictByOverwriting = () => {
            console.log(
              `   ⚠️  Rebase conflict detected on ${developBranch}, overwriting ${hashFileName} with publish version...`
            )
            fs.writeFileSync(prodHashFile, finalHashFileContent, 'utf8')
            execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
            try {
              execSync('git rebase --continue', {
                cwd: projectRootDirForHashes,
                stdio: 'pipe',
                env: { ...process.env, GIT_EDITOR: 'true' }
              })
            } catch {
              execSync('git -c core.editor=true rebase --continue', { cwd: projectRootDirForHashes, stdio: 'pipe' })
            }
          }

          let developPushSuccess = false
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              if (isRebaseInProgress()) {
                resolveHashConflictByOverwriting()
              } else {
                execSync(`git pull --rebase origin ${developBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
              }

              // Ensure the publish-generated file content wins (even without conflicts)
              fs.writeFileSync(prodHashFile, finalHashFileContent, 'utf8')
              execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
              try {
                execSync(`git commit -m "chore(ci): sync prod component hashes to develop [skip ci]"`, {
                  cwd: projectRootDirForHashes,
                  stdio: 'pipe'
                })
              } catch {
                // No changes after rebase is fine
              }

              execSync(`git push origin ${developBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
              developPushSuccess = true
              console.log(`   ✅ Prod hashes committed and pushed to ${developBranch}`)
              break
            } catch (error) {
              const errorOutput =
                (error.stdout?.toString() || '') + (error.stderr?.toString() || '') + (error.message || '')

              const isConflict =
                errorOutput.includes('CONFLICT') ||
                errorOutput.includes('Merge conflict') ||
                errorOutput.includes('unmerged files') ||
                errorOutput.includes('fix conflicts') ||
                isRebaseInProgress()

              if (isConflict) {
                try {
                  resolveHashConflictByOverwriting()
                  execSync(`git push origin ${developBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
                  developPushSuccess = true
                  console.log(
                    `   ✅ Prod hashes committed and pushed to ${developBranch} (after overwrite conflict resolution)`
                  )
                  break
                } catch {
                  abortRebaseIfNeeded()
                }
              } else if (attempt < 3) {
                abortRebaseIfNeeded()
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
              } else {
                abortRebaseIfNeeded()
                throw error
              }
            }
          }

          if (!developPushSuccess) {
            abortRebaseIfNeeded()
            throw new Error('Failed to push develop hashes after 3 retries')
          }
        } catch (error) {
          abortRebaseIfNeeded()
          console.log(`   ⚠️  Failed to commit/push prod hashes to develop: ${error.message}`)
          console.log('   ℹ️  Screens were published successfully, develop hash sync is non-critical')
        }
      } catch (error) {
        abortRebaseIfNeeded()
        console.log(`   ⚠️  Failed to commit/push prod hashes: ${error.message}`)
        console.log('   ℹ️  Screens were published successfully, hash update is non-critical')
      }
    } else {
      console.log('   ℹ️  No hashes to update')
    }
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
    console.log(`\n⏩ SKIPPED SCREENS (hashes matched):`)
    console.log(`${'='.repeat(50)}`)
    skippedScreens.forEach((skip, index) => {
      console.log(`\n${index + 1}. Screen: ${skip.screen}`)
      console.log(`   Hash: ${skip.hash ? skip.hash.substring(0, 16) + '...' : 'N/A'}`)
      console.log(`   Reason: ${skip.reason}`)
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
