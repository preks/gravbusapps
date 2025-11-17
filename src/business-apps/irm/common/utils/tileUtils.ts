/**
 * Utility functions for managing investment KPI tiles
 */

import { TileData, TableData, TableRow, TableColumn } from '../types/tileTypes'

/**
 * Generate a unique tile ID using crypto.randomUUID
 * Format: tile_<uuid>
 */
export const generateTileId = (): string => {
  return `tile_${crypto.randomUUID()}`
}

/**
 * Create a default 3x3 table
 */
export const createDefaultTable = (): TableData => {
  const columns: TableColumn[] = Array.from({ length: 3 }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Column ${i + 1}`
  }))

  const rows: TableRow[] = Array.from({ length: 3 }, () => {
    const cells: Record<string, string> = {}
    columns.forEach(col => {
      cells[col.id] = ''
    })
    return {
      id: crypto.randomUUID(),
      cells
    }
  })

  return { rows, columns }
}

/**
 * Load tiles array from investment additionalProperties
 * Handles both string (JSON) and object formats
 */
export const loadTilesFromInvestment = (investment: any): TileData[] => {
  if (!investment) {
    return []
  }

  const additionalProps = investment.additionalProperties

  // Handle string format (JSON)
  if (typeof additionalProps === 'string') {
    try {
      const parsed = JSON.parse(additionalProps)
      return Array.isArray(parsed?.tilesData) ? parsed.tilesData : []
    } catch (error) {
      console.error('Error parsing additionalProperties:', error)
      return []
    }
  }

  // Handle object format
  if (additionalProps && typeof additionalProps === 'object') {
    return Array.isArray(additionalProps.tilesData) ? additionalProps.tilesData : []
  }

  return []
}

/**
 * Find a specific tile by ID
 */
export const findTileById = (investment: any, tileId: string): TileData | undefined => {
  const tiles = loadTilesFromInvestment(investment)
  return tiles.find(tile => tile.id === tileId)
}

/**
 * Update tiles array with a new or updated tile
 * - If tile exists (by ID), update it
 * - If tile is new, add it with calculated order
 */
export const upsertTile = (existingTiles: TileData[], updatedTile: TileData): TileData[] => {
  const tileIndex = existingTiles.findIndex(t => t.id === updatedTile.id)

  if (tileIndex >= 0) {
    // Update existing tile
    const newTiles = [...existingTiles]
    newTiles[tileIndex] = {
      ...updatedTile,
      updatedAt: new Date().toISOString()
    }
    return newTiles
  } else {
    // Add new tile with next order number
    const maxOrder = existingTiles.reduce((max, t) => Math.max(max, t.order), 0)
    return [
      ...existingTiles,
      {
        ...updatedTile,
        order: maxOrder + 1,
        createdAt: updatedTile.createdAt || new Date().toISOString(),
        updatedAt: updatedTile.updatedAt || new Date().toISOString()
      }
    ]
  }
}

/**
 * Delete a tile by ID from tiles array
 */
export const deleteTile = (existingTiles: TileData[], tileId: string): TileData[] => {
  return existingTiles.filter(t => t.id !== tileId)
}

/**
 * Parse additionalProperties safely
 * Returns object format regardless of input format
 */
export const parseAdditionalProperties = (additionalProps: any): Record<string, any> => {
  if (typeof additionalProps === 'string') {
    try {
      return JSON.parse(additionalProps) || {}
    } catch {
      return {}
    }
  }

  if (additionalProps && typeof additionalProps === 'object') {
    return additionalProps
  }

  return {}
}

/**
 * Update investment additionalProperties with new tiles data
 * Preserves other properties in additionalProperties
 */
export const updateInvestmentTiles = (investment: any, updatedTiles: TileData[]): any => {
  const currentAdditionalProps = parseAdditionalProperties(investment.additionalProperties)

  return {
    ...currentAdditionalProps,
    tilesData: updatedTiles
  }
}
