import { BusinessAppContextProps } from '@/common/BusinessAppContext'
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
}): CustomerActivityQueryVariables => {
  const { pagination, searchTerm, selectedFilters, sorting } = params

  const variables: CustomerActivityQueryVariables = {
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
 * Build CRM Activity Configuration
 */
export const buildCrmActivityConfig = (
  context: BusinessAppContextProps
): ActivityViewConfig<CustomerActivity, CustomerActivityQueryVariables> => {
  const { fetchCustomerActivities } = useCustomerActivities(context)
  const activityDescriptors = createActivityDescriptors()

  return {
    fetchActivities: async variables => {
      const result = await fetchCustomerActivities(variables)
      return {
        activities: result.activities,
        total: result.total
      }
    },

    createColumns: config => createActivityColumns(config),

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
