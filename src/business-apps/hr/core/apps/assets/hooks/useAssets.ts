/**
 * useAssets Hook
 * Manages asset data with CRUD operations using GraphQL
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Asset, AssetFilter } from '../types'
import { useAssetService } from '../services/useAssetService'

export const useAssets = (context: BusinessAppContextProps) => {
  const [assets, setAssets] = useState<Asset[]>([])
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

  // Load assets from GraphQL
  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await assetService.getAssets()
      setAssets(result.assets)
      setError(null)
      // Reload statistics after assets are loaded
      await loadStatistics()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load assets'))
      console.error('Error loading assets:', err)
    } finally {
      setIsLoading(false)
    }
  }, [assetService, loadStatistics])

  // Initialize data on mount - run ONCE
  useEffect(() => {
    loadAssets()
  }, []) // Empty array = run once on mount only

  // Filter assets based on current filters
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Category filter
      if (filters.category && asset.assetCategory?.value !== filters.category) {
        return false
      }

      // Status filter
      if (filters.status && asset.assetStatus !== filters.status) {
        return false
      }

      // Search filter (searches in brand, model, serial number, category)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          (asset.assetBrand?.value || '').toLowerCase().includes(searchLower) ||
          asset.model.toLowerCase().includes(searchLower) ||
          asset.serialNumber.toLowerCase().includes(searchLower) ||
          (asset.assetCategory?.value || '').toLowerCase().includes(searchLower)

        if (!matchesSearch) {
          return false
        }
      }

      return true
    })
  }, [assets, filters])

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
    assets: filteredAssets,
    allAssets: assets,
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
