import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildInvestmentOpportunityQuery,
  buildInvestmentOpportunityWhereCondition,
  buildInvestmentOpportunityOrderBy
} from '@/common/data/investment/queries/investmentOpportunityQueries'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import {
  type InvestmentOpportunity,
  toInvestmentOpportunity
} from '@/common/data/investment/types/investmentOpportunityTypes'
import { buildOpportunityCustomConditions, WON_STATUS_CONDITION } from '../../../config/divestmentOpportunityConditions'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'

const EXITS_EXPORT_COLUMNS = [
  { key: 'name', title: 'Opportunity' },
  { key: 'divestment', title: 'Divestment' },
  { key: 'estimatedAmount', title: 'Exit Amount' },
  { key: 'currency', title: 'Currency' },
  { key: 'opportunityStatus', title: 'Status' },
  { key: 'opportunityPipeline', title: 'Pipeline' },
  { key: 'closeDate', title: 'Close Date' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const EXITS_DATE_COLUMN_KEYS = new Set(['closeDate', 'createdAt'])

const formatExitForExport = (opp: InvestmentOpportunity): Record<string, string> => ({
  name: opp.name || '-',
  divestment: (opp as any).divestment?.name || '-',
  estimatedAmount: opp.estimatedAmount == null ? '-' : String(opp.estimatedAmount),
  currency: opp.currency?.value || (opp.currency as any)?.code || '-',
  opportunityStatus: opp.opportunityStatus?.value || '-',
  opportunityPipeline: opp.opportunityPipeline?.value || '-',
  closeDate: formatExportDate(opp.closeDate),
  createdAt: formatExportDate(opp.createdAt)
})

interface UseExitsExportOptions {
  accessToken: string
  queryVariables: InvestmentOpportunityQueryVariables
  activeCurrency: string | undefined
  totalCount: number
}

export function useExitsExport({ accessToken, queryVariables, activeCurrency, totalCount }: UseExitsExportOptions) {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAllItems = useCallback(async (): Promise<InvestmentOpportunity[]> => {
    const query = buildInvestmentOpportunityQuery()
    const customConditions = buildOpportunityCustomConditions(
      { ...queryVariables, dealType: 'DIVESTMENT_DEAL', currencyCode: activeCurrency },
      [WON_STATUS_CONDITION]
    )
    const whereCondition = buildInvestmentOpportunityWhereCondition(queryVariables, [], customConditions)
    const orderBy = buildInvestmentOpportunityOrderBy(queryVariables.orderBy || [])

    const result = await graphqlClient.request<{
      InvestmentOpportunity: InvestmentOpportunity[]
      InvestmentOpportunityAggregate: { aggregate: { count: number } }
    }>(query, { limit: totalCount, offset: 0, where: whereCondition, orderBy })

    return result.InvestmentOpportunity.map(toInvestmentOpportunity)
  }, [graphqlClient, queryVariables, activeCurrency, totalCount])

  return useExportBase<InvestmentOpportunity>({
    fetchAllItems,
    formatItem: formatExitForExport,
    columns: EXITS_EXPORT_COLUMNS,
    dateColumnKeys: EXITS_DATE_COLUMN_KEYS,
    sheetName: 'Exits',
    entityLabel: 'exits',
    totalCount,
    filenamePrefix: 'exits'
  })
}
