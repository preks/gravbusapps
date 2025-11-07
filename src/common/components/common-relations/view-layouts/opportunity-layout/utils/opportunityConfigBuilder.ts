import type { OpportunityViewConfig } from '../OpportunityLayout'
import type { OpportunityStatisticsData } from '../components/OpportunityStatisticsLayout'
import type { OpportunityBoardFilters } from '../config/opportunityBoardTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { createBoardCardRenderer } from './boardCardRenderer'
import { createOpportunityColumns, createOpportunitySortableColumns } from '../config/opportunityColumns'
import { opportunityFilterConfig } from '../config/opportunityFilters'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface OpportunityConfigBuilderOptions<TOpportunity, TQueryVariables> {
  contextType: 'customer' | 'investment'

  extendQueryVariables?: (vars: TQueryVariables) => TQueryVariables

  fetchOpportunities: (variables: TQueryVariables) => Promise<{
    opportunities?: TOpportunity[]
    total?: number
  }>

  filterDataHook: any

  viewDescriptors?: Descriptor[]

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
  extractBoardTotalCount: (result: any) => number

  opportunityStatistics?: OpportunityStatisticsData

  rowActionsContextArray: FlowContextName[]
  buildRowActionsExternalContextData: (row: { original: TOpportunity }) => Record<string, string>
}

export const createOpportunityConfig = <TOpportunity extends { id: string }, TQueryVariables>(
  options: OpportunityConfigBuilderOptions<TOpportunity, TQueryVariables>
): OpportunityViewConfig<TOpportunity, TQueryVariables> => {
  return {
    contextType: options.contextType,

    fetchOpportunities: options.fetchOpportunities,

    filterDataHook: options.filterDataHook,

    createColumns: createOpportunityColumns as any,
    createSortableColumns: (availableColumnIds?: string[]) =>
      createOpportunitySortableColumns(options.viewDescriptors, availableColumnIds),

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

      // Copy filter values directly (Filter-IDs now match Descriptor-Keys)
      // Handle amount filter (number range - no Descriptor)
      if (params.selectedFilters.amount && typeof params.selectedFilters.amount === 'object') {
        const { min, max } = params.selectedFilters.amount
        if ((min !== null && min !== undefined) || (max !== null && max !== undefined)) {
          vars.estimatedAmountRanges = [
            {
              ...(min !== null && min !== undefined && { min }),
              ...(max !== null && max !== undefined && { max })
            }
          ]
        }
      }

      // Handle closeDate filter (date range)
      if (params.selectedFilters.closeDate) {
        if (typeof params.selectedFilters.closeDate === 'string') {
          // Parse comma-separated date string
          const dates = params.selectedFilters.closeDate
            .split(',')
            .map(d => d.trim())
            .filter(Boolean)
          if (dates.length === 1) {
            vars.closeDateFrom = dates[0]
            vars.closeDateTo = dates[0]
          } else if (dates.length === 2) {
            if (dates[0]) vars.closeDateFrom = dates[0]
            if (dates[1]) vars.closeDateTo = dates[1]
          }
        } else if (Array.isArray(params.selectedFilters.closeDate) && params.selectedFilters.closeDate.length === 2) {
          const [start, end] = params.selectedFilters.closeDate
          if (start) vars.closeDateFrom = start
          if (end) vars.closeDateTo = end
        }
      }

      // Copy all other filters directly (they now match Descriptor-Keys)
      Object.keys(params.selectedFilters).forEach(key => {
        if (
          key !== 'amount' &&
          key !== 'closeDate' &&
          params.selectedFilters[key] !== undefined &&
          params.selectedFilters[key] !== null
        ) {
          vars[key as keyof typeof vars] = params.selectedFilters[key]
        }
      })

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

    opportunityStatistics: options.opportunityStatistics,

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
        variables.opportunityPipelineIds = [filters.selectedPipelineId]
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
      return {
        opportunities: options.extractBoardOpportunities(result),
        total: options.extractBoardTotalCount(result)
      }
    },

    renderBoardCard: createBoardCardRenderer({ preferForecastedProfit: options.boardConfig.preferForecastedProfit }),

    processCompletionEvents: ['taskCompletion'],

    rowActionsContextArray: options.rowActionsContextArray,
    buildRowActionsExternalContextData: options.buildRowActionsExternalContextData
  }
}
