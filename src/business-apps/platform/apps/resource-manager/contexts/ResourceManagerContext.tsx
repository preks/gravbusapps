import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import { useComponentPaths } from '@/common/data/resources/hooks/useComponentPaths'
import type { DomainProcess, DomainOption, ProcessOption } from '../types/domainProcess.types'

// Split contexts for better performance
// 1. Static data context (changes rarely)
interface ResourceDataContextValue {
  domains: DomainOption[]
  getProcessesForDomain: (domain: string) => ProcessOption[]
}

// 2. Azure data context (changes more frequently)
interface AzureDataContextValue {
  devComponentPathVersions: Map<string, { versions: string[]; hasUnversioned: boolean }>
  prodComponentPathVersions: Map<string, { versions: string[]; hasUnversioned: boolean }>
  isLoadingAzure: boolean
}

// 3. Actions context (stable functions)
interface ResourceActionsContextValue {
  refreshServices: () => Promise<void>
  refreshAzureData: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const ResourceDataContext = createContext<ResourceDataContextValue | undefined>(undefined)
const AzureDataContext = createContext<AzureDataContextValue | undefined>(undefined)
const ResourceActionsContext = createContext<ResourceActionsContextValue | undefined>(undefined)

interface ResourceManagerProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

export const ResourceManagerProvider: React.FC<ResourceManagerProviderProps> = ({ children, ...context }) => {
  const [domainProcesses, setDomainProcesses] = useState<DomainProcess[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAzure, setIsLoadingAzure] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resourceClient = useResourceClient(context.accessToken)

  // Fetch DEV and PROD component path versions (loaded once on mount)
  // Empty array means it will fetch ALL blobs in the container
  const { componentPathVersions: devComponentPathVersions, refetch: refetchDevComponentPaths } = useComponentPaths(
    context,
    [],
    'dev'
  )

  const { componentPathVersions: prodComponentPathVersions, refetch: refetchProdComponentPaths } = useComponentPaths(
    context,
    [],
    'prod'
  )

  // Transform domain processes to domain options (unique domains)
  const domains = useMemo<DomainOption[]>(() => {
    return domainProcesses.map(dp => ({
      id: dp.domain,
      name: dp.domain,
      processes: dp.processes.map(p => ({ id: p, name: p }))
    }))
  }, [domainProcesses])

  // Client-side filtering function to get processes for a specific domain
  const getProcessesForDomain = useCallback(
    (domain: string): ProcessOption[] => {
      const found = domainProcesses.find(dp => dp.domain === domain)
      return found?.processes.map(p => ({ id: p, name: p })) || []
    },
    [domainProcesses]
  )

  // Load domain/process data from API
  const loadDomainProcesses = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await resourceClient.action.getDomainProcesses()
      setDomainProcesses(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load domain/process data'
      setError(errorMessage)
      console.error('ResourceManagerContext: Error loading domain processes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [resourceClient])

  // Load Azure Storage data
  const loadAzureData = useCallback(async () => {
    setIsLoadingAzure(true)

    try {
      await Promise.all([refetchDevComponentPaths(), refetchProdComponentPaths()])
    } catch (err) {
      console.error('ResourceManagerContext: Error loading Azure Storage data:', err)
      // Don't set error state - Azure data is optional
    } finally {
      setIsLoadingAzure(false)
    }
  }, [refetchDevComponentPaths, refetchProdComponentPaths])

  // Refresh function for services
  const refreshServices = useCallback(async () => {
    await loadDomainProcesses()
  }, [loadDomainProcesses])

  // Refresh function for Azure data
  const refreshAzureData = useCallback(async () => {
    await loadAzureData()
  }, [loadAzureData])

  // Load data on mount
  useEffect(() => {
    loadDomainProcesses()
    loadAzureData()
  }, [loadDomainProcesses, loadAzureData])

  // Split context values for optimal performance
  const dataValue: ResourceDataContextValue = useMemo(
    () => ({
      domains,
      getProcessesForDomain
    }),
    [domains, getProcessesForDomain]
  )

  const azureValue: AzureDataContextValue = useMemo(
    () => ({
      devComponentPathVersions,
      prodComponentPathVersions,
      isLoadingAzure
    }),
    [devComponentPathVersions, prodComponentPathVersions, isLoadingAzure]
  )

  const actionsValue: ResourceActionsContextValue = useMemo(
    () => ({
      refreshServices,
      refreshAzureData,
      isLoading,
      error
    }),
    [refreshServices, refreshAzureData, isLoading, error]
  )

  return (
    <ResourceDataContext.Provider value={dataValue}>
      <AzureDataContext.Provider value={azureValue}>
        <ResourceActionsContext.Provider value={actionsValue}>{children}</ResourceActionsContext.Provider>
      </AzureDataContext.Provider>
    </ResourceDataContext.Provider>
  )
}

// Individual hooks for each context (consume only what you need)
export const useResourceData = (): ResourceDataContextValue => {
  const context = useContext(ResourceDataContext)
  if (context === undefined) {
    throw new Error('useResourceData must be used within a ResourceManagerProvider')
  }
  return context
}

export const useAzureData = (): AzureDataContextValue => {
  const context = useContext(AzureDataContext)
  if (context === undefined) {
    throw new Error('useAzureData must be used within a ResourceManagerProvider')
  }
  return context
}

export const useResourceActions = (): ResourceActionsContextValue => {
  const context = useContext(ResourceActionsContext)
  if (context === undefined) {
    throw new Error('useResourceActions must be used within a ResourceManagerProvider')
  }
  return context
}

// Legacy hook for backward compatibility (combines all contexts)
export const useResourceManagerContext = () => {
  const data = useResourceData()
  const azure = useAzureData()
  const actions = useResourceActions()

  return {
    ...data,
    ...azure,
    ...actions,
    // Deprecated fields (for backward compatibility)
    domainProcesses: [] as DomainProcess[]
  }
}
