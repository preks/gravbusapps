import React, { useMemo, useState, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
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

export type OpportunityViewProps = BusinessAppContextProps

export const OpportunityView: React.FC<OpportunityViewProps> = context => {
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)
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
  const contextRef = useRef(context)
  contextRef.current = context

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
          const result = await fetchInvestmentOpportunities(variables)
          return {
            opportunities: result.InvestmentOpportunity,
            total: result.InvestmentOpportunityAggregate.aggregate.count
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
          createContextData: { dealType: 'INVESTMENT_DEAL' }
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

        opportunityStatistics: opportunityStatisticsData,

        // Reads latest context/key from refs so config stays stable
        renderStatistics: (selectedCurrency?: string, quickFilter?: string) => (
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
    [fetchInvestmentOpportunities, opportunityStatisticsData]
  )

  return (
    <OpportunityLayout
      context={context}
      config={config}
      dataTestId="investment-opportunities-view"
      renderQuickFilters={renderQuickFilters}
      quickFilter={activeQuickFilter}
      enableExport
      exportFilenamePrefix="opportunities"
    />
  )
}

export default OpportunityView
