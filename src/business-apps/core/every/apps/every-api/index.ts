/**
 * Every API - Unified Task Management API
 *
 * Entry point for the Every API service that provides unified access
 * to tasks from both custom-flow-engine and Kogito systems.
 *
 * This is a JSON-only API that works as a "screen" in gravity-business-apps
 * but returns raw JSON data instead of rendering UI.
 *
 * @example
 * Access via: http://localhost:3000?app=core/every/apps/every-api&userId=USER_ID
 * With filters: ?app=core/every/apps/every-api&userId=USER_ID&source=cflow&limit=10
 * Get stats: ?app=core/every/apps/every-api&userId=USER_ID&stats=true
 * Get task: ?app=core/every/apps/every-api&taskId=TASK_ID&userId=USER_ID
 */

import { handleTaskRequest } from './routes/taskRoutes'
import { validateConfig } from './utils/config'

// Export types
export * from './types'

// Export services
export * from './services/UnifiedTaskService'
export * from './services/TaskAdapterService'
export * from './services/EveryboxUserStateService'

// Export utilities
export * from './utils/CflowClient'
export * from './utils/KogitoClient'
export * from './utils/middleware'
export * from './utils/config'

// Export the screen component as default
export { default } from './EveryApiScreen'

/**
 * Main API handler (for programmatic use)
 *
 * This function can be called directly from code if needed
 *
 * @param request - The incoming HTTP request
 * @param accessToken - Optional access token for authentication
 * @returns Response object with JSON data
 */
export async function everyApiHandler(request: Request, accessToken?: string): Promise<Response> {
  try {
    // Validate configuration on first request
    const configValidation = validateConfig()
    if (!configValidation.valid) {
      // Configuration validation errors are non-fatal - service can still operate with defaults
      // Errors are logged elsewhere if needed
    }

    // Handle the request
    return await handleTaskRequest(request, accessToken)
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

/**
 * Health check endpoint
 *
 * Returns the status of the Every API service
 */
export function everyApiHealthCheck(): Response {
  const configValidation = validateConfig()

  return new Response(
    JSON.stringify(
      {
        status: 'ok',
        service: 'Every API',
        version: '1.0.0',
        config: {
          valid: configValidation.valid,
          errors: configValidation.errors
        },
        endpoints: [
          'GET /tasks/user/:userId[.json]',
          'GET /tasks/user/:userId/stats[.json]',
          'GET /tasks/:taskId[.json]?userId=:userId'
        ]
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}
