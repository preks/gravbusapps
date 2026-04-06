import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLeadExport } from './hooks/useLeadExport'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { LeadListLayout } from './components/LeadListLayout'
import { LeadStatisticsLayout, type LeadStatisticsData } from './components/LeadStatisticsLayout'
import type { Lead } from '@/common/data/relations/types/leadTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { deriveSortableColumns, deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from './utils/filterHelpers'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'

export interface LeadViewConfig<TLead extends Lead = Lead, TQueryVariables = any> {
  fetchLeads: (variables: TQueryVariables) => Promise<{
    leads?: TLead[]
    total?: number
  }>

  createColumns: () => ColumnDef<TLead>[]
  descriptors: Descriptor[]
  columnLabels?: Record<string, string>
  entityName: string

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
  }) => TQueryVariables

  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
    createContextData?: Record<string, any>
  }

  buildRecordUrl: (id: string) => string

  leadStatistics?: LeadStatisticsData

  rowActionsContextArray: FlowContextName[]
  buildRowActionsExternalContextData: (row: { original: TLead }) => Record<string, string>

  translations: {
    allLeads: { key: string; default: string }
    searchLeads: { key: string; default: string }
    filterLeads: { key: string; default: string }
    filterLeadsDescription: { key: string; default: string }
    addLead: { key: string; default: string }
  }
}

export interface LeadLayoutProps<TLead extends Lead = Lead, TQueryVariables = any> {
  readonly context: BusinessAppContextProps
  readonly config: LeadViewConfig<TLead, TQueryVariables>
  readonly dataTestId?: string
  readonly initialFilters?: Record<string, any>
  readonly hideFilters?: boolean
  readonly customPrimaryAction?: React.ReactNode
  /**
   * Pass statistics here instead of via config.leadStatistics so that statistics
   * state updates do not recreate the config object and inadvertently re-trigger
   * the GetLeads query via the queryVariables / loadData dependency chain.
   */
  readonly leadStatistics?: LeadStatisticsData
  /** When true, renders CSV and Excel export buttons in the toolbar. */
  readonly enableExport?: boolean
  /** Filename prefix for exported files (timestamp is appended automatically). */
  readonly exportFilenamePrefix?: string
}

// Row Actions Component
const LeadRowActions = <TLead extends Lead = Lead, TQueryVariables = any>({
  row,
  config,
  accessToken
}: {
  row: { original: TLead }
  config: LeadViewConfig<TLead, TQueryVariables>
  accessToken: string
}) => (
  <AppActionMenu
    contextsArray={config.rowActionsContextArray}
    externalContextData={config.buildRowActionsExternalContextData(row)}
    prefixDataTestId="lead-actions"
    accessToken={accessToken}
    emptyStateBehavior="enable"
    deferMainContextRequestsUntilClick
  >
    <Button variant="ghost" size="icon" data-testid={`lead-actions-${row.original.id}`}>
      <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
        />
      </svg>
    </Button>
  </AppActionMenu>
)

function ConfigLeadLayout<TLead extends Lead = Lead, TQueryVariables = any>(
  props: Readonly<LeadLayoutProps<TLead, TQueryVariables>>
): React.ReactElement {
  const {
    context,
    config,
    dataTestId = 'lead-view',
    initialFilters = {},
    hideFilters = false,
    customPrimaryAction,
    leadStatistics: leadStatisticsProp,
    enableExport = false,
    exportFilenamePrefix = 'leads'
  } = props

  // Prefer the directly-passed prop; fall back to config for backwards compatibility
  const activeLeadStatistics = leadStatisticsProp ?? config.leadStatistics

  // View State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])

  // Data State
  const [leads, setLeads] = useState<TLead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Use centralized filter groups hook
  const filterGroups = useFilterGroups(
    context || ({} as BusinessAppContextProps),
    config.entityName,
    config.descriptors,
    { limit: 100 }
  )

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(config.baseFilterConfig, config.descriptors, filterGroups)
  }, [config.baseFilterConfig, config.descriptors, filterGroups])

  // Query Variables
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm,
        selectedFilters,
        sorting
      }),
    [pagination, searchTerm, selectedFilters, sorting, config]
  )

  // Load Data
  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      if (!context?.accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await config.fetchLeads(queryVariables)
        setLeads(result.leads || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [context?.accessToken, config, queryVariables]
  )

  // Initial load
  useEffect(() => {
    if (!context?.accessToken || !isInitialLoad) return
    loadData(true)
  }, [context?.accessToken, isInitialLoad])

  // Reload data when filters/search/sort change (skip initial load).
  // loadData is intentionally omitted from deps: it is derived from queryVariables,
  // so including it would cause the effect to fire twice on every query change.
  useEffect(() => {
    if (isInitialLoad || !context?.accessToken) return
    loadData(false)
  }, [queryVariables, context?.accessToken])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadData(false)
    activeLeadStatistics?.refetch?.()
  }, [loadData, activeLeadStatistics?.refetch])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  // Event Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterUpdate = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleRowClick = useCallback(
    (lead: TLead) => {
      if (!lead.id) return
      const url = config.buildRecordUrl(lead.id)
      navigateTo(url)
    },
    [config]
  )

  // Columns
  const columns = useMemo(() => config.createColumns(), [config])
  const availableColumns = useMemo(() => deriveAvailableColumns(columns), [columns])
  const availableColumnIds = useMemo(() => availableColumns.map(col => col.id), [availableColumns])
  const sortableColumns = useMemo(
    () => deriveSortableColumns(config.descriptors, config.columnLabels, availableColumnIds),
    [config.descriptors, config.columnLabels, availableColumnIds]
  )

  // Initialize visible columns from available columns if empty
  useEffect(() => {
    if (visibleColumns.length === 0 && availableColumns.length > 0) {
      setVisibleColumns(availableColumns.map(col => col.id))
    }
  }, [availableColumns, visibleColumns.length])

  // Row actions - rendered internally
  // Row actions - rendered internally (only if actions are configured)
  const rowActions = useMemo(() => {
    // Hide actions column if no actions are configured
    if (!config.rowActionsContextArray || config.rowActionsContextArray.length === 0) {
      return undefined
    }
    return (row: { original: TLead }) => (
      <LeadRowActions row={row} config={config} accessToken={context?.accessToken || ''} />
    )
  }, [config, context?.accessToken])

  // Export hook — always called unconditionally (React rules).
  const { isExporting, handleExportCsv, handleExportExcel } = useLeadExport({
    fetchLeads: config.fetchLeads as any,
    queryVariables,
    totalCount,
    filenamePrefix: exportFilenamePrefix
  })

  const exportSecondaryActions = useMemo(() => {
    if (!enableExport) return undefined

    const getTitle = (entityLabel: string) => {
      if (isExporting) return 'Exporting…'
      if (totalCount === 0) return 'No data to export'
      return entityLabel
    }
    const csvTitle = getTitle(`Export ${totalCount} leads as CSV`)
    const excelTitle = getTitle(`Export ${totalCount} leads as Excel`)

    return (
      <>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          size="sm"
          disabled={isExporting || totalCount === 0}
          data-testid="lead-export-csv-button"
          title={csvTitle}
        >
          <DownloadIcon className="gba:mr-2" />
          {isExporting ? 'Exporting…' : 'CSV'}
        </Button>
        <Button
          onClick={handleExportExcel}
          variant="outline"
          size="sm"
          disabled={isExporting || totalCount === 0}
          data-testid="lead-export-excel-button"
          title={excelTitle}
        >
          <FileXlsIcon className="gba:mr-2" />
          {isExporting ? 'Exporting…' : 'Excel'}
        </Button>
      </>
    )
  }, [enableExport, isExporting, totalCount, handleExportCsv, handleExportExcel])

  if (!context) {
    console.error('LeadLayout: context is required')
    return <></>
  }

  const accessToken = context.accessToken

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {activeLeadStatistics && (
        <LeadStatisticsLayout statistics={activeLeadStatistics} data-testid={`${dataTestId}-statistics`} />
      )}

      {/* DataDisplay */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel(
              config.translations.allLeads.key,
              config.translations.allLeads.default
            ),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          config.translations.searchLeads.key,
          config.translations.searchLeads.default
        )}
        onSearchChange={handleSearch}
        filters={hideFilters ? undefined : selectedFilters}
        filterConfiguration={hideFilters ? undefined : dynamicFilterConfig}
        onFilterChange={hideFilters ? undefined : handleFilterUpdate}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          customPrimaryAction ||
          (config.flowContexts.createContext ? (
            <AppAction
              contextsArray={[config.flowContexts.createContext]}
              externalContextData={config.flowContexts.createContextData}
              accessToken={accessToken}
              data-testid="add-lead-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-lead-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel(
                  config.translations.addLead.key,
                  config.translations.addLead.default
                )}
              </Button>
            </AppAction>
          ) : undefined)
        }
        secondaryActions={exportSecondaryActions}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel(
          config.translations.filterLeads.key,
          config.translations.filterLeads.default
        )}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          config.translations.filterLeadsDescription.key,
          config.translations.filterLeadsDescription.default
        )}
      >
        <LeadListLayout<TLead>
          data={leads}
          loading={isLoading}
          error={error}
          totalCount={totalCount}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          actions={rowActions}
          onRowClick={handleRowClick}
          dataTestId={`${dataTestId}-list`}
        />
      </DataDisplay>
    </div>
  )
}

export const LeadLayout = ConfigLeadLayout
export default LeadLayout
