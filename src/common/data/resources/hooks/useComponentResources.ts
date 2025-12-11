import { useState, useMemo, useCallback } from 'react'
import { ComponentResource, AzureBlobVersions, Component } from '../types/component.types'
import { useComponentPaths } from './useComponentPaths'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'

interface UseComponentResourcesParams {
  searchParameter?: string
  filter?: {
    appId?: string
    screenKey?: string
    builderType?: 'LOWCODER' | 'FORMIO' | 'NATIVE_SCREEN'
  }
  sort?: {
    field: string
    order: 'ASC' | 'DESC'
  }
  limit?: number
  offset?: number
}

interface UseComponentResourcesResult {
  resources: ComponentResource[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: (params?: UseComponentResourcesParams, isInitial?: boolean) => Promise<void>
}

/**
 * Hook for Components View - combines Screen Management API and Azure Storage data
 * Only used in ComponentsView, not on app level
 * Supports pagination with limit/offset
 */
export const useComponentResources = (
  context: BusinessAppContextProps,
  params?: UseComponentResourcesParams
): UseComponentResourcesResult => {
  const [components, setComponents] = useState<Component[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)

  // Extract component paths from components
  const componentPaths = useMemo(() => {
    return components
      .map(component => component.screenComponents?.formDefinition?.componentPath)
      .filter((path): path is string => !!path && path.startsWith('/'))
      .map(path => path.substring(1)) // Remove leading '/'
  }, [components])

  // Fetch DEV and PROD component path versions - pass componentPaths so hooks can track them
  // Hooks won't auto-fetch, only when refetch() is called
  const {
    componentPathVersions: devComponentPathVersions,
    error: devComponentPathsError,
    refetch: refetchDevComponentPaths
  } = useComponentPaths(
    context,
    componentPaths, // Pass actual paths - hook will only fetch when refetch() is called
    'dev'
  )
  const {
    componentPathVersions: prodComponentPathVersions,
    error: prodComponentPathsError,
    refetch: refetchProdComponentPaths
  } = useComponentPaths(
    context,
    componentPaths, // Pass actual paths - hook will only fetch when refetch() is called
    'prod'
  )

  const fetchComponents = useCallback(
    async (fetchParams?: UseComponentResourcesParams, isInitial = false) => {
      if (!context.accessToken) {
        setError('No access token available')
        setIsInitialLoading(false)
        return
      }

      // Only show loading state on initial load
      if (isInitial) {
        setIsInitialLoading(true)
      }
      setError(null)

      try {
        // Use provided params or defaults
        const limit = fetchParams?.limit ?? params?.limit ?? 20
        const offset = fetchParams?.offset ?? params?.offset ?? 0
        const searchParameter = fetchParams?.searchParameter ?? params?.searchParameter
        const filter = fetchParams?.filter ?? params?.filter
        const sort = fetchParams?.sort ?? params?.sort

        // Build request params according to OpenAPI spec
        const requestParams: {
          searchParameter?: string
          filter?: {
            appId?: string
            screenKey?: string
            builderType?: 'LOWCODER' | 'FORMIO' | 'NATIVE_SCREEN'
          }
          sort?: {
            field: string
            order: 'ASC' | 'DESC'
          }
          limit: number
          offset: number
          returnTotalRecords: boolean
        } = {
          limit: limit,
          offset: offset,
          returnTotalRecords: true // Always request total count for pagination
        }

        // Add search parameter if provided
        if (searchParameter?.trim()) {
          requestParams.searchParameter = searchParameter.trim()
        }

        // Add filter if provided (optional)
        if (filter) {
          requestParams.filter = filter
        }

        // Add sort if provided (defaults to name ASC in ComponentClient)
        if (sort) {
          requestParams.sort = sort
        }

        // Single request with pagination, search, filter, and sort
        const response = await resourceClient.component.getComponents(requestParams)

        if (response?.data && Array.isArray(response.data)) {
          setComponents(response.data)
          // Extract total count from paging
          setTotalCount(response.paging?.totalRecords ?? response.data.length)
        } else {
          setComponents([])
          setTotalCount(0)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch components'
        setError(errorMessage)
        setComponents([])
        setTotalCount(0)
      } finally {
        setIsInitialLoading(false)
      }
    },
    [context.accessToken, params, resourceClient]
  )

  // Combine Component Management data with Azure Storage versions (DEV and PROD)
  const resources = useMemo<ComponentResource[]>(() => {
    return components.map(component => {
      const componentPath = component.screenComponents?.formDefinition?.componentPath
      const pathWithoutSlash = componentPath?.startsWith('/') ? componentPath.substring(1) : componentPath || ''

      const devComponentPathInfo = devComponentPathVersions.get(pathWithoutSlash)
      const devAzureVersions: AzureBlobVersions = devComponentPathInfo
        ? { versions: devComponentPathInfo.versions, hasUnversioned: devComponentPathInfo.hasUnversioned }
        : { versions: [], hasUnversioned: false }

      const prodComponentPathInfo = prodComponentPathVersions.get(pathWithoutSlash)
      const prodAzureVersions: AzureBlobVersions = prodComponentPathInfo
        ? { versions: prodComponentPathInfo.versions, hasUnversioned: prodComponentPathInfo.hasUnversioned }
        : { versions: [], hasUnversioned: false }

      return {
        ...component,
        azureVersions: {
          dev: devAzureVersions,
          prod: prodAzureVersions
        }
      }
    })
  }, [components, devComponentPathVersions, prodComponentPathVersions])

  const errorState = error || devComponentPathsError || prodComponentPathsError

  const refetch = useCallback(
    async (fetchParams?: UseComponentResourcesParams, isInitial = false) => {
      await fetchComponents(fetchParams, isInitial)

      // Only fetch Azure paths on initial load (they contain ALL blobs, not just current page)
      if (isInitial) {
        Promise.all([refetchDevComponentPaths(), refetchProdComponentPaths()]).catch(() => {
          // Silently handle component path fetch errors
        })
      }
    },
    [fetchComponents, refetchDevComponentPaths, refetchProdComponentPaths]
  )

  return {
    resources,
    totalCount,
    isLoading: isInitialLoading, // Only show loading on initial load
    error: errorState,
    refetch
  }
}
