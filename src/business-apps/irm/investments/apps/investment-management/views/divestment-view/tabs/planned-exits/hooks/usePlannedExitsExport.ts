import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS, type Investment } from '@/common/data/investment/types/investmentTypes.new'
import {
  buildInvestmentFragment,
  INVESTMENT_QUERY_CONFIGS
} from '@/common/data/investment/queries/investmentQueries.new'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'

const PLANNED_EXITS_EXPORT_COLUMNS = [
  { key: 'name', title: 'Investment' },
  { key: 'investmentGroup', title: 'Group' },
  { key: 'investmentType', title: 'Type' },
  { key: 'totalInvestmentAmount', title: 'Total Investment' },
  { key: 'currency', title: 'Currency' },
  { key: 'ownerEmployee', title: 'Owner' },
  { key: 'investmentStatus', title: 'Status' },
  { key: 'plannedExitDate', title: 'Planned Exit Date' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const PLANNED_EXITS_DATE_COLUMN_KEYS = new Set(['plannedExitDate', 'createdAt'])

const getOwnerName = (inv: Investment): string => {
  const emp = inv.ownerEmployee
  if (!emp) return '-'
  return emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '-'
}

const formatPlannedExitForExport = (inv: Investment): Record<string, string> => ({
  name: inv.name || '-',
  investmentGroup: inv.investmentGroup?.value || '-',
  investmentType: inv.investmentType?.value || '-',
  totalInvestmentAmount: inv.totalInvestmentAmount == null ? '-' : String(inv.totalInvestmentAmount),
  currency: inv.currency?.value || (inv.currency as any)?.code || '-',
  ownerEmployee: getOwnerName(inv),
  investmentStatus: inv.investmentStatus?.value || '-',
  plannedExitDate: formatExportDate(inv.plannedExitDate),
  createdAt: formatExportDate(inv.createdAt)
})

interface UsePlannedExitsExportOptions {
  accessToken: string
  sectionState: { search: string; sortField: string; sortOrder: 'ASC' | 'DESC' }
  selectedFilters: Record<string, any>
  totalCount: number
}

export function usePlannedExitsExport({
  accessToken,
  sectionState,
  selectedFilters,
  totalCount
}: UsePlannedExitsExportOptions) {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAllItems = useCallback(async (): Promise<Investment[]> => {
    const baseConditions: Record<string, any>[] = [{ planedExit: { _eq: true } }]
    const extraConditions: Record<string, any>[] = selectedFilters.customConditions ?? []
    const restFilters = Object.fromEntries(
      Object.entries(selectedFilters).filter(([key]) => key !== 'customConditions')
    )

    const sortDirection: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' =
      sectionState.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'

    const vars = {
      limit: totalCount,
      offset: 0,
      search: sectionState.search?.trim() || undefined,
      orderBy: sectionState.sortField
        ? [{ field: sectionState.sortField, direction: sortDirection }]
        : [{ field: 'plannedExitDate', direction: 'ASC_NULLS_LAST' as const }],
      customConditions: [...baseConditions, ...extraConditions],
      ...restFilters
    }

    const fragment = buildInvestmentFragment(INVESTMENT_QUERY_CONFIGS.list)
    const varsAny = vars as any
    const allConditions = [...(varsAny.customConditions || [])]
    const filteredVars = { ...varsAny }
    delete filteredVars.customConditions

    const whereObj = buildWhere({
      variables: filteredVars,
      descriptors: INVESTMENT_DESCRIPTORS,
      ids: filteredVars.ids,
      isDeleted: true,
      customConditions: allConditions
    })

    const orderByInput =
      vars.orderBy && vars.orderBy.length > 0
        ? vars.orderBy
        : [{ field: 'plannedExitDate', direction: 'ASC_NULLS_LAST' as const }]
    const orderByArray = buildOrderBy(orderByInput, INVESTMENT_DESCRIPTORS)

    const query = `
      query GetPlannedExitsForExport(
        $limit: Int $offset: Int $where: InvestmentBoolExp $orderBy: [InvestmentOrderBy!]
      ) {
        Investment(limit: $limit offset: $offset orderBy: $orderBy where: $where) { ${fragment} }
      }
    `

    const result = await graphqlClient.request<{ Investment: any[] }>(query, {
      limit: vars.limit,
      offset: 0,
      where: whereObj,
      orderBy: orderByArray
    })

    return (result.Investment || []) as Investment[]
  }, [graphqlClient, sectionState, selectedFilters, totalCount])

  return useExportBase<Investment>({
    fetchAllItems,
    formatItem: formatPlannedExitForExport,
    columns: PLANNED_EXITS_EXPORT_COLUMNS,
    dateColumnKeys: PLANNED_EXITS_DATE_COLUMN_KEYS,
    sheetName: 'Planned Exits',
    entityLabel: 'planned exits',
    totalCount,
    filenamePrefix: 'planned-exits'
  })
}
