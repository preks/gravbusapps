import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import {
  OpportunityLayout,
  type OpportunityViewConfig,
  type OpportunityBoardFilters
} from '@/common/components/common-relations/view-layouts/opportunity-layout'
import type { CustomerOpportunity } from '@/common/data/customer/types'
import type { CustomerOpportunityQueryVariables } from '@/common/data/customer/queries/customerOpportunityQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  createOpportunityColumns,
  createOpportunitySortableColumns
} from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import { opportunityFilterConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityFilters'
import { useCustomerOpportunityFilters } from './hooks/useCustomerOpportunityFilters'
import { OpportunityStatisticsWithTrend } from './components/OpportunityStatistics'
import { useOpportunityStatisticsWithTrend } from './hooks/useOpportunityStatisticsWithTrend'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import {
  applyBasicFilters,
  applyAmountFilter,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/queryHelpers'
import { createBoardCardRenderer } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/boardCardRenderer'

export type OpportunityViewProps = BusinessAppContextProps

export const OpportunityView: React.FC<OpportunityViewProps> = context => {
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)
  const opportunityStatistics = useOpportunityStatisticsWithTrend({ ...context, sourceApp: 'CRM' })

  const config: OpportunityViewConfig<CustomerOpportunity, CustomerOpportunityQueryVariables> = useMemo(
    () => ({
      contextType: 'customer',

      fetchOpportunities: async (variables: CustomerOpportunityQueryVariables) => {
        return await fetchCustomerOpportunities(variables)
      },

      filterDataHook: useCustomerOpportunityFilters,

      createColumns: createOpportunityColumns as any,
      createSortableColumns: createOpportunitySortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        const mapping: Record<string, string> = {
          opportunity: 'name',
          amount: 'estimatedAmount',
          pipeline: 'salesPipeline',
          stage: 'salesPipelineStage',
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
        const vars: CustomerOpportunityQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        applyBasicFilters(vars, params.selectedFilters)
        applyAmountFilter(vars, params.selectedFilters.amount)
        applyDateFilter(vars, params.selectedFilters.closeDate)

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
        entityContext: FlowContextName.customerOpportunityEntity,
        createContext: FlowContextName.customerOpportunityCreate
      },

      buildRecordUrl: (id: string) =>
        buildPlatformUrl('/platform/crm/opportunity-record', {
          opportunityId: id,
          source: 'customer-relations'
        }),

      buildAccountUrl: (id: string) =>
        buildPlatformUrl('/platform/crm/account-record', {
          accountId: id
        }),

      renderStatistics: ({ onRefresh }) =>
        opportunityStatistics.trendData ? (
          <OpportunityStatisticsWithTrend
            trendData={opportunityStatistics.trendData}
            isLoading={opportunityStatistics.isLoading}
            error={opportunityStatistics.error}
            onRefresh={onRefresh}
          />
        ) : null,

      // Board configuration
      boardConfig: {
        pipelineCatalog: 'SalesPipeline',
        pipelineStageCatalog: 'SalesPipelineStage',
        opportunityType: 'CustomerOpportunity',
        defaultFilter: 'all',
        formatCurrency: (amount: number) => formatNumberFunction(amount, '0.0a').toUpperCase(),
        buildQueryVariables: () => ({}),
        processConfig: {
          domain: 'customer-relations',
          processName: 'transitionCustomerOpportunity',
          buildPayload: (opportunityId: string, targetStageRef: string) => ({
            opportunityId,
            targetStageRef
          })
        }
      },

      fetchOpportunitiesForBoard: async (
        filters: OpportunityBoardFilters & { additionalFilters?: Record<string, any> }
      ) => {
        const variables: CustomerOpportunityQueryVariables = {
          limit: 200,
          orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
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

        const result = await fetchCustomerOpportunities(variables)
        return result.opportunities || []
      },

      renderBoardCard: createBoardCardRenderer(),

      processCompletionEvents: ['taskCompletion']
    }),
    [context, fetchCustomerOpportunities, opportunityStatistics]
  )

  return <OpportunityLayout context={context} config={config} dataTestId="customer-opportunities-view" />
}

export default OpportunityView
