/**
 * Environment Configuration for AI Builder
 */

export const ENV = {
  // FORGE API URL - where the AI backend is running
  FORGE_API_URL: import.meta.env.VITE_FORGE_API_URL || 'https://forge-api-production-db58.up.railway.app',

  // Publish Service URL - where the publish service is running
  PUBLISH_API_URL: import.meta.env.VITE_PUBLISH_API_URL || 'http://localhost:3002',

  // Repository ID for gravbusapps (UUID from FORGE)
  GRAVBUSAPPS_REPO_ID: '168cd931-0e04-4f64-a496-fcb4af916612',

  // Repository URL
  REPOSITORY_URL: 'https://github.com/preks/gravbusapps',

  // Debug mode
  DEBUG: import.meta.env.DEV
}

/**
 * Check if FORGE is configured and available
 */
export async function checkForgeAvailability(): Promise<{
  available: boolean
  error?: string
}> {
  try {
    const response = await fetch(`${ENV.FORGE_API_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    if (response.ok) {
      return { available: true }
    }

    return {
      available: false,
      error: `FORGE returned status ${response.status}`
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if repository is indexed in FORGE
 */
export async function checkRepositoryStatus(): Promise<{
  indexed: boolean
  status?: string
  error?: string
}> {
  try {
    const response = await fetch(`${ENV.FORGE_API_URL}/api/repos/${ENV.GRAVBUSAPPS_REPO_ID}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })

    if (response.ok) {
      const data = await response.json()
      return {
        indexed: data.status === 'completed',
        status: data.status
      }
    }

    return {
      indexed: false,
      error: `Status check returned ${response.status}`
    }
  } catch (error) {
    return {
      indexed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
