/**
 * 🚀 Generic Mock GraphQL Client
 *
 * Lightweight client that routes queries through a data registry.
 * Replaces the monolithic 1146-line implementation with a clean,
 * maintainable, domain-agnostic architecture.
 *
 * ⚠️ API COMPATIBILITY: This mock client has the EXACT same signature
 * as the real GraphQL client to allow seamless switching between mock
 * and real data without code changes.
 */

import { createQueryRouter } from './core/queryRouter'
import { debugLogger } from './core/debugLogger'

/**
 * Mock GraphQL client that mimics real GraphQL client behavior
 * This allows seamless switching between mock and real data
 *
 * @param accessToken - Optional access token (ignored in mock, but kept for API compatibility)
 * @returns GraphQL client instance with same API as real client
 */
export const useGraphQLClient = (accessToken?: string) => {
  const router = createQueryRouter()

  // Log if access token provided (for debugging)
  if (accessToken && process.env.NODE_ENV === 'development') {
    console.log('🔒 Mock GraphQL Client: Access token provided but not used in mock mode')
  }

  return {
    /**
     * Execute GraphQL query
     *
     * @param query - GraphQL query string
     * @param variables - Optional query variables (currently not used in mock)
     * @returns Promise with query result
     */
    request: async <T = any>(query: string, variables?: Record<string, any>): Promise<T> => {
      const startTime = Date.now()

      // Log query start
      debugLogger.queryStart(query)

      // Log variables if provided (for future implementation)
      if (variables && Object.keys(variables).length > 0) {
        debugLogger.log('Variables provided (not yet implemented in mock):', variables)
      }

      return new Promise((resolve, reject) => {
        // Simulate network delay for realistic testing
        setTimeout(
          async () => {
            try {
              // Route query through data registry
              const result = await router.route(query)

              // Log successful completion
              debugLogger.querySuccess(query, startTime, result)

              resolve(result as T)
            } catch (error) {
              // Log error
              debugLogger.queryError(query, error)
              reject(error)
            }
          },
          100 + Math.random() * 200
        ) // 100-300ms delay
      })
    },

    /**
     * Set access token (API compatibility method)
     * Not used in mock mode, but required for API compatibility
     */
    setAccessToken: (token: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '🔒 Mock GraphQL Client: setAccessToken called but not used in mock mode',
          token ? '(token provided)' : '(no token)'
        )
      }
    }
  }
}

// Export with both naming conventions for compatibility
export { useGraphQLClient as useGraphqlClient }
