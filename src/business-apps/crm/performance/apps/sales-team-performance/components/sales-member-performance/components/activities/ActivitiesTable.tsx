import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DataTable, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import { ActivitiesTableProps } from '../../types/activitiesTypes'
import { useEmployeeActivitiesData } from '../../hooks/useEmployeeActivitiesData'
import { createActivityColumns } from './activityColumns'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  activitySortableColumns,
  activityAvailableColumns,
  activityFilterConfig
} from '@/common/components/common-relations/view-layouts/activity-layout'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { createActivityDescriptors } from '@/common/data/relations/types/activityTypes'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/utils/filterHelpers'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const DATA_TEST_ID_PREFIX = 'ActivitiesTable'

export const ActivitiesTable: React.FC<ActivitiesTableProps> = ({
  employeeId,
  accessToken,
  onTotalChange,
  userInfo
}) => {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'occurredAt', desc: true }])
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'title',
    'activityType.value',
    'reference',
    'occurredAt',
    'createdAt'
  ])

  // Use centralized filter groups hook for catalog data (exclude owner filter - it's just one employee)
  const activityDescriptors = useMemo(() => {
    const descriptors = createActivityDescriptors()
    // Filter out ownerEmployeeIds descriptor - we're viewing a single employee's activities
    return descriptors.filter(d => d.key !== 'ownerEmployeeIds')
  }, [])

  const filterGroups = useFilterGroups(
    { accessToken, userInfo } as BusinessAppContextProps,
    'SalesActivity',
    activityDescriptors,
    { limit: 100 }
  )

  // Enhanced filter configuration with catalog data from filterGroups (without owner filter)
  const enhancedFilterConfig: FilterConfiguration = useMemo(() => {
    const dynamicConfig = buildDynamicFilterConfig(activityFilterConfig, activityDescriptors, filterGroups)

    // Remove owner filter group entirely since we're viewing a single employee's activities
    const filteredGroups = dynamicConfig.groups.filter((group: any) => group.id !== 'owner-group')

    return {
      ...dynamicConfig,
      groups: filteredGroups
    }
  }, [activityDescriptors, filterGroups])

  // Convert DataDisplay filters to hook-compatible format
  const convertFilters = useCallback((filters: Record<string, any>) => {
    const converted: any = {}

    if (filters.activityTypeIds) {
      converted.activityTypeRef = filters.activityTypeIds
    }

    if (filters.referenceType) {
      converted.referenceType = filters.referenceType
    }

    // Handle date range filters using normalizeDateRange
    const dateRangeKeys = ['createdAtRange', 'occurredAtRange']
    for (const rangeKey of dateRangeKeys) {
      const normalized = normalizeDateRange(filters[rangeKey])
      if (normalized) {
        const baseKey = rangeKey.replace('Range', '')
        if (normalized.from) {
          converted[`${baseKey}From`] = normalized.from
        }
        if (normalized.to) {
          converted[`${baseKey}To`] = normalized.to
        }
      }
    }

    return converted
  }, [])

  // Build query variables with filters
  const queryVariables = useMemo(() => {
    const converted = convertFilters(selectedFilters)
    return {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: search || undefined,
      orderBy: sorting.map(s => ({
        field: s.id,
        direction: s.desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
      })),
      ...converted
    }
  }, [pagination, search, sorting, selectedFilters, convertFilters])

  // Fetch activities data
  const { activities, totalCount, loading, error, refetch } = useEmployeeActivitiesData({
    employeeId,
    accessToken,
    queryVariables
  })

  // Notify parent of total count change
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(totalCount)
    }
  }, [totalCount, onTotalChange])

  // Handle search change
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Handle filter change
  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Handle reference click (navigate to entity record)
  const handleReferenceClick = useCallback((activity: any) => {
    let url = ''

    if (activity.accountId) {
      url = buildPlatformUrl('/platform/crm/account-record', { accountId: activity.accountId })
    } else if (activity.contactId) {
      url = buildPlatformUrl('/platform/crm/contact-record', { contactId: activity.contactId })
    } else if (activity.leadId) {
      url = buildPlatformUrl('/platform/crm/lead-record', { leadId: activity.leadId })
    } else if (activity.opportunityId) {
      url = buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: activity.opportunityId })
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [])

  // Create columns with reference click handler
  const columns = useMemo(
    () => createActivityColumns({ onReferenceClick: handleReferenceClick }),
    [handleReferenceClick]
  )

  const sortableColumns = activitySortableColumns
  const availableColumns = activityAvailableColumns

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`} className="gba:space-y-4">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'Sales Activities',
            metadata: {
              count: totalCount,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder="Search activities by title, type, or reference..."
        onSearchChange={handleSearch}
        filters={selectedFilters}
        filterConfiguration={enhancedFilterConfig}
        onFilterChange={handleFilterChange}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        filterSheetTitle="Filter Activities"
        filterSheetDescription="Apply filters to narrow down the activity list"
        data-testid={DATA_TEST_ID_PREFIX}
      >
        <DataTable
          data={activities}
          columns={columns}
          loading={loading}
          totalCount={totalCount}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
          enablePagination
          enableSorting
          enableSelection={false}
        />
      </DataDisplay>

      {error && (
        <div data-testid={`${DATA_TEST_ID_PREFIX}-error`} className="gba:p-4">
          <div className="gba:rounded-lg gba:border gba:border-destructive gba:bg-destructive-secondary gba:p-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-destructive">Error Loading Activities</h3>
            <p className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">{error.message}</p>
            <button
              onClick={refetch}
              className="gba:mt-4 gba:rounded gba:border gba:border-destructive gba:bg-background gba:px-4 gba:py-2 gba:text-sm gba:text-destructive hover:gba:bg-destructive-secondary"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
