/**
 * Custom hook to extract asset data from additionalData
 * Handles all the different possible paths where asset data might be located
 */

import { useMemo } from 'react'
import { Asset } from '../../../apps/assets/types'

interface AdditionalData {
  assetId?: string
  asset?: Asset
  version?: number
  psi_taskPayload?: {
    assetId?: string
    asset?: Asset
    version?: number
    initialParameters?: {
      assetId?: string
      asset?: Asset
      version?: number
    }
    psi_initialParameters?: {
      assetId?: string
      asset?: Asset
      version?: number
    }
  }
}

export const useAssetFormData = (additionalData?: AdditionalData) => {
  const assetId = useMemo(() => {
    return (
      additionalData?.assetId ||
      additionalData?.psi_taskPayload?.assetId ||
      additionalData?.psi_taskPayload?.initialParameters?.assetId ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.assetId ||
      null
    )
  }, [additionalData])

  const existingAsset = useMemo(() => {
    return (
      additionalData?.asset ||
      additionalData?.psi_taskPayload?.asset ||
      additionalData?.psi_taskPayload?.initialParameters?.asset ||
      additionalData?.psi_taskPayload?.psi_initialParameters?.asset ||
      null
    )
  }, [additionalData])

  const assetVersion = useMemo(() => {
    if (existingAsset?.version !== undefined) {
      return existingAsset.version
    }
    if (additionalData?.version !== undefined) {
      return additionalData.version
    }
    if (additionalData?.psi_taskPayload?.version !== undefined) {
      return additionalData.psi_taskPayload.version
    }
    if (additionalData?.psi_taskPayload?.initialParameters?.version !== undefined) {
      return additionalData.psi_taskPayload.initialParameters.version
    }
    if (additionalData?.psi_taskPayload?.psi_initialParameters?.version !== undefined) {
      return additionalData.psi_taskPayload.psi_initialParameters.version
    }
    return 0
  }, [existingAsset, additionalData])

  const assetDisplayName = useMemo(() => {
    if (!existingAsset) return 'Asset'
    return `${existingAsset.assetBrand?.value || ''} ${existingAsset.model || ''}`.trim() || 'Asset'
  }, [existingAsset])

  return {
    assetId,
    existingAsset,
    assetVersion,
    assetDisplayName
  }
}
