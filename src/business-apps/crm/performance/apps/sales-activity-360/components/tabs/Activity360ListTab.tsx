import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityViewFilter } from '../../types'
import {
  useTeamActivitiesData,
  TeamActivitiesFilters,
  TeamSalesActivity
} from '@/business-apps/crm/performance/apps/sales-team-performance/components/team-performance-view/hooks/useTeamActivitiesData'
import { createActivity360Columns } from './activity360Columns'
import { Button, DataDisplay, type FilterConfiguration, Spinner } from '@newwork/nw-design-system'
import {
  ActivityListLayout,
  activitySortableColumns,
  activityAvailableColumns,
  activityFilterConfig
} from '@/common/components/common-relations/view-layouts/activity-layout'
import { useActivityExport } from '@/common/components/common-relations/view-layouts/activity-layout/hooks/useActivityExport'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { createActivityDescriptors } from '@/common/data/relations/types/activityTypes'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/utils/filterHelpers'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { ActivityDetailSheet } from '@/common/components/common-relations/detail-sheets/activity-detail-sheet'
import { buildCrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'

interface Activity360ListTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  filter: ActivityViewFilter
  entityId?: string
}

// Sales Associate capability name for filtering (consistent with Sales Performance module)
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

// Query to get sales associates only - consistent with Sales Performance module
// This ensures Sales Activity 360 shows the same employees as Sales Performance dashboards
const GET_ALL_EMPLOYEES = `
  query GetAllEmployees {
    Employee(
      where: { 
        isDeleted: { _eq: false }
        employeePosition: {
          employeeCapabilities: {
            capability: {
              name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
            }
          }
        }
      }
      limit: 1000
    ) {
      id
      fullName
    }
  }
`

const getExportButtonTitle = (isExporting: boolean, totalCount: number, format: string): string => {
  if (isExporting) return 'Exporting…'
  if (totalCount === 0) return 'No data to export'
  return `Export ${totalCount} activities as ${format}`
}

export const Activity360ListTab: React.FC<Activity360ListTabProps> = ({ accessToken, userInfo, filter, entityId }) => {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'occurredAt', desc: true }])
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'occurredAt',
    'ownerEmployee.fullName',
    'reference',
    'activityType.value',
    'title'
  ])
  const [allEmployeeIds, setAllEmployeeIds] = useState<string[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState<TeamSalesActivity | null>(null)

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
    if (filter === 'by-general') {
      filters.unlinkedOnly = true
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
    if (sorting.length === 0) return 'occurredAt'
    return sorting[0].id as any
  }, [sorting])

  const sortOrder = useMemo(() => {
    if (sorting.length === 0) return 'DESC_NULLS_LAST'
    return (sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST') as any
  }, [sorting])

  // Use team activities hook - skip if we don't have employee IDs loaded yet
  const shouldFetch = allEmployeeIds.length > 0

  const { activities, total, loading, error, retry, fetchActivities } = useTeamActivitiesData({
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
  const visibleActivityColumns = useMemo(
    () => columns.filter(col => visibleColumns.includes(col.id as string)),
    [columns, visibleColumns]
  )

  const { isExporting, handleExportCsv, handleExportExcel } = useActivityExport({
    fetchActivities,
    queryVariables: {},
    totalCount: total,
    filenamePrefix: 'sales-activity-360'
  })

  const exportButtons = useMemo(() => {
    const disabled = isExporting || total === 0
    const label = isExporting ? 'Exporting…' : null
    const csvTitle = getExportButtonTitle(isExporting, total, 'CSV')
    const excelTitle = getExportButtonTitle(isExporting, total, 'Excel')

    return (
      <>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          size="sm"
          disabled={disabled}
          data-testid="sales-activity-360-export-csv-button"
          title={csvTitle}
        >
          <DownloadIcon className="gba:mr-2" />
          {label ?? 'CSV'}
        </Button>
        <Button
          onClick={handleExportExcel}
          variant="outline"
          size="sm"
          disabled={disabled}
          data-testid="sales-activity-360-export-excel-button"
          title={excelTitle}
        >
          <FileXlsIcon className="gba:mr-2" />
          {label ?? 'Excel'}
        </Button>
      </>
    )
  }, [isExporting, total, handleExportCsv, handleExportExcel])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleActivityDetailClose = useCallback((open: boolean) => {
    if (!open) {
      setSelectedActivity(null)
    }
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
        secondaryActions={exportButtons}
        toolbarDensity="default"
        filterSheetTitle="Filter Activities"
        filterSheetDescription="Apply filters to narrow down the activity list"
      >
        <ActivityListLayout<TeamSalesActivity>
          data={activities}
          columns={visibleActivityColumns}
          loading={loading}
          error={error}
          totalCount={total}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
          onRowClick={setSelectedActivity}
          onRetry={retry}
          dataTestId="sales-activity-360-list"
        />
      </DataDisplay>

      <ActivityDetailSheet
        activity={selectedActivity as any}
        open={!!selectedActivity}
        onOpenChange={handleActivityDetailClose}
        buildReferenceUrl={(entityType, entityId) =>
          buildCrmRelatedEntityRecordUrl(entityType as Parameters<typeof buildCrmRelatedEntityRecordUrl>[0], entityId)
        }
        accessToken={accessToken}
        data-testid="sales-activity-360-activity-detail"
      />
    </div>
  )
}

export default Activity360ListTab
