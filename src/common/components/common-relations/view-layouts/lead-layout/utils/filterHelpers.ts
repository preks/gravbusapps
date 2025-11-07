import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Update filter options in a filter configuration
 */
export const updateFilterOptions = (
  filterConfig: FilterConfiguration,
  groupId: string,
  filterId: string,
  options: Array<{ id: string; label: string }>,
  totalCount?: number
) => {
  const group = filterConfig.groups.find(g => g.id === groupId)
  if (!group) return

  const filter = group.filters.find(f => f.id === filterId)
  if (filter?.config && 'options' in filter.config) {
    filter.config.options = options

    // Set totalCount if provided
    if (totalCount !== undefined && 'totalCount' in filter.config) {
      filter.config.totalCount = totalCount
    } else if ('totalCount' in filter.config) {
      // Default to options length if totalCount not provided
      filter.config.totalCount = options.length
    }

    // Set hasMore if there are more results than shown
    if ('hasMore' in filter.config && totalCount !== undefined) {
      filter.config.hasMore = totalCount > options.length
    }
  }
}

/**
 * Add search and load more functions to filter configuration
 */
export const addSearchAndLoadMoreFunctions = (
  filterConfig: FilterConfiguration,
  callbacks: {
    searchOwners?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchStatuses?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchRatings?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchSources?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchSalutations?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchIndustries?: (query: string) => Promise<Array<{ id: string; label: string }>>
    loadMoreOwners?: () => Promise<void>
    loadMoreStatuses?: () => Promise<void>
    loadMoreRatings?: () => Promise<void>
    loadMoreSources?: () => Promise<void>
    loadMoreSalutations?: () => Promise<void>
    loadMoreIndustries?: () => Promise<void>
  }
) => {
  const {
    searchOwners,
    searchStatuses,
    searchRatings,
    searchSources,
    searchSalutations,
    searchIndustries,
    loadMoreOwners,
    loadMoreStatuses,
    loadMoreRatings,
    loadMoreSources,
    loadMoreSalutations,
    loadMoreIndustries
  } = callbacks

  const ownersFilter = filterConfig.groups.find(g => g.id === 'owner-group')?.filters.find(f => f.id === 'owners')
  if (ownersFilter?.config) {
    if (searchOwners) ownersFilter.config.onSearch = searchOwners
    if (loadMoreOwners) ownersFilter.config.onLoadMore = loadMoreOwners
  }

  const statusesFilter = filterConfig.groups.find(g => g.id === 'status-group')?.filters.find(f => f.id === 'statuses')
  if (statusesFilter?.config) {
    if (searchStatuses) statusesFilter.config.onSearch = searchStatuses
    if (loadMoreStatuses) statusesFilter.config.onLoadMore = loadMoreStatuses
  }

  const ratingsFilter = filterConfig.groups.find(g => g.id === 'rating-group')?.filters.find(f => f.id === 'ratings')
  if (ratingsFilter?.config) {
    if (searchRatings) ratingsFilter.config.onSearch = searchRatings
    if (loadMoreRatings) ratingsFilter.config.onLoadMore = loadMoreRatings
  }

  const sourcesFilter = filterConfig.groups.find(g => g.id === 'source-group')?.filters.find(f => f.id === 'sources')
  if (sourcesFilter?.config) {
    if (searchSources) sourcesFilter.config.onSearch = searchSources
    if (loadMoreSources) sourcesFilter.config.onLoadMore = loadMoreSources
  }

  const salutationsFilter = filterConfig.groups
    .find(g => g.id === 'salutation-group')
    ?.filters.find(f => f.id === 'salutations')
  if (salutationsFilter?.config) {
    if (searchSalutations) salutationsFilter.config.onSearch = searchSalutations
    if (loadMoreSalutations) salutationsFilter.config.onLoadMore = loadMoreSalutations
  }

  const industriesFilter = filterConfig.groups
    .find(g => g.id === 'industry-group')
    ?.filters.find(f => f.id === 'industries')
  if (industriesFilter?.config) {
    if (searchIndustries) industriesFilter.config.onSearch = searchIndustries
    if (loadMoreIndustries) industriesFilter.config.onLoadMore = loadMoreIndustries
  }
}

/**
 * Build dynamic filter configuration from filter options
 */
export const buildDynamicFilterConfig = (
  baseConfig: FilterConfiguration,
  filterOptions: {
    owners: Array<{ id: string; label: string }>
    statuses: Array<{ id: string; label: string }>
    ratings: Array<{ id: string; label: string }>
    sources: Array<{ id: string; label: string }>
    salutations?: Array<{ id: string; label: string }>
    industries?: Array<{ id: string; label: string }>
    totalCounts?: {
      owners?: number
      statuses?: number
      ratings?: number
      sources?: number
      salutations?: number
      industries?: number
    }
    searchOwners?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchStatuses?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchRatings?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchSources?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchSalutations?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchIndustries?: (query: string) => Promise<Array<{ id: string; label: string }>>
    loadMoreOwners?: () => Promise<void>
    loadMoreStatuses?: () => Promise<void>
    loadMoreRatings?: () => Promise<void>
    loadMoreSources?: () => Promise<void>
    loadMoreSalutations?: () => Promise<void>
    loadMoreIndustries?: () => Promise<void>
  }
): FilterConfiguration => {
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

  const { owners, statuses, ratings, sources, salutations, industries, totalCounts } = filterOptions

  updateFilterOptions(filterConfig, 'owner-group', 'owners', owners, totalCounts?.owners)
  updateFilterOptions(filterConfig, 'status-group', 'statuses', statuses, totalCounts?.statuses)
  updateFilterOptions(filterConfig, 'rating-group', 'ratings', ratings, totalCounts?.ratings)
  updateFilterOptions(filterConfig, 'source-group', 'sources', sources, totalCounts?.sources)
  if (salutations) {
    updateFilterOptions(filterConfig, 'salutation-group', 'salutations', salutations, totalCounts?.salutations)
  }
  if (industries) {
    updateFilterOptions(filterConfig, 'industry-group', 'industries', industries, totalCounts?.industries)
  }

  // Add search and load more functions if available
  addSearchAndLoadMoreFunctions(filterConfig, {
    searchOwners: filterOptions.searchOwners,
    searchStatuses: filterOptions.searchStatuses,
    searchRatings: filterOptions.searchRatings,
    searchSources: filterOptions.searchSources,
    searchSalutations: filterOptions.searchSalutations,
    searchIndustries: filterOptions.searchIndustries,
    loadMoreOwners: filterOptions.loadMoreOwners,
    loadMoreStatuses: filterOptions.loadMoreStatuses,
    loadMoreRatings: filterOptions.loadMoreRatings,
    loadMoreSources: filterOptions.loadMoreSources,
    loadMoreSalutations: filterOptions.loadMoreSalutations,
    loadMoreIndustries: filterOptions.loadMoreIndustries
  })

  return filterConfig
}
