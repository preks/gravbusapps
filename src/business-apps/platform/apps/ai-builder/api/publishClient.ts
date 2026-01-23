/**
 * Publish Client
 *
 * Handles publishing generated screens to the NEWWORK platform
 * by interfacing with the publish-dev-screen.js script.
 */

import { ENV } from '../config/environment'

const AI_SERVICE_API_URL = ENV.AI_SERVICE_API_URL

export interface GeneratedFile {
  path: string
  content: string
  changeType?: 'create' | 'update' | 'delete'
}

export interface PublishRequest {
  files: GeneratedFile[]
  screenPath: string
  resourceUrl: string
  sessionId: string
  accessToken: string
}

export interface PublishResponse {
  success: boolean
  screenPath: string
  resourceUrl: string
  azureUrl: string
  message: string
  error?: string
}

/**
 * Publish generated screen to NEWWORK platform
 *
 * This function:
 * 1. Writes the generated files to the file system
 * 2. Calls the publish-dev-screen.js script
 * 3. Uploads the build to Azure
 * 4. Registers the screen in the platform
 */
export async function publishScreen(request: PublishRequest): Promise<PublishResponse> {
  try {
    // Make HTTP request to the publish API
    const response = await fetch(`${AI_SERVICE_API_URL}/api/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.accessToken}`
      },
      body: JSON.stringify({
        files: request.files,
        screenPath: request.screenPath,
        resourceUrl: request.resourceUrl,
        sessionId: request.sessionId
      })
    })

    if (!response.ok) {
      // Try to get detailed error from response
      let errorDetails = 'Failed to publish screen'
      try {
        const errorData = await response.json()
        // Get the most detailed error message available
        errorDetails = errorData.error || errorData.message || errorData.details || errorDetails

        // If there's a build error with stack trace, include it
        if (errorData.buildError) {
          errorDetails = `Build Error:\n${errorData.buildError}`
        }

        // If there's stderr output, include it
        if (errorData.stderr) {
          errorDetails = `${errorDetails}\n\nError Output:\n${errorData.stderr}`
        }
      } catch {
        // If response is not JSON, try to get text
        try {
          errorDetails = await response.text()
        } catch {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`
        }
      }

      throw new Error(errorDetails)
    }

    const data = await response.json()
    return {
      success: true,
      screenPath: request.screenPath,
      resourceUrl: request.resourceUrl,
      azureUrl: data.azureUrl || '',
      message: data.message || 'Screen published successfully'
    }
  } catch (error) {
    console.error('Publish failed:', error)

    // Re-throw the error with full details so it can be shown in the chat
    throw error
  }
}

/**
 * Validate screen path format
 */
export function validateScreenPath(path: string): {
  valid: boolean
  error?: string
} {
  if (!path) {
    return { valid: false, error: 'Screen path is required' }
  }

  // Expected format: module/sub-module/apps/screen-name
  const pathRegex = /^[a-z-]+\/[a-z-]+\/apps\/[a-z-]+$/
  if (!pathRegex.test(path)) {
    return {
      valid: false,
      error: 'Invalid format. Expected: module/sub-module/apps/screen-name'
    }
  }

  return { valid: true }
}

/**
 * Validate resource URL format
 */
export function validateResourceUrl(url: string): {
  valid: boolean
  error?: string
} {
  if (!url) {
    return { valid: false, error: 'Resource URL is required' }
  }

  if (!url.startsWith('/')) {
    return {
      valid: false,
      error: 'Resource URL must start with /'
    }
  }

  // Expected format: /apps/module/screen-name
  const urlRegex = /^\/apps\/[a-z-]+\/[a-z-]+$/
  if (!urlRegex.test(url)) {
    return {
      valid: false,
      error: 'Invalid format. Expected: /apps/module/screen-name'
    }
  }

  return { valid: true }
}

/**
 * Generate suggested resource URL from screen path
 */
export function suggestResourceUrl(screenPath: string): string {
  // Convert: crm/customers/apps/my-screen -> /apps/crm/my-screen
  const parts = screenPath.split('/')
  if (parts.length >= 4 && parts[2] === 'apps') {
    const module = parts[0]
    const screenName = parts[3]
    return `/apps/${module}/${screenName}`
  }
  return ''
}
