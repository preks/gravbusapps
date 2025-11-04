import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityConfigBuilder'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentOpportunityFilters } from '@/business-apps/irm/core/apps/investment-relations/views/opportunity-view/hooks/useInvestmentOpportunityFilters'
import { ExitOpportunityStatistics } from './components/ExitOpportunityStatistics'

export type ExitOpportunitiesTabProps = BusinessAppContextProps

export const ExitOpportunitiesTab: React.FC<ExitOpportunitiesTabProps> = context => {
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  const config = useMemo(
    () =>
      createOpportunityConfig<InvestmentOpportunity, InvestmentOpportunityQueryVariables>({
        contextType: 'investment',

        extendQueryVariables: vars => ({ ...vars, dealType: 'DIVESTMENT_DEAL' }),

        fetchOpportunities: async variables => {
          const result = await fetchInvestmentOpportunities(variables)
          return {
            opportunities: result.InvestmentOpportunity,
            total: result.InvestmentOpportunityAggregate.aggregate.count
          }
        },

        filterDataHook: useInvestmentOpportunityFilters,

        columnMappings: {
          pipeline: 'opportunityPipeline',
          stage: 'opportunityPipelineStage'
        },

        flowContexts: {
          entity: FlowContextName.investmentOpportunityEntity,
          create: FlowContextName.investmentOpportunityCreate,
          createContextData: { dealType: 'DIVESTMENT_DEAL' }
        },

        urlPaths: {
          opportunityRecord: '/platform/irm/opportunity-record',
          accountRecord: '/platform/irm/account-record',
          source: 'divestment-view'
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
        renderStatistics: () => <ExitOpportunityStatistics {...context} />
      }),
    [context, fetchInvestmentOpportunities]
  )

  return <OpportunityLayout context={context} config={config} dataTestId="exit-opportunities-view" />
}

export default ExitOpportunitiesTab
