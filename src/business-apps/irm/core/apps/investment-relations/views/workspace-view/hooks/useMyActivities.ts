import { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  type InvestmentActivity,
  INVESTMENT_ACTIVITY_DESCRIPTORS
} from '@/common/data/investment/types/investmentActivityTypes'
import {
  type InvestmentActivityQueryVariables,
  buildInvestmentActivityQuery,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy
} from '@/common/data/investment/queries/investmentActivityQueries'
import {
  createActivityColumns,
  activitySortableColumns,
  activityAvailableColumns
} from '@/common/components/common-relations/view-layouts/activity-layout/config'
import { investmentActivityFilterConfig } from '@/common/components/common-relations/view-layouts/activity-layout/config/investmentActivityFilterConfig'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { MyActivitiesViewConfig } from '@/common/components/common-relations/view-layouts/personal-workspace/components/activities'
import { useActivityKpis } from '../../activity-view/hooks/useActivityKpis'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/activity-layout/utils/filterHelpers'

// Helper: Build base query variables
const buildBaseQueryVariables = (
  pagination: { pageIndex: number; pageSize: number },
  searchTerm: string,
  employeeId: string
): InvestmentActivityQueryVariables => ({
  limit: pagination.pageSize,
  offset: pagination.pageIndex * pagination.pageSize,
  search: searchTerm.trim() || undefined,
  ownerEmployeeIds: [employeeId]
})

// Helper: Apply activity type filter
const applyActivityTypeFilter = (
  variables: InvestmentActivityQueryVariables,
  selectedFilters: Record<string, any>
): void => {
  if (selectedFilters.activityTypeIds?.length > 0) {
    variables.activityTypeIds = selectedFilters.activityTypeIds
  }
}

// Helper: Apply date range filters
const applyDateRangeFilters = (
  variables: InvestmentActivityQueryVariables,
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

// Helper: Build orderBy configuration
const buildOrderByConfig = (sorting: Array<{ id: string; desc: boolean }>): any[] => {
  if (sorting.length > 0) {
    return [
      {
        field: sorting[0].id as any,
        direction: sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
      }
    ]
  }
  return [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
}

// Helper: Build reference type filter conditions (IRM includes investment)
const buildReferenceTypeFilter = (referenceTypes: string[]): Record<string, any>[] => {
  const orConditions: Record<string, any>[] = []

  if (referenceTypes.includes('account')) {
    orConditions.push({ accountId: { _isNull: false } })
  }
  if (referenceTypes.includes('contact')) {
    orConditions.push({ contactId: { _isNull: false } })
  }
  if (referenceTypes.includes('investment')) {
    orConditions.push({ investmentId: { _isNull: false } })
  }
  if (referenceTypes.includes('lead')) {
    orConditions.push({ leadId: { _isNull: false } })
  }
  if (referenceTypes.includes('opportunity')) {
    orConditions.push({ opportunityId: { _isNull: false } })
  }

  return orConditions
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
 * Hook for My Activities in IRM Workspace
 */
export const useMyActivities = (context: BusinessAppContextProps): MyActivitiesViewConfig<InvestmentActivity> => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id

  // Fetch activity KPIs early to maintain hook order
  const {
    kpis,
    loading: kpiLoading,
    error: kpiError,
    refetch: kpiRefetch
  } = useActivityKpis({
    employeeId: employeeId || '',
    accessToken: context.accessToken
  })

  // State for activities data
  const [activities, setActivities] = useState<InvestmentActivity[]>([])
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
  const filterGroups = useFilterGroups(context, 'InvestmentActivity', INVESTMENT_ACTIVITY_DESCRIPTORS, { limit: 100 })

  // Dynamic Filter Configuration (using IRM-specific config with Investment option)
  const dynamicFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(investmentActivityFilterConfig, INVESTMENT_ACTIVITY_DESCRIPTORS, filterGroups)
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
      const query = buildInvestmentActivityQuery()
      let whereCondition = buildInvestmentActivityWhereCondition(variables)
      const orderBy = buildInvestmentActivityOrderBy(variables.orderBy || [])

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
        InvestmentActivity: InvestmentActivity[]
        InvestmentActivityAggregate: { aggregate: { count: number } }
      }>(query, graphQLVariables)

      setActivities(result.InvestmentActivity || [])
      setTotalCount(result.InvestmentActivityAggregate?.aggregate?.count || 0)
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

  // Handle row click - navigate to activity detail
  const handleRowClick = useCallback((activity: InvestmentActivity) => {
    // Navigate to related entity if available (prioritize in typical workflow order)
    if (activity.leadId) {
      globalThis.location.href = buildPlatformUrl('/platform/irm/lead-record', { leadId: activity.leadId })
    } else if (activity.accountId) {
      globalThis.location.href = buildPlatformUrl('/platform/irm/account-record', { accountId: activity.accountId })
    } else if (activity.contactId) {
      globalThis.location.href = buildPlatformUrl('/platform/irm/contact-record', { contactId: activity.contactId })
    } else if (activity.opportunityId) {
      globalThis.location.href = buildPlatformUrl('/platform/irm/opportunity-record', {
        opportunityId: activity.opportunityId
      })
    } else if (activity.investmentId) {
      globalThis.location.href = buildPlatformUrl('/platform/irm/investment-record', {
        investmentId: activity.investmentId
      })
    }
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
    createContext: FlowContextName.investmentActivityCreate,
    rowActionsContextArray: [FlowContextName.investmentActivityEntity],
    buildRowActionsExternalContextData: (row: { original: InvestmentActivity }) => {
      const externalContextData: Record<string, string> = {
        activityId: row.original.id
      }

      // Add parent reference ID (including IRM-specific investmentId)
      if (row.original.accountId) externalContextData.accountId = row.original.accountId
      if (row.original.contactId) externalContextData.contactId = row.original.contactId
      if (row.original.investmentId) externalContextData.investmentId = row.original.investmentId
      if (row.original.leadId) externalContextData.leadId = row.original.leadId
      if (row.original.opportunityId) externalContextData.opportunityId = row.original.opportunityId

      return externalContextData
    },
    onRetry: () => {
      loadActivities()
    },
    onRowClick: handleRowClick,
    kpiStatistics: kpis,
    kpiLoading,
    kpiError,
    onKpiRetry: () => {
      kpiRefetch()
    },
    translations: {
      title: 'My Activities',
      searchPlaceholder: 'Search activities by title, type...'
    }
  }
}
