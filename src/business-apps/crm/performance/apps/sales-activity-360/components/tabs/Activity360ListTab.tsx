import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityViewFilter } from '../../types'
import {
  useTeamActivitiesData,
  TeamActivitiesFilters,
  TeamSalesActivity
} from '@/business-apps/crm/performance/apps/sales-team-performance/components/team-performance-view/hooks/useTeamActivitiesData'
import { createActivity360Columns } from './activity360Columns'
import { DataTable, Button, DataDisplay, type FilterConfiguration, Spinner } from '@newwork/nw-design-system'
import {
  activitySortableColumns,
  activityAvailableColumns,
  activityFilterConfig
} from '@/common/components/common-relations/view-layouts/activity-layout'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { createActivityDescriptors } from '@/common/data/relations/types/activityTypes'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/utils/filterHelpers'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface Activity360ListTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  filter: ActivityViewFilter
  entityId?: string
}

// Query to get all employees for "all" view
const GET_ALL_EMPLOYEES = `
  query GetAllEmployees {
    Employee(where: { isDeleted: { _eq: false } }, limit: 1000) {
      id
      fullName
    }
  }
`

export const Activity360ListTab: React.FC<Activity360ListTabProps> = ({ accessToken, userInfo, filter, entityId }) => {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'occurredAt',
    'ownerEmployee.fullName',
    'reference',
    'activityType.value'
  ])
  const [allEmployeeIds, setAllEmployeeIds] = useState<string[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  const graphqlClient = useGraphQLClient(accessToken)

  // Fetch all employee IDs for all views (needed for the team activities hook)
  useEffect(() => {
    setLoadingEmployees(true)
    graphqlClient
      .request<{ Employee: Array<{ id: string; fullName: string }> }>(GET_ALL_EMPLOYEES)
      .then(result => {
        const ids = result.Employee?.map(e => e.id) || []
        setAllEmployeeIds(ids)
      })
      .catch(err => {
        console.error('Failed to load employees:', err)
        setAllEmployeeIds([])
      })
      .finally(() => {
        setLoadingEmployees(false)
      })
  }, [graphqlClient])

  // Determine employeeIds based on filter type
  const employeeIds = useMemo(() => {
    if (filter === 'by-employee' && entityId) {
      // Filter by specific employee
      return [entityId]
    }
    // For "all" and entity-based filters, we need all employee IDs
    // (the entity filters will narrow down the results)
    return allEmployeeIds
  }, [filter, entityId, allEmployeeIds])

  // Build entity-specific filters
  const entityFilters: TeamActivitiesFilters = useMemo(() => {
    const filters: TeamActivitiesFilters = {}

    if (filter === 'by-account' && entityId) {
      filters.accountId = [entityId]
    }
    if (filter === 'by-contact' && entityId) {
      filters.contactId = [entityId]
    }
    if (filter === 'by-lead' && entityId) {
      filters.leadId = [entityId]
    }
    if (filter === 'by-opportunity' && entityId) {
      filters.opportunityId = [entityId]
    }

    return filters
  }, [filter, entityId])

  // Filter descriptors
  const activityDescriptors = useMemo(() => createActivityDescriptors(), [])
  const filterGroups = useFilterGroups(
    { accessToken, userInfo } as BusinessAppContextProps,
    'SalesActivity',
    activityDescriptors,
    { limit: 100 }
  )

  // Enhanced filter configuration
  const enhancedFilterConfig: FilterConfiguration = useMemo(() => {
    return buildDynamicFilterConfig(activityFilterConfig, activityDescriptors, filterGroups)
  }, [activityDescriptors, filterGroups])

  // Convert DataDisplay filters to TeamActivitiesFilters
  const convertToTeamFilters = useCallback((filters: Record<string, any>): TeamActivitiesFilters => {
    const teamFilters: TeamActivitiesFilters = {}

    if (filters.activityTypeIds) {
      teamFilters.activityTypeRef = filters.activityTypeIds
    }
    if (filters.ownerEmployeeIds) {
      teamFilters.ownerEmployeeId = filters.ownerEmployeeIds
    }
    if (filters.referenceType) {
      teamFilters.referenceType = filters.referenceType
    }

    // Handle date range filters
    const dateRangeKeys = ['createdAtRange', 'occurredAtRange']
    for (const rangeKey of dateRangeKeys) {
      const normalized = normalizeDateRange(filters[rangeKey])
      if (normalized) {
        const baseKey = rangeKey.replace('Range', '')
        if (normalized.from) {
          teamFilters[`${baseKey}From` as keyof TeamActivitiesFilters] = normalized.from as any
        }
        if (normalized.to) {
          teamFilters[`${baseKey}To` as keyof TeamActivitiesFilters] = normalized.to as any
        }
      }
    }

    return teamFilters
  }, [])

  // Combine entity filters with user-selected filters
  const combinedFilters = useMemo(() => {
    const converted = convertToTeamFilters(selectedFilters)
    return { ...entityFilters, ...converted }
  }, [selectedFilters, entityFilters, convertToTeamFilters])

  const sortField = useMemo(() => {
    if (sorting.length === 0) return 'createdAt'
    return sorting[0].id as any
  }, [sorting])

  const sortOrder = useMemo(() => {
    if (sorting.length === 0) return 'DESC_NULLS_LAST'
    return (sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST') as any
  }, [sorting])

  // Use team activities hook - skip if we don't have employee IDs loaded yet
  const shouldFetch = allEmployeeIds.length > 0

  const { activities, total, loading, error, retry } = useTeamActivitiesData({
    employeeIds: shouldFetch ? employeeIds : [],
    accessToken,
    userInfo,
    search,
    sortField,
    sortOrder,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    filters: combinedFilters
  })

  // Create columns using GraphQL data directly (no teamMembers needed)
  const columns = useMemo(() => createActivity360Columns(), [])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Show loading while fetching employee IDs for "all" view
  if (loadingEmployees) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="gba:space-y-4">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'Activities',
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder="Search activities by title, type, owner..."
        onSearchChange={handleSearch}
        filters={selectedFilters}
        filterConfiguration={enhancedFilterConfig}
        onFilterChange={handleFilterChange}
        sorting={sorting}
        sortableColumns={activitySortableColumns}
        onSortingChange={setSorting}
        availableColumns={activityAvailableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        filterSheetTitle="Filter Activities"
        filterSheetDescription="Apply filters to narrow down the activity list"
      >
        <div className="gba:w-full gba:overflow-x-auto">
          <DataTable<TeamSalesActivity>
            data={activities}
            columns={columns}
            loading={loading}
            totalCount={total}
            pagination={pagination}
            sorting={sorting}
            onPaginationChange={setPagination}
            onSortingChange={setSorting}
            enablePagination
            enableSorting
            enableSelection={false}
          />
        </div>
      </DataDisplay>

      {error && (
        <div className="gba:flex gba:justify-center gba:p-4">
          <div className="gba:text-center">
            <p className="gba:text-destructive gba:text-sm gba:mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Activity360ListTab
