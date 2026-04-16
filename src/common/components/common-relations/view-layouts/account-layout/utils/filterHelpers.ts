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
      // Create onLoadMore callback (for now just refetches, TODO: implement pagination)
      onLoadMore: async () => {
        await filterGroups.refetch()
      }
    }
  }

  const enriched = buildFilterConfigFromDescriptors(baseConfig, descriptors, filterDataMap)

  // Override filter type/config when a descriptor says 'number' but the catalog generated
  // a text filter (e.g. MOIC, IRR whose catalog field type isn't AMOUNT/NUMBER/PERCENTAGE).
  const numberDescriptorKeys = new Set(
    descriptors.filter(d => d.type === 'number' && d.path && !d.kind).map(d => d.key)
  )

  enriched.groups = enriched.groups.map(group => ({
    ...group,
    filters: group.filters.map(filter => {
      if (filter.type !== 'number' && numberDescriptorKeys.has(filter.field ?? filter.id)) {
        return {
          ...filter,
          type: 'number' as const,
          config: {
            mode: 'range',
            placeholderMin: 'Min',
            placeholderMax: 'Max'
          }
        }
      }
      return filter
    })
  }))

  return enriched
}

// Re-export for backward compatibility
export { buildFilterConfigFromDescriptors } from '@/common/network/graphql/descriptorUtils'
