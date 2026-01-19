import { useState, useEffect } from 'react'
import AuthorizationClient, { CheckPermissionsRequestDTO } from '../network/authorization/AuthorizationClient'

// Define tab permission mapping
export interface TabPermission {
  tabKey: string
  hasAccess: boolean
  sections?: Record<string, boolean>
}

// Define permission mapping type
export interface ResourcePermissionMap {
  domain: string
  resource: string
  permission: string
  resourceId?: string
  sections?: Record<string, { domain: string; resource: string; permission: string }>
}

/**
 * Hook for checking permissions for resources
 * @param resourceId - ID of the resource being accessed
 * @param permissionMap - Map of resource keys to their permission requirements
 * @param accessToken - Access token for API calls
 */
export const usePermissionCheck = <T extends Record<string, ResourcePermissionMap>>(
  resourceId: string,
  permissionMap: T,
  accessToken: string
) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [resourcePermissions, setResourcePermissions] = useState<Record<string, TabPermission>>({})

  useEffect(() => {
    // Skip if no resourceId or no accessToken
    if (!resourceId || !accessToken) {
      setLoading(false)
      return
    }

    const checkPermissions = async () => {
      try {
        setLoading(true)

        // Get the client instance
        const authClient = AuthorizationClient.getInstance()
        authClient.setAccessToken(accessToken)

        // Build permission check requests for all resources and their sections
        const permissionRequests: CheckPermissionsRequestDTO[] = []

        // Add resource permission requests
        Object.entries(permissionMap).forEach(
          ([key, { domain, resource, permission, resourceId: resourceIdFromMap }]) => {
            permissionRequests.push({
              domain,
              resource,
              resourceId: resourceIdFromMap || resourceId,
              permissions: [permission]
            })

            // Add section permission requests if they exist
            if (permissionMap[key].sections) {
              Object.values(permissionMap[key].sections!).forEach(sectionConfig => {
                permissionRequests.push({
                  domain: sectionConfig.domain,
                  resource: sectionConfig.resource,
                  resourceId,
                  permissions: [sectionConfig.permission]
                })
              })
            }
          }
        )

        // Call the bulk permission check endpoint
        const permissions = await authClient.bulkCheckPermissions(permissionRequests)

        // Process permission check results
        const permissionResults: Record<string, TabPermission> = {}

        // Process resource permissions
        Object.entries(permissionMap).forEach(([key, config]) => {
          // Find the permission response for this resource
          const permResponse = permissions.find(
            p =>
              p.domain === config.domain &&
              p.resource === config.resource &&
              p.resourceId === (config.resourceId || resourceId)
          )
          // Initialize permission object
          permissionResults[key] = {
            tabKey: key,
            hasAccess: permResponse ? permResponse.permissions[config.permission] || false : false,
            sections: {}
          }

          // Process section permissions if they exist
          if (config.sections) {
            Object.entries(config.sections).forEach(([sectionKey, sectionConfig]) => {
              const sectionPermResponse = permissions.find(
                p =>
                  p.domain === sectionConfig.domain &&
                  p.resource === sectionConfig.resource &&
                  p.resourceId === resourceId
              )

              if (permissionResults[key].sections) {
                permissionResults[key].sections![sectionKey] = sectionPermResponse
                  ? sectionPermResponse.permissions[sectionConfig.permission] || false
                  : false
              }
            })
          }
        })

        setResourcePermissions(permissionResults)
        setLoading(false)
      } catch (err) {
        console.error('Error checking permissions:', err)
        setError(err instanceof Error ? err : new Error('Failed to check permissions'))
        setLoading(false)
      }
    }

    checkPermissions()
  }, [resourceId, accessToken, permissionMap])

  return {
    loading,
    error,
    permissions: resourcePermissions,
    isResourceAccessible: (key: keyof T) => resourcePermissions[key as string]?.hasAccess || false,
    isSectionAccessible: (key: keyof T, sectionKey: string) =>
      resourcePermissions[key as string]?.sections?.[sectionKey] || false
  }
}

export default usePermissionCheck
