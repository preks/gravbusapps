/**
 * useAssets Hook
 * Manages asset data with CRUD operations using GraphQL
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Asset, AssetFilter, AssetStatus } from '../types'
import { useAssetService } from '../services/useAssetService'

export interface UseAssetsOptions {
  page?: number
  pageSize?: number
  search?: string
  statusFilter?: string
}

export const useAssets = (context: BusinessAppContextProps, options: UseAssetsOptions = {}) => {
  const { page = 1, pageSize = 10, search, statusFilter } = options
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
    retiredAssets: 0,
    underRepairAssets: 0
  })

  // Fetch statistics from GraphQL for accurate counts
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await assetService.getAssetStatistics()
      setStatistics(stats)
    } catch (err) {
      console.error('Error loading asset statistics:', err)
    }
  }, [assetService])

  // Build GraphQL where conditions for search and filters
  const buildWhereConditions = useCallback(() => {
    const conditions: any[] = []

    // Always exclude retired assets and deleted assets
    conditions.push({ assetStatus: { _neq: AssetStatus.RETIRED } })
    conditions.push({ isDeleted: { _eq: false } })

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      conditions.push({ assetStatus: { _eq: statusFilter } })
    }

    // Search filter - search across multiple fields
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

    // Category filter (if provided in filters)
    if (filters.category) {
      conditions.push({ assetCategory: { value: { _eq: filters.category } } })
    }

    return conditions.length > 0 ? { _and: conditions } : { isDeleted: { _eq: false } }
  }, [search, statusFilter, filters.category])

  // Load assets from GraphQL with pagination
  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true)
      const where = buildWhereConditions()
      const offset = (page - 1) * pageSize

      const result = await assetService.getAssets({
        where,
        limit: pageSize,
        offset
      })

      setAssets(result.assets)
      setTotalCount(result.totalCount)
      setError(null)
      // Reload statistics after assets are loaded
      await loadStatistics()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load assets'))
      console.error('Error loading assets:', err)
    } finally {
      setIsLoading(false)
    }
  }, [assetService, loadStatistics, buildWhereConditions, page, pageSize])

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
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add asset'))
        console.error('Error adding asset:', err)
        throw err
      }
    },
    [assetService, loadAssets]
  )

  // Update asset wrapper
  const updateAssetWrapper = useCallback(
    async (id: string, version: number, updates: Partial<Asset>) => {
      try {
        await assetService.updateAsset(id, version, updates)
        await loadAssets()
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update asset'))
        console.error('Error updating asset:', err)
        throw err
      }
    },
    [assetService, loadAssets]
  )

  // Delete asset wrapper
  const deleteAssetWrapper = useCallback(
    async (id: string, version: number) => {
      try {
        await assetService.deleteAsset(id, version)
        await loadAssets()
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete asset'))
        console.error('Error deleting asset:', err)
        throw err
      }
    },
    [assetService, loadAssets]
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
    statistics
  }
}
