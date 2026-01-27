import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ActivityViewConfig } from '@/common/components/common-relations/view-layouts/activity-layout/ActivityLayout'
import type { InvestmentActivity } from '@/common/data/investment/types/investmentActivityTypes'
import type { InvestmentActivityQueryVariables } from '@/common/data/investment/queries/investmentActivityQueries'
import { useGetInvestmentActivities } from '@/common/data/investment/hooks/useInvestmentActivities'
import {
  createActivityColumns,
  activitySortableColumns,
  activityAvailableColumns,
  activityFilterConfig
} from '@/common/components/common-relations/view-layouts/activity-layout/config'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/utils/filterHelpers'
import { createActivityDescriptors } from '@/common/data/relations/types/activityTypes'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

/**
 * Helper: Build sorting configuration
 */
const buildSortingConfig = (sorting: Array<{ id: string; desc: boolean }>) => {
  if (sorting.length > 0) {
    return sorting.map(sort => ({
      field: sort.id as any,
      direction: sort.desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
    }))
  }
  return [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
}

/**
 * Helper: Apply activity filters to variables
 */
const applyActivityFilters = (
  variables: InvestmentActivityQueryVariables,
  selectedFilters: Record<string, any>
): void => {
  if (selectedFilters.activityTypeIds && Array.isArray(selectedFilters.activityTypeIds)) {
    variables.activityTypeIds = selectedFilters.activityTypeIds
  }

  if (selectedFilters.ownerEmployeeIds && Array.isArray(selectedFilters.ownerEmployeeIds)) {
    variables.ownerEmployeeIds = selectedFilters.ownerEmployeeIds
  }

  if (selectedFilters.referenceType && Array.isArray(selectedFilters.referenceType)) {
    variables.referenceTypes = selectedFilters.referenceType
  }
}

/**
 * Helper: Apply date range filters to variables
 */
const applyDateRangeFilters = (
  variables: InvestmentActivityQueryVariables,
  selectedFilters: Record<string, any>
): void => {
  const createdAtRange = normalizeDateRange(selectedFilters.createdAtRange)
  if (createdAtRange) {
    if (createdAtRange.from) variables.createdAtFrom = createdAtRange.from
    if (createdAtRange.to) variables.createdAtTo = createdAtRange.to
  }

  const occurredAtRange = normalizeDateRange(selectedFilters.occurredAtRange)
  if (occurredAtRange) {
    if (occurredAtRange.from) variables.occurredAtFrom = occurredAtRange.from
    if (occurredAtRange.to) variables.occurredAtTo = occurredAtRange.to
  }
}

/**
 * Build query variables from ActivityLayout parameters
 */
const buildQueryVariables = (params: {
  pagination: { pageIndex: number; pageSize: number }
  searchTerm: string
  selectedFilters: Record<string, any>
  sorting: Array<{ id: string; desc: boolean }>
}): InvestmentActivityQueryVariables => {
  const { pagination, searchTerm, selectedFilters, sorting } = params

  const variables: InvestmentActivityQueryVariables = {
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    search: searchTerm || undefined
  }

  // Apply sorting configuration
  variables.orderBy = buildSortingConfig(sorting)

  // Apply activity filters
  applyActivityFilters(variables, selectedFilters)

  // Apply date range filters
  applyDateRangeFilters(variables, selectedFilters)

  return variables
}

/**
 * Build IRM Activity Configuration
 */
export const buildIrmActivityConfig = (
  context: BusinessAppContextProps
): ActivityViewConfig<InvestmentActivity, InvestmentActivityQueryVariables> => {
  const { fetchInvestmentActivities } = useGetInvestmentActivities(context)
  const activityDescriptors = createActivityDescriptors()
  const filterGroups = useFilterGroups(context, 'InvestmentActivity', activityDescriptors, { limit: 100 })

  // Enhanced filter configuration with dynamic options
  const enhancedFilterConfig = buildDynamicFilterConfig(activityFilterConfig, activityDescriptors, filterGroups)

  return {
    fetchActivities: async variables => {
      const result = await fetchInvestmentActivities(variables)
      return {
        activities: result.InvestmentActivity,
        total: result.InvestmentActivityAggregate?.aggregate?.count || 0
      }
    },

    createColumns: config => createActivityColumns(config),

    baseFilterConfig: enhancedFilterConfig,

    buildQueryVariables,

    sortableColumns: activitySortableColumns,

    availableColumns: activityAvailableColumns,

    translations: {
      allActivities: {
        key: 'irm.activities.allActivities',
        default: 'All Activities'
      },
      searchActivities: {
        key: 'irm.activities.searchActivities',
        default: 'Search activities by title, type, owner...'
      }
    }
  }
}
