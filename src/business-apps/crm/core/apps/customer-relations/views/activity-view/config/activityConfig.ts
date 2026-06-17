import type { ActivityViewConfig } from '@/common/components/common-relations/view-layouts/activity-layout/ActivityLayout'
import type { CustomerActivity } from '@/common/data/customer/types/customerActivityTypes'
import type { CustomerActivityQueryVariables } from '@/common/data/customer/queries/customerActivityQueries'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import {
  createActivityColumns,
  activitySortableColumns,
  activityAvailableColumns,
  activityFilterConfig
} from '@/common/components/common-relations/view-layouts/activity-layout/config'
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
 * Resolve visible column ids to descriptor keys for free-text search. Column ids may be nested
 * accessors (e.g. 'activityType.value' → 'activityType'); the descriptor key is the root segment.
 * The composite 'reference' column maps to the dedicated 'reference' descriptor that spans the
 * related entities (see createActivityDescriptors), so no per-column expansion is needed here.
 */
const resolveSearchDescriptorKeys = (visibleColumns: string[]): string[] =>
  Array.from(new Set(visibleColumns.map(columnId => columnId.split('.')[0])))

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
  variables: CustomerActivityQueryVariables,
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
  variables: CustomerActivityQueryVariables,
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
  visibleColumns?: string[]
}): CustomerActivityQueryVariables => {
  const { pagination, searchTerm, selectedFilters, sorting, visibleColumns } = params
  const trimmedSearch = searchTerm.trim()

  const variables: CustomerActivityQueryVariables = {
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    search: trimmedSearch || undefined
  }

  // Scope free-text search to the visible table columns to keep the generated _or small.
  if (trimmedSearch && visibleColumns && visibleColumns.length > 0) {
    const searchDescriptorKeys = resolveSearchDescriptorKeys(visibleColumns)
    if (searchDescriptorKeys.length > 0) {
      variables.searchDescriptorKeys = searchDescriptorKeys
    }
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
 * Build CRM Activity Configuration
 * Accepts fetchCustomerActivities as a parameter so the caller can call the hook
 * at the component level and memoize the resulting config.
 */
export const buildCrmActivityConfig = (
  fetchCustomerActivities: ReturnType<typeof useCustomerActivities>['fetchCustomerActivities']
): ActivityViewConfig<CustomerActivity, CustomerActivityQueryVariables> => {
  const activityDescriptors = createActivityDescriptors()

  return {
    fetchActivities: async variables => {
      const result = await fetchCustomerActivities(variables)
      return {
        activities: result.activities,
        total: result.total
      }
    },

    createColumns: config => createActivityColumns(config) as any,

    descriptors: activityDescriptors,
    entityName: 'SalesActivity',

    baseFilterConfig: activityFilterConfig,

    buildQueryVariables,

    sortableColumns: activitySortableColumns,

    availableColumns: activityAvailableColumns,

    flowContexts: {
      entityContext: FlowContextName.customerActivityEntity,
      createContext: FlowContextName.customerActivityCreate
    },

    rowActionsContextArray: [FlowContextName.customerActivityEntity],

    buildRowActionsExternalContextData: (row: { original: CustomerActivity }) => {
      const externalContextData: Record<string, string> = {
        activityId: row.original.id
      }

      // Add parent reference ID based on activity reference
      if (row.original.accountId) {
        externalContextData.accountId = row.original.accountId
      }
      if (row.original.contactId) {
        externalContextData.contactId = row.original.contactId
      }
      if (row.original.leadId) {
        externalContextData.leadId = row.original.leadId
      }
      if (row.original.opportunityId) {
        externalContextData.opportunityId = row.original.opportunityId
      }

      return externalContextData
    },

    buildReferenceUrl: reference => {
      switch (reference.type) {
        case 'lead':
          return buildPlatformUrl('/platform/crm/lead-record', { leadId: reference.id })
        case 'account':
          return buildPlatformUrl('/platform/crm/account-record', { accountId: reference.id })
        case 'contact':
          return buildPlatformUrl('/platform/crm/contact-record', { contactId: reference.id })
        case 'opportunity':
          return buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: reference.id })
        case 'investment':
          return ''
        default:
          return ''
      }
    },

    translations: {
      allActivities: {
        key: 'crm.activities.allActivities',
        default: 'All Activities'
      },
      searchActivities: {
        key: 'crm.activities.searchActivities',
        default: 'Search activities by title, type, owner...'
      }
    }
  }
}
