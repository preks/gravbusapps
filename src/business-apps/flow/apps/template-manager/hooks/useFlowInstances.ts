/**
 * useFlowInstances Hook
 * Fetches flow engine instances from:
 * 1. Environment variables (for localhost/DEV)
 * 2. FlowEngineInstances catalog (for STAGING/PROD)
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { FlowEngineInstance } from '../types/instance'
import { env } from '@/common/env/EnvUtils'
import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

const CATALOG_NAME = 'FlowEngineInstances'

const getCurrentPlatformApiUrl = (): string | null => {
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')?.replace(/\/+$/, '')
  return baseUrl ? `${baseUrl}/flow-engine/api` : null
}

/**
 * Get current platform instance (uses BASE_URL + "/flow-engine")
 * This automatically detects the current platform environment
 */
const getCurrentPlatformInstance = (): FlowEngineInstance | null => {
  try {
    // Get base URL from environment (this is the platform URL)
    const baseUrl = env('NEXT_PUBLIC_BASE_URL')

    if (!baseUrl) {
      console.warn('NEXT_PUBLIC_BASE_URL not available, current platform instance disabled')
      return null
    }

    // Construct flow-engine URL from platform base URL
    const flowEngineUrl = baseUrl + '/flow-engine'

    // Determine environment from URL
    let environment = 'DEV'
    let name = 'Current'
    let icon = '🌐'
    let color = '#8b5cf6'

    if (baseUrl.includes('newwork-dev')) {
      environment = 'DEV'
      name = 'Current (DEV)'
      icon = '💻'
      color = '#3b82f6'
    } else if (baseUrl.includes('demo') || baseUrl.includes('staging')) {
      environment = 'STAGING'
      name = 'Current (STAGING)'
      icon = '🧪'
      color = '#f59e0b'
    } else if (baseUrl.includes('newwork.cloud') || baseUrl.includes('production')) {
      environment = 'PROD'
      name = 'Current (PROD)'
      icon = '🚀'
      color = '#10b981'
    }

    return {
      id: 'instance:flow:current-platform',
      name,
      code: environment as 'DEV' | 'STAGING' | 'PROD',
      baseUrl: flowEngineUrl,
      apiKey: '', // Will use current user's access token
      environment,
      color,
      icon,
      description: `Current platform flow-engine (${flowEngineUrl})`,
      order: 0,
      isHealthy: undefined,
      lastChecked: undefined
    }
  } catch (error) {
    console.error('Failed to get current platform instance:', error)
    return null
  }
}

/**
 * Get local development instance (uses NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL)
 * Only added when custom URL is configured
 */
const getLocalDevelopmentInstance = (): FlowEngineInstance | null => {
  try {
    const currentPlatformApiUrl = getCurrentPlatformApiUrl()
    if (CUSTOM_FLOW_ENGINE_API_URL === currentPlatformApiUrl) {
      return null
    }

    const customUrl = getFlowEngineBaseUrl()

    if (!customUrl) {
      return null // No custom URL configured
    }

    return {
      id: 'instance:flow:local-dev',
      name: 'Local Development',
      code: 'DEV',
      baseUrl: customUrl,
      apiKey: '', // Will use current user's access token
      environment: 'LOCAL',
      color: '#8b5cf6', // Purple for local
      icon: '🖥️',
      description: `Local development instance (${customUrl})`,
      order: 0.5, // Between current (0) and catalog instances (1+)
      isHealthy: undefined,
      lastChecked: undefined
    }
  } catch (error) {
    console.error('Failed to get local development instance:', error)
    return null
  }
}

export const useFlowInstances = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [instances, setInstances] = useState<FlowEngineInstance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInstances = useCallback(async (): Promise<FlowEngineInstance[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const allInstances: FlowEngineInstance[] = []

      // Check if local development instance is configured (NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL)
      const localDev = getLocalDevelopmentInstance()
      if (localDev) {
        // Use local development instance when custom URL is set
        allInstances.push(localDev)
      } else {
        // Use current platform instance when custom URL is NOT set (BASE_URL + "/flow-engine")
        const currentPlatform = getCurrentPlatformInstance()
        if (currentPlatform) {
          allInstances.push(currentPlatform)
        }
      }

      // Fetch external instances from catalog using GraphQL (avoids 401 errors)
      try {
        const query = `
          query GetFlowEngineInstances {
            CatalogEntry(
              where: {
                catalog: {identifier: {_eq: "${CATALOG_NAME}"}},
                isDeleted: {_eq: false}
              }
            ) {
              id
              code
              value
              description
              displayOrder
              objectValue
            }
          }
        `

        const response = await graphqlClient.request(query)

        // GraphQL response structure: { CatalogEntry: [...] }
        const catalogEntries = response.CatalogEntry || []
        const catalogInstances: FlowEngineInstance[] = catalogEntries.map((entry: any) => {
          // objectValue contains the metadata
          const metadata = (entry.objectValue as any) || {}

          return {
            id: entry.id,
            name: entry.value || entry.code, // Use value as display name
            code: entry.code as 'DEV' | 'STAGING' | 'PROD',
            baseUrl: metadata.baseUrl || '',
            apiKey: metadata.apiKey || '',
            environment: metadata.environment || entry.code,
            color: metadata.color || '#666666',
            icon: metadata.icon || '🔧',
            description: entry.description || metadata.description || '',
            order: entry.displayOrder || metadata.order || 999
          }
        })

        allInstances.push(...catalogInstances)
      } catch (catalogErr) {
        // If catalog doesn't exist yet, just use current platform
        console.error('Catalog GraphQL fetch error:', catalogErr)
        console.warn('Catalog not found or empty, using current platform only')
        if (allInstances.length === 0) {
          // No current platform and no catalog - this is an error
          throw catalogErr
        }
      }

      // Sort by order
      const sortedInstances = allInstances.sort((a, b) => a.order - b.order)

      setInstances(sortedInstances)

      return sortedInstances
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch instances'
      setError(errorMessage)
      console.error('Failed to load flow engine instances', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient])

  useEffect(() => {
    if (accessToken) {
      fetchInstances().catch(err => {
        console.error('useFlowInstances: fetchInstances failed:', err)
      })
    } else {
      console.warn('useFlowInstances: No accessToken available, skipping fetch')
      setError('No access token available. Please ensure you are logged in.')
    }
  }, [accessToken, fetchInstances])

  return {
    instances,
    isLoading,
    error,
    refetch: fetchInstances
  }
}
