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
    searchDepartments?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchJobPositions?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchAcademicTitles?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchSalutations?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchLanguages?: (query: string) => Promise<Array<{ id: string; label: string }>>
    loadMoreOwners?: () => Promise<void>
    loadMoreDepartments?: () => Promise<void>
    loadMoreJobPositions?: () => Promise<void>
    loadMoreAcademicTitles?: () => Promise<void>
    loadMoreSalutations?: () => Promise<void>
    loadMoreLanguages?: () => Promise<void>
  }
) => {
  const {
    searchOwners,
    searchDepartments,
    searchJobPositions,
    searchAcademicTitles,
    searchSalutations,
    searchLanguages,
    loadMoreOwners,
    loadMoreDepartments,
    loadMoreJobPositions,
    loadMoreAcademicTitles,
    loadMoreSalutations,
    loadMoreLanguages
  } = callbacks

  const ownersFilter = filterConfig.groups.find(g => g.id === 'owner-group')?.filters.find(f => f.id === 'owners')
  if (ownersFilter?.config) {
    if (searchOwners) ownersFilter.config.onSearch = searchOwners
    if (loadMoreOwners) ownersFilter.config.onLoadMore = loadMoreOwners
  }

  const departmentsFilter = filterConfig.groups
    .find(g => g.id === 'department-group')
    ?.filters.find(f => f.id === 'departments')
  if (departmentsFilter?.config) {
    if (searchDepartments) departmentsFilter.config.onSearch = searchDepartments
    if (loadMoreDepartments) departmentsFilter.config.onLoadMore = loadMoreDepartments
  }

  const jobPositionsFilter = filterConfig.groups
    .find(g => g.id === 'job-position-group')
    ?.filters.find(f => f.id === 'jobPositions')
  if (jobPositionsFilter?.config) {
    if (searchJobPositions) jobPositionsFilter.config.onSearch = searchJobPositions
    if (loadMoreJobPositions) jobPositionsFilter.config.onLoadMore = loadMoreJobPositions
  }

  const academicTitlesFilter = filterConfig.groups
    .find(g => g.id === 'academic-title-group')
    ?.filters.find(f => f.id === 'academicTitles')
  if (academicTitlesFilter?.config) {
    if (searchAcademicTitles) academicTitlesFilter.config.onSearch = searchAcademicTitles
    if (loadMoreAcademicTitles) academicTitlesFilter.config.onLoadMore = loadMoreAcademicTitles
  }

  const salutationsFilter = filterConfig.groups
    .find(g => g.id === 'salutation-group')
    ?.filters.find(f => f.id === 'salutations')
  if (salutationsFilter?.config) {
    if (searchSalutations) salutationsFilter.config.onSearch = searchSalutations
    if (loadMoreSalutations) salutationsFilter.config.onLoadMore = loadMoreSalutations
  }

  const languagesFilter = filterConfig.groups
    .find(g => g.id === 'language-group')
    ?.filters.find(f => f.id === 'languages')
  if (languagesFilter?.config) {
    if (searchLanguages) languagesFilter.config.onSearch = searchLanguages
    if (loadMoreLanguages) languagesFilter.config.onLoadMore = loadMoreLanguages
  }
}

/**
 * Build dynamic filter configuration from filter options
 */
export const buildDynamicFilterConfig = (
  baseConfig: FilterConfiguration,
  filterOptions: {
    owners: Array<{ id: string; label: string }>
    departments?: Array<{ id: string; label: string }>
    jobPositions?: Array<{ id: string; label: string }>
    academicTitles?: Array<{ id: string; label: string }>
    salutations?: Array<{ id: string; label: string }>
    languages?: Array<{ id: string; label: string }>
    totalCounts?: {
      owners?: number
      departments?: number
      jobPositions?: number
      academicTitles?: number
      salutations?: number
      languages?: number
    }
    searchOwners?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchDepartments?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchJobPositions?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchAcademicTitles?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchSalutations?: (query: string) => Promise<Array<{ id: string; label: string }>>
    searchLanguages?: (query: string) => Promise<Array<{ id: string; label: string }>>
    loadMoreOwners?: () => Promise<void>
    loadMoreDepartments?: () => Promise<void>
    loadMoreJobPositions?: () => Promise<void>
    loadMoreAcademicTitles?: () => Promise<void>
    loadMoreSalutations?: () => Promise<void>
    loadMoreLanguages?: () => Promise<void>
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

  const { owners, departments, jobPositions, academicTitles, salutations, languages, totalCounts } = filterOptions

  updateFilterOptions(filterConfig, 'owner-group', 'owners', owners, totalCounts?.owners)
  if (departments) {
    updateFilterOptions(filterConfig, 'department-group', 'departments', departments, totalCounts?.departments)
  }
  if (jobPositions) {
    updateFilterOptions(filterConfig, 'job-position-group', 'jobPositions', jobPositions, totalCounts?.jobPositions)
  }
  if (academicTitles) {
    updateFilterOptions(
      filterConfig,
      'academic-title-group',
      'academicTitles',
      academicTitles,
      totalCounts?.academicTitles
    )
  }
  if (salutations) {
    updateFilterOptions(filterConfig, 'salutation-group', 'salutations', salutations, totalCounts?.salutations)
  }
  if (languages) {
    updateFilterOptions(filterConfig, 'language-group', 'languages', languages, totalCounts?.languages)
  }

  // Add search and load more functions if available
  addSearchAndLoadMoreFunctions(filterConfig, {
    searchOwners: filterOptions.searchOwners,
    searchDepartments: filterOptions.searchDepartments,
    searchJobPositions: filterOptions.searchJobPositions,
    searchAcademicTitles: filterOptions.searchAcademicTitles,
    searchSalutations: filterOptions.searchSalutations,
    searchLanguages: filterOptions.searchLanguages,
    loadMoreOwners: filterOptions.loadMoreOwners,
    loadMoreDepartments: filterOptions.loadMoreDepartments,
    loadMoreJobPositions: filterOptions.loadMoreJobPositions,
    loadMoreAcademicTitles: filterOptions.loadMoreAcademicTitles,
    loadMoreSalutations: filterOptions.loadMoreSalutations,
    loadMoreLanguages: filterOptions.loadMoreLanguages
  })

  return filterConfig
}
