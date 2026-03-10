/**
 * Load allocation and asset data for the allocate-asset-review form.
 * Supports: psi_taskPayload.allocationId, psi_taskPayload.assetId, or inline allocation/asset.
 */

import { useState, useEffect, useCallback } from 'react'
import { Asset } from '../../../apps/assets/types'
import { AssetAllocation } from '../../../apps/assets/types'
import { useAssetService } from '../../../apps/assets/services/useAssetService'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface AdditionalData {
  psi_taskPayload?: {
    allocationId?: string
    assetId?: string
    /** Allocation id from process (employeeAsset.id). */
    employeeAssetId?: string
    /** Inline allocation or employeeAsset from process. */
    allocation?: AssetAllocation
    asset?: Asset
    employeeAsset?: { id?: string; assetId?: string; asset?: string; [k: string]: any }
  }
  psi_processMetadata?: {
    variables?: {
      employeeAsset?: { id?: string; assetId?: string; asset?: string; [k: string]: any }
      assetId?: string
    }
  }
  assetId?: string
  asset?: Asset
}

export interface UseAllocateAssetReviewDataResult {
  allocation: AssetAllocation | null
  asset: Asset | null
  assetDisplayName: string
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAllocateAssetReviewData(
  context: BusinessAppContextProps,
  additionalData?: AdditionalData
): UseAllocateAssetReviewDataResult {
  const [allocation, setAllocation] = useState<AssetAllocation | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const payload = additionalData?.psi_taskPayload
  const variables = additionalData?.psi_processMetadata?.variables
  const { getEmployeeAssetById, getCurrentAllocation, getAssetById } = useAssetService(context)

  const allocationId =
    payload?.allocationId ?? payload?.employeeAssetId ?? payload?.employeeAsset?.id ?? variables?.employeeAsset?.id
  const assetIdFromPayload =
    payload?.assetId ??
    payload?.employeeAsset?.asset ??
    payload?.employeeAsset?.assetId ??
    variables?.employeeAsset?.asset ??
    variables?.assetId ??
    additionalData?.assetId
  const allocationFromPayload = payload?.allocation
  const assetFromPayload = payload?.asset ?? additionalData?.asset

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let alloc: AssetAllocation | null = allocationFromPayload ?? null
      let assetData: Asset | null = assetFromPayload ?? null

      if (allocationId && !alloc) {
        alloc = await getEmployeeAssetById(allocationId)
        if (alloc?.assetId) {
          assetData = await getAssetById(alloc.assetId)
        }
      } else if (assetIdFromPayload && !alloc) {
        alloc = await getCurrentAllocation(assetIdFromPayload)
        if (!assetData) {
          assetData = await getAssetById(assetIdFromPayload)
        }
      }
      if (assetIdFromPayload && !assetData) {
        assetData = await getAssetById(assetIdFromPayload)
      }
      if (alloc?.assetId && !assetData) {
        assetData = await getAssetById(alloc.assetId)
      }

      setAllocation(alloc)
      setAsset(assetData)
    } catch (err) {
      console.error('Error loading allocate-asset-review data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load allocation details')
    } finally {
      setLoading(false)
    }
  }, [
    allocationId,
    assetIdFromPayload,
    allocationFromPayload,
    assetFromPayload,
    getEmployeeAssetById,
    getCurrentAllocation,
    getAssetById
  ])

  useEffect(() => {
    if (!context.accessToken) {
      setLoading(false)
      return
    }
    if (allocationFromPayload ?? assetFromPayload) {
      setAllocation(allocationFromPayload ?? null)
      setAsset(assetFromPayload ?? null)
      setLoading(false)
      return
    }
    if (allocationId ?? assetIdFromPayload) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [context.accessToken, allocationId, assetIdFromPayload, allocationFromPayload, assetFromPayload])

  const assetDisplayName =
    asset != null ? `${asset.assetBrand?.value ?? ''} ${asset.model ?? ''}`.trim() || 'Asset' : 'Asset'

  return {
    allocation,
    asset,
    assetDisplayName,
    loading,
    error,
    refetch: fetchData
  }
}
