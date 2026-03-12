import React, { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMember } from '../../sales-members-list/types'
import { useTeamActivitiesData, TeamActivitiesFilters, TeamSalesActivity } from '../hooks/useTeamActivitiesData'
import { DataTable, Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import { createTeamActivitiesColumns } from './teamActivitiesColumns'
import {
  activitySortableColumns,
  activityAvailableColumns,
  activityFilterConfig
} from '@/common/components/common-relations/view-layouts/activity-layout'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { createActivityDescriptors } from '@/common/data/relations/types/activityTypes'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/utils/filterHelpers'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

const DATA_TEST_ID_PREFIX = 'TeamActivitiesTable'

interface TeamActivitiesTableProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  teamMembers: SalesTeamMember[]
}

const TeamActivitiesTable: React.FC<TeamActivitiesTableProps> = ({ teamMembers, accessToken, userInfo }) => {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'ownerEmployee.displayName',
    'title',
    'activityType.value',
    'reference',
    'createdAt',
    'occurredAt'
  ])

  // Get employee IDs from team members (filter out undefined)
  const employeeIds = useMemo(
    () => teamMembers.map(m => m.employeeId).filter((id): id is string => id !== undefined),
    [teamMembers]
  )

  // Use centralized filter groups hook for catalog data (exclude owner filter - we'll use team members)
  const activityDescriptors = useMemo(() => {
    const descriptors = createActivityDescriptors()
    // Filter out ownerEmployeeIds descriptor - we'll manually set team members
    return descriptors.filter(d => d.key !== 'ownerEmployeeIds')
  }, [])

  const filterGroups = useFilterGroups(
    { accessToken, userInfo } as BusinessAppContextProps,
    'SalesActivity',
    activityDescriptors,
    { limit: 100 }
  )

  // Enhanced filter configuration with catalog data from filterGroups
  const enhancedFilterConfig: FilterConfiguration = useMemo(() => {
    // Build dynamic config with catalog data
    const dynamicConfig = buildDynamicFilterConfig(activityFilterConfig, activityDescriptors, filterGroups)

    // Override owner filter options with team members ONLY (scoped to this team)
    const ownerGroup = dynamicConfig.groups.find((g: any) => g.id === 'owner-group')
    if (ownerGroup) {
      const ownerFilter = ownerGroup.filters.find((f: any) => f.id === 'ownerEmployeeIds')
      if (ownerFilter?.type === 'multi-select') {
        // Replace with team members only
        ownerFilter.config = {
          ...ownerFilter.config,
          options: teamMembers
            .map(member => ({
              id: member.employeeId || '',
              value: member.employeeId || '',
              label: member.name || 'Unknown'
            }))
            .filter(opt => opt.id),
          // Disable search callback since we're using static team member list
          onSearch: undefined,
          onLoadMore: undefined
        }
      }
    }

    return dynamicConfig
  }, [activityDescriptors, filterGroups, teamMembers])

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

    // Handle date range filters using normalizeDateRange (same as CRM core)
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

  // Use the activity data hook with converted filters
  const teamFilters = useMemo(() => {
    const baseFilters: TeamActivitiesFilters = {}
    const convertedFilters = convertToTeamFilters(selectedFilters)
    return { ...baseFilters, ...convertedFilters }
  }, [selectedFilters, convertToTeamFilters])

  const sortField = useMemo(() => {
    if (sorting.length === 0) return 'createdAt'
    return sorting[0].id as any
  }, [sorting])

  const sortOrder = useMemo(() => {
    if (sorting.length === 0) return 'DESC_NULLS_LAST'
    return (sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST') as any
  }, [sorting])

  const { activities, total, loading, error, retry } = useTeamActivitiesData({
    employeeIds,
    accessToken,
    userInfo,
    search,
    sortField,
    sortOrder,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    filters: teamFilters
  })

  // Create columns with team members for proper name display
  const columns: ColumnDef<TeamSalesActivity>[] = useMemo(() => createTeamActivitiesColumns(teamMembers), [teamMembers])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const sortableColumns = activitySortableColumns
  const availableColumns = activityAvailableColumns

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`} className="gba:space-y-4">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'Team Activities',
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder="Search activities..."
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
      >
        <DataTable<TeamSalesActivity>
          data={activities}
          columns={columns}
          loading={loading}
          totalCount={total}
          pagination={{
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize
          }}
          sorting={sorting}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
          enablePagination
          enableSorting
          enableSelection={false}
          enableResizing={false}
          tableLayout="fixed"
        />
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

export default TeamActivitiesTable
