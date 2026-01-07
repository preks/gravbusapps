import { useState, useEffect } from 'react'
import AuthorizationClient from '../network/authorization/AuthorizationClient'

export interface ScopePermissionCheckResult {
  loading: boolean
  error: Error | null
  hasPermission: boolean
}

/**
 * Hook for checking scope permissions for a resource URL
 * @param resourceUrl - The resource URL path (e.g., '/platform/employee-record')
 * @param scopeCode - The scope code to check (e.g., 'employee-record-notes')
 * @param accessToken - Access token for API calls
 */
export const useScopePermissionCheck = (resourceUrl: string, scopeCode: string, accessToken: string) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    // Skip if no resourceUrl, scopeCode, or accessToken
    if (!resourceUrl || !scopeCode || !accessToken) {
      setLoading(false)
      return
    }

    const checkScopePermission = async () => {
      try {
        setLoading(true)
        setError(null)

        const authClient = AuthorizationClient.getInstance()
        authClient.setAccessToken(accessToken)

        const hasScope = await authClient.hasScopePermission(resourceUrl, scopeCode)
        setHasPermission(hasScope)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to check scope permission'))
        setHasPermission(false)
      } finally {
        setLoading(false)
      }
    }

    checkScopePermission()
  }, [resourceUrl, scopeCode, accessToken])

  return {
    loading,
    error,
    hasPermission
  }
}

export default useScopePermissionCheck
