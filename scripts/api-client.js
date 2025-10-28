import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

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

      const response = await axios.post(this.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      this.accessToken = response.data.access_token
      // expires_in is in seconds
      this.expiresAt = now + response.data.expires_in
      return this.accessToken
    } catch (error) {
      console.error('Error fetching OAuth token:', error)
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
 * Get resource URLs from Navigation service
 * @param {string} apiEndpoint - The API endpoint to use (optional, defaults to dev endpoint)
 * @param {Object} oauthConfig - OAuth configuration for production (optional)
 * @param {Object} searchParams - Search parameters (optional)
 * @param {string} searchParams.search - Search term to filter by URL or title
 * @param {string} searchParams.sort - Comma-separated list of fields to define the sort order
 * @returns {Promise<Array>} Array of resource URL objects
 */
async function getResourceUrls(apiEndpoint = null, oauthConfig = {}, searchParams = {}) {
  try {
    const oauthClient = new OAuthClient(oauthConfig)
    const accessToken = await oauthClient.getAccessToken()
    const navigationServiceApi = apiEndpoint || process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API

    // Use search endpoint if search parameters are provided
    const endpoint =
      searchParams.search || searchParams.sort
        ? `${navigationServiceApi}/resource-url/search`
        : `${navigationServiceApi}/resource-url`

    // Build query parameters
    const params = {}
    if (searchParams.search) {
      params.search = searchParams.search
    }
    if (searchParams.sort) {
      params.sort = searchParams.sort
    }

    // Build the full URL with parameters for logging
    const urlParams = new URLSearchParams(params).toString()
    const fullUrl = urlParams ? `${endpoint}?${urlParams}` : endpoint
    console.log('🔍 Full resource request URL:', fullUrl)

    const response = await axios.get(endpoint, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`
      },
      params: params
    })

    // Handle different response structures
    let results = []
    if (Array.isArray(response.data)) {
      results = response.data
    } else if (response.data && Array.isArray(response.data.data)) {
      results = response.data.data
    } else if (response.data && response.data.content && Array.isArray(response.data.content)) {
      results = response.data.content
    }

    console.log('🔍 Results count:', results.length)

    return results
  } catch (error) {
    console.error('❌ Failed to get resource URLs:', error.message)
    throw error
  }
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
    // Extract just the path part for searching (remove /platform/ prefix)
    const searchTerm = urlPath.replace(/^\/platform\//, '')

    // Use search to find the specific resource URL
    const resourceUrls = await getResourceUrls(apiEndpoint, oauthConfig, {
      search: searchTerm,
      sort: '-updatedAt'
    })

    // Look for exact URL match
    const foundResource = resourceUrls.find(resource => resource.url === urlPath)

    if (foundResource) {
      console.log(`🔍 Found existing resource URL: ${urlPath}`)
      return foundResource
    } else {
      console.log(`🔍 Resource URL not found: ${urlPath} (searched for: ${searchTerm})`)
      return null
    }
  } catch (error) {
    console.error('❌ Failed to check resource URL:', error.message)
    throw error
  }
}

/**
 * Helper to detect LOWCODER screens by builderType
 * @param {Object} screen
 * @returns {boolean}
 */
function isLowcoderScreen(screen) {
  const type = (screen?.screenComponents?.builderType || '').toUpperCase()
  return type === 'LOWCODER'
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

  await axios.delete(`${screenManagementApi}/screen/${screenId}`, {
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
      await axios.post(`${navigationServiceApi}/resource-url`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`✅ Resource URL added successfully: ${payload.url}`)
    } catch {
      if (addIfExistsResponse) {
        console.log(`ℹ️ Possible Error. Or Resource URL already exists for: ${payload.url}`)
      }
    }
  } catch (error) {
    console.error('❌ Failed to add resource URL:', error.message)
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
      await axios.post(`${navigationServiceApi}/resource-url`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`✅ Custom resource URL added successfully: ${payload.url}`)
      return true
    } catch {
      console.log(`ℹ️ Possible Error. Or Custom resource URL migth already exist for: ${payload.url}`)
      return true
    }
  } catch (error) {
    console.error('❌ Failed to add custom resource URL:', error.message)
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
      await axios.post(`${screenManagementApi}/screen`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`✅ Screen config added successfully for ${customUrlPath}`)
      return { success: true, id: generatedId }
    } catch {
      console.log(`ℹ️ Possible Error. Or Screen config already exists for ${customUrlPath}`)
      return { success: false, id: generatedId }
    }
  } catch (error) {
    console.error('❌ Failed to add screen config:', error.message)
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

    try {
      const response = await axios.get(`${screenManagementApi}/screen`, {
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
            console.log(`🔍 Found existing native screen with key: ${screenKey}, ID: ${screen.id}`)
            return screen
          } else {
            console.log(
              `🔍 Found existing non-native screen with key: ${screenKey}, ID: ${screen.id}, returning to process an update`
            )
            return screen
          }
        }
      }

      console.log(`🔍 Screen not found for key: ${screenKey}`)
      return null
    } catch (error) {
      console.error(`❌ Failed to get screen by key: ${screenKey}`, error.message)
      throw error
    }
  } catch (error) {
    console.error('❌ Failed to get screen by key:', error.message)
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
      await axios.put(`${screenManagementApi}/screen/${screenId}`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`✅ Screen config updated successfully for ID: ${screenId}`)
      return true
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`❌ Screen config not found for ID: ${screenId}`)
      } else {
        console.log(`❌ Error updating screen config for ID: ${screenId}`, error.message)
      }
      return false
    }
  } catch (error) {
    console.error('❌ Failed to update screen config:', error.message)
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
      await axios.put(`${screenManagementApi}/screen/${screenId}`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })
      console.log(`✅ Screen config updated successfully for ID: ${screenId}`)
      return { success: true }
    } catch (error) {
      const status = error?.response?.status
      const message = error?.response?.data?.message || error.message
      if (status === 404) {
        console.log(`❌ Screen config not found for ID: ${screenId}`)
      } else {
        console.log(`❌ Error updating screen config for ID: ${screenId}`, message)
      }
      return { success: false, status, message }
    }
  } catch (error) {
    console.error('❌ Failed to update screen config (detailed):', error.message)
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

    console.log('📤 Posting form as landing screen to screen management API...')

    try {
      // Similar pattern to existing API calls
      await axios.post(`${screenManagementApi}/screen`, payload, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      console.log(`✅ Successfully added landing screen with ID: ${generatedId}`)
      return { success: true, id: generatedId }
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 409) {
        console.log('⚠️ Screen config already exists. Continuing...')
        return { success: false, id: generatedId }
      }
      throw apiError // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error('❌ Failed to add landing screen to screen management:', error.message)
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

    console.log('📤 Posting form as user task screen to screen management API...')

    try {
      // Similar pattern to existing API calls
      await axios.post(`${apiEndpoint}/screen`, payload, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      console.log(`✅ Successfully added user task screen with ID: ${generatedId}`)
      return generatedId
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 409) {
        console.log('⚠️ Screen config already exists. Continuing...')
        return null
      }
      throw apiError // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error('❌ Failed to add user task screen to screen management:', error.message)
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

    console.log('🔍 Fetching all NATIVE_SCREEN screens with pagination...')

    while (hasMore) {
      console.log(`   Fetching screens: offset=${offset}, limit=${limit}`)

      try {
        const response = await axios.get(`${screenManagementApi}/screen`, {
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

          console.log(`   Found ${screens.length} screens in this batch`)

          // Check if we have more data
          if (screens.length < limit) {
            hasMore = false
          } else {
            offset += limit
          }

          // Log total on first request
          if (offset === limit && response.data.paging && response.data.paging.totalRecords) {
            console.log(`   Total NATIVE_SCREEN screens available: ${response.data.paging.totalRecords}`)
          }
        } else {
          console.log('   No screens data in response')
          hasMore = false
        }
      } catch (error) {
        console.error(`❌ Failed to fetch screens at offset ${offset}:`, error.message)
        throw error
      }
    }

    console.log(`✅ Successfully fetched ${allScreens.length} total NATIVE_SCREEN screens`)
    return allScreens
  } catch (error) {
    console.error('❌ Failed to get all native screens:', error.message)
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
      console.log(`   ✅ Resource URL already exists in prod (ID: ${existingProdResourceUrl.id})`)
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
    await axios.post(`${prodNavigationApi}/resource-url`, payload, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      }
    })

    console.log(`   ✅ Resource URL synced to prod with same ID: ${devResourceUrl.url}`)
    return { success: true, operation: 'created', resourceUrl: devResourceUrl }
  } catch (error) {
    console.error(`   ❌ Failed to sync resource URL to prod: ${error.message}`)
    return { success: false, operation: 'error', error: error.message, resourceUrl: devResourceUrl }
  }
}

/**
 * Sync screen from dev to prod environment
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

    // Check if screen already exists in prod
    console.log(`   Checking if screen exists in prod: ${devScreen.screenKey}`)
    const existingProdScreen = await getScreenByKey(devScreen.screenKey, prodScreenManagementApi, prodOauthConfig)

    if (existingProdScreen) {
      // Strict LOWCODER detection and deletion
      if (isLowcoderScreen(existingProdScreen)) {
        console.log('   🔎 LOWCODER screen detected - deleting before recreation')
        await deleteScreenInScreenManagement(existingProdScreen.id, prodScreenManagementApi, prodOauthConfig)

        // Build minimal creation payload without reusing dev ID to avoid server-side conflicts
        const recreatePayload = {
          name: devScreen.name,
          screenKey: devScreen.screenKey,
          namespaceId: devScreen.namespaceId,
          namespaceCode: devScreen.namespaceCode,
          namespaceDescription: devScreen.namespaceDescription,
          type: 'SCREEN',
          screenComponents: {
            appName: devScreen.screenComponents?.appName || devScreen.name,
            builderType: 'NATIVE_SCREEN',
            key: devScreen.screenKey,
            name: devScreen.name,
            flowIcon: devScreen.screenComponents?.flowIcon || '',
            formDefinition: {
              componentPath: devScreen.screenComponents?.formDefinition?.componentPath,
              version: buildVersion
            },
            release: 'true'
          }
        }

        try {
          // short delay to let deletion complete server-side
          await new Promise(r => setTimeout(r, 300))
          await axios.post(`${prodScreenManagementApi}/screen`, recreatePayload, {
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${accessToken}`,
              'content-type': 'application/json'
            }
          })
          console.log(`   ✅ Screen recreated in prod as NATIVE_SCREEN: ${devScreen.screenKey}`)
          return { success: true, operation: 'create', screenId: devScreen.id }
        } catch (error) {
          console.error(`   ❌ Failed to recreate screen in prod: ${error.message}`)
          return { success: false, operation: 'create', error: error.message }
        }
      }

      console.log(`   📝 Screen exists in prod (ID: ${existingProdScreen.id}), updating version to ${buildVersion}`)

      const updateData = {
        ...devScreen,
        // Overwrite namespace with source (dev)
        namespaceId: devScreen.namespaceId,
        namespaceCode: devScreen.namespaceCode,
        namespaceDescription: devScreen.namespaceDescription,
        screenComponents: {
          ...devScreen.screenComponents,
          builderType: 'NATIVE_SCREEN',
          formDefinition: {
            ...devScreen.screenComponents.formDefinition,
            version: buildVersion
          },
          release: 'true'
        }
      }

      const updateResult = await updateScreenConfigInScreenManagementDetailed(
        existingProdScreen.id,
        updateData,
        prodScreenManagementApi,
        prodOauthConfig
      )

      if (updateResult.success) {
        console.log(`   ✅ Screen updated in prod: ${devScreen.screenKey}`)
        return { success: true, operation: 'update', screenId: existingProdScreen.id }
      }

      const message = (updateResult.message || '').toLowerCase()
      if ([400, 409, 422].includes(updateResult.status) || message.includes('namespace')) {
        console.log('   🔁 Update failed due to namespace mismatch → deleting and recreating')
        try {
          await deleteScreenInScreenManagement(existingProdScreen.id, prodScreenManagementApi, prodOauthConfig)
          // Create without reusing dev ID or extra metadata
          const createPayload = {
            name: updateData.name,
            screenKey: updateData.screenKey,
            namespaceId: updateData.namespaceId,
            namespaceCode: updateData.namespaceCode,
            namespaceDescription: updateData.namespaceDescription,
            type: 'SCREEN',
            screenComponents: {
              appName: updateData.screenComponents?.appName || updateData.name,
              builderType: 'NATIVE_SCREEN',
              key: updateData.screenComponents?.key || updateData.screenKey,
              name: updateData.screenComponents?.name || updateData.name,
              flowIcon: updateData.screenComponents?.flowIcon || '',
              formDefinition: updateData.screenComponents?.formDefinition,
              release: 'true'
            }
          }
          await axios.post(`${prodScreenManagementApi}/screen`, createPayload, {
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${accessToken}`,
              'content-type': 'application/json'
            }
          })
          console.log(`   ✅ Screen recreated with source namespace in prod: ${devScreen.screenKey}`)
          return { success: true, operation: 'recreate', screenId: devScreen.id }
        } catch (error) {
          console.error(`   ❌ Failed to recreate screen in prod after namespace mismatch: ${error.message}`)
          return { success: false, operation: 'recreate', error: error.message }
        }
      }

      console.error(`   ❌ Failed to update screen in prod: ${updateResult.message || 'Unknown error'}`)
      return { success: false, operation: 'update', error: updateResult.message }
    }

    // Create new screen in prod with same ID as dev
    console.log(`   🆕 Screen doesn't exist in prod, creating: ${devScreen.screenKey}`)

    const payload = {
      ...devScreen,
      // Ensure builder type and version
      screenComponents: {
        ...devScreen.screenComponents,
        builderType: 'NATIVE_SCREEN',
        formDefinition: {
          ...devScreen.screenComponents.formDefinition,
          version: buildVersion
        },
        release: 'true'
      }
    }

    try {
      await axios.post(`${prodScreenManagementApi}/screen`, payload, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
      })

      console.log(`   ✅ Screen created in prod: ${devScreen.screenKey}`)
      return { success: true, operation: 'create', screenId: devScreen.id }
    } catch (error) {
      console.error(`   ❌ Failed to create screen in prod: ${error.message}`)
      return { success: false, operation: 'create', error: error.message }
    }
  } catch (error) {
    console.error(`   ❌ Error syncing screen to prod: ${error.message}`)
    return { success: false, operation: 'error', error: error.message }
  }
}

export {
  OAuthClient,
  getResourceUrls,
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
  // helpers for prod publish
  isLowcoderScreen,
  deleteScreenInScreenManagement,
  updateScreenConfigInScreenManagementDetailed
}
