import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Button,
  DataDisplay,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  type FilterConfiguration
} from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { useOpportunityExport } from './hooks/useOpportunityExport'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { OpportunityBoardLayout } from './components/OpportunityBoardLayout'
import { OpportunityListLayout } from './components/OpportunityListLayout'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useBoardEmployees } from './hooks/useBoardEmployees'
import { opportunityBoardFilterConfig } from './config/opportunityBoardFilters'
import type { OpportunityBoardFilters, OpportunityBoardConfig } from './config/opportunityBoardTypes'
import { deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import {
  getFiltersForSection,
  getFilterConfigForSection,
  getFilterChangeHandlerForSection
} from './utils/layoutHelpers'
import { OpportunityStatisticsLayout, type OpportunityStatisticsData } from './components/OpportunityStatisticsLayout'
import { OpportunityAggregatesBar, type OpportunityAggregates } from './components/OpportunityAggregatesBar'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'

// Helper: Update filter options
const updateFilterOptions = (
  filterConfig: FilterConfiguration,
  groupId: string,
  filterId: string,
  options: Array<{ id: string; label: string }>
) => {
  if (options.length === 0) return

  const group = filterConfig.groups.find(g => g.id === groupId)
  if (!group) return

  const filter = group.filters.find(f => f.id === filterId)
  if (filter?.config && 'options' in filter.config) {
    filter.config.options = options
  }
}

// Helper: Determine opportunity filter from board filters
const determineOpportunityFilter = (
  boardFilters: Record<string, any>,
  currentEmployeeId?: string
): { opportunityFilter: 'my' | 'all' | 'selected'; ownerEmployeeIds: string[] | undefined } => {
  let ownerEmployeeIds: string[] | undefined = undefined

  if (boardFilters.owner && Array.isArray(boardFilters.owner) && boardFilters.owner.length > 0) {
    ownerEmployeeIds = boardFilters.owner
  }

  let opportunityFilter: 'my' | 'all' | 'selected' = 'all'
  if (ownerEmployeeIds) {
    const isOnlyMe = ownerEmployeeIds.length === 1 && ownerEmployeeIds[0] === currentEmployeeId

    if (isOnlyMe) {
      opportunityFilter = 'my'
    } else {
      opportunityFilter = 'selected'
    }
  }

  return { opportunityFilter, ownerEmployeeIds }
}

// Helper: Update amount range filter
const updateAmountRangeFilter = (filterConfig: FilterConfiguration, amountRange: { min: number; max: number }) => {
  const group = filterConfig.groups.find(g => g.id === 'amount-group')
  if (!group) return

  const filter = group.filters.find(f => f.id === 'amount')
  if (filter?.config && 'min' in filter.config && 'max' in filter.config) {
    filter.config.min = amountRange.min
    filter.config.max = amountRange.max
    const range = amountRange.max - amountRange.min
    filter.config.step = Math.max(100, Math.ceil(range * 0.01))
  }
}

export interface OpportunityViewConfig<TOpportunity extends { id: string }, TQueryVariables> {
  contextType: 'customer' | 'investment'

  fetchOpportunities: (variables: TQueryVariables) => Promise<{
    opportunities?: TOpportunity[]
    total?: number
    aggregates?: OpportunityAggregates
  }>

  filterDataHook: (context: BusinessAppContextProps) => {
    owners: Array<{ id: string; label: string }>
    stages: Array<{ id: string; label: string }>
    pipelines: Array<{ id: string; label: string }>
    accounts: Array<{ id: string; label: string }>
    statuses: Array<{ id: string; label: string }>
  }

  createColumns: () => ColumnDef<TOpportunity>[]
  createSortableColumns: (availableColumnIds?: string[]) => Array<{ id: string; label: string }>

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
    createContextData?: Record<string, any> // Optional external context data for create action
  }

  buildRecordUrl: (id: string) => string
  buildAccountUrl: (id: string) => string

  opportunityStatistics?: OpportunityStatisticsData
  renderStatistics?: (selectedCurrency?: string, quickFilter?: string) => React.ReactNode

  boardConfig: OpportunityBoardConfig
  fetchOpportunitiesForBoard: (
    filters: OpportunityBoardFilters & {
      additionalFilters?: Record<string, any>
    }
  ) => Promise<{ opportunities: TOpportunity[]; total: number }>
  renderBoardCard?: (opportunity: TOpportunity) => React.ReactNode

  rowActionsContextArray: FlowContextName[]
  buildRowActionsExternalContextData: (row: { original: TOpportunity }) => Record<string, string>
}

export type OpportunityTabKey = 'list' | 'board'

export interface QuickFiltersRenderProps {
  statuses: Array<{ id: string; label: string; code?: string }>
  selectedFilters: Record<string, any>
  onFilterChange: (filters: Record<string, any>) => void
}

export interface OpportunityLayoutProps<TOpportunity extends { id: string } = any, TQueryVariables = any> {
  context: BusinessAppContextProps
  config: OpportunityViewConfig<TOpportunity, TQueryVariables>
  dataTestId?: string
  initialFilters?: Record<string, any>
  hideFilters?: boolean
  customPrimaryAction?: React.ReactNode
  extendVisibleColumns?: string[] // Additional columns to add to base columns
  renderQuickFilters?: (props: QuickFiltersRenderProps) => React.ReactNode
  quickFilter?: string // Current quick filter value (e.g., 'all', 'qualified', 'unqualified')
  /** When true, renders CSV and Excel export buttons in the list view toolbar. */
  enableExport?: boolean
  /** Filename prefix for exported files (timestamp is appended automatically). */
  exportFilenamePrefix?: string
  showAllCurrencyOption?: boolean
  defaultCurrency?: string
}

interface OpportunityRowActionsProps<TOpportunity extends { id: string }> {
  row: { original: TOpportunity }
  config: OpportunityViewConfig<TOpportunity, any>
  accessToken: string
}

const OpportunityRowActions = <TOpportunity extends { id: string } = any>({
  row,
  config,
  accessToken
}: OpportunityRowActionsProps<TOpportunity>) => (
  <AppActionMenu
    contextsArray={config.rowActionsContextArray}
    externalContextData={config.buildRowActionsExternalContextData(row)}
    prefixDataTestId="opportunity-actions"
    accessToken={accessToken}
    emptyStateBehavior="enable"
    deferMainContextRequestsUntilClick
  >
    <Button variant="ghost" size="icon" data-testid={`opportunity-actions-${row.original.id}`}>
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

interface CurrencyFilterProps {
  selectedCurrency: string
  currencies: Array<{ code: string; label: string }>
  onCurrencyChange: (currencyCode: string) => void
  showAllOption?: boolean
}

const CurrencyFilter: React.FC<CurrencyFilterProps> = ({
  selectedCurrency,
  currencies,
  onCurrencyChange,
  showAllOption = true
}) => {
  if (currencies.length === 0) return null

  // Get display label for selected currency
  const getDisplayLabel = (value: string) => {
    if (value === 'ALL') return 'All'
    const currency = currencies.find(c => c.code === value)
    return currency?.label || value
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="gba:w-32">
          <SelectValue placeholder="Select currency">{getDisplayLabel(selectedCurrency)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="ALL">All</SelectItem>}
          {currencies.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface BoardSecondaryActionsProps {
  currentSection: 'list' | 'board'
  boardPipelineId: string
  pipelines?: Array<{ id: string; label: string }>
  onPipelineChange: (pipelineId: string) => void
  selectedCurrency: string
  currencies: Array<{ code: string; label: string }>
  onCurrencyChange: (currencyCode: string) => void
  showAllCurrencyOption?: boolean
}

const BoardSecondaryActions: React.FC<BoardSecondaryActionsProps> = ({
  currentSection,
  boardPipelineId,
  pipelines,
  onPipelineChange,
  selectedCurrency,
  currencies,
  onCurrencyChange,
  showAllCurrencyOption = true
}) => {
  if (currentSection !== 'board') return undefined

  return (
    <div className="gba:flex gba:items-center gba:gap-4">
      <div className="gba:flex gba:items-center gba:gap-2">
        <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Pipeline:</Label>
        <Select value={boardPipelineId} onValueChange={onPipelineChange}>
          <SelectTrigger className="gba:w-48">
            <SelectValue placeholder="Select Pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines?.map(pipeline => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <CurrencyFilter
        selectedCurrency={selectedCurrency}
        currencies={currencies}
        onCurrencyChange={onCurrencyChange}
        showAllOption={showAllCurrencyOption}
      />
    </div>
  )
}

interface ListSecondaryActionsProps {
  currentSection: 'list' | 'board'
  selectedCurrency: string
  currencies: Array<{ code: string; label: string }>
  onCurrencyChange: (currencyCode: string) => void
  showAllCurrencyOption?: boolean
}

const ListSecondaryActions: React.FC<ListSecondaryActionsProps> = ({
  currentSection,
  selectedCurrency,
  currencies,
  onCurrencyChange,
  showAllCurrencyOption = true
}) => {
  if (currentSection !== 'list') return undefined

  return (
    <CurrencyFilter
      selectedCurrency={selectedCurrency}
      currencies={currencies}
      onCurrencyChange={onCurrencyChange}
      showAllOption={showAllCurrencyOption}
    />
  )
}

function initializeVisibleColumns(baseColumns: string[], extendColumns: string[]): string[] {
  if (extendColumns.length === 0) return baseColumns
  const closeDateIndex = baseColumns.indexOf('closeDate')
  if (closeDateIndex >= 0) {
    return [...baseColumns.slice(0, closeDateIndex + 1), ...extendColumns, ...baseColumns.slice(closeDateIndex + 1)]
  }
  return [...baseColumns, ...extendColumns]
}

function buildDynamicListFilterConfig(
  baseFilterConfig: FilterConfiguration,
  filterData: {
    owners: Array<{ id: string; label: string }>
    stages: Array<{ id: string; label: string }>
    pipelines: Array<{ id: string; label: string }>
    accounts: Array<{ id: string; label: string }>
    statuses: Array<{ id: string; label: string }>
    forecasts: Array<{ id: string; label: string }>
    amountRange: { min: number; max: number }
  }
): FilterConfiguration {
  const filterConfig = { ...baseFilterConfig }
  const { owners, stages, pipelines, accounts, statuses, forecasts, amountRange } = filterData
  updateFilterOptions(
    filterConfig,
    'stage-group',
    'opportunityPipelineStageIds',
    stages.map(s => ({ id: s.id, label: s.label }))
  )
  updateFilterOptions(
    filterConfig,
    'status-group',
    'opportunityStatusIds',
    statuses.map(s => ({ id: s.id, label: s.label }))
  )
  updateFilterOptions(
    filterConfig,
    'forecast-group',
    'opportunityForecastIds',
    (forecasts || []).map((f: any) => ({ id: f.id, label: f.label }))
  )
  updateFilterOptions(
    filterConfig,
    'pipeline-group',
    'opportunityPipelineIds',
    pipelines.map(p => ({ id: p.id, label: p.label }))
  )
  updateFilterOptions(
    filterConfig,
    'owner-group',
    'ownerEmployeeIds',
    owners.map(o => ({ id: o.id, label: o.label }))
  )
  updateFilterOptions(
    filterConfig,
    'account-group',
    'accountIds',
    accounts.map(a => ({ id: a.id, label: a.label }))
  )
  updateAmountRangeFilter(filterConfig, amountRange)
  return filterConfig
}

function applyCurrencyToVars(
  baseVars: any,
  selectedCurrency: string,
  availableCurrencies: Array<{ id: string; code: string }>
): any {
  if (selectedCurrency === 'ALL') return baseVars
  const selectedCurrencyObj = availableCurrencies.find(c => c.code === selectedCurrency)
  if (selectedCurrencyObj?.id) {
    return { ...baseVars, currencyIds: [selectedCurrencyObj.id] }
  }
  return baseVars
}

function ConfigOpportunityLayout<TOpportunity extends { id: string } = any, TQueryVariables = any>(
  props: OpportunityLayoutProps<TOpportunity, TQueryVariables>
): React.ReactElement {
  const {
    context,
    config,
    dataTestId = 'opportunity-view',
    initialFilters = {},
    hideFilters = false,
    customPrimaryAction,
    extendVisibleColumns = [],
    renderQuickFilters,
    quickFilter,
    enableExport = false,
    exportFilenamePrefix = 'opportunities',
    showAllCurrencyOption = true,
    defaultCurrency = 'ALL'
  } = props
  const { accessToken } = context

  // View State
  const [currentSection, setCurrentSection] = useState<'list' | 'board'>('list')

  // List View State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const baseVisibleColumns = useMemo(
    () => [
      'opportunity',
      'amount',
      'opportunityPipeline',
      'opportunityPipelineStage',
      'opportunityStatus',
      'opportunityForecast',
      'closeDate',
      'owner',
      'created'
    ],
    []
  )

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    initializeVisibleColumns(baseVisibleColumns, extendVisibleColumns)
  )

  // Board View State
  const [boardPipelineId, setBoardPipelineId] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency)
  const [boardFilters, setBoardFilters] = useState<Record<string, any>>({})
  const [boardSearch, setBoardSearch] = useState('')
  const [boardOpportunities, setBoardOpportunities] = useState<TOpportunity[]>([])
  const [boardTotalCount, setBoardTotalCount] = useState(0)
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [boardRefreshTrigger, setBoardRefreshTrigger] = useState(0)

  // List Data State
  const [opportunities, setOpportunities] = useState<TOpportunity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [listAggregates, setListAggregates] = useState<OpportunityAggregates | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Dynamic Filter Data
  const filterData = config.filterDataHook(context)
  const { owners, stages, pipelines, accounts, statuses } = filterData
  const forecasts = ('forecasts' in filterData ? filterData.forecasts : []) as Array<{ id: string; label: string }>
  const amountRange =
    'amountRange' in filterData && typeof filterData.amountRange === 'object'
      ? (filterData.amountRange as { min: number; max: number })
      : { min: 0, max: 1000000 }

  // Fetch available currencies efficiently using distinctOn
  const { currencies: currencyOptions } = useAvailableCurrencies(context, {
    filters: {
      entity: config.contextType === 'customer' ? 'Opportunity' : 'InvestmentOpportunity',
      ...(config.boardConfig && 'dealType' in config.boardConfig
        ? { dealType: (config.boardConfig as any).dealType }
        : {})
    },
    returnFormat: 'full'
  })

  const availableCurrencies = useMemo(
    () =>
      (Array.isArray(currencyOptions) ? currencyOptions : [])
        .filter((currency: any) => {
          // Filter out "ALL" as we add it manually in the filter dropdown
          const currencyCode = currency?.code
          return currencyCode !== 'ALL'
        })
        .map((currency: any) => ({
          code: currency.code,
          label: currency.code,
          id: currency.id // Full catalog ID like "Currency:v1:EUR"
        })),
    [currencyOptions]
  )

  // Board Employees (for owner filter in board view)
  const { employees: boardEmployees } = useBoardEmployees({
    accessToken,
    currentEmployeeId: context.userInfo?.employeeDetails?.employeeId,
    opportunityType: config.boardConfig.opportunityType,
    selectedPipelineId: boardPipelineId
  })

  // Dynamic Filter Configuration for Board
  const boardFilterConfig = useMemo(() => {
    const filterConfig = { ...opportunityBoardFilterConfig }
    updateFilterOptions(filterConfig, 'owner-group', 'owner', boardEmployees)
    return filterConfig
  }, [boardEmployees])

  // Dynamic Filter Configuration for List
  const dynamicFilterConfig = useMemo(
    () =>
      buildDynamicListFilterConfig(config.baseFilterConfig, {
        owners,
        stages,
        pipelines,
        accounts,
        statuses,
        forecasts,
        amountRange
      }),
    [owners, stages, pipelines, accounts, statuses, forecasts, amountRange, config.baseFilterConfig]
  )

  // List Query Variables
  const listQueryVariables = useMemo(() => {
    const baseVars = config.buildQueryVariables({ pagination, searchTerm, selectedFilters, sorting })
    return applyCurrencyToVars(baseVars, selectedCurrency, availableCurrencies)
  }, [pagination, searchTerm, selectedFilters, sorting, selectedCurrency, availableCurrencies, config])

  // Export
  const { isExporting, handleExportCsv, handleExportExcel } = useOpportunityExport({
    fetchOpportunities: config.fetchOpportunities as any,
    queryVariables: listQueryVariables,
    totalCount,
    filenamePrefix: exportFilenamePrefix,
    contextType: config.contextType,
    listAggregates,
    displayCurrencyCode: selectedCurrency === 'ALL' ? 'EUR' : selectedCurrency
  })

  // Load List Data
  const loadListData = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await config.fetchOpportunities(listQueryVariables)
        setOpportunities(result.opportunities || [])
        setTotalCount(result.total || 0)
        if (result.aggregates) {
          setListAggregates(result.aggregates)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [accessToken, config, listQueryVariables]
  )

  // Load Board Data
  const loadBoardData = useCallback(async () => {
    if (!accessToken) return

    setBoardLoading(true)
    setBoardError(null)

    try {
      // Determine filter mode using helper
      const currentEmployeeId = context.userInfo?.employeeDetails?.employeeId
      const { opportunityFilter, ownerEmployeeIds } = determineOpportunityFilter(boardFilters, currentEmployeeId)

      const boardFiltersObj: OpportunityBoardFilters = {
        selectedPipelineId: boardPipelineId,
        opportunityFilter,
        selectedEmployeeIds: ownerEmployeeIds || [],
        search: boardSearch.trim() || undefined
      }

      // Convert selected currency code to full catalog ID if not "ALL"
      if (selectedCurrency !== 'ALL') {
        const selectedCurrencyObj = availableCurrencies.find(c => c.code === selectedCurrency)
        if (selectedCurrencyObj?.id) {
          ;(boardFiltersObj as any).currencyIds = [selectedCurrencyObj.id]
        }
      }

      const result = await config.fetchOpportunitiesForBoard(boardFiltersObj)
      setBoardOpportunities(result.opportunities || [])
      setBoardTotalCount(result.total || 0)
    } catch (err) {
      console.error('Error loading board opportunities:', err)
      setBoardError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setBoardLoading(false)
    }
  }, [
    accessToken,
    config,
    boardPipelineId,
    boardFilters,
    boardSearch,
    selectedCurrency,
    availableCurrencies,
    context.userInfo?.employeeDetails?.employeeId
  ])

  // Set default board pipeline FIRST
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !boardPipelineId) {
      setBoardPipelineId(pipelines[0].id)
    }
  }, [pipelines, boardPipelineId])

  // Initial parallel load: Load BOTH list and board data for badge counts
  useEffect(() => {
    if (!accessToken || !isInitialLoad) return

    const loadBothSections = async () => {
      // Always load list; load board only when a pipeline is available
      const tasks = [loadListData(true)]
      if (boardPipelineId) {
        tasks.push(loadBoardData())
      }
      await Promise.all(tasks)
    }

    loadBothSections()
  }, [accessToken, isInitialLoad])

  // Reload list data when filters/search/sort change (only when list is active, skip initial load).
  // loadListData is intentionally omitted from deps: it is derived from listQueryVariables,
  // so including it would cause the effect to fire twice on every query change.
  useEffect(() => {
    if (isInitialLoad || !accessToken || currentSection !== 'list') return
    loadListData(false)
  }, [listQueryVariables, accessToken, currentSection])

  // Reload board data when filters/search/currency change (only when board is active, skip initial load).
  // loadBoardData is intentionally omitted from deps: it is derived from the other deps listed,
  // so including it would cause the effect to fire twice on every change.
  useEffect(() => {
    if (isInitialLoad || !accessToken || currentSection !== 'board' || !boardPipelineId) return
    loadBoardData()
  }, [boardPipelineId, boardFilters, boardSearch, selectedCurrency, isInitialLoad, accessToken, currentSection])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    if (currentSection === 'list') {
      loadListData(false)
    } else {
      loadBoardData()
    }
    setBoardRefreshTrigger(prev => prev + 1)
    // Also refresh statistics when process completes
    config.opportunityStatistics?.refetch?.()
  }, [currentSection, loadListData, loadBoardData, config.opportunityStatistics?.refetch])

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
    (opportunity: TOpportunity) => {
      const url = config.buildRecordUrl(opportunity.id)
      navigateTo(url)
    },
    [config]
  )

  // Columns
  const columns = useMemo(() => config.createColumns(), [config])
  const availableColumns = useMemo(() => deriveAvailableColumns(columns), [columns])

  // Row actions - rendered internally
  // Row actions - rendered internally (only if actions are configured)
  const rowActions = useMemo(() => {
    if (config.rowActionsContextArray && config.rowActionsContextArray.length > 0) {
      return (row: { original: TOpportunity }) => (
        <OpportunityRowActions row={row} config={config} accessToken={accessToken} />
      )
    }
    return undefined
  }, [config, accessToken])

  // Board secondary actions: Pipeline selector + Currency filter
  const boardSecondaryActions = useMemo(
    () => (
      <BoardSecondaryActions
        currentSection={currentSection}
        boardPipelineId={boardPipelineId}
        pipelines={pipelines}
        onPipelineChange={setBoardPipelineId}
        selectedCurrency={selectedCurrency}
        currencies={availableCurrencies}
        onCurrencyChange={setSelectedCurrency}
        showAllCurrencyOption={showAllCurrencyOption}
      />
    ),
    [currentSection, boardPipelineId, pipelines, selectedCurrency, availableCurrencies, showAllCurrencyOption]
  )

  // List secondary actions: Currency filter + optional export buttons
  const listSecondaryActions = useMemo(
    () => (
      <div className="gba:flex gba:items-center gba:gap-2">
        <ListSecondaryActions
          currentSection={currentSection}
          selectedCurrency={selectedCurrency}
          currencies={availableCurrencies}
          onCurrencyChange={setSelectedCurrency}
          showAllCurrencyOption={showAllCurrencyOption}
        />
        {enableExport && currentSection === 'list' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting || totalCount === 0}
              title={isExporting ? 'Exporting…' : `Export ${totalCount} opportunities as CSV`}
              data-testid="export-csv-button"
            >
              <DownloadIcon size={16} />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting || totalCount === 0}
              title={isExporting ? 'Exporting…' : `Export ${totalCount} opportunities as Excel`}
              data-testid="export-excel-button"
            >
              <FileXlsIcon size={16} />
              Excel
            </Button>
          </>
        )}
      </div>
    ),
    [
      currentSection,
      selectedCurrency,
      availableCurrencies,
      showAllCurrencyOption,
      enableExport,
      isExporting,
      totalCount,
      handleExportCsv,
      handleExportExcel
    ]
  )

  // Extract sortableColumns for list view
  const listSortableColumns = useMemo(() => {
    if (currentSection !== 'list') return undefined
    const availableColumnIds = availableColumns.map(col => col.id)
    return config.createSortableColumns(availableColumnIds)
  }, [currentSection, availableColumns, config])

  // Extract primary action
  const primaryActionElement = useMemo(() => {
    if (customPrimaryAction) return customPrimaryAction

    if (config.flowContexts.createContext) {
      return (
        <AppAction
          contextsArray={[config.flowContexts.createContext]}
          externalContextData={config.flowContexts.createContextData}
          accessToken={accessToken}
          data-testid="add-opportunity-action"
          emptyStateBehavior="hide"
        >
          <Button size="sm" variant="default" data-testid="add-opportunity-button" type="button">
            <Plus size={16} />
            {getTranslationFromI18nKeyAndLabel('crm:opportunity.addOpportunity', 'Add Opportunity')}
          </Button>
        </AppAction>
      )
    }

    return undefined
  }, [customPrimaryAction, config.flowContexts.createContext, config.flowContexts.createContextData, accessToken])

  // Convert selected currency code to full ID for statistics
  const selectedCurrencyId = useMemo(() => {
    if (selectedCurrency === 'ALL') return undefined
    const currencyObj = availableCurrencies.find(c => c.code === selectedCurrency)
    return currencyObj?.id
  }, [selectedCurrency, availableCurrencies])

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {config.renderStatistics ? (
        <div data-testid={`${dataTestId}-statistics`}>{config.renderStatistics(selectedCurrencyId, quickFilter)}</div>
      ) : config.opportunityStatistics ? (
        <OpportunityStatisticsLayout
          statistics={config.opportunityStatistics}
          data-testid={`${dataTestId}-statistics`}
        />
      ) : null}

      {/* Quick Filters */}
      {renderQuickFilters && (
        <div className="gba:mb-4" data-testid={`${dataTestId}-quick-filters`}>
          {renderQuickFilters({
            statuses: statuses as Array<{ id: string; label: string; code?: string }>,
            selectedFilters,
            onFilterChange: handleFilterUpdate
          })}
        </div>
      )}

      {/* DataDisplay with titleSections as Tabs */}
      <DataDisplay
        key={currentSection}
        titleSections={[
          {
            id: 'list',
            label: getTranslationFromI18nKeyAndLabel('common:listView', 'List'),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          },
          {
            id: 'board',
            label: getTranslationFromI18nKeyAndLabel('common:boardView', 'Board'),
            metadata: {
              count: boardTotalCount,
              isLoading: boardLoading
            }
          }
        ]}
        currentSection={currentSection}
        onSectionChange={value => setCurrentSection(value as 'list' | 'board')}
        searchValue={currentSection === 'list' ? searchTerm : boardSearch}
        searchPlaceholder={currentSection === 'list' ? 'Search opportunities...' : 'Search board...'}
        onSearchChange={currentSection === 'list' ? handleSearch : setBoardSearch}
        filters={getFiltersForSection(currentSection, hideFilters, selectedFilters, boardFilters)}
        filterConfiguration={getFilterConfigForSection(
          currentSection,
          hideFilters,
          dynamicFilterConfig,
          boardFilterConfig
        )}
        onFilterChange={getFilterChangeHandlerForSection(
          currentSection,
          hideFilters,
          handleFilterUpdate,
          setBoardFilters
        )}
        sorting={currentSection === 'list' ? sorting : undefined}
        sortableColumns={listSortableColumns}
        onSortingChange={currentSection === 'list' ? setSorting : undefined}
        availableColumns={currentSection === 'list' ? availableColumns : undefined}
        visibleColumns={currentSection === 'list' ? visibleColumns : undefined}
        onVisibleColumnsChange={currentSection === 'list' ? setVisibleColumns : undefined}
        primaryAction={primaryActionElement}
        secondaryActions={currentSection === 'board' ? boardSecondaryActions : listSecondaryActions}
        toolbarDensity="default"
        enableLiveFiltering={currentSection === 'board'}
        filterSheetTitle={currentSection === 'board' ? 'Filter Board' : 'Filter Opportunities'}
        filterSheetDescription={
          currentSection === 'board'
            ? 'Filter opportunities by owner'
            : 'Apply filters to narrow down the opportunity list'
        }
      >
        {currentSection === 'list' ? (
          <>
            <OpportunityListLayout<TOpportunity>
              data={opportunities}
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
            {listAggregates && (
              <OpportunityAggregatesBar
                aggregates={listAggregates}
                displayCurrencyCode={selectedCurrency === 'ALL' ? 'EUR' : selectedCurrency}
                dataTestId={`${dataTestId}-aggregates-bar`}
              />
            )}
          </>
        ) : (
          <OpportunityBoardLayout
            accessToken={accessToken}
            userInfo={context.userInfo}
            config={config.boardConfig}
            opportunities={boardOpportunities as any}
            isLoading={boardLoading}
            error={boardError}
            selectedPipelineId={boardPipelineId}
            onRefresh={loadBoardData}
            refreshTrigger={boardRefreshTrigger}
            renderCard={config.renderBoardCard as any}
            dataTestId={`${dataTestId}-board`}
          />
        )}
      </DataDisplay>
    </div>
  )
}

export const OpportunityLayout = ConfigOpportunityLayout
export default OpportunityLayout
