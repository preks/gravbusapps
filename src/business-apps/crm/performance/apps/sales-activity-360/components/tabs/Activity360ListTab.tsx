import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityViewFilter } from '../../types'
import { useTeamActivitiesData, TeamActivitiesFilters, TeamSalesActivity } from '../../hooks/useTeamActivitiesData'
import { createActivity360Columns } from './activity360Columns'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
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
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { ActivityDetailSheet } from '@/common/components/common-relations/detail-sheets/activity-detail-sheet'
import { buildCrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'

interface Activity360ListTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  filter: ActivityViewFilter
  entityId?: string
}

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
  const [selectedActivity, setSelectedActivity] = useState<TeamSalesActivity | null>(null)

  // Determine employeeIds based on filter type.
  // - "By Employee" targets a single employee via explicit id.
  // - All other views scope to the sales team via the owner's capability (handled in the hook),
  //   so no explicit employee ids are needed.
  const employeeIds = useMemo(() => {
    if (filter === 'by-employee' && entityId) {
      return [entityId]
    }
    return []
  }, [filter, entityId])

  // For non "By Employee" views, scope server-side to Sales Associate owners.
  const scopeToSalesAssociates = !(filter === 'by-employee' && entityId)

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

  const { activities, total, loading, error, retry, fetchActivities } = useTeamActivitiesData({
    employeeIds,
    scopeToSalesAssociates,
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
