import { useState, useEffect, useRef } from 'react'
import { env } from '../env/EnvUtils'
import { useRestClient } from '../network/rest/useRestClient'

interface PermissionRequest {
  domain: string
  resource: string
  resourceId: string
  permissions: string[]
}

interface PermissionResponse {
  domain: string
  resource: string
  resourceId: string
  userId: string
  permissions: Record<string, boolean>
}

/**
 * Custom hook for checking permissions
 * @param permissionRequests Array of permission requests to check
 * @returns Object containing loading state, permission check result, and any error
 */
export const usePermissionCheck = (accessToken: string, permissionRequests: PermissionRequest[]) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [hasPermission, setHasPermission] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const permissionsApiUrl = `${env('NEXT_PUBLIC_BASE_URL')}/authorization/api/v1` || ''
  const restClient = useRestClient(permissionsApiUrl)

  // Use a ref to track if we've already attempted the permission check
  const checkAttempted = useRef<boolean>(false)

  useEffect(() => {
    const checkPermissions = async () => {
      // Skip if we've already attempted the check
      if (checkAttempted.current) {
        return
      }

      if (!permissionRequests || permissionRequests.length === 0) {
        setHasPermission(false)
        setLoading(false)
        return
      }

      // Mark that we've attempted the check
      checkAttempted.current = true

      try {
        setLoading(true)

        // Use the correct API endpoint
        const response = await restClient.post(`/permissions/bulk-check`, permissionRequests, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        // Check if all permissions are granted
        const allPermissionsGranted = response.every((result: PermissionResponse) => {
          // Check each requested permission in the response
          const requestedPermissions =
            permissionRequests.find(
              req =>
                req.domain === result.domain && req.resource === result.resource && req.resourceId === result.resourceId
            )?.permissions || []

          // Check if all requested permissions are granted
          return requestedPermissions.every(permission => result.permissions[permission] === true)
        })

        setHasPermission(allPermissionsGranted)
        setError(null)
      } catch (err) {
        console.error('Error checking permissions:', err)
        setError(err instanceof Error ? err : new Error('Unknown error occurred'))
        setHasPermission(false)
        // Don't retry on failure - we've already marked this check as attempted
      } finally {
        setLoading(false)
      }
    }

    checkPermissions()
  }, [permissionRequests])

  return { loading, hasPermission, error }
}
