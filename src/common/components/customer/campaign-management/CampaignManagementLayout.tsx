import React, { useState, useCallback, useMemo } from 'react'
import { DataDisplay, Button, DataTable } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { useCampaignExport } from './hooks/useCampaignExport'
import type { CampaignManagementLayoutProps, Campaign } from './types/CampaignManagementLayoutTypes'

/**
 * Campaign row actions component
 */
const CampaignRowActions: React.FC<{
  campaignId: string
  accessToken: string
  campaignEntityContext: string
}> = ({ campaignId, accessToken, campaignEntityContext }) => (
  <AppAction
    variant="table-row"
    contexts={[
      {
        context: campaignEntityContext as any,
        contextData: { campaignId }
      }
    ]}
    prefixDataTestId="campaign-actions"
    accessToken={accessToken}
    emptyState="enable"
    lazyLoad
    onClick={e => e.stopPropagation()}
    data-testid={`campaign-actions-${campaignId}`}
  />
)

/**
 * Helper: Get initial visible columns for the table
 */
const getInitialVisibleColumns = () => ['name', 'type', 'startDate', 'endDate', 'status', 'createdAt']

const normalizeVisibleColumns = (columns?: string[]) => {
  if (!columns || columns.length === 0) {
    return getInitialVisibleColumns()
  }

  const deduplicated = Array.from(new Set(columns))
  return deduplicated.includes('name') ? deduplicated : ['name', ...deduplicated]
}

/**
 * Helper: Check whether the layout's local sorting state differs from the parent's sort props.
 * Extracted outside the component to keep its cognitive complexity within limits.
 */
const isSortOutOfSync = (
  sorting: Array<{ id: string; desc: boolean }>,
  sortField: string | undefined,
  sortOrder: 'ASC' | 'DESC' | undefined
): boolean => {
  if (!sortField || !sortOrder) return false
  const parentWantsDesc = sortOrder === 'DESC'
  return sorting[0]?.id !== sortField || sorting[0]?.desc !== parentWantsDesc
}

type MainActiveTab = 'overview' | 'analytics' | 'insights'

const isMainActiveTab = (section: string): section is MainActiveTab =>
  section === 'overview' || section === 'analytics' || section === 'insights'

const getInitialMainTabFromUrl = (): MainActiveTab => {
  if (globalThis.window === undefined) return 'overview'
  const params = new URLSearchParams(globalThis.window.location.search)
  const mainTab = params.get('mainTab')
  if (mainTab === 'analytics' || mainTab === 'insights') return mainTab
  return 'overview'
}

interface CampaignOverviewTabPanelProps {
  campaigns: Campaign[]
  totalCount: number
  columns: CampaignManagementLayoutProps['columns']
  visibleColumns: string[]
  isLoading: boolean
  error: string | null
  sorting: Array<{ id: string; desc: boolean }>
  pagination: { pageIndex: number; pageSize: number }
  translations?: CampaignManagementLayoutProps['translations']
  renderCampaignActions?: (row: { original: Campaign }) => React.ReactNode
  defaultRenderActions: (row: { original: Campaign }) => React.ReactNode
  onCampaignRowClick?: (campaign: Campaign) => void
  handleCampaignRowClick: (campaign: Campaign) => void
  handleSortingChange: (newSorting: Array<{ id: string; desc: boolean }>) => void
  setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
}

const CampaignOverviewTabPanel: React.FC<CampaignOverviewTabPanelProps> = ({
  campaigns,
  totalCount,
  columns,
  visibleColumns,
  isLoading,
  error,
  sorting,
  pagination,
  translations,
  renderCampaignActions,
  defaultRenderActions,
  onCampaignRowClick,
  handleCampaignRowClick,
  handleSortingChange,
  setPagination
}) => (
  <DataTable<Campaign>
    data={campaigns}
    columns={columns ? columns.filter(col => visibleColumns.includes(col.id as string)) : []}
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
    emptyMessage={
      translations?.emptyMessage || getTranslationFromI18nKeyAndLabel('campaign.management.empty', 'No campaigns found')
    }
    actions={renderCampaignActions || defaultRenderActions}
    onRowClick={onCampaignRowClick ? handleCampaignRowClick : undefined}
    data-testid="campaign-list"
  />
)

const renderMainTabPanel = (
  mainActiveTab: MainActiveTab,
  overviewProps: CampaignOverviewTabPanelProps,
  renderAnalytics?: () => React.ReactNode,
  renderInsights?: () => React.ReactNode
): React.ReactNode => {
  if (mainActiveTab === 'overview') {
    return <CampaignOverviewTabPanel {...overviewProps} />
  }
  if (mainActiveTab === 'analytics') {
    return <div className="gba:space-y-6 gba:mt-6">{renderAnalytics?.()}</div>
  }
  if (mainActiveTab === 'insights') {
    return <div className="gba:space-y-6 gba:mt-6">{renderInsights?.()}</div>
  }
  return null
}

const whenOverviewTab = <T,>(mainActiveTab: MainActiveTab, value: T): T | undefined => {
  if (mainActiveTab === 'overview') {
    return value
  }
  return undefined
}

const handleMainTabUrlChange = (section: string) => {
  if (globalThis.window === undefined) {
    return
  }
  const params = new URLSearchParams(globalThis.window.location.search)
  if (section === 'analytics' || section === 'insights') {
    params.set('mainTab', section)
  } else {
    params.delete('mainTab')
  }
  const newUrl = `${globalThis.window.location.pathname}?${params.toString()}`
  globalThis.window.history.replaceState({}, '', newUrl)
}

const useCampaignManagementLayoutModel = (props: CampaignManagementLayoutProps) => {
  const {
    campaigns,
    totalCount,
    isLoading,
    error,
    search,
    onSearchChange,
    onFilterChange,
    sortField,
    sortOrder,
    onCampaignRowClick,
    campaignEntityContext,
    translations,
    columns,
    renderCampaignActions,
    renderStatistics,
    renderAnalytics,
    filterConfiguration,
    sortableColumns,
    enableExport = false,
    exportFilenamePrefix = 'campaigns',
    fetchCampaignsForExport,
    accessToken,
    initialFilters,
    initialSorting,
    initialVisibleColumns,
    onSaveVisibleColumns,
    pagination,
    onPaginationChange
  } = props

  const [mainActiveTab, setMainActiveTab] = useState<MainActiveTab>(getInitialMainTabFromUrl)
  const [searchTerm, setSearchTerm] = useState(search || '')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters ?? {})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(
    initialSorting ?? [{ id: 'createdAt', desc: true }]
  )
  const [visibleColumns, setVisibleColumns] = useState<string[]>(normalizeVisibleColumns(initialVisibleColumns))
  const hasInitializedTabFetch = React.useRef(false)
  const previousTabRef = React.useRef<MainActiveTab>(mainActiveTab)

  React.useEffect(() => {
    if (search !== searchTerm) {
      setSearchTerm(search)
    }
  }, [search, searchTerm])

  React.useEffect(() => {
    if (!isSortOutOfSync(sorting, sortField, sortOrder)) return
    setSorting([{ id: sortField as string, desc: sortOrder === 'DESC' }])
  }, [sortField, sortOrder])

  React.useEffect(() => {
    // Initial fetch only when landing directly on a non-overview tab (via URL)
    if (!hasInitializedTabFetch.current) {
      hasInitializedTabFetch.current = true
      previousTabRef.current = mainActiveTab
      if (mainActiveTab !== 'overview') {
        props.onTabDataFetch?.(mainActiveTab)
      }
      return
    }

    // Fetch exactly once per actual tab change
    if (previousTabRef.current === mainActiveTab) {
      return
    }

    previousTabRef.current = mainActiveTab
    props.onTabDataFetch?.(mainActiveTab)
  }, [mainActiveTab, props])

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      setSearchTerm(newSearch)
      onSearchChange?.(newSearch)
    },
    [onSearchChange]
  )

  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)
      onFilterChange?.(filters)
    },
    [onFilterChange]
  )

  const handleVisibleColumnsChange = useCallback(
    (nextColumns: string[]) => {
      const normalizedColumns = normalizeVisibleColumns(nextColumns)
      setVisibleColumns(normalizedColumns)
      onSaveVisibleColumns?.(normalizedColumns)
    },
    [onSaveVisibleColumns]
  )

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      setSorting(newSorting)
      if (props.onSortChange && newSorting.length > 0) {
        props.onSortChange(newSorting[0].id, newSorting[0].desc ? 'DESC' : 'ASC')
      }
    },
    [props]
  )

  const handleMainTabChange = useCallback((section: string) => {
    if (!isMainActiveTab(section)) return
    setMainActiveTab(section)
    handleMainTabUrlChange(section)
  }, [])

  const handleCampaignRowClick = useCallback(
    (campaign: Campaign) => {
      onCampaignRowClick?.(campaign)
    },
    [onCampaignRowClick]
  )

  const defaultRenderActions = useCallback(
    (row: { original: Campaign }) => (
      <div role="presentation" onClick={e => e.stopPropagation()}>
        <CampaignRowActions
          campaignId={row.original.id}
          accessToken={accessToken}
          campaignEntityContext={campaignEntityContext}
        />
      </div>
    ),
    [accessToken, campaignEntityContext]
  )

  const exportQueryVariables = useMemo(
    () => buildExportQueryVariables(searchTerm, selectedFilters, sorting),
    [searchTerm, selectedFilters, sorting]
  )

  const { isExporting, handleExportCsv, handleExportExcel } = useCampaignExport({
    fetchCampaigns: fetchCampaignsForExport ?? (async () => ({})),
    queryVariables: exportQueryVariables,
    totalCount,
    filenamePrefix: exportFilenamePrefix
  })

  const exportActions = useMemo(() => {
    if (!enableExport || !fetchCampaignsForExport) return undefined
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCsv}
          disabled={isExporting || totalCount === 0}
          title={isExporting ? 'Exporting…' : `Export ${totalCount} campaigns as CSV`}
          data-testid="export-csv-button"
        >
          <DownloadIcon size={16} />
          CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportExcel}
          disabled={isExporting || totalCount === 0}
          title={isExporting ? 'Exporting…' : `Export ${totalCount} campaigns as Excel`}
          data-testid="export-excel-button"
        >
          <FileXlsIcon size={16} />
          Excel
        </Button>
      </>
    )
  }, [enableExport, fetchCampaignsForExport, isExporting, totalCount, handleExportCsv, handleExportExcel])

  return {
    props,
    campaigns,
    isLoading,
    error,
    translations,
    columns,
    renderCampaignActions,
    renderStatistics,
    renderAnalytics,
    filterConfiguration,
    sortableColumns,
    accessToken,
    campaignCreateContext: props.campaignCreateContext,
    mainActiveTab,
    searchTerm,
    selectedFilters,
    sorting,
    visibleColumns,
    pagination,
    handleMainTabChange,
    handleSearchChange,
    handleFilterChange,
    handleVisibleColumnsChange,
    handleSortingChange,
    handleCampaignRowClick,
    onCampaignRowClick,
    defaultRenderActions,
    exportActions,
    setPagination: onPaginationChange,
    totalCount
  }
}

const buildExportQueryVariables = (
  searchTerm: string,
  selectedFilters: Record<string, any>,
  sorting: Array<{ id: string; desc: boolean }>
) => {
  const sortEntry = sorting[0]
  const processedStartDate = normalizeDateRange(selectedFilters.startDateRange)
  const processedEndDate = normalizeDateRange(selectedFilters.endDateRange)
  const processedCreatedDate = normalizeDateRange(selectedFilters.createdAtRange)
  return {
    search: searchTerm || undefined,
    campaignTypes: selectedFilters.types?.length ? selectedFilters.types : undefined,
    startDateAfter: processedStartDate?.from,
    startDateBefore: processedStartDate?.to,
    endDateAfter: processedEndDate?.from,
    endDateBefore: processedEndDate?.to,
    createdAfter: processedCreatedDate?.from,
    createdBefore: processedCreatedDate?.to,
    sortField: sortEntry?.id,
    sortOrder: sortEntry?.desc ? 'DESC' : 'ASC'
  }
}

/**
 * Shared Campaign Management Layout Component
 *
 * This component provides the UI/presentation layer for campaign management.
 * It receives all data as props from the parent module (CRM, Marketing, etc.)
 *
 * @param props - CampaignManagementLayoutProps with all data and callbacks
 */
export const CampaignManagementLayout: React.FC<CampaignManagementLayoutProps> = props => {
  const model = useCampaignManagementLayoutModel(props)

  return (
    <div className="layout-content gba:pb-8">
      {model.renderStatistics?.()}

      {/* Tab Navigation with Search/Filters on same line */}
      <DataDisplay
        titleSections={[
          {
            id: 'overview',
            label: getTranslationFromI18nKeyAndLabel('campaigns.tabs.overview', 'Overview'),
            metadata: {
              count: model.totalCount,
              isLoading: model.isLoading
            }
          },
          {
            id: 'analytics',
            label: getTranslationFromI18nKeyAndLabel('campaigns.tabs.analytics', 'Analytics')
          },
          {
            id: 'insights',
            label: getTranslationFromI18nKeyAndLabel('campaigns.tabs.insights', 'Insights')
          }
        ]}
        currentSection={model.mainActiveTab}
        onSectionChange={model.handleMainTabChange}
        searchValue={model.searchTerm}
        searchPlaceholder={
          model.translations?.searchPlaceholder ||
          getTranslationFromI18nKeyAndLabel('common:searchCampaigns', 'Search campaigns...')
        }
        onSearchChange={model.handleSearchChange}
        filters={whenOverviewTab(model.mainActiveTab, model.selectedFilters)}
        filterConfiguration={whenOverviewTab(model.mainActiveTab, model.filterConfiguration)}
        onFilterChange={whenOverviewTab(model.mainActiveTab, model.handleFilterChange)}
        sorting={whenOverviewTab(model.mainActiveTab, model.sorting)}
        sortableColumns={whenOverviewTab(model.mainActiveTab, model.sortableColumns)}
        onSortingChange={whenOverviewTab(model.mainActiveTab, model.handleSortingChange)}
        availableColumns={whenOverviewTab(model.mainActiveTab, [
          { id: 'name', label: 'Campaign' },
          { id: 'type', label: 'Type' },
          { id: 'startDate', label: 'Start Date' },
          { id: 'endDate', label: 'End Date' },
          { id: 'status', label: 'Status' },
          { id: 'createdAt', label: 'Created' }
        ])}
        visibleColumns={whenOverviewTab(model.mainActiveTab, model.visibleColumns)}
        onVisibleColumnsChange={whenOverviewTab(model.mainActiveTab, model.handleVisibleColumnsChange)}
        primaryAction={whenOverviewTab(
          model.mainActiveTab,
          <AppAction
            contexts={[
              {
                context: model.campaignCreateContext as any,
                contextData: {}
              }
            ]}
            accessToken={model.accessToken}
            data-testid="add-campaign-action"
            emptyState="hide"
          >
            <Button size="sm" variant="default" data-testid="add-campaign-button" type="button">
              <Plus size={16} />
              {model.translations?.addButton ||
                getTranslationFromI18nKeyAndLabel('crm:campaign.addCampaign', 'Add Campaign')}
            </Button>
          </AppAction>
        )}
        secondaryActions={whenOverviewTab(model.mainActiveTab, model.exportActions)}
        toolbarDensity="default"
        enableLiveFiltering={model.mainActiveTab === 'overview'}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterCampaigns', 'Filter Campaigns')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterCampaignsDescription',
          'Apply filters to narrow down the campaign list'
        )}
      >
        {renderMainTabPanel(
          model.mainActiveTab,
          {
            campaigns: model.campaigns,
            totalCount: model.totalCount,
            columns: model.columns,
            visibleColumns: model.visibleColumns,
            isLoading: model.isLoading,
            error: model.error,
            sorting: model.sorting,
            pagination: model.pagination,
            translations: model.translations,
            renderCampaignActions: model.renderCampaignActions,
            defaultRenderActions: model.defaultRenderActions,
            onCampaignRowClick: model.onCampaignRowClick,
            handleCampaignRowClick: model.handleCampaignRowClick,
            handleSortingChange: model.handleSortingChange,
            setPagination: model.setPagination
          },
          model.renderAnalytics,
          model.props.renderInsights
        )}
      </DataDisplay>
    </div>
  )
}

export default CampaignManagementLayout
