/**
 * useAssetAllocations Hook
 * Manages asset allocation history and operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AssetAllocation } from '../types'
import {
  getAllocations,
  getAllocationsForAsset,
  getCurrentAllocation as getCurrentAllocationFromStore,
  allocateAsset as allocateAssetInStore,
  deallocateAsset as deallocateAssetInStore,
  initializeMockData
} from '../data/mockData'

export const useAssetAllocations = (assetId?: string) => {
  const [allocations, setAllocations] = useState<AssetAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load allocations
  const loadAllocations = useCallback(() => {
    try {
      setIsLoading(true)
      initializeMockData()

      const loadedAllocations = assetId ? getAllocationsForAsset(assetId) : getAllocations()

      setAllocations(loadedAllocations)
      setError(null)
    } catch (err) {
      setError('Failed to load allocation history')
      console.error('Error loading allocations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [assetId])

  useEffect(() => {
    loadAllocations()
  }, [loadAllocations])

  // Get current allocation for asset
  const currentAllocation = useMemo(() => {
    if (!assetId) return undefined
    return getCurrentAllocationFromStore(assetId)
  }, [assetId, allocations])

  // Allocate asset to employee
  const allocateAsset = useCallback(
    (allocation: AssetAllocation) => {
      try {
        // Validation: Check if asset is already allocated
        const existing = getCurrentAllocationFromStore(allocation.assetId)
        if (existing) {
          throw new Error('Asset is already allocated. Please deallocate first.')
        }

        allocateAssetInStore(allocation)
        loadAllocations()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to allocate asset'
        setError(message)
        console.error('Error allocating asset:', err)
        throw err
      }
    },
    [loadAllocations]
  )

  // Deallocate asset (return from employee)
  const deallocateAsset = useCallback(
    (allocationId: string, endDate: string, conditionEnd?: string) => {
      try {
        deallocateAssetInStore(allocationId, endDate, conditionEnd)
        loadAllocations()
      } catch (err) {
        setError('Failed to deallocate asset')
        console.error('Error deallocating asset:', err)
        throw err
      }
    },
    [loadAllocations]
  )

  // Get allocation by ID
  const getAllocationById = useCallback(
    (id: string) => {
      return allocations.find(alloc => alloc.id === id)
    },
    [allocations]
  )

  // Sort allocations by date (most recent first)
  const sortedAllocations = useMemo(() => {
    return [...allocations].sort((a, b) => {
      const dateA = new Date(a.startDate).getTime()
      const dateB = new Date(b.startDate).getTime()
      return dateB - dateA
    })
  }, [allocations])

  return {
    allocations: sortedAllocations,
    currentAllocation,
    isLoading,
    error,
    allocateAsset,
    deallocateAsset,
    getAllocationById,
    refetch: loadAllocations
  }
}
