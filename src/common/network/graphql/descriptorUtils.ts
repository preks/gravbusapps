/**
 * Utility functions for working with Descriptors and Columns
 */

import type { Descriptor } from './queryHelpers'
import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Merge multiple descriptor arrays, with later arrays overriding earlier ones
 * Descriptors with the same key in later arrays will replace those in earlier arrays
 *
 * @param descriptorArrays - Array of descriptor arrays to merge (later arrays override earlier ones)
 * @returns Merged descriptor array
 */
export function mergeDescriptors(...descriptorArrays: Descriptor[][]): Descriptor[] {
  const merged = new Map<string, Descriptor>()

  // Process arrays in order, later descriptors override earlier ones
  for (const descriptors of descriptorArrays) {
    for (const descriptor of descriptors) {
      merged.set(descriptor.key, descriptor)
    }
  }

  return Array.from(merged.values())
}

/**
 * Derive sortable columns from descriptors
 * Returns columns that have sorting enabled (enableSort !== false) and have a sortPath or sortPaths
 * Only includes columns that are actually present in the table (if availableColumnIds provided)
 *
 * @param descriptors - Single descriptor array, or multiple arrays that will be merged (later override earlier)
 * @param labelMap - Optional map of descriptor keys to display labels (defaults to key if not provided)
 * @param availableColumnIds - Optional array of column IDs that are actually in the table. If provided, only descriptors with keys matching these IDs will be included.
 * @returns Array of sortable column definitions for UI
 */
export function deriveSortableColumns(
  descriptors: Descriptor[] | Descriptor[][],
  labelMap?: Record<string, string>,
  availableColumnIds?: string[]
): Array<{ id: string; label: string }> {
  // If multiple arrays provided (rest parameters), merge them (later override earlier)
  const mergedDescriptors =
    Array.isArray(descriptors) && descriptors.length > 0 && Array.isArray(descriptors[0])
      ? mergeDescriptors(...(descriptors as Descriptor[][]))
      : (descriptors as Descriptor[])

  // Create a Set for fast lookup if availableColumnIds is provided
  const availableIdsSet = availableColumnIds ? new Set(availableColumnIds) : null

  return mergedDescriptors
    .filter(d => {
      // Skip if sorting is explicitly disabled
      if (d.enableSort === false) return false
      // Must have sortPath or sortPaths to be sortable
      if (!(d.sortPath || (d.sortPaths && d.sortPaths.length > 0))) return false
      // If availableColumnIds provided, only include if the descriptor key matches a column ID
      if (availableIdsSet && !availableIdsSet.has(d.key)) return false
      return true
    })
    .map(d => ({
      id: d.key,
      label: labelMap?.[d.key] || d.key
    }))
}

/**
 * Derive available columns from column definitions
 * Extracts id and header/label from ColumnDef array for column selector
 *
 * @param columns - Array of column definitions
 * @returns Array of available column definitions for UI
 */
export function deriveAvailableColumns<T = any>(columns: ColumnDef<T>[]): Array<{ id: string; label: string }> {
  return columns
    .filter(col => col.id) // Only include columns with an id
    .map(col => {
      const id = col.id as string
      // Extract label from header (can be string or function)
      let label = id
      if (typeof col.header === 'string') {
        label = col.header
      } else if (typeof col.header === 'function') {
        // For function headers, try to get a reasonable default
        // In practice, these should have explicit labels in the column definition
        label = id
      }
      return { id, label }
    })
}

/**
 * Build filter configuration from descriptors and filter data
 * Automatically maps descriptor.key to filter.field in baseConfig
 * Sets totalCount, hasMore, and callbacks based on provided data
 * Design system will automatically enable search mode when totalCount exceeds threshold
 *
 * @param baseConfig - Base filter configuration from config files
 * @param descriptors - Descriptors array with optionSelectPaths for filter options
 * @param filterData - Map of descriptor.key to filter data (options, totalCount, callbacks)
 * @returns Updated filter configuration with options and callbacks
 */
export function buildFilterConfigFromDescriptors(
  baseConfig: FilterConfiguration,
  descriptors: Descriptor[],
  filterData: Record<
    string,
    {
      options: Array<{ id: string; label: string }>
      totalCount?: number
      onSearch?: (query: string) => Promise<Array<{ id: string; label: string }>>
      onLoadMore?: () => Promise<void>
    }
  >
): FilterConfiguration {
  // Deep clone to avoid mutations
  const filterConfig: FilterConfiguration = {
    ...baseConfig,
    groups: baseConfig.groups.map(group => ({
      ...group,
      filters: group.filters.map(filter => ({
        ...filter,
        config: { ...filter.config }
      }))
    }))
  }

  // Process descriptors that have filter options
  descriptors
    .filter(d => d.optionSelectPaths && d.optionSelectPaths.length > 0)
    .forEach(descriptor => {
      const data = filterData[descriptor.key]
      if (!data) return

      // Find filter by field matching descriptor.key
      const group = filterConfig.groups.find(g => g.filters.some(f => f.field === descriptor.key))
      if (!group) return

      const filter = group.filters.find(f => f.field === descriptor.key)
      if (!filter?.config || !('options' in filter.config)) return

      // Update filter label if descriptor has filterLabel
      if (descriptor.filterLabel) {
        filter.label = descriptor.filterLabel
      }

      // Update options
      filter.config.options = data.options

      // Set totalCount (use provided or default to options.length)
      const totalCount = data.totalCount ?? data.options.length
      if ('totalCount' in filter.config) {
        filter.config.totalCount = totalCount
      }

      // Design system automatically enables search if totalCount > threshold
      // We just ensure totalCount is set correctly

      // Set hasMore
      if ('hasMore' in filter.config && data.totalCount !== undefined) {
        filter.config.hasMore = data.totalCount > data.options.length
      }

      // Add callbacks if provided
      if (data.onSearch) filter.config.onSearch = data.onSearch
      if (data.onLoadMore) filter.config.onLoadMore = data.onLoadMore
    })

  return filterConfig
}
