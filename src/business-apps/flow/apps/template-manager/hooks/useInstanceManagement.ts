/**
 * useInstanceManagement Hook
 * Handles CRUD operations for FlowEngineInstances catalog entries
 */

import { useCallback, useState } from 'react'
import { useFlowInstances } from './useFlowInstances'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { createEnhancedError } from '../utils/errorHandler'

const CATALOG_NAME = 'FlowEngineInstances'
const CATALOG_VERSION = 'v1'

export interface InstanceFormData {
  name: string
  code: string
  baseUrl: string
  apiKey?: string
  environment: 'DEV' | 'STAGING' | 'PROD' | 'LOCAL'
  icon: string
  color: string
  description?: string
  displayOrder: number
}

export const useInstanceManagement = (accessToken: string) => {
  const { instances, isLoading, error, refetch } = useFlowInstances(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Create a new instance in the catalog
   */
  const createInstance = useCallback(
    async (data: InstanceFormData): Promise<void> => {
      setIsCreating(true)
      try {
        const catalogEntry = {
          code: data.code,
          value: data.name,
          description: data.description || '', // Store at root level for retrieval
          displayOrder: data.displayOrder,
          type: 'flow-engine-instance',
          translations: [],
          objectValue: {
            baseUrl: data.baseUrl,
            apiKey: data.apiKey || '',
            environment: data.environment,
            color: data.color,
            icon: data.icon,
            description: data.description || '' // Also keep in objectValue for consistency
          }
        }

        await catalogClient.createCatalogEntry(CATALOG_NAME, CATALOG_VERSION, catalogEntry)

        // Refresh instances list
        await refetch()
      } catch (err) {
        console.error('Failed to create instance:', err)
        const enhancedError = createEnhancedError(err, {
          operation: 'Create Instance',
          instanceName: data.name
        })
        throw enhancedError
      } finally {
        setIsCreating(false)
      }
    },
    [catalogClient, refetch]
  )

  /**
   * Update an existing instance in the catalog
   */
  const updateInstance = useCallback(
    async (instanceId: string, data: InstanceFormData): Promise<void> => {
      setIsUpdating(true)
      try {
        // Pattern from JobFamilyForm: include id and code in payload
        const catalogEntry = {
          id: instanceId, // Required for updates
          code: data.code, // Required (must match original)
          value: data.name,
          description: data.description || '', // Store at root level for retrieval
          displayOrder: data.displayOrder,
          translations: [],
          objectValue: {
            baseUrl: data.baseUrl,
            apiKey: data.apiKey || '',
            environment: data.environment,
            color: data.color,
            icon: data.icon,
            description: data.description || '' // Also keep in objectValue for consistency
          }
        }

        await catalogClient.updateCatalogEntry(CATALOG_NAME, CATALOG_VERSION, instanceId, catalogEntry)

        // Refresh instances list
        await refetch()
      } catch (err) {
        console.error('Failed to update instance:', err)
        const enhancedError = createEnhancedError(err, {
          operation: 'Update Instance',
          instanceName: data.name
        })
        throw enhancedError
      } finally {
        setIsUpdating(false)
      }
    },
    [catalogClient, refetch]
  )

  /**
   * Delete an instance from the catalog
   */
  const deleteInstance = useCallback(
    async (instanceId: string, instanceName: string): Promise<void> => {
      setIsDeleting(true)
      try {
        await catalogClient.deleteCatalogEntry(CATALOG_NAME, CATALOG_VERSION, instanceId)

        // Refresh instances list
        await refetch()
      } catch (err) {
        console.error('Failed to delete instance:', err)
        const enhancedError = createEnhancedError(err, {
          operation: 'Delete Instance',
          instanceName
        })
        throw enhancedError
      } finally {
        setIsDeleting(false)
      }
    },
    [catalogClient, refetch]
  )

  /**
   * Get only catalog-based instances (excludes current platform / local dev)
   */
  const getCatalogInstances = useCallback(() => {
    return instances.filter(i => i.id !== 'instance:flow:current-platform' && i.id !== 'instance:flow:local-dev')
  }, [instances])

  return {
    instances,
    catalogInstances: getCatalogInstances(),
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    createInstance,
    updateInstance,
    deleteInstance,
    refetch
  }
}
