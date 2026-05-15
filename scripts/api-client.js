import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { logAxiosError } from './utils/errorLogger.js'

// Use a module-local client so interceptors never leak globally.
const http = axios.create()

// Centralize HTTP error diagnostics for requests made through this client.
http.interceptors.response.use(
  response => response,
  error => {
    logAxiosError('api-client.http', error)
    return Promise.reject(error)
  }
)

/**
 * OAuth Client for handling authentication and token management
 */
class OAuthClient {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.OAUTH_CLIENT_ID || ''
    this.clientSecret = config.clientSecret || process.env.OAUTH_CLIENT_SECRET || ''
    const keycloakHost = config.oauthUrl || process.env.OAUTH_URL || ''
    const realm = config.realm || process.env.OAUTH_REALM || ''
    this.tokenUrl = `${keycloakHost}/realms/${realm}/protocol/openid-connect/token`
    this.accessToken = null
    this.expiresAt = null // epoch seconds

    if (!this.clientId || !this.clientSecret) {
      throw new Error('OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET not set')
    }
  }

  /**
   * Returns a valid access token, refreshing if needed
   * @returns {Promise<string>} The access token
   */
  async getAccessToken() {
    const now = Math.floor(Date.now() / 1000) // seconds since epoch

    // If token exists and is valid for at least 60 more seconds, use it
    if (this.accessToken && this.expiresAt && this.expiresAt - now > 60) {
      return this.accessToken
    }

    try {
      const params = new URLSearchParams()
      params.append('grant_type', 'client_credentials')
      params.append('client_id', this.clientId)
      params.append('client_secret', this.clientSecret)

      const response = await http.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      this.accessToken = response.data.access_token
      // expires_in is in seconds
      this.expiresAt = now + response.data.expires_in
      return this.accessToken
    } catch (error) {
      logAxiosError('oauth.getAccessToken', error, { tokenUrl: this.tokenUrl })
      throw new Error('Failed to obtain OAuth access token')
    }
  }
}

/**
 * Format path for resource URL
 * @param {string} path - The path to format
 * @returns {Object} Object containing the formatted code and name
 */
function formatPathForResource(path) {
  const segments = path.split('/')
  const code = segments.map(s => s.toLowerCase()).join('-')
  const name = segments
    .map(s => s.toLowerCase())
    .map(s => `${s.charAt(0).toUpperCase()}${s.substring(1)}`)
    .join(' ')

  return { code, name }
}

/**
 * Format screen name from path - extracts only the screen name and converts to Pascal Case
 * @param {string} path - The path to format (e.g., "apps/hr/core/apps/employee-record")
 * @returns {string} Formatted screen name (e.g., "Employee Record")
 */
function formatScreenNameFromPath(path) {
  const segments = path.split('/')
  // Get the last segment which is the actual screen name
  const screenName = segments[segments.length - 1]

  // Convert kebab-case to Pascal Case with spaces
  return screenName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Generate screen key from path - removes "apps" and "forms" segments only from the beginning
 * @param {string} path - The path to format (e.g., "apps/hr/core/apps/employee-record")
 * @returns {string} Screen key (e.g., "url_hr~core~apps~employee-record")
 */
function generateScreenKeyFromPath(path) {
  const segments = path.split('/')

  // Remove "apps" and "forms" segments only from the beginning of the path
  let startIndex = 0
  while (
    startIndex < segments.length &&
    (segments[startIndex].toLowerCase() === 'apps' || segments[startIndex].toLowerCase() === 'forms')
  ) {
    startIndex++
  }

  // Take segments from startIndex onwards and convert to lowercase
  const filteredSegments = segments.slice(startIndex).map(segment => segment.toLowerCase())

  return `url_${filteredSegments.join('~')}`
}

/**
 * Check if a resource URL exists for a given URL path
 * @param {string} urlPath - The URL path to check (e.g., "/platform/apps/hr/core/apps/employee-record")
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<Object|null>} The resource URL object if found, null if not found
 */
async function getResourceUrlByPath(urlPath, apiEndpoint = null, oauthConfig = {}) {
  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const navigationServiceApi = apiEndpoint || process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API
    const endpoint = `${navigationServiceApi}/resource-url`

    const params = {
      search: urlPath,
      limit: 20,
      offset: 0
    }

    const urlParams = new URLSearchParams(params).toString()
    console.log(`Resource URL request: ${endpoint}?${urlParams}`)

    const response = await http.get(endpoint, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`
      },
      params
    })

    let resourceUrls = []
    if (Array.isArray(response.data)) {
      resourceUrls = response.data
    } else if (response.data && Array.isArray(response.data.data)) {
      resourceUrls = response.data.data
    } else if (response.data && response.data.content && Array.isArray(response.data.content)) {
      resourceUrls = response.data.content
    }

    console.log(`Resource URL results: ${resourceUrls.length}`)

    // Look for exact URL match
    const foundResource = resourceUrls.find(resource => resource.url === urlPath)

    if (foundResource) {
      console.log(`Found existing resource URL: ${urlPath}`)
      return foundResource
    } else {
      console.log(`Resource URL not found: ${urlPath}`)
      return null
    }
  } catch (error) {
    logAxiosError('navigation.getResourceUrlByPath', error, { urlPath, apiEndpoint })
    console.error('Failed to check resource URL:', error.message)
    throw error
  }
}

function normalizeFormComponentPath(path) {
  if (!path || typeof path !== 'string') return ''
  return path.replace(/^\/+/, '').trim()
}

/**
 * Whether a screen's formDefinition.componentPath matches any of the normalized path tokens
 * (same logic as publish-prod-screens matching: exact or suffix segment).
 */
function screenMatchesAnyPurgePath(screen, normalizedPaths) {
  const n = normalizeFormComponentPath(screen?.screenComponents?.formDefinition?.componentPath)
  if (!n) return false
  return normalizedPaths.some(p => n === p || n.endsWith(`/${p}`))
}

/** When dev omits namespace fields, match resource-manager native create defaults. */
const DEFAULT_PROD_SYNC_NAMESPACE_CODE = 'nw_dev'
const DEFAULT_PROD_SYNC_NAMESPACE_DESCRIPTION = 'nw_dev'
const DEFAULT_PROD_SYNC_NAMESPACE_ID = '1e6e2926-33f1-4dfb-a3b8-d535602d06b0'

function trimString(value) {
  if (value == null) return ''
  return String(value).trim()
}

/**
 * appId is Lowcoder-only; native NATIVE_SCREEN sync must not send it or DB uniqueness breaks
 * when multiple screenKeys share one componentPath.
 */
function stripAppIdFromScreenComponents(components) {
  if (!components || typeof components !== 'object') return components
  const copy = { ...components }
  delete copy.appId
  return copy
}

/**
 * Shape a dev screen row for prod POST: same fields as resource-manager / platform screen create
 * (explicit top-level + screenComponents; no id/audit/isDeleted; native formDefinition is only path + version).
 * Mirrors ComponentDialog / ActionBundleDialog payload (omit createdAt, updatedAt, createdBy, updatedBy).
 */
function buildNativeProdScreenSyncBody(devScreen, buildVersion) {
  const sc = stripAppIdFromScreenComponents(devScreen.screenComponents || {})
  const fd = sc.formDefinition && typeof sc.formDefinition === 'object' ? sc.formDefinition : {}
  const componentPath = fd.componentPath != null ? String(fd.componentPath) : ''
  const screenKey = devScreen.screenKey != null ? String(devScreen.screenKey) : ''
  const nsCode = trimString(devScreen.namespaceCode)
  const nsDesc = trimString(devScreen.namespaceDescription)
  const nsId = trimString(devScreen.namespaceId)
  return {
    name: devScreen.name != null ? String(devScreen.name) : '',
    screenKey,
    namespaceCode: nsCode || DEFAULT_PROD_SYNC_NAMESPACE_CODE,
    namespaceId: nsId || DEFAULT_PROD_SYNC_NAMESPACE_ID,
    namespaceDescription: nsDesc || DEFAULT_PROD_SYNC_NAMESPACE_DESCRIPTION,
    type: devScreen.type || 'SCREEN',
    screenComponents: {
      key: sc.key != null ? String(sc.key) : screenKey,
      name: sc.name != null ? String(sc.name) : devScreen.name != null ? String(devScreen.name) : '',
      builderType: 'NATIVE_SCREEN',
      formDefinition: {
        componentPath,
        version: buildVersion != null ? String(buildVersion) : ''
      }
    }
  }
}

/**
 * Delete prod NATIVE_SCREEN rows before comprehensive sync (union):
 * - `formDefinition.componentPath` matches any normalized path from dev, OR
 * - `screenKey` is in `screenKeysToPurge` (dev keys for this publish batch).
 *
 * Screen-management enforces unique `screenKey` on create (`ApplicationScreenValidator.validateUniqueFields` /
 * `existsByScreenKey`); purge-by-key clears prod rows whose path did not match the path filter.
 *
 * @param {string[]} normalizedPaths - paths without leading slash (e.g. hr/core/forms/foo)
 * @param {string} prodScreenManagementApi
 * @param {Object} prodOauthConfig
 * @param {string[]|null} screenKeysToPurge - dev screenKeys for this batch (optional)
 * @returns {{ deleted: number, matched: number }}
 */
async function deleteProdNativeScreensByComponentPaths(
  normalizedPaths,
  prodScreenManagementApi,
  prodOauthConfig,
  screenKeysToPurge = null
) {
  const paths = [...new Set((normalizedPaths || []).map(normalizeFormComponentPath).filter(Boolean))]
  const keySet = new Set((screenKeysToPurge || []).map(k => String(k || '').trim()).filter(Boolean))

  if (paths.length === 0 && keySet.size === 0) return { deleted: 0, matched: 0 }

  const allProd = await getAllNativeScreens(prodScreenManagementApi, prodOauthConfig)
  const matched = allProd.filter(s => {
    const key = s.screenKey ? String(s.screenKey).trim() : ''
    if (key && keySet.has(key)) return true
    if (paths.length > 0 && screenMatchesAnyPurgePath(s, paths)) return true
    return false
  })
  let deleted = 0
  for (const screen of matched) {
    await deleteScreenInScreenManagement(screen.id, prodScreenManagementApi, prodOauthConfig)
    deleted++
    console.log(`   Purged prod screen screenKey=${screen.screenKey} id=${screen.id}`)
  }
  return { deleted, matched: matched.length }
}

/**
 * Delete a screen by ID in Screen Management
 * @param {string} screenId
 * @param {string} apiEndpoint
 * @param {Object} oauthConfig
 */
async function deleteScreenInScreenManagement(screenId, apiEndpoint = null, oauthConfig = {}) {
  const oauthClient = new OAuthClient(oauthConfig)
  const accessToken = await oauthClient.getAccessToken()
  const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API

  await http.delete(`${screenManagementApi}/screen/${screenId}`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`
    }
  })
}

/**
 * Add an app resource URL to Navigation service
 * @param {string} azureDestinationPath - The path where the app is deployed
 * @param {boolean} addIfExistsResponse - Whether to respond if the URL exists
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<void>}
 */
async function addAppResourceUrl(
  azureDestinationPath,
  addIfExistsResponse = true,
  apiEndpoint = null,
  oauthConfig = {}
) {
  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const navigationServiceApi = apiEndpoint || process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API

    const { code, name } = formatPathForResource(azureDestinationPath)

    const payload = {
      code: code,
      name: name,
      url: `/platform/apps/${azureDestinationPath}`,
      roles: [],
      features: [],
      name_i18n: {},
      description_i18n: {},
      isSearchable: false
    }

    try {
      await http.post(`${navigationServiceApi}/resource-url`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`Resource URL added successfully: ${payload.url}`)
    } catch {
      if (addIfExistsResponse) {
        console.log(`Possible error, or resource URL already exists for: ${payload.url}`)
      }
    }
  } catch (error) {
    logAxiosError('navigation.addAppResourceUrl', error, { azureDestinationPath, apiEndpoint })
    console.error('Failed to add resource URL:', error.message)
    throw error
  }
}

/**
 * Add a custom resource URL to Navigation service
 * @param {string} customUrlPath - The custom URL path provided by user
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<void>}
 */
async function addCustomResourceUrl(customUrlPath, apiEndpoint = null, oauthConfig = {}) {
  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const navigationServiceApi = apiEndpoint || process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API

    const { code, name } = formatPathForResource(customUrlPath)

    const payload = {
      code: code,
      name: name,
      url: `/platform/${customUrlPath}`,
      roles: [],
      features: [],
      name_i18n: {},
      description_i18n: {},
      isSearchable: false
    }

    try {
      await http.post(`${navigationServiceApi}/resource-url`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`Custom resource URL added successfully: ${payload.url}`)
      return true
    } catch {
      console.log(`Possible error, or custom resource URL might already exist for: ${payload.url}`)
      return true
    }
  } catch (error) {
    logAxiosError('navigation.addCustomResourceUrl', error, { customUrlPath, apiEndpoint })
    console.error('Failed to add custom resource URL:', error.message)
    throw error
  }
}

/**
 * Add screen configuration to Screen Management service
 * @param {string} azureDestinationPath - The path where the app is deployed
 * @param {string} customUrlPath - The custom URL path provided by user
 * @param {string} buildNumber - The build number to use as version (optional, defaults to empty string)
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<string>} The generated UUID if successful, null if failed
 */
async function addScreenConfigToScreenManagement(
  azureDestinationPath,
  customUrlPath,
  buildNumber = '',
  apiEndpoint = null,
  oauthConfig = {},
  options = {}
) {
  const generatedId = uuidv4()

  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API

    // Use new helper functions for proper screen naming and key generation
    const name = options.nameOverride || formatScreenNameFromPath(customUrlPath)
    const screenKey = options.screenKeyOverride || generateScreenKeyFromPath(customUrlPath)

    const payload = {
      id: options.idOverride || generatedId,
      name: name,
      screenKey: screenKey,
      namespaceCode: options.namespace?.namespaceCode || 'nw_dev',
      namespaceId: options.namespace?.namespaceId || '1e6e2926-33f1-4dfb-a3b8-d535602d06b0',
      namespaceDescription: options.namespace?.namespaceDescription || 'nw_dev',
      type: 'SCREEN',
      screenComponents: {
        appName: name,
        builderType: 'NATIVE_SCREEN',
        key: screenKey,
        name: name,
        flowIcon: '',
        formDefinition: {
          componentPath: `/${azureDestinationPath}`,
          version: buildNumber
        },
        release: buildNumber || 'false'
      }
    }

    try {
      await http.post(`${screenManagementApi}/screen`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`Screen config added successfully for ${customUrlPath}`)
      return { success: true, id: generatedId }
    } catch {
      console.log(`Possible error, or screen config already exists for ${customUrlPath}`)
      return { success: false, id: generatedId }
    }
  } catch (error) {
    logAxiosError('screenManagement.addScreenConfigToScreenManagement', error, {
      azureDestinationPath,
      customUrlPath,
      apiEndpoint
    })
    console.error('Failed to add screen config:', error.message)
    throw error
  }
}

/**
 * Get screen configuration by screen key from Screen Management service
 * @param {string} screenKey - The screen key to search for
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<Object|null>} The screen object if found, null if not found
 */
async function getScreenByKey(screenKey, apiEndpoint = null, oauthConfig = {}) {
  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API

    const response = await http.get(`${screenManagementApi}/screen`, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`
      },
      params: {
        screenKey: screenKey,
        sort: 'updatedAt',
        order: 'DESC',
        limit: 10,
        offset: 0
      }
    })

    if (response.data && response.data.data && response.data.data.length > 0) {
      const screen = response.data.data.find(s => s.screenKey === screenKey)
      if (screen) {
        if (screen.screenComponents?.builderType === 'NATIVE_SCREEN') {
          console.log(`Found existing native screen with key: ${screenKey}, ID: ${screen.id}`)
          return screen
        }
        console.log(
          `Found existing non-native screen with key: ${screenKey}, ID: ${screen.id}, returning to process update`
        )
        return screen
      }
    }

    console.log(`Screen not found for key: ${screenKey}`)
    return null
  } catch (error) {
    logAxiosError('screenManagement.getScreenByKey', error, { screenKey, apiEndpoint })
    console.error('Failed to get screen by key:', error.message)
    throw error
  }
}

/**
 * Update screen configuration in Screen Management service
 * @param {string} screenId - The ID of the screen to update
 * @param {Object} updateData - The screen data to update
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<boolean>} Whether the update was successful
 */
async function updateScreenConfigInScreenManagement(screenId, updateData, apiEndpoint = null, oauthConfig = {}) {
  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API

    // Ensure required fields are present
    const payload = {
      id: screenId,
      namespaceId: updateData.namespaceId,
      namespaceCode: updateData.namespaceCode,
      screenKey: updateData.screenKey,
      name: updateData.name,
      namespaceDescription: updateData.namespaceDescription,
      createdAt: updateData.createdAt,
      createdBy: updateData.createdBy,
      updatedBy: updateData.updatedBy,
      updatedAt: updateData.updatedAt || new Date().toISOString(),
      isDeleted: updateData.isDeleted || false,
      type: updateData.type || 'SCREEN',
      screenComponents: {
        key: updateData.screenComponents?.key,
        name: updateData.screenComponents?.name,
        builderType: updateData.screenComponents?.builderType || 'NATIVE_SCREEN',
        appId: updateData.screenComponents?.appId,
        appName: updateData.screenComponents?.appName,
        formDefinition: updateData.screenComponents?.formDefinition || {},
        flowIcon: updateData.screenComponents?.flowIcon || '',
        release: updateData.screenComponents?.release || 'true'
      }
    }

    try {
      await http.put(`${screenManagementApi}/screen/${screenId}`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`Screen config updated successfully for ID: ${screenId}`)
      return true
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`Screen config not found for ID: ${screenId}`)
      } else {
        console.log(`Error updating screen config for ID: ${screenId}`, error.message)
      }
      return false
    }
  } catch (error) {
    logAxiosError('screenManagement.updateScreenConfigInScreenManagement', error, { screenId, apiEndpoint })
    console.error('Failed to update screen config:', error.message)
    throw error
  }
}

/**
 * Update screen configuration with detailed result
 * @returns {Promise<{success:boolean,status?:number,message?:string}>}
 */
async function updateScreenConfigInScreenManagementDetailed(
  screenId,
  updateData,
  apiEndpoint = null,
  oauthConfig = {}
) {
  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API

    const payload = {
      id: screenId,
      namespaceId: updateData.namespaceId,
      namespaceCode: updateData.namespaceCode,
      screenKey: updateData.screenKey,
      name: updateData.name,
      namespaceDescription: updateData.namespaceDescription,
      createdAt: updateData.createdAt,
      createdBy: updateData.createdBy,
      updatedBy: updateData.updatedBy,
      updatedAt: updateData.updatedAt || new Date().toISOString(),
      isDeleted: updateData.isDeleted || false,
      type: updateData.type || 'SCREEN',
      screenComponents: {
        key: updateData.screenComponents?.key,
        name: updateData.screenComponents?.name,
        builderType: updateData.screenComponents?.builderType || 'NATIVE_SCREEN',
        appId: updateData.screenComponents?.appId,
        appName: updateData.screenComponents?.appName,
        formDefinition: updateData.screenComponents?.formDefinition || {},
        flowIcon: updateData.screenComponents?.flowIcon || '',
        release: updateData.screenComponents?.release || 'true'
      }
    }

    try {
      await http.put(`${screenManagementApi}/screen/${screenId}`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`Screen config updated successfully for ID: ${screenId}`)
      return { success: true }
    } catch (error) {
      const status = error?.response?.status
      const message = error?.response?.data?.message || error.message
      if (status === 404) {
        console.log(`Screen config not found for ID: ${screenId}`)
      } else {
        console.log(`Error updating screen config for ID: ${screenId}`, message)
      }
      return { success: false, status, message }
    }
  } catch (error) {
    logAxiosError('screenManagement.updateScreenConfigInScreenManagementDetailed', error, { screenId, apiEndpoint })
    console.error('Failed to update screen config (detailed):', error.message)
    return { success: false, message: error.message }
  }
}

/**
 * Convert camelCase to natural language with spaces
 * @param {string} camelCase - The camelCase string to convert
 * @returns {string} Natural language with spaces
 */
function camelCaseToNaturalLanguageWithWhiteSpaces(camelCase) {
  if (!camelCase) return ''

  // Replace camelCase with spaces and capitalize first letter
  const withSpaces = camelCase.replace(/([A-Z])/g, ' $1').trim()
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

/**
 * Add form as a landing screen to Screen Management
 * @param {string} processName - Process name in camelCase
 * @param {string} azureDestinationPath - The path where the form is deployed
 * @param {string} buildNumber - The build number to use as version (optional, defaults to empty string)
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<string>} - The generated UUID if successful, null if failed
 */
async function addFormAsLandingScreen(
  processName,
  azureDestinationPath,
  buildNumber = '',
  apiEndpoint = null,
  oauthConfig = {},
  options = {}
) {
  const generatedId = uuidv4()

  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API

    const name = camelCaseToNaturalLanguageWithWhiteSpaces(processName)
    const screenKey = options.screenKeyOverride || `frm_${processName}`

    const payload = {
      id: options.idOverride || generatedId,
      name: name,
      screenKey: screenKey,
      namespaceCode: options.namespace?.namespaceCode || 'nw_dev',
      namespaceId: options.namespace?.namespaceId || '1e6e2926-33f1-4dfb-a3b8-d535602d06b0',
      namespaceDescription: options.namespace?.namespaceDescription || 'nw_dev',
      type: 'SCREEN',
      screenComponents: {
        appName: name,
        builderType: 'NATIVE_SCREEN',
        key: screenKey,
        name: name,
        flowIcon: '',
        formDefinition: {
          componentPath: `/${azureDestinationPath}`,
          version: buildNumber
        },
        release: 'true'
      }
    }

    console.log('Posting form as landing screen to screen management API...')

    try {
      // Similar pattern to existing API calls
      await http.post(`${screenManagementApi}/screen`, payload, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      console.log(`Successfully added landing screen with ID: ${generatedId}`)
      return { success: true, id: generatedId }
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 409) {
        console.log('Screen config already exists. Continuing...')
        return { success: false, id: generatedId }
      }
      throw apiError // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    logAxiosError('screenManagement.addFormAsLandingScreen', error, { processName, azureDestinationPath, apiEndpoint })
    console.error('Failed to add landing screen to screen management:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    return { success: false, id: generatedId }
  }
}

/**
 * Add form as a user task screen to Screen Management
 * @param {string} processName - Process name in camelCase
 * @param {string} taskName - Task name in camelCase
 * @param {string} azureDestinationPath - The path where the form is deployed
 * @param {string} buildNumber - The build number to use as version (optional, defaults to empty string)
 * @returns {Promise<string|null>} - The generated UUID if successful, null if failed
 */
async function addFormAsUserTaskScreen(processName, taskName, azureDestinationPath, buildNumber = '') {
  try {
    const oauthClient = new OAuthClient()
    const accessToken = await oauthClient.getAccessToken()
    const apiEndpoint = process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API

    const name1 = camelCaseToNaturalLanguageWithWhiteSpaces(processName)
    const name2 = camelCaseToNaturalLanguageWithWhiteSpaces(taskName)
    const name = `${name1} - ${name2}`

    const screenKey = `frm_${processName}${taskName.charAt(0).toUpperCase() + taskName.slice(1)}`

    const generatedId = uuidv4()
    const payload = {
      id: generatedId,
      name: name,
      screenKey: screenKey,
      namespaceCode: 'nw_dev',
      namespaceId: '1e6e2926-33f1-4dfb-a3b8-d535602d06b0',
      namespaceDescription: 'nw_dev',
      type: 'SCREEN',
      screenComponents: {
        appName: name,
        builderType: 'NATIVE_SCREEN',
        key: screenKey,
        name: name,
        flowIcon: '',
        formDefinition: {
          componentPath: `/${azureDestinationPath}`,
          version: buildNumber
        },
        release: 'true'
      }
    }

    console.log('Posting form as user task screen to screen management API...')

    try {
      // Similar pattern to existing API calls
      await http.post(`${apiEndpoint}/screen`, payload, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      console.log(`Successfully added user task screen with ID: ${generatedId}`)
      return generatedId
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 409) {
        console.log('Screen config already exists. Continuing...')
        return null
      }
      throw apiError // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    logAxiosError('screenManagement.addFormAsUserTaskScreen', error, { processName, taskName, azureDestinationPath })
    console.error('Failed to add user task screen to screen management:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
    return null
  }
}

/**
 * Get all NATIVE_SCREEN screens from Screen Management service with pagination
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @returns {Promise<Array>} Array of all NATIVE_SCREEN application screen objects
 */
async function getAllNativeScreens(apiEndpoint = null, oauthConfig = {}) {
  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const screenManagementApi = apiEndpoint || process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API

    let allScreens = []
    let offset = 0
    const limit = 100
    let hasMore = true

    console.log('Fetching all NATIVE_SCREEN screens...')

    while (hasMore) {
      try {
        const response = await http.get(`${screenManagementApi}/screen`, {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${accessToken}`
          },
          params: {
            builderType: 'NATIVE_SCREEN',
            limit: limit,
            offset: offset,
            returnTotalRecords: offset === 0 // Only get total on first request
          }
        })

        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const screens = response.data.data
          allScreens = allScreens.concat(screens)

          // Check if we have more data
          if (screens.length < limit) {
            hasMore = false
          } else {
            offset += limit
          }
        } else {
          hasMore = false
        }
      } catch (error) {
        logAxiosError('screenManagement.getAllNativeScreens.batch', error, { offset, limit, screenManagementApi })
        console.error(`Failed to fetch screens at offset ${offset}:`, error.message)
        throw error
      }
    }

    console.log(`Successfully fetched ${allScreens.length} total NATIVE_SCREEN screens`)
    return allScreens
  } catch (error) {
    logAxiosError('screenManagement.getAllNativeScreens', error, { apiEndpoint })
    console.error('Failed to get all native screens:', error.message)
    throw error
  }
}

/**
 * Convert screen key to platform URL
 * @param {string} screenKey - The screen key (e.g., "url_path1~path2~path3")
 * @returns {string|null} Platform URL (e.g., "/platform/path1/path2/path3") or null if invalid
 */
function convertScreenKeyToUrl(screenKey) {
  if (!screenKey || typeof screenKey !== 'string') {
    return null
  }

  // Check if screenKey starts with "url_"
  if (!screenKey.startsWith('url_')) {
    return null
  }

  // Remove "url_" prefix and split by "~"
  const pathParts = screenKey.substring(4).split('~')

  // Join path parts and add /platform prefix
  const url = `/platform/${pathParts.join('/')}`

  return url
}

/**
 * Sync resource URL from dev to prod with same ID
 * @param {Object} devResourceUrl - The resource URL object from dev environment
 * @param {string} prodNavigationApi - Production navigation API endpoint
 * @param {Object} prodOauthConfig - Production OAuth configuration
 * @returns {Promise<Object>} Result object with success status and operation type
 */
async function syncResourceUrlWithSameId(devResourceUrl, prodNavigationApi, prodOauthConfig) {
  try {
    const oauthClient = new OAuthClient(prodOauthConfig)
    const accessToken = await oauthClient.getAccessToken()

    // Check if resource URL already exists in prod
    console.log(`   Checking if resource URL exists in prod: ${devResourceUrl.url}`)
    const existingProdResourceUrl = await getResourceUrlByPath(devResourceUrl.url, prodNavigationApi, prodOauthConfig)

    if (existingProdResourceUrl) {
      console.log(`   Resource URL already exists in prod (ID: ${existingProdResourceUrl.id})`)
      return { success: true, operation: 'exists', resourceUrl: devResourceUrl }
    }

    // Create payload with same ID as dev
    const payload = {
      id: devResourceUrl.id, // Use same ID from dev
      code: devResourceUrl.code,
      name: devResourceUrl.name,
      url: devResourceUrl.url,
      roles: devResourceUrl.roles || [],
      features: devResourceUrl.features || [],
      name_i18n: devResourceUrl.name_i18n || {},
      description_i18n: devResourceUrl.description_i18n || {},
      isSearchable: devResourceUrl.isSearchable || false
    }

    console.log(`   Creating resource URL in prod with same ID: ${devResourceUrl.id}`)
    await http.post(`${prodNavigationApi}/resource-url`, payload, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      }
    })

    console.log(`   Resource URL synced to prod with same ID: ${devResourceUrl.url}`)
    return { success: true, operation: 'created', resourceUrl: devResourceUrl }
  } catch (error) {
    logAxiosError('navigation.syncResourceUrlWithSameId', error, {
      prodNavigationApi,
      resourceUrl: devResourceUrl?.url
    })
    console.error(`   Failed to sync resource URL to prod: ${error.message}`)
    return { success: false, operation: 'error', error: error.message, resourceUrl: devResourceUrl }
  }
}

/**
 * Sync screen from dev to prod: POST create only.
 * Callers must purge prod first (path ∪ screenKey) so `screenKey` is free; see `deleteProdNativeScreensByComponentPaths`.
 *
 * @param {Object} devScreen - The screen object from dev environment
 * @param {string} prodScreenManagementApi - Production screen management API endpoint
 * @param {Object} prodOauthConfig - Production OAuth configuration
 * @param {string} buildVersion - Build version to use
 * @returns {Promise<Object>} Result object with success status and operation type
 */
async function syncScreenFromDevToProd(devScreen, prodScreenManagementApi, prodOauthConfig, buildVersion) {
  try {
    const oauthClient = new OAuthClient(prodOauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const syncBody = buildNativeProdScreenSyncBody(devScreen, buildVersion)

    console.log(`   Creating screen in prod: ${devScreen.screenKey}`)

    let lastCreateError = null
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`   Retrying create in prod (attempt ${attempt}/2): ${devScreen.screenKey}`)
        }
        await http.post(`${prodScreenManagementApi}/screen`, syncBody, {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json'
          }
        })

        console.log(`   Screen written in prod (create): ${devScreen.screenKey}`)
        return { success: true, operation: 'create', screenId: devScreen.id }
      } catch (error) {
        lastCreateError = error
        logAxiosError('screenManagement.syncScreenFromDevToProd.create', error, {
          screenKey: devScreen.screenKey,
          prodScreenManagementApi,
          attempt
        })
        if (attempt < 2) continue
      }
    }

    console.error(`   Failed to create screen in prod after 2 attempts: ${lastCreateError?.message}`)
    return { success: false, operation: 'create', error: lastCreateError?.message }
  } catch (error) {
    logAxiosError('screenManagement.syncScreenFromDevToProd', error, {
      screenKey: devScreen?.screenKey,
      prodScreenManagementApi
    })
    console.error(`   Error syncing screen to prod: ${error.message}`)
    return { success: false, operation: 'error', error: error.message }
  }
}

export {
  OAuthClient,
  getResourceUrlByPath,
  addAppResourceUrl,
  addCustomResourceUrl,
  addScreenConfigToScreenManagement,
  updateScreenConfigInScreenManagement,
  getScreenByKey,
  addFormAsLandingScreen,
  addFormAsUserTaskScreen,
  formatScreenNameFromPath,
  generateScreenKeyFromPath,
  getAllNativeScreens,
  convertScreenKeyToUrl,
  syncResourceUrlWithSameId,
  syncScreenFromDevToProd,
  deleteProdNativeScreensByComponentPaths,
  // helpers for prod publish
  deleteScreenInScreenManagement,
  updateScreenConfigInScreenManagementDetailed
}
