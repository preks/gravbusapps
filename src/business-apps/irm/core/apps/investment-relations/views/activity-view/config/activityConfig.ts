import type { ActivityViewConfig } from '@/common/components/common-relations/view-layouts/activity-layout/ActivityLayout'
import type { InvestmentActivity } from '@/common/data/investment/types/investmentActivityTypes'
import type { InvestmentActivityQueryVariables } from '@/common/data/investment/queries/investmentActivityQueries'
import { useGetInvestmentActivities } from '@/common/data/investment/hooks/useInvestmentActivities'
import {
  createActivityColumns,
  activitySortableColumns,
  activityAvailableColumns
} from '@/common/components/common-relations/view-layouts/activity-layout/config'
import { investmentActivityFilterConfig } from '@/common/components/common-relations/view-layouts/activity-layout/config/investmentActivityFilterConfig'
import { createActivityDescriptors } from '@/common/data/relations/types/activityTypes'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

/**
 * Maps column ids (used by the table) to descriptor keys (used by buildOrderBy).
 * Required when the column id contains a nested path like 'activityType.value'
 * but the descriptor key is just 'activityType'.
 */
const COLUMN_TO_SORT_FIELD: Record<string, string> = {
  'activityType.value': 'activityType',
  'ownerEmployee.displayName': 'ownerEmployee'
}

/**
 * Helper: Build sorting configuration
 */
const buildSortingConfig = (sorting: Array<{ id: string; desc: boolean }>) => {
  if (sorting.length > 0) {
    return sorting.map(sort => ({
      field: COLUMN_TO_SORT_FIELD[sort.id] ?? sort.id,
      direction: (sort.desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST') as 'DESC_NULLS_LAST' | 'ASC_NULLS_LAST'
    }))
  }
  return [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' as const }]
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

  variables.orderBy = buildSortingConfig(sorting)
  applyActivityFilters(variables, selectedFilters)
  applyDateRangeFilters(variables, selectedFilters)

  return variables
}

/**
 * Build IRM Activity Configuration.
 * Accepts fetchInvestmentActivities as a parameter so the caller can call the hook
 * at the component level and memoize the resulting config — same pattern as IRM TaskView.
 */
export const buildIrmActivityConfig = (
  fetchInvestmentActivities: ReturnType<typeof useGetInvestmentActivities>['fetchInvestmentActivities']
): ActivityViewConfig<InvestmentActivity, InvestmentActivityQueryVariables> => {
  const activityDescriptors = createActivityDescriptors()

  return {
    fetchActivities: async variables => {
      const result = await fetchInvestmentActivities(variables)
      return {
        activities: result.InvestmentActivity,
        total: result.InvestmentActivityAggregate?.aggregate?.count || 0
      }
    },

    createColumns: config => createActivityColumns(config) as any,

    descriptors: activityDescriptors,
    entityName: 'InvestmentActivity',

    baseFilterConfig: investmentActivityFilterConfig,

    buildQueryVariables,

    sortableColumns: activitySortableColumns,

    availableColumns: activityAvailableColumns,

    flowContexts: {
      entityContext: FlowContextName.investmentActivityEntity,
      createContext: FlowContextName.investmentActivityCreate
    },

    rowActionsContextArray: [FlowContextName.investmentActivityEntity],

    buildRowActionsExternalContextData: (row: { original: InvestmentActivity }) => {
      const externalContextData: Record<string, string> = {
        activityId: row.original.id
      }
      if (row.original.accountId) externalContextData.accountId = row.original.accountId
      if (row.original.contactId) externalContextData.contactId = row.original.contactId
      if (row.original.leadId) externalContextData.leadId = row.original.leadId
      if (row.original.opportunityId) externalContextData.opportunityId = row.original.opportunityId
      if ((row.original as any).investmentId) externalContextData.investmentId = (row.original as any).investmentId
      return externalContextData
    },

    buildReferenceUrl: reference => {
      switch (reference.type) {
        case 'lead':
          return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id })
        case 'account':
          return buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id })
        case 'contact':
          return buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id })
        case 'opportunity':
          return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id })
        case 'investment':
          return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id })
        default:
          return ''
      }
    },

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
