import React, { useState, useCallback, useMemo } from 'react'
import { DataDisplay, Button, DataTable } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'
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

/**
 * Shared Campaign Management Layout Component
 *
 * This component provides the UI/presentation layer for campaign management.
 * It receives all data as props from the parent module (CRM, Marketing, etc.)
 *
 * @param props - CampaignManagementLayoutProps with all data and callbacks
 */
export const CampaignManagementLayout: React.FC<CampaignManagementLayoutProps> = props => {
  const {
    // Data
    campaigns,
    // Loading states
    isLoading,
    // Error states
    error,
    // Search and filters
    search,
    onSearchChange,
    onFilterChange,
    // Sorting
    sortField,
    sortOrder,
    // Actions
    onFetchAnalytics,
    onCampaignRowClick,
    onAddCampaign,
    // Flow contexts
    campaignEntityContext,
    campaignCreateContext,
    // UI customization
    translations,
    // Columns and rendering functions (passed from parent)
    columns,
    renderCampaignActions,
    renderStatistics,
    renderAnalytics,
    // Filter configuration
    filterConfiguration,
    sortableColumns,
    // Access token
    accessToken
  } = props

  // Tab state for main view
  const [mainActiveTab, setMainActiveTab] = useState('overview')

  // Table state for DataDisplay
  const [searchTerm, setSearchTerm] = useState(search || '')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(getInitialVisibleColumns())

  // Analytics data fetched flag
  const [analyticsDataFetched, setAnalyticsDataFetched] = useState(false)

  // Sync search term with parent prop
  React.useEffect(() => {
    if (search !== searchTerm) {
      setSearchTerm(search)
    }
  }, [search, searchTerm])

  // Sync sorting state with parent props
  // This effect ensures local sorting state stays in sync with parent's sortField/sortOrder
  // It only updates when parent props actually differ from local state to prevent loops
  React.useEffect(() => {
    if (sortField && sortOrder) {
      const currentSortField = sorting[0]?.id
      const currentSortDesc = sorting[0]?.desc
      const parentWantsDesc = sortOrder === 'DESC'

      // Only sync if parent's sorting is actually different from local state
      const needsSync = currentSortField !== sortField || currentSortDesc !== parentWantsDesc

      if (needsSync) {
        const newSorting = [{ id: sortField, desc: parentWantsDesc }]
        setSorting(newSorting)
      }
    }
  }, [sortField, sortOrder])

  // Fetch analytics data only when switching to Analytics tab
  React.useEffect(() => {
    if (mainActiveTab === 'analytics' && !analyticsDataFetched && onFetchAnalytics) {
      onFetchAnalytics()
      setAnalyticsDataFetched(true)
    }
  }, [mainActiveTab, analyticsDataFetched, onFetchAnalytics])

  // Handle search changes - immediately notify parent
  const handleSearchChange = useCallback(
    (newSearch: string) => {
      setSearchTerm(newSearch)
      if (onSearchChange) {
        onSearchChange(newSearch)
      }
    },
    [onSearchChange]
  )

  // Handle filter changes - immediately notify parent and update local state
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)
      if (onFilterChange) {
        onFilterChange(filters)
      }
    },
    [onFilterChange]
  )

  // Handle sorting changes - notify parent with sort field and order
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      // Update local state immediately for responsive UI
      setSorting(newSorting)

      // Notify parent if onSortChange is provided
      // Parent will update its state and trigger data refetch
      if (props.onSortChange && newSorting.length > 0) {
        const sortField = newSorting[0].id
        const sortOrder = newSorting[0].desc ? 'DESC' : 'ASC'
        props.onSortChange(sortField, sortOrder)
      }
    },
    [props]
  )

  // Client-side pagination
  const paginatedCampaigns = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return campaigns.slice(startIndex, endIndex)
  }, [campaigns, pagination.pageIndex, pagination.pageSize])

  // Row click handler
  const handleCampaignRowClick = useCallback(
    (campaign: Campaign) => {
      if (onCampaignRowClick) {
        onCampaignRowClick(campaign)
      }
    },
    [onCampaignRowClick]
  )

  // Default actions renderer if not provided
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

  return (
    <div className="layout-content gba:pb-8">
      {/* Statistics Section - Always visible above tabs */}
      {renderStatistics?.()}

      {/* Tab Navigation with Search/Filters on same line */}
      <DataDisplay
        titleSections={[
          {
            id: 'overview',
            label: getTranslationFromI18nKeyAndLabel('campaigns.tabs.overview', 'Overview'),
            metadata: {
              count: campaigns.length,
              isLoading: isLoading
            }
          },
          {
            id: 'analytics',
            label: getTranslationFromI18nKeyAndLabel('campaigns.tabs.analytics', 'Analytics')
          }
        ]}
        currentSection={mainActiveTab}
        onSectionChange={section => setMainActiveTab(section)}
        searchValue={searchTerm}
        searchPlaceholder={
          translations?.searchPlaceholder ||
          getTranslationFromI18nKeyAndLabel('common:searchCampaigns', 'Search campaigns...')
        }
        onSearchChange={handleSearchChange}
        filters={mainActiveTab === 'overview' ? selectedFilters : undefined}
        filterConfiguration={mainActiveTab === 'overview' ? filterConfiguration : undefined}
        onFilterChange={mainActiveTab === 'overview' ? handleFilterChange : undefined}
        sorting={mainActiveTab === 'overview' ? sorting : undefined}
        sortableColumns={mainActiveTab === 'overview' ? sortableColumns : undefined}
        onSortingChange={mainActiveTab === 'overview' ? handleSortingChange : undefined}
        availableColumns={
          mainActiveTab === 'overview'
            ? [
                { id: 'name', label: 'Campaign' },
                { id: 'type', label: 'Type' },
                { id: 'startDate', label: 'Start Date' },
                { id: 'endDate', label: 'End Date' },
                { id: 'status', label: 'Status' },
                { id: 'createdAt', label: 'Created' }
              ]
            : undefined
        }
        visibleColumns={mainActiveTab === 'overview' ? visibleColumns : undefined}
        onVisibleColumnsChange={mainActiveTab === 'overview' ? setVisibleColumns : undefined}
        primaryAction={
          onAddCampaign && mainActiveTab === 'overview' ? (
            <AppAction
              contexts={[
                {
                  context: campaignCreateContext as any,
                  contextData: {}
                }
              ]}
              accessToken={accessToken}
              data-testid="add-campaign-action"
              emptyState="hide"
            >
              <Button
                size="sm"
                variant="default"
                data-testid="add-campaign-button"
                type="button"
                onClick={onAddCampaign}
              >
                <Plus size={16} />
                {translations?.addButton ||
                  getTranslationFromI18nKeyAndLabel('crm:campaign.addCampaign', 'Add Campaign')}
              </Button>
            </AppAction>
          ) : undefined
        }
        toolbarDensity="default"
        enableLiveFiltering={mainActiveTab === 'overview'}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterCampaigns', 'Filter Campaigns')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterCampaignsDescription',
          'Apply filters to narrow down the campaign list'
        )}
      >
        {mainActiveTab === 'overview' ? (
          <DataTable<Campaign>
            data={paginatedCampaigns}
            columns={columns ? columns.filter(col => visibleColumns.includes(col.id as string)) : []}
            loading={isLoading}
            error={error || undefined}
            totalCount={campaigns.length}
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
              translations?.emptyMessage ||
              getTranslationFromI18nKeyAndLabel('campaign.management.empty', 'No campaigns found')
            }
            actions={renderCampaignActions || defaultRenderActions}
            onRowClick={onCampaignRowClick ? handleCampaignRowClick : undefined}
            data-testid="campaign-list"
          />
        ) : (
          <div className="gba:space-y-6 gba:mt-6">
            {/* Analytics Content */}
            {renderAnalytics?.()}
          </div>
        )}
      </DataDisplay>
    </div>
  )
}

export default CampaignManagementLayout
