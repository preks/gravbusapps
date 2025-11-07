import type { OpportunityViewConfig } from '../OpportunityLayout'
import type { OpportunityBoardFilters } from '../config/opportunityBoardTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { applyBasicFilters, applyAmountFilter, applyDateFilter } from './queryHelpers'
import { createBoardCardRenderer } from './boardCardRenderer'
import { createOpportunityColumns, createOpportunitySortableColumns } from '../config/opportunityColumns'
import { opportunityFilterConfig } from '../config/opportunityFilters'

export interface OpportunityConfigBuilderOptions<TOpportunity, TQueryVariables> {
  contextType: 'customer' | 'investment'

  extendQueryVariables?: (vars: TQueryVariables) => TQueryVariables

  fetchOpportunities: (variables: TQueryVariables) => Promise<{
    opportunities?: TOpportunity[]
    total?: number
  }>

  filterDataHook: any

  columnMappings: {
    pipeline: string
    stage: string
  }

  flowContexts: {
    entity: FlowContextName
    create: FlowContextName
    createContextData?: Record<string, any>
  }

  urlPaths: {
    opportunityRecord: string
    accountRecord: string
    source: string
  }

  boardConfig: {
    pipelineCatalog: string
    pipelineStageCatalog: string
    opportunityType: 'CustomerOpportunity' | 'InvestmentOpportunity'
    processName: string
    processDomain: string
    preferForecastedProfit?: boolean
  }

  fetchBoardOpportunities: (
    variables: TQueryVariables & { limit?: number; orderBy?: any; search?: string }
  ) => Promise<any>

  extractBoardOpportunities: (result: any) => TOpportunity[]

  renderStatistics: (props: any) => React.ReactNode
}

export const createOpportunityConfig = <TOpportunity extends { id: string }, TQueryVariables>(
  options: OpportunityConfigBuilderOptions<TOpportunity, TQueryVariables>
): OpportunityViewConfig<TOpportunity, TQueryVariables> => {
  return {
    contextType: options.contextType,

    fetchOpportunities: options.fetchOpportunities,

    filterDataHook: options.filterDataHook,

    createColumns: createOpportunityColumns as any,
    createSortableColumns: createOpportunitySortableColumns,

    baseFilterConfig: opportunityFilterConfig,

    buildQueryVariables: (params: {
      pagination: { pageIndex: number; pageSize: number }
      searchTerm: string
      selectedFilters: Record<string, any>
      sorting: Array<{ id: string; desc: boolean }>
    }) => {
      const vars: any = {
        limit: params.pagination.pageSize,
        offset: params.pagination.pageIndex * params.pagination.pageSize,
        search: params.searchTerm.trim() || undefined
      }

      applyBasicFilters(vars, params.selectedFilters)
      applyAmountFilter(vars, params.selectedFilters.amount)
      applyDateFilter(vars, params.selectedFilters.closeDate)

      if (params.sorting.length > 0) {
        // Use column ID directly - buildOrderBy will use descriptors (CUSTOMER_OPPORTUNITY_DESCRIPTORS or INVESTMENT_OPPORTUNITY_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., account.name, ownerEmployee.displayName)
        vars.orderBy = [
          {
            field: params.sorting[0].id,
            direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
          }
        ]
      } else {
        vars.orderBy = [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
      }

      return options.extendQueryVariables
        ? options.extendQueryVariables(vars as TQueryVariables)
        : (vars as TQueryVariables)
    },

    flowContexts: {
      entityContext: options.flowContexts.entity,
      createContext: options.flowContexts.create,
      ...(options.flowContexts.createContextData && { createContextData: options.flowContexts.createContextData })
    },

    buildRecordUrl: (id: string) =>
      buildPlatformUrl(options.urlPaths.opportunityRecord, {
        opportunityId: id,
        source: options.urlPaths.source
      }),

    buildAccountUrl: (id: string) =>
      buildPlatformUrl(options.urlPaths.accountRecord, {
        accountId: id
      }),

    renderStatistics: options.renderStatistics,

    boardConfig: {
      pipelineCatalog: options.boardConfig.pipelineCatalog,
      pipelineStageCatalog: options.boardConfig.pipelineStageCatalog,
      opportunityType: options.boardConfig.opportunityType,
      defaultFilter: 'all' as const,
      formatCurrency: (amount: number) => formatNumberFunction(amount, '0.0a').toUpperCase(),
      buildQueryVariables: () => ({}),
      processConfig: {
        domain: options.boardConfig.processDomain,
        processName: options.boardConfig.processName,
        buildPayload: (opportunityId: string, targetStageRef: string) => ({
          opportunityId,
          targetStageRef
        })
      }
    },

    fetchOpportunitiesForBoard: async (
      filters: OpportunityBoardFilters & { additionalFilters?: Record<string, any> },
      currentEmployeeId?: string
    ) => {
      const variables: any = {
        limit: 200,
        orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
        search: filters.search?.trim() || undefined
      }

      if (filters.selectedPipelineId) {
        variables.pipelineIds = [filters.selectedPipelineId]
      }

      if (filters.opportunityFilter === 'my' && currentEmployeeId) {
        variables.ownerEmployeeIds = [currentEmployeeId]
      } else if (filters.opportunityFilter === 'selected') {
        if (filters.selectedEmployeeIds.length > 0) {
          variables.ownerEmployeeIds = filters.selectedEmployeeIds
        } else {
          variables.ownerEmployeeIds = ['00000000-0000-0000-0000-000000000000']
        }
      }

      const extendedVars = options.extendQueryVariables ? options.extendQueryVariables(variables) : variables

      const result = await options.fetchBoardOpportunities(extendedVars)
      return options.extractBoardOpportunities(result)
    },

    renderBoardCard: createBoardCardRenderer({ preferForecastedProfit: options.boardConfig.preferForecastedProfit }),

    processCompletionEvents: ['taskCompletion']
  }
}
