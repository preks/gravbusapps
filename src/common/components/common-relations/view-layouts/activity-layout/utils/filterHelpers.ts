import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildFilterConfigFromDescriptors } from '@/common/network/graphql/descriptorUtils'
import type { UseFilterGroupsResult } from '@/common/data/common/hooks/useFilterGroups'

/**
 * Build dynamic filter configuration from useFilterGroups result
 * Automatically creates onSearch and onLoadMore callbacks for each filter
 */
export const buildDynamicFilterConfig = (
  baseConfig: FilterConfiguration,
  descriptors: Descriptor[],
  filterGroups: UseFilterGroupsResult
): FilterConfiguration => {
  const { filterData, search, getFilterOptions } = filterGroups

  // Build filterDataMap with options, totalCount, and callbacks
  const filterDataMap: Record<
    string,
    {
      options: Array<{ id: string; label: string }>
      totalCount?: number
      onSearch?: (query: string) => Promise<Array<{ id: string; label: string }>>
      onLoadMore?: () => Promise<void>
    }
  > = {}

  // Process each descriptor that has filter options
  for (const descriptor of descriptors.filter(d => d.optionSelectPaths && d.optionSelectPaths.length > 0)) {
    const data = filterData[descriptor.key]
    if (!data) continue

    filterDataMap[descriptor.key] = {
      options: data.options,
      totalCount: data.totalCount,
      // Create onSearch callback that calls search with the descriptor key
      onSearch: async (query: string) => {
        await search({ [descriptor.key]: query })
        // Return updated options after search completes
        return getFilterOptions(descriptor.key)
      },
      // Create onLoadMore callback
      onLoadMore: async () => {
        await filterGroups.refetch()
      }
    }
  }

  return buildFilterConfigFromDescriptors(baseConfig, descriptors, filterDataMap)
}

// Re-export for backward compatibility
export { buildFilterConfigFromDescriptors } from '@/common/network/graphql/descriptorUtils'
