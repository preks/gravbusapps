import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_REVENUE_ALIGNMENT_DATA } from '@/common/data/customer/queries/campaignDashboardQueries'
import type {
  RevenueAlignmentCampaign,
  RevenueAlignmentRow
} from '@/common/data/customer/queries/campaignDashboardQueries'
import { calculateCustomerRevenueAchievementPercentage } from '@/common/data/customer/utils/customerRevenueCalculations'
import { getBadgeVariantFromCatalog } from '@/common/utils/badgeUtils'
import { buildSearch, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { createSalesCampaignDescriptors } from '@/common/data/customer/types/salesCampaignManagementTypes'
import { useCampaignCatalogOptions } from '@/common/data/customer/hooks/useCampaignCatalogOptions'
import { CAMPAIGN_STATUS, CAMPAIGN_SEGMENT } from '@/common/data/customer/constants/customerCatalogs'
import translations from '../../../../_i18n'
import {
  createRevenueAlignmentAvailableColumns,
  createRevenueAlignmentColumns,
  createRevenueAlignmentExportColumns,
  createRevenueAlignmentFilterConfiguration,
  createRevenueAlignmentSortableColumns,
  getInitialRevenueAlignmentVisibleColumns
} from './revenueAlignmentTableConfig'
import { useRevenueAlignmentExport } from './useRevenueAlignmentExport'

type RevenueAlignmentProps = BusinessAppContextProps
type RevenueAlignmentSorting = Array<{ id: string; desc: boolean }>

/**
 * Search descriptors for the Revenue Alignment table. Reuses the shared campaign descriptors
 * (name/description, status, type, dates) — exactly like the main Campaign Management list — and
 * adds the columns unique to this dashboard so search goes through the same `buildSearch` helper
 * as every other view (text → `_ilike`, catalog → value+code, number → exact `_eq`).
 */
const REVENUE_ALIGNMENT_SEARCH_DESCRIPTORS: Descriptor[] = [
  ...createSalesCampaignDescriptors(),
  {
    key: 'segment',
    searchPaths: ['customerCampaignSegment.value', 'customerCampaignSegment.code'],
    sortPath: 'customerCampaignSegment.value',
    type: 'text'
  },
  { key: 'budgetAllocated', searchPaths: ['budgetAllocated'], sortPath: 'budgetAllocated', type: 'number' },
  { key: 'pipelineTarget', searchPaths: ['pipelineTarget'], sortPath: 'pipelineTarget', type: 'number' }
]

const buildRevenueAlignmentWhere = (
  searchTerm: string,
  selectedFilters: Record<string, unknown>,
  visibleColumns?: string[]
): Record<string, unknown> => {
  const conditions: Array<Record<string, unknown>> = [{ isDeleted: { _eq: false } }]
  const normalizedSearch = searchTerm.trim()

  if (normalizedSearch.length > 0) {
    // Scope free-text search to the visible table columns by filtering descriptors on `key`,
    // mirroring the `searchColumns` allowlist used by Campaign Management.
    const scopedDescriptors =
      visibleColumns && visibleColumns.length > 0
        ? REVENUE_ALIGNMENT_SEARCH_DESCRIPTORS.filter(descriptor => visibleColumns.includes(descriptor.key))
        : REVENUE_ALIGNMENT_SEARCH_DESCRIPTORS
    const searchObj = buildSearch(normalizedSearch, scopedDescriptors)
    if (Array.isArray(searchObj?._or) && searchObj._or.length > 0) {
      conditions.push(searchObj)
    }
  }

  const selectedStatuses = Array.isArray(selectedFilters.status) ? selectedFilters.status : []
  if (selectedStatuses.length > 0) {
    conditions.push({
      customerCampaignStatus: { code: { _in: selectedStatuses } }
    })
  }

  const selectedSegments = Array.isArray(selectedFilters.segment) ? selectedFilters.segment : []
  if (selectedSegments.length > 0) {
    conditions.push({
      customerCampaignSegment: { code: { _in: selectedSegments } }
    })
  }

  return conditions.length > 1 ? { _and: conditions } : conditions[0]
}

const mapRevenueAlignmentSortingToOrderBy = (sorting: RevenueAlignmentSorting): Array<Record<string, unknown>> => {
  const activeSort = sorting[0]
  if (!activeSort) {
    return [{ createdAt: 'DESC' }]
  }

  const direction = activeSort.desc ? 'DESC' : 'ASC'

  switch (activeSort.id) {
    case 'name':
      return [{ name: direction }]
    case 'status':
      return [{ customerCampaignStatus: { value: direction } }]
    case 'segment':
      return [{ customerCampaignSegment: { value: direction } }]
    case 'budgetAllocated':
      return [{ budgetAllocated: direction }]
    case 'pipelineTarget':
      return [{ pipelineTarget: direction }]
    default:
      return [{ createdAt: 'DESC' }]
  }
}

const RevenueAlignment: React.FC<RevenueAlignmentProps> = context => {
  const { t } = useTranslation(translations)
  const [rows, setRows] = useState<RevenueAlignmentRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'name', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(getInitialRevenueAlignmentVisibleColumns)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const whereCondition = useMemo(
    () => buildRevenueAlignmentWhere(searchTerm, selectedFilters, visibleColumns),
    [searchTerm, selectedFilters, visibleColumns]
  )
  const orderBy = useMemo(() => mapRevenueAlignmentSortingToOrderBy(sorting), [sorting])

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token missing')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const campaignsResult = await graphqlClient.request<{
        SalesCampaign: RevenueAlignmentCampaign[]
        SalesCampaignAggregate?: { aggregate?: { count?: number | null } | null }
      }>(GET_REVENUE_ALIGNMENT_DATA(), {
        where: whereCondition,
        orderBy,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        countWhere: whereCondition
      })
      const campaigns = campaignsResult?.SalesCampaign || []
      const count = campaignsResult?.SalesCampaignAggregate?.aggregate?.count ?? 0

      const enrichedRows: RevenueAlignmentRow[] = campaigns.map(campaign => {
        const pipelineGenerated = Number(campaign.pipelineAgg?.aggregate?.sum?.estimatedAmount) || 0
        const revenueClosed = Number(campaign.wonAgg?.aggregate?.sum?.estimatedAmount) || 0
        const opportunitiesCreated = campaign.pipelineAgg?.aggregate?.count ?? 0
        const totalEventBudget = Number(campaign.customerCampaignEventsAggregate?.aggregate?.sum?.budget) || 0
        const totalPipelineFromEvents =
          Number(campaign.customerCampaignEventsAggregate?.aggregate?.sum?.pipelineGenerated) || 0
        const percentToGoal = calculateCustomerRevenueAchievementPercentage(
          pipelineGenerated,
          campaign.pipelineTarget || 0
        )
        const costPerOpportunity =
          opportunitiesCreated > 0 && campaign.budgetAllocated != null
            ? campaign.budgetAllocated / opportunitiesCreated
            : 0

        return {
          ...campaign,
          pipelineGenerated,
          revenueClosed,
          percentToGoal,
          opportunitiesCreated,
          totalEventBudget,
          totalPipelineFromEvents,
          costPerOpportunity
        }
      })

      setRows(enrichedRows)
      setTotalCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient, orderBy, pagination.pageIndex, pagination.pageSize, whereCondition])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleSortingChange = useCallback((nextSorting: Array<{ id: string; desc: boolean }>) => {
    setSorting(nextSorting)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Filter options come from the catalogs (all possible values), not the loaded page, so the
  // Status/Segment filters always populate even when the visible rows have no value set.
  const { options: statusCatalogOptions } = useCampaignCatalogOptions(context, CAMPAIGN_STATUS)
  const { options: segmentCatalogOptions } = useCampaignCatalogOptions(context, CAMPAIGN_SEGMENT)

  const filterConfiguration = useMemo(
    () => createRevenueAlignmentFilterConfiguration(statusCatalogOptions, segmentCatalogOptions, selectedFilters),
    [statusCatalogOptions, segmentCatalogOptions, selectedFilters]
  )
  const availableColumns = useMemo(() => createRevenueAlignmentAvailableColumns(), [])
  const sortableColumns = useMemo(() => createRevenueAlignmentSortableColumns(), [])
  const exportColumns = useMemo(() => createRevenueAlignmentExportColumns(visibleColumns), [visibleColumns])
  const columns = useMemo(() => createRevenueAlignmentColumns(t, getBadgeVariantFromCatalog), [t])

  const { isExporting, handleExportCsv, handleExportExcel } = useRevenueAlignmentExport({
    rows,
    columns: exportColumns
  })

  const exportActions = useMemo(
    () => (
      <>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCsv}
          disabled={isExporting || rows.length === 0 || exportColumns.length === 0}
          title={isExporting ? 'Exporting...' : `Export ${rows.length} rows as CSV`}
          data-testid="revenue-alignment-export-csv-button"
        >
          <DownloadIcon size={16} />
          CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportExcel}
          disabled={isExporting || rows.length === 0 || exportColumns.length === 0}
          title={isExporting ? 'Exporting...' : `Export ${rows.length} rows as Excel`}
          data-testid="revenue-alignment-export-excel-button"
        >
          <FileXlsIcon size={16} />
          Excel
        </Button>
      </>
    ),
    [exportColumns.length, handleExportCsv, handleExportExcel, isExporting, rows.length]
  )

  return (
    <div data-testid="revenue-alignment">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: t('dashboard-revenue-title'),
            metadata: {
              count: totalCount,
              isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder="Search campaigns, statuses, or segments..."
        onSearchChange={handleSearchChange}
        filters={selectedFilters}
        filterConfiguration={filterConfiguration}
        onFilterChange={handleFilterChange}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        secondaryActions={exportActions}
        toolbarDensity="default"
        enableLiveFiltering
        filterSheetTitle="Filter Revenue Alignment"
        filterSheetDescription="Apply filters to narrow down the revenue alignment table"
      >
        <DataTable<RevenueAlignmentRow>
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          data={rows}
          loading={isLoading}
          error={error || undefined}
          totalCount={totalCount}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={setPagination}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="fixed"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={t('dashboard-revenue-empty')}
          data-testid="revenue-alignment-table"
        />
      </DataDisplay>
    </div>
  )
}

export default RevenueAlignment
