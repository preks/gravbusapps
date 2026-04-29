import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { InvestmentCatalogEntry, InvestmentGroup, InvestmentListCatalogData } from '../hooks/useInvestmentGroups'

const BASE_FILTER_ALIASES: Record<string, string[]> = {
  createdAtRange: ['createdAt'],
  plannedExitDateRange: ['plannedExitDate']
}

export const mergeFilterConfigurations = (
  baseConfig: FilterConfiguration,
  dynamicConfig?: FilterConfiguration
): FilterConfiguration => {
  if (!dynamicConfig?.groups?.length) {
    return baseConfig
  }

  const existingFilterIds = new Set(
    baseConfig.groups.flatMap(group =>
      group.filters.flatMap(filter => {
        const filterId = filter.field || filter.id
        return [filterId, ...(BASE_FILTER_ALIASES[filterId] || [])]
      })
    )
  )
  const dynamicGroups = dynamicConfig.groups
    .map(group => ({
      ...group,
      filters: group.filters.filter(filter => !existingFilterIds.has(filter.field || filter.id))
    }))
    .filter(group => group.filters.length > 0)

  if (dynamicGroups.length === 0) {
    return baseConfig
  }

  return {
    ...baseConfig,
    groups: [...baseConfig.groups, ...dynamicGroups]
  }
}

export const belongsToInvestmentGroup = (entry: InvestmentCatalogEntry, group: InvestmentGroup): boolean => {
  return (
    entry.parentEntryId === group.id ||
    entry.parentEntryId === group.code ||
    entry.parentEntry?.id === group.id ||
    entry.parentEntry?.code === group.code
  )
}

export const getInvestmentTypeFilterOptions = (
  currentSection: string,
  investmentGroups: InvestmentGroup[],
  catalogData: InvestmentListCatalogData
): Array<{ id: string; label: string }> | null => {
  if (currentSection === 'overview') {
    return null
  }

  const group = investmentGroups.find(item => item.tabId === currentSection)
  if (!group) {
    return null
  }

  const options = catalogData.investmentTypes
    .filter(entry => belongsToInvestmentGroup(entry, group))
    .map(entry => ({
      id: entry.id,
      label: entry.value || entry.code || entry.id
    }))

  return Array.from(new Map(options.map(option => [option.id, option])).values())
}
