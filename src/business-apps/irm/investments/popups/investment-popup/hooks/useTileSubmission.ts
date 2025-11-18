/**
 * Hook for managing tile submission logic
 * Handles tile array upsert operations and payload building
 */

import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Investment } from '@/common/data/investment/types'
import {
  TileData,
  TILE_TYPES,
  generateTileId,
  loadTilesFromInvestment,
  findTileById,
  upsertTile
} from '@/business-apps/irm/investments/records/investment-record/tiles'
import { parseAdditionalProperties, validateInvestmentData } from '../utils/investmentPopupUtils'
import { buildInvestmentPopupPayload } from '../utils/investmentPopupPayloadHelper'

interface UseTileSubmissionParams {
  investment: Investment | null
  businessAppContext: BusinessAppContextProps
  tileId?: string
  tileType: keyof typeof TILE_TYPES
  businessKeyPrefix: string
}

export const useTileSubmission = (params: UseTileSubmissionParams) => {
  const { investment, businessAppContext, tileId, tileType, businessKeyPrefix } = params

  const isEditMode = !!tileId

  const buildTileSubmission = useCallback(
    (tileSpecificData: Partial<TileData>) => {
      // Validate investment data exists
      validateInvestmentData(investment)

      if (!investment) {
        throw new Error('Investment data not loaded')
      }

      // Get current tiles
      const currentTiles = loadTilesFromInvestment(investment)

      // Create or update tile
      const tileData: TileData = {
        id: tileId || generateTileId(),
        type: TILE_TYPES[tileType],
        order: 0, // Will be calculated by upsertTile
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...tileSpecificData
      } as TileData

      // If editing, preserve creation date and order
      if (isEditMode && tileId) {
        const existingTile = findTileById(investment, tileId)
        if (existingTile) {
          tileData.createdAt = existingTile.createdAt
          tileData.order = existingTile.order
        }
      }

      // Update tiles array
      const updatedTiles = upsertTile(currentTiles, tileData)

      // Get current additionalProperties
      const currentAdditionalProps = parseAdditionalProperties(investment.additionalProperties)

      // Update additionalProperties with new tiles
      const updatedAdditionalProperties = {
        ...currentAdditionalProps,
        tilesData: updatedTiles
      }

      // Build the payload using the centralized helper
      const payload = buildInvestmentPopupPayload({
        investment,
        updatedAdditionalProperties,
        businessAppContext,
        businessKeyPrefix,
        businessKeySuffix: tileData.id
      })

      return { payload, tileData }
    },
    [investment, businessAppContext, tileId, tileType, businessKeyPrefix, isEditMode]
  )

  return {
    isEditMode,
    buildTileSubmission
  }
}
