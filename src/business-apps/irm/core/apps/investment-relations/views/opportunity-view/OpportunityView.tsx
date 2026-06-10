import React, { useMemo, useState, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import type { QuickFiltersRenderProps } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityConfigBuilder'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentOpportunityFilters } from './hooks/useInvestmentOpportunityFilters'
import { useInvestmentOpportunityStatistics } from '@/common/data/investment/hooks/useInvestmentOpportunityStatistics'
import { INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '@/common/data/investment/types/investmentOpportunityTypes'
import { OpportunityStatisticsLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout/components/OpportunityStatisticsLayout'
import type { OpportunityStatisticsData } from '@/common/components/common-relations/view-layouts/opportunity-layout/components/OpportunityStatisticsLayout'
import { OpportunityQuickFilters, type QuickFilterType } from './components'
import { stripRecordScopeFilterKeys } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/layoutHelpers'

/**
 * Map quickFilter type to opportunity status codes for statistics filtering
 */
const getStatusCodesFromQuickFilter = (quickFilter?: string): string[] | undefined => {
  if (quickFilter === 'qualified') return ['WON']
  if (quickFilter === 'unqualified') return ['OPEN', 'LOST']
  if (quickFilter === 'converted') return ['CONVERTED']
  return undefined // 'all' or undefined - no filter
}

// Separate component to properly use hooks
const InvestmentOpportunityStatistics: React.FC<{
  context: BusinessAppContextProps
  selectedCurrency?: string // Full currency ID like "Currency:v1:EUR" or undefined
  quickFilter?: string // Quick filter type: 'all', 'qualified', 'unqualified', 'converted'
}> = ({ context, selectedCurrency, quickFilter }) => {
  const statusCodes = useMemo(() => getStatusCodesFromQuickFilter(quickFilter), [quickFilter])
  const opportunityStatistics = useInvestmentOpportunityStatistics(context, selectedCurrency, statusCodes)

  if (!opportunityStatistics.trendData) return null

  return (
    <OpportunityStatisticsLayout
      statistics={{
        recentOpportunities: opportunityStatistics.trendData.recentOpportunities,
        totalOpportunities: opportunityStatistics.trendData.totalOpportunities,
        opportunitiesThisQuarter: opportunityStatistics.trendData.opportunitiesThisQuarter,
        opportunitiesThisYear: opportunityStatistics.trendData.opportunitiesThisYear,
        isLoading: opportunityStatistics.isLoading,
        error: opportunityStatistics.error,
        refetch: () => void opportunityStatistics.refetch()
      }}
    />
  )
}

export type OpportunityViewProps = BusinessAppContextProps & {
  accountId?: string
  contactId?: string
}

export const OpportunityView: React.FC<OpportunityViewProps> = props => {
  const { accountId, contactId } = props
  const isRecordScoped = Boolean(accountId || contactId)

  const preferencesStorageKey = useMemo(() => {
    if (accountId) {
      return `irm:investment-opportunity-preferences:account:${accountId}`
    }
    if (contactId) {
      return `irm:investment-opportunity-preferences:contact:${contactId}`
    }
    return 'irm:investment-opportunity-preferences:v1'
  }, [accountId, contactId])

  const recordScopeFilters = useMemo(() => {
    if (accountId) {
      return { accountIds: [accountId] }
    }
    if (contactId) {
      return { contactIds: [contactId] }
    }
    return {}
  }, [accountId, contactId])

  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage(preferencesStorageKey)

  const recordListInitialFilters = useMemo(
    () => (isRecordScoped ? stripRecordScopeFilterKeys(initialFilters) : initialFilters),
    [initialFilters, isRecordScoped]
  )

  const handleFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      saveFilters(isRecordScoped ? stripRecordScopeFilterKeys(filters) : filters)
    },
    [saveFilters, isRecordScoped]
  )

  const { fetchInvestmentOpportunities, fetchInvestmentOpportunityAggregates } = useGetInvestmentOpportunities(props)
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterType>('all')

  const handleQuickFilterChange = useCallback(
    (
      filter: QuickFilterType,
      statusIds: string[] | undefined,
      onFilterChange: (filters: Record<string, any>) => void,
      currentFilters: Record<string, any>
    ) => {
      setActiveQuickFilter(filter)
      onFilterChange({
        ...currentFilters,
        opportunityStatusIds: statusIds && statusIds.length > 0 ? statusIds : undefined
      })
    },
    []
  )

  const renderQuickFilters = useCallback(
    ({ statuses, selectedFilters, onFilterChange }: QuickFiltersRenderProps) => (
      <OpportunityQuickFilters
        statuses={statuses}
        activeFilter={activeQuickFilter}
        onFilterChange={(filter, statusIds) =>
          handleQuickFilterChange(filter, statusIds, onFilterChange, selectedFilters)
        }
      />
    ),
    [activeQuickFilter, handleQuickFilterChange]
  )

  // State to trigger statistics refresh (re-mounts InvestmentOpportunityStatistics via key prop)
  const [statisticsRefreshKey, setStatisticsRefreshKey] = useState(0)

  // Refs so that renderStatistics in config always reads the latest values without
  // causing config to rebuild (which would cascade to listQueryVariables → loadListData → query).
  const statisticsRefreshKeyRef = useRef(statisticsRefreshKey)
  statisticsRefreshKeyRef.current = statisticsRefreshKey
  const contextRef = useRef(props)
  contextRef.current = props

  // Create a refetch callback for statistics
  const refetchStatistics = useCallback(() => {
    setStatisticsRefreshKey(prev => prev + 1)
  }, [])

  // Statistics data with refetch callback — stable because refetchStatistics is stable
  const opportunityStatisticsData: OpportunityStatisticsData | undefined = useMemo(
    () => ({
      recentOpportunities: { current: 0, previous: 0, change: 0, changePercent: 0, isPositive: false },
      totalOpportunities: { current: 0, previous: 0, change: 0, changePercent: 0, isPositive: false },
      opportunitiesThisQuarter: { current: 0, previous: 0, change: 0, changePercent: 0, isPositive: false },
      opportunitiesThisYear: { current: 0, previous: 0, change: 0, changePercent: 0, isPositive: false },
      isLoading: false,
      error: null,
      refetch: refetchStatistics
    }),
    [refetchStatistics]
  )

  // Config — context and statisticsRefreshKey are intentionally excluded from deps.
  // They are accessed via refs so that statistics refreshes and context reference changes
  // do not recreate config, which would cascade into new listQueryVariables / loadListData
  // references and re-fire GetOpportunities.
  const config = useMemo(
    () =>
      createOpportunityConfig<InvestmentOpportunity, InvestmentOpportunityQueryVariables>({
        contextType: 'investment',

        extendQueryVariables: vars => ({
          ...vars,
          dealType: 'INVESTMENT_DEAL'
        }),

        fetchOpportunities: async variables => {
          const [result, aggregates] = await Promise.all([
            fetchInvestmentOpportunities(variables),
            fetchInvestmentOpportunityAggregates(variables)
          ])
          return {
            opportunities: result.InvestmentOpportunity,
            total: result.InvestmentOpportunityAggregate.aggregate.count,
            aggregates
          }
        },

        filterDataHook: useInvestmentOpportunityFilters,

        viewDescriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,

        columnMappings: {
          pipeline: 'opportunityPipeline',
          stage: 'opportunityPipelineStage'
        },

        flowContexts: {
          entity: FlowContextName.investmentOpportunityEntity,
          create: FlowContextName.investmentOpportunityCreate,
          createContextData: {
            dealType: 'INVESTMENT_DEAL',
            ...(accountId ? { accountId } : {}),
            ...(contactId ? { contactId } : {})
          }
        },

        urlPaths: {
          opportunityRecord: '/platform/irm/opportunity-record',
          accountRecord: '/platform/irm/account-record',
          source: 'investment-relations'
        },

        boardConfig: {
          pipelineCatalog: 'InvestmentOpportunityPipeline',
          pipelineStageCatalog: 'InvestmentOpportunityPipelineStage',
          opportunityType: 'InvestmentOpportunity',
          processName: 'transitionInvestmentOpportunity',
          processDomain: 'investment-relations',
          preferForecastedProfit: true
        },

        fetchBoardOpportunities: fetchInvestmentOpportunities,
        extractBoardOpportunities: result => result.InvestmentOpportunity || [],
        extractBoardTotalCount: result => result.InvestmentOpportunityAggregate?.aggregate?.count || 0,

        opportunityStatistics: isRecordScoped ? undefined : opportunityStatisticsData,

        renderStatistics: isRecordScoped
          ? undefined
          : (selectedCurrency?: string, quickFilter?: string) => (
              <InvestmentOpportunityStatistics
                key={statisticsRefreshKeyRef.current}
                context={contextRef.current}
                selectedCurrency={selectedCurrency}
                quickFilter={quickFilter}
              />
            ),
        rowActionsContextArray: [FlowContextName.investmentOpportunityEntity],
        buildRowActionsExternalContextData: (row: { original: InvestmentOpportunity }) => ({
          opportunityId: row.original.id
        })
      }),
    [
      fetchInvestmentOpportunities,
      fetchInvestmentOpportunityAggregates,
      opportunityStatisticsData,
      isRecordScoped,
      accountId,
      contactId
    ]
  )

  return (
    <OpportunityLayout
      context={props}
      config={config}
      dataTestId={isRecordScoped ? 'investment-record-opportunities-view' : 'investment-opportunities-view'}
      renderQuickFilters={isRecordScoped ? undefined : renderQuickFilters}
      quickFilter={isRecordScoped ? undefined : activeQuickFilter}
      enableExport
      exportFilenamePrefix="opportunities"
      initialFilters={recordListInitialFilters}
      scopedQueryFilters={isRecordScoped ? recordScopeFilters : undefined}
      hideFilters={isRecordScoped}
      onFilterChange={handleFilterChange}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
      hideBoard={isRecordScoped}
    />
  )
}

export default OpportunityView
