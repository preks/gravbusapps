import { useState, useCallback, useEffect, useMemo } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  type CustomerActivity,
  CUSTOMER_ACTIVITY_DESCRIPTORS
} from '@/common/data/customer/types/customerActivityTypes'
import {
  type CustomerActivityQueryVariables,
  buildCustomerActivityQuery,
  buildCustomerActivityWhereCondition,
  buildCustomerActivityOrderBy
} from '@/common/data/customer/queries/customerActivityQueries'
import {
  createActivityColumns,
  activitySortableColumns,
  activityAvailableColumns,
  activityFilterConfig
} from '@/common/components/common-relations/view-layouts/activity-layout/config'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { MyActivitiesViewConfig } from '@/common/components/common-relations/view-layouts/personal-workspace/components/activities'
import { useCustomerActivityStatistics } from '@/common/data/customer/hooks/useCustomerActivityStatistics'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/activity-layout/utils/filterHelpers'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

// Helper: Build base query variables
const buildBaseQueryVariables = (
  pagination: { pageIndex: number; pageSize: number },
  searchTerm: string,
  employeeId: string
): CustomerActivityQueryVariables => ({
  limit: pagination.pageSize,
  offset: pagination.pageIndex * pagination.pageSize,
  search: searchTerm.trim() || undefined,
  ownerEmployeeIds: [employeeId]
})

// Helper: Apply activity type filter
const applyActivityTypeFilter = (
  variables: CustomerActivityQueryVariables,
  selectedFilters: Record<string, any>
): void => {
  if (selectedFilters.activityTypeIds?.length > 0) {
    variables.activityTypeIds = selectedFilters.activityTypeIds
  }
}

// Helper: Apply date range filters
const applyDateRangeFilters = (
  variables: CustomerActivityQueryVariables,
  selectedFilters: Record<string, any>
): void => {
  if (selectedFilters.createdAtRange) {
    const normalized = normalizeDateRange(selectedFilters.createdAtRange)
    if (normalized?.from) variables.createdAtFrom = normalized.from
    if (normalized?.to) variables.createdAtTo = normalized.to
  }

  if (selectedFilters.occurredAtRange) {
    const normalized = normalizeDateRange(selectedFilters.occurredAtRange)
    if (normalized?.from) variables.occurredAtFrom = normalized.from
    if (normalized?.to) variables.occurredAtTo = normalized.to
  }
}

// Maps column ids to descriptor keys (same mapping as activityConfig.ts)
const COLUMN_TO_SORT_FIELD: Record<string, string> = {
  'activityType.value': 'activityType',
  'ownerEmployee.displayName': 'ownerEmployee'
}

// Helper: Build orderBy configuration
const buildOrderByConfig = (sorting: Array<{ id: string; desc: boolean }>): any[] => {
  if (sorting.length > 0) {
    return [
      {
        field: (COLUMN_TO_SORT_FIELD[sorting[0].id] ?? sorting[0].id) as any,
        direction: sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
      }
    ]
  }
  return [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
}

// Helper: Build reference type filter conditions
// Uses nested relationship paths (same pattern as useCustomerTasks)
const buildReferenceTypeFilter = (referenceTypes: string[]): Record<string, any>[] => {
  const conditions: Record<string, any>[] = []
  for (const type of referenceTypes) {
    switch (type) {
      case 'account':
        conditions.push({ account: { id: { _neq: null } } })
        break
      case 'contact':
        conditions.push({ contact: { id: { _neq: null } } })
        break
      case 'lead':
        conditions.push({ lead: { id: { _neq: null } } })
        break
      case 'opportunity':
        conditions.push({ opportunity: { id: { _neq: null } } })
        break
    }
  }
  return conditions
}

// Helper: Apply reference filter to where condition
const applyReferenceFilter = (
  whereCondition: Record<string, any>,
  orConditions: Record<string, any>[]
): Record<string, any> => {
  if (orConditions.length === 0) return whereCondition

  if (whereCondition._and) {
    whereCondition._and.push({ _or: orConditions })
    return whereCondition
  }

  return {
    _and: [whereCondition, { _or: orConditions }]
  }
}

/**
 * Hook for My Activities in CRM Workspace
 */
export const useMyActivities = (context: BusinessAppContextProps): MyActivitiesViewConfig<CustomerActivity> => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id

  // Fetch activity statistics early to maintain hook order
  const activityStatistics = useCustomerActivityStatistics(context)

  // State for activities data
  const [activities, setActivities] = useState<CustomerActivity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Sorting state - default by createdAt descending
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])

  // Search state
  const [searchTerm, setSearchTerm] = useState('')

  // Filter state
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})

  // Column visibility state - exclude ownerEmployee since these are MY activities
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])

  // Use centralized filter groups hook
  const filterGroups = useFilterGroups(context, 'SalesActivity', CUSTOMER_ACTIVITY_DESCRIPTORS, { limit: 100 })

  // Dynamic Filter Configuration - exclude owner filter since these are MY activities
  const dynamicFilterConfig = useMemo(() => {
    const config = buildDynamicFilterConfig(activityFilterConfig, CUSTOMER_ACTIVITY_DESCRIPTORS, filterGroups)
    // Remove owner filter group - activities are already filtered to current user
    type FilterGroup = FilterConfiguration['groups'][number]
    const filteredGroups = config.groups.filter((group: FilterGroup) => group.id !== 'owner-group')
    return {
      ...config,
      groups: filteredGroups
    }
  }, [filterGroups])

  // Initialize visible columns (excluding ownerEmployee)
  useEffect(() => {
    if (visibleColumns.length === 0) {
      const defaultColumns = activityAvailableColumns
        .filter(col => col.id !== 'ownerEmployee.displayName')
        .map(col => col.id)
      setVisibleColumns(defaultColumns)
    }
  }, [visibleColumns.length])

  // Load activities with full reference data
  const loadActivities = useCallback(async () => {
    if (!context.accessToken || !employeeId) return

    setIsLoading(true)
    setError(null)

    try {
      // Build base query variables
      const variables = buildBaseQueryVariables(pagination, searchTerm, employeeId)

      // Apply filters
      applyActivityTypeFilter(variables, selectedFilters)
      applyDateRangeFilters(variables, selectedFilters)

      // Build orderBy
      variables.orderBy = buildOrderByConfig(sorting)

      // Build query and base where condition
      const query = buildCustomerActivityQuery()
      let whereCondition = buildCustomerActivityWhereCondition(variables)
      const orderBy = buildCustomerActivityOrderBy(variables.orderBy || [])

      // Apply reference type filter if selected
      if (selectedFilters.referenceType?.length > 0) {
        const orConditions = buildReferenceTypeFilter(selectedFilters.referenceType)
        whereCondition = applyReferenceFilter(whereCondition, orConditions)
      }

      const graphQLVariables: Record<string, any> = {
        limit: variables.limit,
        offset: variables.offset,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<{
        SalesActivity: CustomerActivity[]
        SalesActivityAggregate: { aggregate: { count: number } }
      }>(query, graphQLVariables)

      setActivities(result.SalesActivity || [])
      setTotalCount(result.SalesActivityAggregate?.aggregate?.count || 0)
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities')
      setActivities([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, employeeId, pagination, sorting, searchTerm, selectedFilters, graphqlClient])

  // Load on mount and when dependencies change
  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  // Process Completion Handler - refresh data when processes complete
  const handleProcessComplete = useCallback(() => {
    loadActivities()
    void activityStatistics.refetch()
  }, [loadActivities, activityStatistics.refetch])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  // Fetch all activities for export (uses current filter state, overrides limit/offset)
  const fetchAllActivities = useCallback(
    async (vars: { limit: number; offset?: number }) => {
      if (!context.accessToken || !employeeId) return { activities: [] as CustomerActivity[], total: 0 }

      const variables: CustomerActivityQueryVariables = {
        limit: vars.limit,
        offset: vars.offset || 0,
        search: searchTerm.trim() || undefined,
        ownerEmployeeIds: [employeeId],
        orderBy: buildOrderByConfig(sorting)
      }

      applyActivityTypeFilter(variables, selectedFilters)
      applyDateRangeFilters(variables, selectedFilters)

      const query = buildCustomerActivityQuery()
      let whereCondition = buildCustomerActivityWhereCondition(variables)
      const orderBy = buildCustomerActivityOrderBy(variables.orderBy || [])

      if (selectedFilters.referenceType?.length > 0) {
        const orConditions = buildReferenceTypeFilter(selectedFilters.referenceType)
        whereCondition = applyReferenceFilter(whereCondition, orConditions)
      }

      const result = await graphqlClient.request<{
        SalesActivity: CustomerActivity[]
        SalesActivityAggregate: { aggregate: { count: number } }
      }>(query, {
        limit: variables.limit,
        offset: variables.offset,
        where: whereCondition,
        orderBy: orderBy
      })

      return {
        activities: result.SalesActivity || [],
        total: result.SalesActivityAggregate?.aggregate?.count || 0
      }
    },
    [context.accessToken, employeeId, searchTerm, sorting, selectedFilters, graphqlClient]
  )

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 })) // Reset to first page on search
  }, [])

  // Handle filter change
  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 })) // Reset to first page on filter change
  }, [])

  // Create columns - hide owner since these are MY activities
  const columns = useMemo(() => createActivityColumns({ showOwnerEmployee: false }) as any, [])

  // Sortable columns (excluding owner)
  const sortableColumns = useMemo(
    () => activitySortableColumns.filter(col => col.id !== 'ownerEmployee.displayName'),
    []
  )

  // Available columns (excluding owner)
  const availableColumns = useMemo(
    () => activityAvailableColumns.filter(col => col.id !== 'ownerEmployee.displayName'),
    []
  )

  return {
    activities,
    totalCount,
    isLoading,
    error,
    pagination,
    onPaginationChange: setPagination,
    sorting,
    onSortingChange: setSorting,
    sortableColumns,
    columns,
    availableColumns,
    visibleColumns,
    onVisibleColumnsChange: setVisibleColumns,
    searchTerm,
    onSearchChange: handleSearchChange,
    selectedFilters,
    onFilterChange: handleFilterChange,
    filterConfiguration: dynamicFilterConfig,
    createContext: FlowContextName.customerActivityCreate,
    rowActionsContextArray: [FlowContextName.customerActivityEntity],
    buildReferenceUrl: (entityType: string, entityId: string) => {
      switch (entityType) {
        case 'lead':
          return buildPlatformUrl('/platform/crm/lead-record', { leadId: entityId })
        case 'account':
          return buildPlatformUrl('/platform/crm/account-record', { accountId: entityId })
        case 'contact':
          return buildPlatformUrl('/platform/crm/contact-record', { contactId: entityId })
        case 'opportunity':
          return buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: entityId })
        default:
          return ''
      }
    },
    buildRowActionsExternalContextData: (row: { original: CustomerActivity }) => {
      const externalContextData: Record<string, string> = {
        activityId: row.original.id
      }

      // Add parent reference ID
      if (row.original.accountId) externalContextData.accountId = row.original.accountId
      if (row.original.contactId) externalContextData.contactId = row.original.contactId
      if (row.original.leadId) externalContextData.leadId = row.original.leadId
      if (row.original.opportunityId) externalContextData.opportunityId = row.original.opportunityId

      return externalContextData
    },
    onRetry: () => {
      loadActivities()
    },
    kpiStatistics: activityStatistics.myActivitiesStatistics,
    kpiLoading: activityStatistics.isLoading,
    kpiError: activityStatistics.error,
    onKpiRetry: () => {
      void activityStatistics.refetch()
    },
    fetchAllActivities,
    translations: {
      title: 'My Activities',
      searchPlaceholder: 'Search activities by title, type...'
    }
  }
}
