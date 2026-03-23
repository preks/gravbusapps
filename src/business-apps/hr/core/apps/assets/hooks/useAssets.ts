/**
 * useAssets Hook
 * Manages asset data with CRUD operations using GraphQL
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Asset, AssetFilter } from '../types'
import { useAssetService } from '../services/useAssetService'

export interface UseAssetsOptions {
  page?: number
  pageSize?: number
  search?: string
  /** Status filter: when array with length > 0, filter by those statuses; otherwise no status filter */
  statusFilter?: string[]
  categoryFilter?: string[]
  locationFilter?: string[]
  /** Employee filter: when array with length > 0, only assets with current allocation to one of these employee ids */
  employeeFilter?: string[]
  /** acquisitionDate _gte (inclusive range start), YYYY-MM-DD */
  acquisitionDateFrom?: string
  /** acquisitionDate _lte (inclusive range end), YYYY-MM-DD */
  acquisitionDateTo?: string
  /** disposalDate _gte (inclusive range start), YYYY-MM-DD */
  disposalDateFrom?: string
  /** disposalDate _lte (inclusive range end), YYYY-MM-DD */
  disposalDateTo?: string
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
}

export const useAssets = (context: BusinessAppContextProps, options: UseAssetsOptions = {}) => {
  const {
    page = 1,
    pageSize = 10,
    search,
    statusFilter,
    categoryFilter,
    locationFilter,
    employeeFilter,
    acquisitionDateFrom,
    acquisitionDateTo,
    disposalDateFrom,
    disposalDateTo,
    sortField,
    sortOrder
  } = options
  const [assets, setAssets] = useState<Asset[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFilters] = useState<AssetFilter>({})

  const assetService = useAssetService(context)

  const [statistics, setStatistics] = useState({
    totalAssets: 0,
    availableAssets: 0,
    allocatedAssets: 0,
    underRepairAssets: 0,
    retiredAssets: 0
  })
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [statisticsError, setStatisticsError] = useState<Error | null>(null)

  // Fetch statistics from GraphQL for accurate counts
  // Only updates statistics if values actually changed to prevent unnecessary re-renders
  const loadStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true)
      setStatisticsError(null)
      const stats = await assetService.getAssetStatistics()
      // Only update if values actually changed
      setStatistics(prevStats => {
        if (
          prevStats.totalAssets === stats.totalAssets &&
          prevStats.allocatedAssets === stats.allocatedAssets &&
          prevStats.availableAssets === stats.availableAssets &&
          prevStats.underRepairAssets === stats.underRepairAssets &&
          prevStats.retiredAssets === stats.retiredAssets
        ) {
          return prevStats // Return same reference if values unchanged
        }
        return stats
      })
    } catch (err) {
      const raw = err instanceof Error ? err : new Error('Failed to load statistics')
      const message =
        raw.message === 'Failed to fetch'
          ? 'Network error. Check your connection and that the service is available.'
          : raw.message
      setStatisticsError(new Error(message))
      console.error('Error loading asset statistics:', err)
    } finally {
      setStatisticsLoading(false)
    }
  }, [assetService])

  // Build GraphQL where conditions for search and filters
  const buildWhereConditions = useCallback(() => {
    const conditions: any[] = []

    conditions.push({ isDeleted: { _eq: false } })

    // Status filter - multi-select from sidebar
    if (statusFilter && statusFilter.length > 0) {
      conditions.push({ assetStatus: { _in: statusFilter } })
    }

    // Search filter - search across multiple fields (includes retired assets)
    if (search?.trim()) {
      const searchPattern = { _ilike: `%${search.trim()}%` }
      conditions.push({
        _or: [
          { model: searchPattern },
          { serialNumber: searchPattern },
          { assetBrand: { value: searchPattern } },
          { assetCategory: { value: searchPattern } },
          { siteLocation: { name: searchPattern } }
        ]
      })
    }

    // Category filter (assetCategoryRef) - multi-select
    if (categoryFilter && categoryFilter.length > 0) {
      conditions.push({ assetCategoryRef: { _in: categoryFilter } })
    }

    // Location filter (siteLocationId) - multi-select
    if (locationFilter && locationFilter.length > 0) {
      conditions.push({ siteLocationId: { _in: locationFilter } })
    }

    // Acquisition date – inclusive range (_gte / _lte), YYYY-MM-DD
    const acquisitionCmp: { _gte?: string; _lte?: string } = {}
    if (acquisitionDateFrom?.trim()) {
      acquisitionCmp._gte = acquisitionDateFrom.trim()
    }
    if (acquisitionDateTo?.trim()) {
      acquisitionCmp._lte = acquisitionDateTo.trim()
    }
    if (Object.keys(acquisitionCmp).length > 0) {
      conditions.push({ acquisitionDate: acquisitionCmp })
    }

    // Disposal date – inclusive range
    const disposalCmp: { _gte?: string; _lte?: string } = {}
    if (disposalDateFrom?.trim()) {
      disposalCmp._gte = disposalDateFrom.trim()
    }
    if (disposalDateTo?.trim()) {
      disposalCmp._lte = disposalDateTo.trim()
    }
    if (Object.keys(disposalCmp).length > 0) {
      conditions.push({ disposalDate: disposalCmp })
    }

    // Employee filter is applied in loadAssets by first fetching asset IDs from EmployeeAsset, then id _in (see loadAssets)
    return conditions.length > 0 ? { _and: conditions } : { isDeleted: { _eq: false } }
  }, [
    search,
    statusFilter,
    categoryFilter,
    locationFilter,
    acquisitionDateFrom,
    acquisitionDateTo,
    disposalDateFrom,
    disposalDateTo
  ])

  // Build orderBy for GraphQL query (must be an array)
  const buildOrderBy = useCallback((): any[] => {
    if (!sortField || !sortOrder) {
      return [{ createdAt: 'DESC' }] // Default sort as array
    }

    // Handle nested fields (e.g., "assetCategory.value" -> { assetCategory: { value: 'ASC' } })
    if (sortField.includes('.')) {
      const [parentField, childField] = sortField.split('.')
      return [{ [parentField]: { [childField]: sortOrder } }]
    }

    // Handle simple fields
    return [{ [sortField]: sortOrder }]
  }, [sortField, sortOrder])

  // Load assets from GraphQL with pagination
  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true)
      const where = buildWhereConditions()

      let assetIds: string[] | undefined
      if (employeeFilter && employeeFilter.length > 0) {
        assetIds = await assetService.getAssetIdsByEmployeeIds(employeeFilter)
      }

      const offset = (page - 1) * pageSize
      const orderBy = buildOrderBy()

      const result = await assetService.getAssets({
        where,
        assetIds,
        limit: pageSize,
        offset,
        orderBy
      })

      setAssets(result.assets)
      setTotalCount(result.totalCount)
      setError(null)
      // Note: Statistics are NOT reloaded here - they only reload when assets are modified
    } catch (err) {
      const raw = err instanceof Error ? err : new Error('Failed to load assets')
      const message =
        raw.message === 'Failed to fetch'
          ? 'Network error. Check your connection and that the service is available.'
          : raw.message
      setError(new Error(message))
      console.error('Error loading assets:', err)
    } finally {
      setIsLoading(false)
    }
  }, [assetService, buildWhereConditions, buildOrderBy, page, pageSize, employeeFilter])

  // Load statistics on initial mount only
  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  // Reload assets when pagination, search, or filters change
  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  // Add new asset
  const addAsset = useCallback(
    async (asset: Omit<Asset, 'id' | 'status' | 'currentAllocationId'>) => {
      try {
        await assetService.createAsset(asset)
        await loadAssets()
        await loadStatistics() // Reload statistics when asset is created
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add asset'))
        console.error('Error adding asset:', err)
        throw err
      }
    },
    [assetService, loadAssets, loadStatistics]
  )

  // Update asset wrapper
  const updateAssetWrapper = useCallback(
    async (id: string, version: number, updates: Partial<Asset>) => {
      try {
        await assetService.updateAsset(id, version, updates)
        await loadAssets()
        // Reload statistics if status changed (affects counts)
        if (updates.assetStatus) {
          await loadStatistics()
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update asset'))
        console.error('Error updating asset:', err)
        throw err
      }
    },
    [assetService, loadAssets, loadStatistics]
  )

  // Delete asset wrapper
  const deleteAssetWrapper = useCallback(
    async (id: string, version: number) => {
      try {
        await assetService.deleteAsset(id, version)
        await loadAssets()
        await loadStatistics() // Reload statistics when asset is deleted
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete asset'))
        console.error('Error deleting asset:', err)
        throw err
      }
    },
    [assetService, loadAssets, loadStatistics]
  )

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AssetFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // Get asset by ID
  const getAssetById = useCallback(
    (id: string) => {
      return assets.find(asset => asset.id === id)
    },
    [assets]
  )

  return {
    assets,
    totalCount,
    isLoading,
    error,
    filters,
    updateFilters,
    clearFilters,
    addAsset,
    updateAsset: updateAssetWrapper,
    deleteAsset: deleteAssetWrapper,
    getAssetById,
    refetch: () => {
      loadAssets()
      loadStatistics()
    },
    refetchStatistics: loadStatistics,
    statistics,
    statisticsLoading,
    statisticsError
  }
}
