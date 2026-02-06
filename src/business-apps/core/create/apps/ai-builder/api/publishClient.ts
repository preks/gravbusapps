/**
 * Publish Client
 *
 * Handles publishing generated content to the platform.
 * The service fetches file changes from the session, builds the content,
 * optionally uploads to Azure, and optionally registers with platform services.
 *
 * Note: targetPath and resourceUrl are retrieved from the session on the server.
 * Make sure to save the session with the correct targetPath and resourceUrl before publishing.
 */

import { ENV } from '../config/environment'

const AI_SERVICE_API_URL = ENV.AI_SERVICE_API_URL

export interface PublishRequest {
  repoId: string
  sessionId: string
  accessToken: string
}

export interface PublishResponse {
  success: boolean
  targetPath: string
  resourceUrl?: string
  azureUrl?: string // Optional - only present if Azure upload is enabled
  message: string
  error?: string
}

/**
 * Publish generated content to the platform
 *
 * This function calls the publish API which:
 * 1. Gets targetPath and resourceUrl from the session
 * 2. Fetches file changes from the session
 * 3. Applies changes to the repository
 * 4. Builds the content with npm run build
 * 5. Optionally uploads to Azure blob storage (if enabled for the repo)
 * 6. Optionally registers the content in the platform (if resourceUrl in session)
 */
export async function publishScreen(request: PublishRequest): Promise<PublishResponse> {
  try {
    // Make HTTP request to the publish API
    // targetPath and resourceUrl are retrieved from the session on the server
    const response = await fetch(`${AI_SERVICE_API_URL}/api/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.accessToken}`
      },
      body: JSON.stringify({
        repoId: request.repoId,
        sessionId: request.sessionId
      })
    })

    if (!response.ok) {
      // Try to get detailed error from response
      let errorDetails = 'Failed to publish'
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
      targetPath: data.targetPath,
      resourceUrl: data.resourceUrl,
      azureUrl: data.azureUrl,
      message: data.message || 'Published successfully'
    }
  } catch (error) {
    // Re-throw the error with full details so it can be shown in the chat
    throw error
  }
}

/**
 * Validate target path format
 * Target path should be relative to the configured publish base path
 */
export function validateTargetPath(path: string): {
  valid: boolean
  error?: string
} {
  if (!path) {
    return { valid: false, error: 'Target path is required' }
  }

  // Must not start with src/ (it's relative to the publish base path)
  if (path.startsWith('src/')) {
    return {
      valid: false,
      error: 'Target path should not include src/ prefix'
    }
  }

  // Basic format check - at least one part
  const parts = path.split('/').filter(p => p)
  if (parts.length < 1) {
    return {
      valid: false,
      error: 'Target path must have at least 1 part'
    }
  }

  return { valid: true }
}

/**
 * Validate resource URL format (optional - can be empty)
 */
export function validateResourceUrl(url: string | undefined): {
  valid: boolean
  error?: string
} {
  // Empty/undefined is valid - registration is optional
  if (!url) {
    return { valid: true }
  }

  if (!url.startsWith('/')) {
    return {
      valid: false,
      error: 'Resource URL must start with /'
    }
  }

  // Basic format check - at least /type/name
  const parts = url.split('/').filter(p => p)
  if (parts.length < 2) {
    return {
      valid: false,
      error: 'Resource URL must have at least 2 parts (e.g., /apps/screen-name)'
    }
  }

  return { valid: true }
}

/**
 * Generate suggested resource URL from target path
 */
export function suggestResourceUrl(targetPath: string): string {
  // Convert: crm/customers/apps/my-screen -> /apps/crm/my-screen
  const parts = targetPath.split('/')
  if (parts.length >= 4 && parts[2] === 'apps') {
    const module = parts[0]
    const screenName = parts[3]
    return `/apps/${module}/${screenName}`
  }
  return ''
}
