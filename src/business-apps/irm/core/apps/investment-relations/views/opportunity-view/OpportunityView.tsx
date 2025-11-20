import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityConfigBuilder'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentOpportunityFilters } from './hooks/useInvestmentOpportunityFilters'
import { useInvestmentOpportunityStatistics } from '@/common/data/investment/hooks/useInvestmentOpportunityStatistics'
import { INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '@/common/data/investment/types/investmentOpportunityTypes'

export type OpportunityViewProps = BusinessAppContextProps

export const OpportunityView: React.FC<OpportunityViewProps> = context => {
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)
  const opportunityStatistics = useInvestmentOpportunityStatistics(context)

  const config = useMemo(
    () =>
      createOpportunityConfig<InvestmentOpportunity, InvestmentOpportunityQueryVariables>({
        contextType: 'investment',

        extendQueryVariables: vars => ({ ...vars, dealType: 'INVESTMENT_DEAL' }),

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
        opportunityStatistics: opportunityStatistics.trendData
          ? {
              recentOpportunities: opportunityStatistics.trendData.recentOpportunities,
              opportunityValue: opportunityStatistics.trendData.opportunityValue,
              winRate: opportunityStatistics.trendData.winRate,
              opportunitiesThisYear: opportunityStatistics.trendData.opportunitiesThisYear,
              isLoading: opportunityStatistics.isLoading,
              error: opportunityStatistics.error,
              refetch: () => void opportunityStatistics.refetch()
            }
          : undefined,
        rowActionsContextArray: [FlowContextName.investmentOpportunityEntity],
        buildRowActionsExternalContextData: (row: { original: InvestmentOpportunity }) => ({
          opportunityId: row.original.id
        })
      }),
    [context, fetchInvestmentOpportunities, opportunityStatistics]
  )

  return <OpportunityLayout context={context} config={config} dataTestId="investment-opportunities-view" />
}

export default OpportunityView
