import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import { useComponentPaths } from '@/common/data/resources/hooks/useComponentPaths'
import type { DomainProcess, DomainOption, ProcessOption } from '../types/domainProcess.types'

interface ResourceManagerContextValue {
  // Raw data from API
  domainProcesses: DomainProcess[]

  // Transformed data for Comboboxes
  domains: DomainOption[]

  // Helper function to get processes for a specific domain (client-side filter)
  getProcessesForDomain: (domain: string) => ProcessOption[]

  // Azure Storage version data (loaded once on init, used by all views)
  devComponentPathVersions: Map<string, { versions: string[]; hasUnversioned: boolean }>
  prodComponentPathVersions: Map<string, { versions: string[]; hasUnversioned: boolean }>

  // State
  isLoading: boolean
  isLoadingAzure: boolean
  error: string | null

  // Actions
  refreshServices: () => Promise<void>
  refreshAzureData: () => Promise<void>
}

const ResourceManagerContext = createContext<ResourceManagerContextValue | undefined>(undefined)

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

  const value: ResourceManagerContextValue = {
    domainProcesses,
    domains,
    getProcessesForDomain,
    devComponentPathVersions,
    prodComponentPathVersions,
    isLoading,
    isLoadingAzure,
    error,
    refreshServices,
    refreshAzureData
  }

  return <ResourceManagerContext.Provider value={value}>{children}</ResourceManagerContext.Provider>
}

export const useResourceManagerContext = (): ResourceManagerContextValue => {
  const context = useContext(ResourceManagerContext)
  if (context === undefined) {
    throw new Error('useResourceManagerContext must be used within a ResourceManagerProvider')
  }
  return context
}
