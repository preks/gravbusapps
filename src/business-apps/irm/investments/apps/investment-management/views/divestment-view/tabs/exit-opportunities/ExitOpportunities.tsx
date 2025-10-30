import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Spinner,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { List, Grid3X3, TrendingUp, Target, CheckCircle, Building2, Calendar, Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { ColumnConfig } from '@/components/dataController'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { OpportunityBoard } from '@/business-apps/irm/core/apps/investment-relations/views/opportunity-view/components/opportunity-board/OpportunityBoard'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OwnerDisplay } from '@/business-apps/irm/core/apps/investment-relations/views/task-view/components/OwnerDisplay' // TODO: Extract to common
import { formatDate } from '../../utils'
import { formatCurrencyLarge } from '@/business-apps/crm/common/utils/currencyUtils'

import { DateRangeFilter } from '@/business-apps/crm/core/apps/customer-relations/views/lead-view/components/DateRangeFilter'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import {
  useGetInvestmentOpportunities,
  InvestmentOpportunity,
  InvestmentOpportunityQueryVariables
} from '@/common/data/investment'
import { useExitOpportunityMetrics } from './hooks/useExitOpportunityMetrics'

// Note: ExitOpportunitiesMetrics interface is now imported from the hook as ExitOpportunityMetrics

interface ExitOpportunitiesProps extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

const ExitOpportunities: React.FC<ExitOpportunitiesProps> = ({
  accessToken,
  userInfo,
  initialSubTab = 'list',
  onSubTabChange
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  // Created date range state (creation date)
  const [createdAfter, setCreatedAfter] = useState<string | undefined>(undefined)
  const [createdBefore, setCreatedBefore] = useState<string | undefined>(undefined)
  // Account search term
  const [accountSearchTerm, setAccountSearchTerm] = useState('')
  // Board refresh trigger
  const [boardRefreshTrigger, setBoardRefreshTrigger] = useState(0)
  // Owner backend search
  const {
    employees: employeeOptions,
    search: searchEmployees,
    loading: loadingEmployees,
    error: employeeError
  } = useEmployeeSearch(accessToken)

  // State for exit opportunities data
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([])
  // Note: metrics now handled by useExitOpportunityMetrics hook
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Ref to track last owner search term for debounce protection
  const lastOwnerSearchRef = useRef<string>('')

  // Ref to store loadMetrics function to avoid dependency issues
  const loadMetricsRef = useRef<typeof loadMetrics>()

  const context = { accessToken, userInfo }
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  // Use optimized metrics hook for historical comparisons
  const {
    metrics: optimizedMetrics,
    isLoading: metricsLoading,
    error: metricsError,
    loadMetrics
  } = useExitOpportunityMetrics({ accessToken })

  // Update ref when loadMetrics changes
  loadMetricsRef.current = loadMetrics

  // Data fetching function using central resources
  const loadPage = useCallback(
    async (
      page: number,
      pageSize = 20,
      additionalFilters?: any,
      overrideSortField?: string,
      overrideSortOrder?: 'ASC' | 'DESC' | ''
    ) => {
      if (!accessToken) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Build query variables for InvestmentOpportunity
        const variables: InvestmentOpportunityQueryVariables = {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          dealType: 'DIVESTMENT_DEAL', // Filter for divestment opportunities using dealType
          search: additionalFilters?.search || searchTerm,
          accountSearch: additionalFilters?.accountSearch
        }

        // Add sorting
        const sortFieldToUse = overrideSortField || sortField
        const sortOrderToUse = overrideSortOrder || sortOrder

        if (sortFieldToUse && sortFieldToUse !== '' && sortOrderToUse) {
          variables.orderBy = [
            {
              field: sortFieldToUse,
              direction: sortOrderToUse === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          ]
        }

        // Get current data
        const currentResult = await fetchInvestmentOpportunities(variables)

        if (currentResult?.InvestmentOpportunity) {
          setOpportunities(currentResult.InvestmentOpportunity)

          const totalCount = currentResult.InvestmentOpportunityAggregate?.aggregate?.count || 0
          setTotal(totalCount)

          // Load optimized metrics with the same filters used for the data
          // Build the metrics filters using the exact same logic as the additionalFilters parameter
          const metricsFilters = {
            search: variables.search,
            dealType: variables.dealType,
            ownerEmployeeIds: additionalFilters?.ownerEmployeeIds,
            createdAfter: additionalFilters?.createdAfter,
            createdBefore: additionalFilters?.createdBefore,
            accountSearch: additionalFilters?.accountSearch
          }

          // Trigger optimized metrics calculation in the background
          loadMetricsRef.current?.(metricsFilters)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load exit opportunities'))
      } finally {
        setLoading(false)
      }
    },
    [fetchInvestmentOpportunities, searchTerm, sortField, sortOrder, accessToken]
  ) // Removed loadMetrics to prevent infinite loop

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }, [])

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters)
    setCurrentPage(1)
  }, [])

  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    setCurrentPage(page)
    if (newPageSize) {
      setPageSize(newPageSize)
    }
  }, [])

  const handleRowClick = useCallback((opportunityId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/opportunity-record', {
      opportunityId,
      fromView: 'divestments',
      fromSubView: 'exit-opportunities'
    })
    navigateTo(detailsUrl)
  }, [])

  useEffect(() => {
    const ownerIds = selectedFilters.filter(
      id =>
        !id.startsWith('InvestmentGroup:') && !id.startsWith('InvestmentType:') && !id.startsWith('OpportunityStatus:')
    )
    loadPage(currentPage, pageSize, {
      search: searchTerm,
      ownerEmployeeIds: ownerIds,
      createdAfter,
      createdBefore,
      accountSearch: accountSearchTerm
    })
  }, [
    currentPage,
    pageSize,
    searchTerm,
    sortField,
    sortOrder,
    selectedFilters,
    createdAfter,
    createdBefore,
    accountSearchTerm
  ]) // Removed loadPage from dependencies

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          loadPage(currentPage, pageSize)
          setBoardRefreshTrigger(prev => prev + 1) // Trigger board refresh
          return
        }

        // Check for different event structures
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.opportunity || response?.investment) {
          loadPage(currentPage, pageSize)
          setBoardRefreshTrigger(prev => prev + 1) // Trigger board refresh
          return
        }

        // Check for continue events with payload
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          loadPage(currentPage, pageSize)
          setBoardRefreshTrigger(prev => prev + 1) // Trigger board refresh
        }
      } catch (err) {
        // Log process completion event handling errors
        console.error('Error handling process completion event:', err)

        // Note: Not setting component error state since this is a non-critical
        // background process event listener that shouldn't disrupt the UI
      }
    }

    // Listen to multiple possible event names for updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion)
      })
    }
  }, [currentPage, pageSize]) // Removed loadPage from dependencies

  const handleTabChange = (value: string) => {
    onSubTabChange?.(value)
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(field)
      setSortOrder('DESC')
    }
    setCurrentPage(1)
  }

  // Using OpportunityList for rendering the table to avoid incompatible Table API

  // Column visibility for Exit Opportunities
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: 'actions', label: 'Actions', visible: true, disabled: true },
    { id: 'opportunity', label: 'Opportunity', visible: true },
    { id: 'investment', label: 'Investment', visible: true },
    { id: 'account', label: 'Account', visible: true },
    { id: 'amount', label: 'Amount', visible: true },
    { id: 'stage', label: 'Stage', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'closeDate', label: 'Close Date', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    { id: 'created', label: 'Created', visible: false }
  ])

  const visibleColumns = columnConfig.filter(c => c.visible).map(c => c.id)
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(c => (c.id === columnId ? { ...c, visible } : c)))
  }, [])

  // Map filters to visible columns
  const columnToFilterMap: Record<string, string> = {
    opportunity: 'opportunityName',
    investment: 'investmentName',
    account: 'accountName',
    amount: 'amountRange',
    stage: 'stage',
    status: 'opportunityStatus',
    closeDate: 'closeDate',
    owner: 'owner',
    created: 'creationDate'
  }

  const renderMetrics = () => {
    // Use optimized metrics from the hook with defaults for loading state
    const metricsToUse = optimizedMetrics
    if (!metricsToUse) {
      // Show loading state while metrics are being calculated
      return (
        <WidgetGroup
          widgets={[]}
          isLoading={true}
          error={null}
          skeletonCount={4}
          defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
          emptyText={getTranslationFromI18nKeyAndLabel('loading_metrics', 'Loading metrics...')}
          data-testid="exit-opportunities-metrics-loading"
        />
      )
    }

    // Helper function to format percentage change
    const formatPercentageChange = (change: number): string => {
      const sign = change >= 0 ? '+' : ''
      return `${sign}${change.toFixed(1)}%`
    }

    const widgets: WidgetItem[] = [
      {
        key: 'total-opportunities',
        title: getTranslationFromI18nKeyAndLabel('total_opportunities', 'Total Opportunities'),
        value: metricsToUse.totalCount,
        prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />,
        color: '#1890ff', // Blue theme for opportunities
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel('active_exit_opportunities', 'Active exit opportunities'),
        trend: {
          value: formatPercentageChange(metricsToUse.countChange),
          positive: metricsToUse.countChange >= 0,
          description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
        }
      },
      {
        key: 'total-value',
        title: getTranslationFromI18nKeyAndLabel('total_value', 'Total Value'),
        value: formatCurrencyLarge(metricsToUse.totalValue),
        prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#52c41a', // Green theme for value
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel('estimated_opportunity_value', 'Estimated opportunity value'),
        trend: {
          value: formatPercentageChange(metricsToUse.totalValueChange),
          positive: metricsToUse.totalValueChange >= 0,
          description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
        }
      },
      {
        key: 'average-value',
        title: getTranslationFromI18nKeyAndLabel('average_value', 'Average Value'),
        value: formatCurrencyLarge(metricsToUse.averageValue),
        prefix: <Target className="gba:h-5 gba:w-5 gba:text-purple-600" />,
        color: '#722ed1', // Purple theme for averages
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel('average_opportunity_size', 'Average opportunity size'),
        trend: {
          value: formatPercentageChange(metricsToUse.averageValueChange),
          positive: metricsToUse.averageValueChange >= 0,
          description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
        }
      },
      {
        key: 'average-win-rate',
        title: getTranslationFromI18nKeyAndLabel('average_win_rate', 'Average Win Rate'),
        value: `${metricsToUse.averageWinRate.toFixed(1)}%`,
        prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-orange-600" />,
        color: '#fa8c16', // Orange theme for win rate
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel('success_probability', 'Success probability'),
        trend: {
          value: formatPercentageChange(metricsToUse.winRateChange),
          positive: metricsToUse.winRateChange >= 0,
          description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
        }
      }
    ]

    return (
      <WidgetGroup
        widgets={widgets}
        isLoading={loading || metricsLoading}
        error={error || (metricsError ? new Error(metricsError) : null)}
        skeletonCount={4}
        defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
        emptyText={getTranslationFromI18nKeyAndLabel('no_metrics_available', 'No metrics available')}
        data-testid="exit-opportunities-metrics"
      />
    )
  }

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!status) return 'outline'
    const statusLower = status.toLowerCase()
    if (statusLower.includes('active') || statusLower.includes('open')) return 'default'
    if (statusLower.includes('won') || statusLower.includes('success')) return 'secondary'
    if (statusLower.includes('lost') || statusLower.includes('failed')) return 'destructive'
    return 'outline'
  }

  // Helper function to get stage badge variant
  const getStageBadgeVariant = (stage?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!stage) return 'outline'
    const stageLower = stage.toLowerCase()
    if (stageLower.includes('discovery')) return 'default'
    if (stageLower.includes('qualification')) return 'secondary'
    if (stageLower.includes('negotiation')) return 'default'
    return 'outline'
  }

  const renderOpportunityTable = () => {
    if (loading && opportunities.length === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <Spinner size="lg" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <span>Error loading exit opportunities: {error?.message || 'Unknown error'}</span>
            <Button variant="outline" size="sm" onClick={() => loadPage(currentPage, pageSize)}>
              Retry
            </Button>
          </div>
        </Alert>
      )
    }

    return (
      <DataContainer
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': 'exit-opportunities-column-visibility'
          },
          dateRange: {
            createdAfter,
            createdBefore,
            onClear: () => {
              setCreatedAfter(undefined)
              setCreatedBefore(undefined)
            }
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Exit Opportunities</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
          actions: (
            <AppAction
              contextsArray={[FlowContextName.investmentOpportunityCreate]}
              accessToken={accessToken}
              data-testid="exit-opportunities-add-action"
              emptyStateBehavior="hide"
            >
              <Button
                size="sm"
                variant="default"
                data-testid="exit-opportunities-add-action"
                type="button"
                style={{ gap: 'var(--nw-spacing-xs)' }}
              >
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('exit_opportunities.addOpportunity', 'Add Opportunity')}
              </Button>
            </AppAction>
          )
        }}
        dataFilterProps={{
          filterGroups: [
            {
              id: 'opportunityName',
              title: 'Opportunity',
              filters: [],
              customComponent: React.createElement('input', {
                value: searchTerm,
                onChange: (e: any) => handleSearch(e?.target?.value || ''),
                placeholder: 'Search opportunity name',
                className:
                  'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none'
              }),
              hideSearch: true
            },
            {
              id: 'investmentName',
              title: 'Investment',
              filters: [],
              customComponent: React.createElement('input', {
                value: '',
                onChange: () => {},
                placeholder: 'Search investment',
                className:
                  'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none'
              }),
              hideSearch: true
            },
            {
              id: 'accountName',
              title: 'Account',
              filters: [],
              customComponent: React.createElement('input', {
                value: accountSearchTerm,
                onChange: (e: any) => {
                  setAccountSearchTerm(e?.target?.value || '')
                  setCurrentPage(1)
                },
                placeholder: 'Search account',
                className:
                  'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
                'data-testid': 'exit-opportunities-account-search-input'
              }),
              hideSearch: true
            },
            {
              id: 'amountRange',
              title: 'Amount',
              filters: [],
              customComponent: React.createElement('div', null),
              hideSearch: true
            },
            {
              id: 'stage',
              title: 'Stage',
              filters: [
                {
                  id: 'OpportunityPipelineStage:v1:QUALIFICATION',
                  label: 'In Qualification',
                  selected: selectedFilters.includes('OpportunityPipelineStage:v1:QUALIFICATION')
                },
                {
                  id: 'OpportunityPipelineStage:v1:NEGOTIATION',
                  label: 'Negotiation',
                  selected: selectedFilters.includes('OpportunityPipelineStage:v1:NEGOTIATION')
                }
              ]
            },
            {
              id: 'opportunityStatus',
              title: 'Opportunity status',
              filters: [
                {
                  id: 'OpportunityStatus:v1:OPEN',
                  label: 'Open',
                  selected: selectedFilters.includes('OpportunityStatus:v1:OPEN')
                },
                {
                  id: 'OpportunityStatus:v1:QUALIFIED',
                  label: 'Qualified',
                  selected: selectedFilters.includes('OpportunityStatus:v1:QUALIFIED')
                },
                {
                  id: 'OpportunityStatus:v1:WON',
                  label: 'Won',
                  selected: selectedFilters.includes('OpportunityStatus:v1:WON')
                }
              ]
            },
            {
              id: 'owner',
              title: 'Owner',
              filters: [],
              backendSearch: (q: string) => {
                const term = (q || '').trim()

                // Clear/reset ref and return empty array if term is too short
                if (term.length < 2) {
                  lastOwnerSearchRef.current = ''
                  return { filters: [], loading: loadingEmployees, error: employeeError } as any
                }

                // Only invoke searchEmployees if term is different from last searched term
                if (term !== lastOwnerSearchRef.current) {
                  lastOwnerSearchRef.current = term
                  void searchEmployees(term)
                }

                const opts = (employeeOptions || []).map(e => ({
                  id: e.id,
                  label: e.displayName,
                  value: e.id,
                  selected: selectedFilters.includes(e.id)
                }))
                return { filters: opts, loading: loadingEmployees, error: employeeError } as any
              }
            },
            {
              id: 'creationDate',
              title: 'Created Date',
              filters: [],
              customComponent: (
                <DateRangeFilter
                  createdAfter={createdAfter}
                  createdBefore={createdBefore}
                  onDateRangeChange={(after?: string, before?: string) => {
                    setCreatedAfter(after)
                    setCreatedBefore(before)
                  }}
                  className="gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent"
                />
              ),
              hideSearch: true
            }
          ].filter(g => {
            // show only when corresponding columns are visible
            const targetCol = Object.keys(columnToFilterMap).find(c => columnToFilterMap[c] === g.id)
            return targetCol ? visibleColumns.includes(targetCol) : true
          }),
          onFilterChange: (id, checked) => {
            setSelectedFilters(prev => (checked ? [...prev, id] : prev.filter(f => f !== id)))
          }
        }}
        dataBody={
          <div className="gba:bg-white gba:rounded-lg gba:border">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('opportunity') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('name')}>
                      Opportunity
                    </TableHead>
                  )}
                  {visibleColumns.includes('investment') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('investmentName')}>
                      Investment
                    </TableHead>
                  )}
                  {visibleColumns.includes('account') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('accountName')}>
                      Account
                    </TableHead>
                  )}
                  {visibleColumns.includes('amount') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('estimatedAmount')}>
                      Amount
                    </TableHead>
                  )}
                  {visibleColumns.includes('stage') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('opportunityPipelineStage')}>
                      Stage
                    </TableHead>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('opportunityStatus')}>
                      Status
                    </TableHead>
                  )}
                  {visibleColumns.includes('closeDate') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('closeDate')}>
                      Close Date
                    </TableHead>
                  )}
                  {visibleColumns.includes('owner') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('ownerEmployee')}>
                      Owner
                    </TableHead>
                  )}
                  {visibleColumns.includes('created') && (
                    <TableHead className="gba:cursor-pointer" onClick={() => handleSort('createdAt')}>
                      Created
                    </TableHead>
                  )}
                  {visibleColumns.includes('actions') && <TableHead className="gba:w-[60px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map(opportunity => (
                  <TableRow
                    key={opportunity.id}
                    className="gba:cursor-pointer"
                    onClick={() => handleRowClick(opportunity.id)}
                  >
                    {visibleColumns.includes('opportunity') && (
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <div className="gba:flex gba:flex-col">
                            <span className="gba:font-medium">{opportunity.name}</span>
                            {opportunity.code && (
                              <span className="gba:text-sm gba:text-gray-500">{opportunity.code}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes('investment') && (
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Target className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span>{opportunity.investmentName || 'N/A'}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes('account') && (
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span>{opportunity.account?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes('amount') && (
                      <TableCell>
                        <span className="gba:font-medium">
                          {opportunity.estimatedAmount ? formatCurrencyLarge(opportunity.estimatedAmount) : 'N/A'}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.includes('stage') && (
                      <TableCell>
                        <Badge variant={getStageBadgeVariant(opportunity.opportunityPipelineStage?.value)}>
                          {opportunity.opportunityPipelineStage?.value || opportunity.stage?.value || 'Unknown'}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes('status') && (
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(opportunity.opportunityStatus?.value)}>
                          {opportunity.opportunityStatus?.value || 'Unknown'}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes('closeDate') && (
                      <TableCell>
                        {opportunity.closeDate ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                            <span>{formatDate(opportunity.closeDate)}</span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">N/A</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes('owner') && (
                      <TableCell>
                        <OwnerDisplay
                          ownerEmployee={opportunity.ownerEmployee}
                          entityId={opportunity.id}
                          testIdPrefix="exit-opportunity"
                        />
                      </TableCell>
                    )}
                    {visibleColumns.includes('created') && (
                      <TableCell>
                        <span>{formatDate((opportunity as any).createdAt)}</span>
                      </TableCell>
                    )}
                    {visibleColumns.includes('actions') && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`exit-opportunity-update-button-${opportunity.id}`}
                            size="icon"
                            contextsArray={[FlowContextName.investmentOpportunityEntity]}
                            externalContextData={{ opportunityId: opportunity.id }}
                            prefixDataTestId={`exit-opportunity-update`}
                            accessToken={accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div
              className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-4 gba:border-t"
              data-testid="exit-opportunities-pagination"
            >
              <div className="gba:text-sm gba:text-muted-foreground" data-testid="exit-opportunities-pagination-info">
                {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                  currentPage * pageSize,
                  total
                )} of ${total} opportunities`}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <p className="gba:text-sm gba:font-medium">Rows per page</p>
                  <select
                    value={pageSize}
                    onChange={e => handlePaginationChange(1, Number(e.target.value))}
                    className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                    data-testid="exit-opportunities-page-size-select"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div
                  className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                  data-testid="exit-opportunities-page-info"
                >
                  Page {currentPage} of {Math.ceil(total / pageSize)}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePaginationChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    data-testid="exit-opportunities-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePaginationChange(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    data-testid="exit-opportunities-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        }
      />
    )
  }

  return (
    <div data-testid="exit-opportunities-container" className="gba:space-y-6">
      {/* Metrics */}
      {renderMetrics()}

      <Tabs value={initialSubTab} onValueChange={handleTabChange} className="gba:mt-6">
        <TabsList className="gba:grid gba:w-full gba:max-w-md gba:grid-cols-2">
          <TabsTrigger value="list" startIcon={<List />} data-testid="exit-opportunities-list-tab">
            {getTranslationFromI18nKeyAndLabel('list_view', 'List View')}
          </TabsTrigger>
          <TabsTrigger value="board" startIcon={<Grid3X3 />} data-testid="exit-opportunities-board-tab">
            {getTranslationFromI18nKeyAndLabel('board_view', 'Board View')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="gba:mt-6">
          {renderOpportunityTable()}
        </TabsContent>

        <TabsContent value="board" className="gba:mt-6">
          <div className="gba:mb-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('exit_opportunities_board', 'Exit Opportunities Board')}
            </h3>
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'exit_opportunities_board_desc',
                'Kanban board view of opportunities related to investments planned for exit'
              )}
            </p>
          </div>
          <OpportunityBoard
            accessToken={accessToken}
            userInfo={userInfo}
            dealType="DIVESTMENT_DEAL"
            refreshTrigger={boardRefreshTrigger}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ExitOpportunities
