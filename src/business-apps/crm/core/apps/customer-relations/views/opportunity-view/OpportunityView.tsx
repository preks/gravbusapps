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
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  createOpportunityColumns,
  createOpportunitySortableColumns
} from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import { CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '@/common/data/customer/types/customerOpportunityTypes'
import { opportunityFilterConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityFilters'
import { useCustomerOpportunityFilters } from './hooks/useCustomerOpportunityFilters'
import { useCustomerOpportunityStatistics } from '@/common/data/customer/hooks/useCustomerOpportunityStatistics'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { createBoardCardRenderer } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/boardCardRenderer'

// Helper function to process amount filter
const processAmountFilter = (selectedFilters: Record<string, any>, vars: CustomerOpportunityQueryVariables): void => {
  if (selectedFilters.amount && typeof selectedFilters.amount === 'object') {
    const { min, max } = selectedFilters.amount
    if ((min !== null && min !== undefined) || (max !== null && max !== undefined)) {
      vars.estimatedAmountRanges = [
        {
          ...(min !== null && min !== undefined && { min }),
          ...(max !== null && max !== undefined && { max })
        }
      ]
    }
  }
}

// Helper function to process date range filters
const processOpportunityDateRanges = (
  selectedFilters: Record<string, any>,
  vars: CustomerOpportunityQueryVariables
): void => {
  const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'closeDateRange']
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) vars[`${baseKey}From` as keyof CustomerOpportunityQueryVariables] = normalized.from
      if (normalized.to) vars[`${baseKey}To` as keyof CustomerOpportunityQueryVariables] = normalized.to
    }
  }
}

// Helper function to copy other filters
const copyOpportunityFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: CustomerOpportunityQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (
      key !== 'amount' &&
      !dateRangeKeys.includes(key) &&
      selectedFilters[key] !== undefined &&
      selectedFilters[key] !== null
    ) {
      vars[key as keyof CustomerOpportunityQueryVariables] = selectedFilters[key]
    }
  }
}

export type OpportunityViewProps = BusinessAppContextProps

export const OpportunityView: React.FC<OpportunityViewProps> = context => {
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)
  const opportunityStatistics = useCustomerOpportunityStatistics(context)

  const config: OpportunityViewConfig<CustomerOpportunity, CustomerOpportunityQueryVariables> = useMemo(
    () => ({
      contextType: 'customer',

      fetchOpportunities: async (variables: CustomerOpportunityQueryVariables) => {
        return await fetchCustomerOpportunities(variables)
      },

      filterDataHook: useCustomerOpportunityFilters,

      createColumns: createOpportunityColumns as any,
      createSortableColumns: (availableColumnIds?: string[]) =>
        createOpportunitySortableColumns(CUSTOMER_OPPORTUNITY_DESCRIPTORS, availableColumnIds),

      baseFilterConfig: opportunityFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
      }) => {
        const vars: CustomerOpportunityQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'closeDateRange']

        // Process amount filter using helper
        processAmountFilter(params.selectedFilters, vars)

        // Process date range filters using helper
        processOpportunityDateRanges(params.selectedFilters, vars)

        // Copy all other filters using helper
        copyOpportunityFilters(params.selectedFilters, dateRangeKeys, vars)

        if (params.sorting.length > 0) {
          // Use column ID directly - buildOrderBy will use CUSTOMER_OPPORTUNITY_DESCRIPTORS to resolve correct GraphQL paths
          // This allows nested paths like account.name, ownerEmployee.displayName to work correctly
          vars.orderBy = [
            {
              field: params.sorting[0].id as any,
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

      opportunityStatistics: opportunityStatistics.trendData
        ? {
            recentOpportunities: opportunityStatistics.trendData.recentOpportunities,
            opportunityValue: opportunityStatistics.trendData.opportunityValue,
            winRate: opportunityStatistics.trendData.winRate,
            opportunitiesThisYear: opportunityStatistics.trendData.opportunitiesThisYear,
            isLoading: opportunityStatistics.isLoading,
            error: opportunityStatistics.error,
            refetch: opportunityStatistics.refetch
          }
        : undefined,

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
          variables.opportunityPipelineIds = [filters.selectedPipelineId]
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
        return {
          opportunities: result.opportunities || [],
          total: result.total || 0
        }
      },

      renderBoardCard: createBoardCardRenderer(),

      processCompletionEvents: ['taskCompletion'],

      rowActionsContextArray: [FlowContextName.customerOpportunityEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerOpportunity }) => ({
        opportunityId: row.original.id
      })
    }),
    [context, fetchCustomerOpportunities, opportunityStatistics]
  )

  return <OpportunityLayout context={context} config={config} dataTestId="customer-opportunities-view" />
}

export default OpportunityView
