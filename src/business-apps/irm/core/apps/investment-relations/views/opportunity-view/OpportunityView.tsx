import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import {
  OpportunityLayout,
  type OpportunityViewConfig,
  type OpportunityBoardFilters
} from '@/common/components/common-relations/view-layouts/opportunity-layout'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  createOpportunityColumns,
  createOpportunitySortableColumns
} from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import { opportunityFilterConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityFilters'
import { useInvestmentOpportunityFilters } from './hooks/useInvestmentOpportunityFilters'
import { OpportunityStatistics } from './components/OpportunityStatistics'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import {
  applyBasicFilters,
  applyAmountFilter,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/queryHelpers'
import { createBoardCardRenderer } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/boardCardRenderer'

export type OpportunityViewProps = BusinessAppContextProps

export const OpportunityView: React.FC<OpportunityViewProps> = context => {
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  const config: OpportunityViewConfig<InvestmentOpportunity, InvestmentOpportunityQueryVariables> = useMemo(
    () => ({
      contextType: 'investment',

      // Transform the response format to match what OpportunityLayout expects
      fetchOpportunities: async (variables: InvestmentOpportunityQueryVariables) => {
        const result = await fetchInvestmentOpportunities(variables)
        return {
          opportunities: result.InvestmentOpportunity,
          total: result.InvestmentOpportunityAggregate.aggregate.count
        }
      },

      filterDataHook: useInvestmentOpportunityFilters,

      createColumns: createOpportunityColumns as any,
      createSortableColumns: createOpportunitySortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        const mapping: Record<string, string> = {
          opportunity: 'name',
          amount: 'estimatedAmount',
          pipeline: 'opportunityPipeline',
          stage: 'opportunityPipelineStage',
          status: 'opportunityStatus',
          closeDate: 'closeDate',
          account: 'accountId',
          owner: 'ownerEmployeeId',
          created: 'createdAt'
        }
        return mapping[columnId] || columnId
      },

      baseFilterConfig: opportunityFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
        mapColumnToGraphQLField: (columnId: string) => string
      }) => {
        const vars: InvestmentOpportunityQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        // Apply filters using helpers
        applyBasicFilters(vars, params.selectedFilters)
        applyAmountFilter(vars, params.selectedFilters.amount)
        applyDateFilter(vars, params.selectedFilters.closeDate)

        // Sorting
        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.mapColumnToGraphQLField(params.sorting[0].id) as any,
              direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },

      flowContexts: {
        entityContext: FlowContextName.investmentOpportunityEntity,
        createContext: FlowContextName.investmentOpportunityCreate
      },

      buildRecordUrl: (id: string) =>
        buildPlatformUrl('/platform/irm/opportunity-record', {
          opportunityId: id,
          source: 'investment-relations'
        }),

      buildAccountUrl: (id: string) =>
        buildPlatformUrl('/platform/irm/account-record', {
          accountId: id
        }),

      renderStatistics: () => <OpportunityStatistics {...context} />,

      // Board configuration
      boardConfig: {
        pipelineCatalog: 'InvestmentOpportunityPipeline',
        pipelineStageCatalog: 'InvestmentOpportunityPipelineStage',
        opportunityType: 'InvestmentOpportunity',
        defaultFilter: 'all',
        formatCurrency: (amount: number) => formatNumberFunction(amount, '0.0a').toUpperCase(),
        buildQueryVariables: () => ({}),
        processConfig: {
          domain: 'investment-relations',
          processName: 'transitionInvestmentOpportunity',
          buildPayload: (opportunityId: string, targetStageRef: string) => ({
            opportunityId,
            targetStageRef
          })
        }
      },

      fetchOpportunitiesForBoard: async (
        filters: OpportunityBoardFilters & { additionalFilters?: Record<string, any> }
      ) => {
        const variables: InvestmentOpportunityQueryVariables = {
          limit: 200,
          orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
          dealType: 'INVESTMENT_DEAL',
          search: filters.search?.trim() || undefined
        }

        if (filters.selectedPipelineId) {
          variables.pipelineIds = [filters.selectedPipelineId]
        }

        if (filters.opportunityFilter === 'my' && context.userInfo?.employeeDetails?.employeeId) {
          variables.ownerEmployeeIds = [context.userInfo.employeeDetails.employeeId]
        } else if (filters.opportunityFilter === 'selected') {
          if (filters.selectedEmployeeIds.length > 0) {
            variables.ownerEmployeeIds = filters.selectedEmployeeIds
          } else {
            variables.ownerEmployeeIds = ['00000000-0000-0000-0000-000000000000']
          }
        }

        const result = await fetchInvestmentOpportunities(variables)
        return result.InvestmentOpportunity || []
      },

      renderBoardCard: createBoardCardRenderer({ preferForecastedProfit: true }),

      processCompletionEvents: ['taskCompletion']
    }),
    [context, fetchInvestmentOpportunities]
  )

  return <OpportunityLayout context={context} config={config} dataTestId="investment-opportunities-view" />
}

export default OpportunityView
