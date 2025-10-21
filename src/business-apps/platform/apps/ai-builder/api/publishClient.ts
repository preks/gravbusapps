/**
 * Publish Client
 *
 * Handles publishing generated screens to the NEWWORK platform
 * by interfacing with the publish-dev-screen.js script.
 */

import { GeneratedFile } from './forgeClient'
import { ENV } from '../config/environment'

const PUBLISH_API_URL = ENV.PUBLISH_API_URL

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
 * Fixed vite.config.ts content with exports: 'auto'
 * This ensures the bundle preserves both default and named exports
 */
const FIXED_VITE_CONFIG = `exports: 'auto' // Allow both default and named exports - required for component registration`

/**
 * Inject vite.config.ts fix into the session before publishing
 * This is a workaround until Forge's base repository is reindexed
 */
async function injectViteConfigFix(request: PublishRequest): Promise<void> {
  try {
    // Read the current vite.config.ts from the repo
    const viteConfigResponse = await fetch(`${PUBLISH_API_URL}/api/files/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.accessToken}`
      },
      body: JSON.stringify({
        repoId: ENV.GRAVBUSAPPS_REPO_ID,
        sessionId: request.sessionId,
        filePath: 'vite.config.ts'
      })
    })

    if (viteConfigResponse.ok) {
      const { content } = await viteConfigResponse.json()

      // Check if it needs the fix
      if (content && content.includes("exports: 'named'")) {
        console.log('[AI Builder] Injecting vite.config.ts fix...')

        // Replace exports: 'named' with exports: 'auto'
        const fixedContent = content.replace(/exports:\s*['"]named['"]/g, FIXED_VITE_CONFIG)

        // Track the change in the session
        await fetch(`${PUBLISH_API_URL}/api/newwork/track-change`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${request.accessToken}`
          },
          body: JSON.stringify({
            repoId: ENV.GRAVBUSAPPS_REPO_ID,
            sessionId: request.sessionId,
            filePath: 'vite.config.ts',
            changeType: 'modify',
            newContent: fixedContent
          })
        })

        console.log('[AI Builder] ✅ vite.config.ts fix injected successfully')
      } else {
        console.log('[AI Builder] vite.config.ts already has correct exports setting')
      }
    }
  } catch (error) {
    console.warn('[AI Builder] Failed to inject vite.config.ts fix:', error)
    // Don't fail the publish if this fails - it's a workaround
  }
}

/**
 * Publish generated screen to NEWWORK platform
 *
 * This function:
 * 1. Injects vite.config.ts fix (workaround for base repo issue)
 * 2. Writes the generated files to the file system
 * 3. Calls the publish-dev-screen.js script
 * 4. Uploads the build to Azure
 * 5. Registers the screen in the platform
 */
export async function publishScreen(request: PublishRequest): Promise<PublishResponse> {
  try {
    // STEP 1: Inject vite.config.ts fix before publishing
    await injectViteConfigFix(request)

    // STEP 2: Proceed with normal publish
    const response = await fetch(`${PUBLISH_API_URL}/api/publish`, {
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
      const error = await response.json()
      throw new Error(error.message || 'Failed to publish screen')
    }

    const data = await response.json()
    return {
      success: true,
      screenPath: request.screenPath,
      resourceUrl: request.resourceUrl,
      azureUrl: data.azureUrl,
      message: 'Screen published successfully'
    }
  } catch (error) {
    console.error('Publish failed:', error)
    return {
      success: false,
      screenPath: request.screenPath,
      resourceUrl: request.resourceUrl,
      azureUrl: '',
      message: 'Publish failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
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
