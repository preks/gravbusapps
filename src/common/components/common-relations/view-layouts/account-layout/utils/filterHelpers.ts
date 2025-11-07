import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { CommonAccountFilters } from '@/common/data/relations/types/commonAccountTypes'

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
    searchIndustries?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchLegalForms?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchCompanySizes?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchRevenueBands?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchCountries?: (query: string) => Promise<Array<{ id: string; label: string }>>
    loadMoreOwners?: () => Promise<void>
    loadMoreIndustries?: () => Promise<void>
    loadMoreLegalForms?: () => Promise<void>
    loadMoreCompanySizes?: () => Promise<void>
    loadMoreRevenueBands?: () => Promise<void>
    loadMoreCountries?: () => Promise<void>
  }
) => {
  const {
    searchOwners,
    searchIndustries,
    searchLegalForms,
    searchCompanySizes,
    searchRevenueBands,
    searchCountries,
    loadMoreOwners,
    loadMoreIndustries,
    loadMoreLegalForms,
    loadMoreCompanySizes,
    loadMoreRevenueBands,
    loadMoreCountries
  } = callbacks

  const ownersFilter = filterConfig.groups
    .find(g => g.id === 'owner-group')
    ?.filters.find(f => f.id === 'ownerEmployeeIds')
  if (ownersFilter?.config) {
    if (searchOwners) ownersFilter.config.onSearch = searchOwners
    if (loadMoreOwners) ownersFilter.config.onLoadMore = loadMoreOwners
  }

  const industriesFilter = filterConfig.groups
    .find(g => g.id === 'industry-group')
    ?.filters.find(f => f.id === 'industryClassIds')
  if (industriesFilter?.config) {
    if (searchIndustries) industriesFilter.config.onSearch = searchIndustries
    if (loadMoreIndustries) industriesFilter.config.onLoadMore = loadMoreIndustries
  }

  const legalFormsFilter = filterConfig.groups
    .find(g => g.id === 'legal-form-group')
    ?.filters.find(f => f.id === 'legalFormIds')
  if (legalFormsFilter?.config) {
    if (searchLegalForms) legalFormsFilter.config.onSearch = searchLegalForms
    if (loadMoreLegalForms) legalFormsFilter.config.onLoadMore = loadMoreLegalForms
  }

  const companySizesFilter = filterConfig.groups
    .find(g => g.id === 'company-size-group')
    ?.filters.find(f => f.id === 'companySizeIds')
  if (companySizesFilter?.config) {
    if (searchCompanySizes) companySizesFilter.config.onSearch = searchCompanySizes
    if (loadMoreCompanySizes) companySizesFilter.config.onLoadMore = loadMoreCompanySizes
  }

  const revenueBandsFilter = filterConfig.groups
    .find(g => g.id === 'revenue-group')
    ?.filters.find(f => f.id === 'accountAnnualRevenueBandIds')
  if (revenueBandsFilter?.config) {
    if (searchRevenueBands) revenueBandsFilter.config.onSearch = searchRevenueBands
    if (loadMoreRevenueBands) revenueBandsFilter.config.onLoadMore = loadMoreRevenueBands
  }

  const countriesFilter = filterConfig.groups
    .find(g => g.id === 'country-group')
    ?.filters.find(f => f.id === 'countries')
  if (countriesFilter?.config) {
    if (searchCountries) countriesFilter.config.onSearch = searchCountries
    if (loadMoreCountries) countriesFilter.config.onLoadMore = loadMoreCountries
  }
}

/**
 * Build dynamic filter configuration from filter options
 */
export const buildDynamicFilterConfig = (
  baseConfig: FilterConfiguration,
  filterOptions: CommonAccountFilters
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

  const { owners, industries, legalForms, companySizes, revenueBands, countries, totalCounts } = filterOptions

  updateFilterOptions(filterConfig, 'owner-group', 'ownerEmployeeIds', owners, totalCounts?.owners)
  updateFilterOptions(filterConfig, 'industry-group', 'industryClassIds', industries, totalCounts?.industries)
  updateFilterOptions(filterConfig, 'legal-form-group', 'legalFormIds', legalForms, totalCounts?.legalForms)
  updateFilterOptions(filterConfig, 'company-size-group', 'companySizeIds', companySizes, totalCounts?.companySizes)
  updateFilterOptions(
    filterConfig,
    'revenue-group',
    'accountAnnualRevenueBandIds',
    revenueBands,
    totalCounts?.revenueBands
  )
  updateFilterOptions(filterConfig, 'country-group', 'countries', countries, totalCounts?.countries)

  // Add search and load more functions if available
  addSearchAndLoadMoreFunctions(filterConfig, {
    searchOwners: filterOptions.searchOwners,
    searchIndustries: filterOptions.searchIndustries,
    searchLegalForms: filterOptions.searchLegalForms,
    searchCompanySizes: filterOptions.searchCompanySizes,
    searchRevenueBands: filterOptions.searchRevenueBands,
    searchCountries: filterOptions.searchCountries,
    loadMoreOwners: filterOptions.loadMoreOwners,
    loadMoreIndustries: filterOptions.loadMoreIndustries,
    loadMoreLegalForms: filterOptions.loadMoreLegalForms,
    loadMoreCompanySizes: filterOptions.loadMoreCompanySizes,
    loadMoreRevenueBands: filterOptions.loadMoreRevenueBands,
    loadMoreCountries: filterOptions.loadMoreCountries
  })

  return filterConfig
}
