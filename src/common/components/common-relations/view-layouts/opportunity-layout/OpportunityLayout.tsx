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
    const existingOptions = (filter.config.options as Array<{ id: string; label: string }>) ?? []
    const syntheticOptions = existingOptions.filter(o => o.id.startsWith('BUCKET:'))
    filter.config.options = syntheticOptions.length > 0 ? [...syntheticOptions, ...options] : options
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
  /**
   * Applied to list/export queries only (not shown as filter chips). Pair with `hideFilters`
   * on record tabs so users cannot clear account/contact scope from the filter UI.
   */
  scopedQueryFilters?: Record<string, any>
  /** When true, the list filter bar is hidden (use on record opportunity tabs). */
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
  /** Called whenever the user changes list-tab filters — use to persist filter state externally. */
  onFilterChange?: (filters: Record<string, any>) => void
  initialSorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  initialVisibleColumns?: string[]
  onVisibleColumnsChange?: (columns: string[]) => void
  /** When true, only the list view is shown (board tab is hidden). */
  hideBoard?: boolean
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

function buildBoardFiltersObj(args: {
  boardPipelineId: string
  boardFilters: Record<string, any>
  boardSearch: string
  selectedCurrency: string
  availableCurrencies: Array<{ id: string; code: string }>
  currentEmployeeId?: string
}): OpportunityBoardFilters {
  const { boardPipelineId, boardFilters, boardSearch, selectedCurrency, availableCurrencies, currentEmployeeId } = args
  const { opportunityFilter, ownerEmployeeIds } = determineOpportunityFilter(boardFilters, currentEmployeeId)

  const boardFiltersObj: OpportunityBoardFilters = {
    selectedPipelineId: boardPipelineId,
    opportunityFilter,
    selectedEmployeeIds: ownerEmployeeIds || [],
    search: boardSearch.trim() || undefined
  }

  const selectedCurrencyObj =
    selectedCurrency === 'ALL' ? undefined : availableCurrencies.find(c => c.code === selectedCurrency)
  if (selectedCurrencyObj?.id) {
    ;(boardFiltersObj as any).currencyIds = [selectedCurrencyObj.id]
  }

  return boardFiltersObj
}

interface SectionUiPropsArgs {
  currentSection: 'list' | 'board'
  searchTerm: string
  boardSearch: string
  handleSearch: (value: string) => void
  setBoardSearch: (value: string) => void
  sorting: Array<{ id: string; desc: boolean }>
  handleSortingChange: (newSorting: Array<{ id: string; desc: boolean }>) => void
  availableColumns: Array<{ id: string; label: string }>
  visibleColumns: string[]
  handleVisibleColumnsChange: (newColumns: string[]) => void
  boardSecondaryActions: React.ReactNode
  listSecondaryActions: React.ReactNode
}

function buildSectionUiProps(args: SectionUiPropsArgs) {
  const isListSection = args.currentSection === 'list'
  return {
    isListSection,
    searchValue: isListSection ? args.searchTerm : args.boardSearch,
    searchPlaceholder: isListSection ? 'Search opportunities...' : 'Search board...',
    onSearchChange: isListSection ? args.handleSearch : args.setBoardSearch,
    sorting: isListSection ? args.sorting : undefined,
    onSortingChange: isListSection ? args.handleSortingChange : undefined,
    availableColumns: isListSection ? args.availableColumns : undefined,
    visibleColumns: isListSection ? args.visibleColumns : undefined,
    onVisibleColumnsChange: isListSection ? args.handleVisibleColumnsChange : undefined,
    secondaryActions: isListSection ? args.listSecondaryActions : args.boardSecondaryActions,
    enableLiveFiltering: !isListSection,
    filterSheetTitle: isListSection ? 'Filter Opportunities' : 'Filter Board',
    filterSheetDescription: isListSection
      ? 'Apply filters to narrow down the opportunity list'
      : 'Filter opportunities by owner'
  }
}

function mapAvailableCurrencies(currencyOptions: unknown): Array<{ code: string; label: string; id: string }> {
  const list = Array.isArray(currencyOptions) ? currencyOptions : []
  return list
    .filter((currency: any) => currency?.code !== 'ALL')
    .map((currency: any) => ({ code: currency.code, label: currency.code, id: currency.id }))
}

interface OpportunityPrimaryActionProps {
  customAction?: React.ReactNode
  createContext?: FlowContextName
  createContextData?: Record<string, any>
  accessToken?: string
}

const OpportunityPrimaryAction: React.FC<OpportunityPrimaryActionProps> = ({
  customAction,
  createContext,
  createContextData,
  accessToken
}) => {
  if (customAction) return <>{customAction}</>
  if (!createContext) return null

  return (
    <AppAction
      contextsArray={[createContext]}
      externalContextData={createContextData}
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

function ConfigOpportunityLayout<TOpportunity extends { id: string } = any, TQueryVariables = any>(
  props: OpportunityLayoutProps<TOpportunity, TQueryVariables>
): React.ReactElement {
  const {
    context,
    config,
    dataTestId = 'opportunity-view',
    initialFilters = {},
    scopedQueryFilters = {},
    hideFilters = false,
    customPrimaryAction,
    extendVisibleColumns = [],
    renderQuickFilters,
    quickFilter,
    enableExport = false,
    exportFilenamePrefix = 'opportunities',
    showAllCurrencyOption = true,
    defaultCurrency = 'ALL',
    onFilterChange: onFilterChangeProp,
    initialSorting: initialSortingProp,
    onSortingChange: onSortingChangeProp,
    initialVisibleColumns: initialVisibleColumnsProp,
    onVisibleColumnsChange: onVisibleColumnsChangeProp,
    hideBoard = false
  } = props
  const { accessToken } = context

  // View State
  const [currentSection, setCurrentSection] = useState<'list' | 'board'>('list')

  // List View State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(
    () => initialSortingProp ?? [{ id: 'createdAt', desc: true }]
  )
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

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    () => initialVisibleColumnsProp ?? initializeVisibleColumns(baseVisibleColumns, extendVisibleColumns)
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

  const availableCurrencies = useMemo(() => mapAvailableCurrencies(currencyOptions), [currencyOptions])

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
    const withScope = { ...baseVars, ...scopedQueryFilters }
    return applyCurrencyToVars(withScope, selectedCurrency, availableCurrencies)
  }, [
    pagination,
    searchTerm,
    selectedFilters,
    sorting,
    selectedCurrency,
    availableCurrencies,
    config,
    scopedQueryFilters
  ])

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
      const boardFiltersObj = buildBoardFiltersObj({
        boardPipelineId,
        boardFilters,
        boardSearch,
        selectedCurrency,
        availableCurrencies,
        currentEmployeeId: context.userInfo?.employeeDetails?.employeeId
      })

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

  // Initial parallel load: Load BOTH list and board data for badge counts.
  // Always load list; load board only when a pipeline is available.
  useEffect(() => {
    if (!accessToken || !isInitialLoad) return

    const tasks: Array<Promise<unknown>> = [loadListData(true)]
    if (boardPipelineId) tasks.push(loadBoardData())
    Promise.all(tasks)
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

  const handleFilterUpdate = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
      onFilterChangeProp?.(filters)
    },
    [onFilterChangeProp]
  )

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      setSorting(newSorting)
      onSortingChangeProp?.(newSorting)
    },
    [onSortingChangeProp]
  )

  const handleVisibleColumnsChange = useCallback(
    (newColumns: string[]) => {
      setVisibleColumns(newColumns)
      onVisibleColumnsChangeProp?.(newColumns)
    },
    [onVisibleColumnsChangeProp]
  )

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

  // Row actions - rendered internally (only if actions are configured)
  const rowActions = useMemo(() => {
    const hasRowActions = (config.rowActionsContextArray?.length ?? 0) > 0
    if (!hasRowActions) return undefined
    return (row: { original: TOpportunity }) => (
      <OpportunityRowActions row={row} config={config} accessToken={accessToken} />
    )
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
  const primaryActionElement = useMemo(
    () => (
      <OpportunityPrimaryAction
        customAction={customPrimaryAction}
        createContext={config.flowContexts.createContext}
        createContextData={config.flowContexts.createContextData}
        accessToken={accessToken}
      />
    ),
    [customPrimaryAction, config.flowContexts.createContext, config.flowContexts.createContextData, accessToken]
  )

  const isListSection = currentSection === 'list'
  const sectionUiProps = useMemo(
    () =>
      buildSectionUiProps({
        currentSection,
        searchTerm,
        boardSearch,
        handleSearch,
        setBoardSearch,
        sorting,
        handleSortingChange,
        availableColumns,
        visibleColumns,
        handleVisibleColumnsChange,
        boardSecondaryActions,
        listSecondaryActions
      }),
    [
      currentSection,
      searchTerm,
      boardSearch,
      handleSearch,
      setBoardSearch,
      sorting,
      handleSortingChange,
      availableColumns,
      visibleColumns,
      handleVisibleColumnsChange,
      boardSecondaryActions,
      listSecondaryActions
    ]
  )

  const titleSections = useMemo(() => {
    const sections = [
      {
        id: 'list',
        label: getTranslationFromI18nKeyAndLabel('common:listView', 'List'),
        metadata: { count: totalCount, isLoading }
      }
    ]
    if (!hideBoard) {
      sections.push({
        id: 'board',
        label: getTranslationFromI18nKeyAndLabel('common:boardView', 'Board'),
        metadata: { count: boardTotalCount, isLoading: boardLoading }
      })
    }
    return sections
  }, [hideBoard, totalCount, isLoading, boardTotalCount, boardLoading])

  // Convert selected currency code to full ID for statistics
  const selectedCurrencyId = useMemo(() => {
    if (selectedCurrency === 'ALL') return undefined
    const currencyObj = availableCurrencies.find(c => c.code === selectedCurrency)
    return currencyObj?.id
  }, [selectedCurrency, availableCurrencies])

  const statisticsContent = useMemo(() => {
    if (config.renderStatistics) {
      return (
        <div data-testid={`${dataTestId}-statistics`}>{config.renderStatistics(selectedCurrencyId, quickFilter)}</div>
      )
    }
    if (config.opportunityStatistics) {
      return (
        <OpportunityStatisticsLayout
          statistics={config.opportunityStatistics}
          data-testid={`${dataTestId}-statistics`}
        />
      )
    }
    return null
  }, [config.renderStatistics, config.opportunityStatistics, selectedCurrencyId, quickFilter, dataTestId])

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {statisticsContent}

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
        titleSections={titleSections}
        currentSection={currentSection}
        onSectionChange={value => setCurrentSection(value as 'list' | 'board')}
        searchValue={sectionUiProps.searchValue}
        searchPlaceholder={sectionUiProps.searchPlaceholder}
        onSearchChange={sectionUiProps.onSearchChange}
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
        sorting={sectionUiProps.sorting}
        sortableColumns={listSortableColumns}
        onSortingChange={sectionUiProps.onSortingChange}
        availableColumns={sectionUiProps.availableColumns}
        visibleColumns={sectionUiProps.visibleColumns}
        onVisibleColumnsChange={sectionUiProps.onVisibleColumnsChange}
        primaryAction={primaryActionElement}
        secondaryActions={sectionUiProps.secondaryActions}
        toolbarDensity="default"
        enableLiveFiltering={sectionUiProps.enableLiveFiltering}
        filterSheetTitle={sectionUiProps.filterSheetTitle}
        filterSheetDescription={sectionUiProps.filterSheetDescription}
      >
        {isListSection ? (
          <>
            <OpportunityListLayout<TOpportunity>
              data={opportunities}
              loading={isLoading}
              error={error}
              totalCount={totalCount}
              columns={columns.filter(col => visibleColumns.includes(col.id as string))}
              sorting={sorting}
              onSortingChange={handleSortingChange}
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
