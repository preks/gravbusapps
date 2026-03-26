import React, { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { OpportunityLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/opportunityConfigBuilder'
import { createOpportunityColumns } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import {
  buildInvestmentOpportunityQuery,
  buildInvestmentOpportunityWhereCondition,
  buildInvestmentOpportunityOrderBy
} from '@/common/data/investment/queries/investmentOpportunityQueries'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useDivestmentOpportunityFilters } from './hooks/useDivestmentOpportunityFilters'
import { ExitOpportunityStatistics } from './components/ExitOpportunityStatistics'
import { DIVESTMENT_OPPORTUNITY_DESCRIPTORS } from '../../config/divestmentOpportunityDescriptors'
import { divestmentOpportunityFilterConfig } from '../../config/defaultDivestmentFilters'
import { insertDivestmentColumn } from '../../config/divestmentColumns'
import { buildOpportunityCustomConditions } from '../../config/divestmentOpportunityConditions'
import {
  type InvestmentOpportunity,
  toInvestmentOpportunity
} from '@/common/data/investment/types/investmentOpportunityTypes'

export interface ExitOpportunitiesTabProps extends BusinessAppContextProps {
  enabled?: boolean
}

const createEnabledFilterHook = (isEnabled: boolean) => {
  return (ctx: BusinessAppContextProps) =>
    useDivestmentOpportunityFilters(isEnabled ? ctx : { ...ctx, accessToken: '' })
}

export const ExitOpportunitiesTab: React.FC<ExitOpportunitiesTabProps> = ({ enabled = true, ...context }) => {
  const { accessToken } = context

  const graphqlClient = useGraphQLClient(enabled ? accessToken : '')

  const fetchInvestmentOpportunities = useCallback(
    async (variables: InvestmentOpportunityQueryVariables = {}) => {
      const query = buildInvestmentOpportunityQuery()
      const customConditions = buildOpportunityCustomConditions(variables, [{ divestmentId: { _isNull: false } }])
      const whereCondition = buildInvestmentOpportunityWhereCondition(variables, [], customConditions)
      const orderBy = buildInvestmentOpportunityOrderBy(variables.orderBy || [])

      const result = await graphqlClient.request<{
        InvestmentOpportunity: InvestmentOpportunity[]
        InvestmentOpportunityAggregate: { aggregate: { count: number } }
      }>(query, {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy
      })

      return {
        InvestmentOpportunity: result.InvestmentOpportunity.map(toInvestmentOpportunity),
        InvestmentOpportunityAggregate: result.InvestmentOpportunityAggregate
      }
    },
    [graphqlClient]
  )

  const filterDataHook = useMemo(() => createEnabledFilterHook(enabled), [enabled])

  const prefilledInvestmentId = useMemo(() => {
    const fromAdditionalData = context.additionalData?.investmentId
    if (typeof fromAdditionalData === 'string' && fromAdditionalData.trim()) {
      return fromAdditionalData.trim()
    }

    const fromUrl = new URLSearchParams(globalThis.window?.location.search ?? '').get('investmentId')
    if (fromUrl?.trim()) return fromUrl.trim()

    return undefined
  }, [context.additionalData])

  const config = useMemo(() => {
    const baseConfig = createOpportunityConfig<
      InvestmentOpportunity & { id: string },
      InvestmentOpportunityQueryVariables
    >({
      contextType: 'investment',

      extendQueryVariables: vars => ({
        ...vars,
        dealType: 'DIVESTMENT_DEAL'
      }),

      fetchOpportunities: async variables => {
        if (!enabled) {
          return { opportunities: [], total: 0 }
        }

        const result = await fetchInvestmentOpportunities(variables)
        return {
          opportunities: result.InvestmentOpportunity.filter(
            (opp): opp is InvestmentOpportunity & { id: string } => !!opp.id
          ),
          total: result.InvestmentOpportunityAggregate.aggregate.count
        }
      },

      filterDataHook,

      viewDescriptors: DIVESTMENT_OPPORTUNITY_DESCRIPTORS,

      columnMappings: {
        pipeline: 'opportunityPipeline',
        stage: 'opportunityPipelineStage'
      },

      flowContexts: {
        entity: FlowContextName.investmentOpportunityEntity,
        create: FlowContextName.investmentOpportunityCreate,
        createContextData: {
          dealType: 'DIVESTMENT_DEAL',
          ...(prefilledInvestmentId ? { investmentId: prefilledInvestmentId } : {})
        }
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
      extractBoardTotalCount: result => result.InvestmentOpportunityAggregate?.aggregate?.count || 0,
      renderStatistics: (selectedCurrency?: string) => (
        <ExitOpportunityStatistics accessToken={accessToken} currencyCode={selectedCurrency} enabled={enabled} />
      ),
      rowActionsContextArray: [FlowContextName.investmentOpportunityEntity],
      buildRowActionsExternalContextData: (row: { original: InvestmentOpportunity & { id: string } }) => ({
        opportunityId: row.original.id
      })
    })

    return {
      ...baseConfig,
      baseFilterConfig: divestmentOpportunityFilterConfig,
      createColumns: () => insertDivestmentColumn(createOpportunityColumns(), 'closeDate'),
      createSortableColumns: (availableColumnIds?: string[]) => {
        const baseSortable = baseConfig.createSortableColumns(availableColumnIds)
        if (!availableColumnIds || availableColumnIds.includes('divestment')) {
          return [...baseSortable, { id: 'divestment', label: 'Divestment' }]
        }
        return baseSortable
      }
    } as typeof baseConfig
  }, [enabled, accessToken, fetchInvestmentOpportunities, filterDataHook, prefilledInvestmentId])

  return (
    <OpportunityLayout
      context={context}
      config={config}
      dataTestId="exit-opportunities-view"
      extendVisibleColumns={['divestment']}
      enableExport
      exportFilenamePrefix="exit-opportunities"
      showAllCurrencyOption={false}
      defaultCurrency="EUR"
    />
  )
}

export default ExitOpportunitiesTab
