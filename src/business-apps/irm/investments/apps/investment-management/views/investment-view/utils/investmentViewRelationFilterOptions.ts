import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { InvestmentRelationFilterOptionSource } from './investmentListColumnTransformer'

interface RelationFilterGroups {
  isLoading: boolean
  filterData: Record<string, { options: Array<{ id: string; label: string }>; totalCount: number } | undefined>
  search: (query: Record<string, string>) => Promise<unknown>
  getFilterOptions: (descriptorKey: string) => Array<{ id: string; label: string }>
}

export const injectRelationFilterOptions = (
  config: FilterConfiguration,
  sources: InvestmentRelationFilterOptionSource[],
  filterGroupsByEntity: Partial<Record<InvestmentRelationFilterOptionSource['entityName'], RelationFilterGroups>>
): FilterConfiguration => {
  const sourceByFilterId = new Map(sources.map(source => [source.filterId, source]))

  if (sources.some(source => filterGroupsByEntity[source.entityName]?.isLoading)) {
    return config
  }

  return {
    ...config,
    groups: config.groups.map(group => ({
      ...group,
      filters: group.filters.map(filter => {
        const filterId = filter.field ?? filter.id
        const source = sourceByFilterId.get(filterId)
        const relationFilterGroups = source ? filterGroupsByEntity[source.entityName] : undefined

        if (!source || !relationFilterGroups) return filter

        const data = relationFilterGroups.filterData[source.descriptorKey]
        if (!data || !filter.config || !('options' in filter.config)) return filter

        return {
          ...filter,
          config: {
            ...filter.config,
            options: data.options,
            totalCount: data.totalCount,
            hasMore: data.totalCount > data.options.length,
            onSearch: async (query: string) => {
              await relationFilterGroups.search({ [source.descriptorKey]: query })
              return relationFilterGroups.getFilterOptions(source.descriptorKey)
            }
          }
        }
      })
    }))
  }
}
