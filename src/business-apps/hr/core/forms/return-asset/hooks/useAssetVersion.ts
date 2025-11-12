/**
 * Custom hook to resolve the current asset version
 * Tries multiple sources and falls back gracefully
 */

import { useState, useCallback } from 'react'
import { useAssetService } from '../../../apps/assets/services/useAssetService'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Asset } from '../../../apps/assets/types'

interface UseAssetVersionOptions {
  assetId: string | null
  existingAsset?: Asset | null
  fallbackVersion?: number
}

export const useAssetVersion = (context: BusinessAppContextProps, options: UseAssetVersionOptions) => {
  const { assetId, existingAsset, fallbackVersion } = options
  const assetService = useAssetService(context)
  const [isResolving, setIsResolving] = useState(false)

  const resolveAssetVersion = useCallback(async (): Promise<number> => {
    if (!assetId) {
      throw new Error('Asset ID is required to resolve version')
    }

    // First, try existing asset version
    if (existingAsset?.version !== undefined && existingAsset.version !== null) {
      return existingAsset.version
    }

    // Try to fetch from API
    setIsResolving(true)
    try {
      const currentAsset = await assetService.getAssetById(assetId)
      if (currentAsset?.version !== undefined) {
        return currentAsset.version
      }
    } catch (error) {
      console.error('Error fetching asset version from API:', error)
    } finally {
      setIsResolving(false)
    }

    // Fallback to provided version
    if (fallbackVersion !== undefined && fallbackVersion !== null && fallbackVersion !== 0) {
      return fallbackVersion
    }

    throw new Error(`Cannot resolve asset version: version is required but not available. Asset ID: ${assetId}`)
  }, [assetId, existingAsset, fallbackVersion, assetService])

  return {
    resolveAssetVersion,
    isResolving
  }
}
