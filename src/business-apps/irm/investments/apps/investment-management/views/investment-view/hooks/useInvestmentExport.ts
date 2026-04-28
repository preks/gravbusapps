import { useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS, type Investment } from '@/common/data/investment/types/investmentTypes.new'
import {
  buildInvestmentFragment,
  INVESTMENT_QUERY_CONFIGS
} from '@/common/data/investment/queries/investmentQueries.new'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import {
  formatFlatCurrencyAmount,
  computePortfolioPerformanceFromSums
} from '../data/shared/investmentAggregatesFormat'
import { getPerformanceSign } from '../data/shared/investmentPerformanceDisplay'

// ─── Columns ─────────────────────────────────────────────────────────────────

const INVESTMENT_EXPORT_COLUMNS = [
  { key: 'name', title: 'Investment' },
  { key: 'investmentGroup', title: 'Group' },
  { key: 'investmentType', title: 'Type' },
  { key: 'totalInvestmentAmount', title: 'Total Investment' },
  { key: 'currency', title: 'Currency' },
  { key: 'ownerEmployee', title: 'Owner' },
  { key: 'account', title: 'Account' },
  { key: 'investmentStatus', title: 'Status' },
  { key: 'planedExit', title: 'Planned Exit' },
  { key: 'plannedExitDate', title: 'Planned Exit Date' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const INVESTMENT_DATE_COLUMN_KEYS = new Set(['createdAt', 'plannedExitDate'])

// ─── Formatter ────────────────────────────────────────────────────────────────

const getOwnerName = (inv: Investment): string => {
  const emp = inv.ownerEmployee
  if (!emp) return '-'
  return emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '-'
}

const formatPlanedExit = (value: boolean | undefined): string => {
  if (value === undefined || value === null) return '-'
  return value ? 'Yes' : 'No'
}

const formatAccount = (inv: Investment): string => {
  const associations = inv.investmentAccounts || []
  if (associations.length === 0) return '-'
  if (associations.length > 1) return 'Multiple'
  return associations[0]?.investmentAccount?.name || '-'
}

const formatInvestmentForExport = (inv: Investment): Record<string, string> => ({
  name: inv.name || '-',
  investmentGroup: inv.investmentGroup?.value || '-',
  investmentType: inv.investmentType?.value || '-',
  totalInvestmentAmount: inv.totalInvestmentAmount == null ? '-' : String(inv.totalInvestmentAmount),
  currency: inv.currency?.value || (inv.currency as any)?.code || '-',
  ownerEmployee: getOwnerName(inv),
  account: formatAccount(inv),
  investmentStatus: inv.investmentStatus?.value || '-',
  planedExit: formatPlanedExit(inv.planedExit),
  plannedExitDate: formatExportDate(inv.plannedExitDate),
  createdAt: formatExportDate(inv.createdAt)
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseInvestmentExportOptions {
  accessToken: string
  currentState: any
  selectedFilters: Record<string, any>
  currentSection: string
  investmentGroups: Array<{ code: string; tabId: string; label: string }>
  totalCount: number
  filenamePrefix?: string
  displayCurrencyCode?: string
}

const buildInvestmentSummaryRows = (
  listAggregates: InvestmentListAggregates | undefined,
  displayCurrencyCode: string,
  showEquityMetrics: boolean
): Array<[string, string]> => {
  if (!listAggregates) return []

  const fmt = (v: number | null) => formatFlatCurrencyAmount(v, displayCurrencyCode)

  const rows: Array<[string, string]> = [
    ['Investments (filtered):', String(listAggregates.count)],
    ['Total investment:', fmt(listAggregates.totalInvestmentAmount)],
    ['Average investment:', fmt(listAggregates.avgTotalInvestmentAmount)],
    ['Market value:', fmt(listAggregates.investmentMarketValue)],
    ['Average market value:', fmt(listAggregates.avgInvestmentMarketValue)]
  ]

  if (!showEquityMetrics) return rows

  const perf = computePortfolioPerformanceFromSums(
    listAggregates.totalInvestmentAmount,
    listAggregates.investmentMarketValue
  )
  const sign = getPerformanceSign(perf.amount === 0, perf.amount > 0)
  const perfAbs = fmt(Math.abs(perf.amount))
  const perfPct = perf.percent != null ? `${sign}${Math.abs(perf.percent).toFixed(2)}%` : '—'

  return [
    ...rows,
    ['Performance (portfolio):', `${sign}${perfAbs} (${perfPct})`],
    ['EBITDA (sum):', fmt(listAggregates.ebitdaAmount)],
    ['EBITDA (average):', fmt(listAggregates.avgEbitdaAmount)]
  ]
}

export function useInvestmentExport({
  accessToken,
  currentState,
  selectedFilters,
  currentSection,
  investmentGroups,
  totalCount,
  filenamePrefix = 'investments',
  displayCurrencyCode = 'EUR'
}: UseInvestmentExportOptions) {
  const graphqlClient = useGraphQLClient(accessToken)

  // Build query variables that exactly mirror what the active section state hook uses
  const queryVariables = useMemo(() => {
    const sortField: string = currentState.sortField || ''
    const sortOrder: 'ASC' | 'DESC' = currentState.sortOrder || 'DESC'

    // Strip currencyIds and customConditions — handled separately below
    const listFilters = Object.fromEntries(
      Object.entries(selectedFilters).filter(([key]) => key !== 'currencyIds' && key !== 'customConditions')
    )

    // Currency condition (same logic as section state hooks)
    const currencyIds: string[] = selectedFilters.currencyIds ?? []
    const currencyCodes = currencyIds.map((id: string) => id.split(':').pop()).filter(Boolean)
    const currencyConditions: Record<string, any>[] =
      currencyCodes.length > 0 ? [{ currency: { code: { _in: currencyCodes } } }] : []

    // Group condition (only for non-overview tabs — mirrors useGenericInvestmentSectionState)
    const activeGroup = investmentGroups.find(g => g.tabId === currentSection)
    const groupCondition: Record<string, any>[] = activeGroup
      ? [{ investmentGroup: { id: { _eq: `InvestmentGroup:v1:${activeGroup.code}` } } }]
      : []

    const existingConditions: Record<string, any>[] = selectedFilters.customConditions ?? []
    const mergedConditions = [...groupCondition, ...existingConditions, ...currencyConditions]
    const sortDirection: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' =
      sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'

    return {
      search: currentState.search?.trim() || undefined,
      orderBy: sortField
        ? [{ field: sortField, direction: sortDirection }]
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }],
      ...listFilters,
      ...(mergedConditions.length > 0 ? { customConditions: mergedConditions } : {})
    }
  }, [
    currentState.search,
    currentState.sortField,
    currentState.sortOrder,
    selectedFilters,
    currentSection,
    investmentGroups
  ])

  const fetchAllItems = useCallback(async (): Promise<Investment[]> => {
    const vars = { ...queryVariables, limit: totalCount, offset: 0 }
    const fragment = buildInvestmentFragment(INVESTMENT_QUERY_CONFIGS.list)

    const varsWithFilters = vars as typeof vars & Record<string, any>
    const customConditions: Record<string, any>[] = Array.isArray(varsWithFilters.customConditions)
      ? [...varsWithFilters.customConditions]
      : []

    const filteredVars = { ...varsWithFilters }
    delete filteredVars.customConditions

    const whereObj = buildWhere({
      variables: filteredVars,
      descriptors: INVESTMENT_DESCRIPTORS,
      ids: filteredVars.ids,
      isDeleted: true,
      customConditions
    })

    const orderByInput =
      vars.orderBy && vars.orderBy.length > 0
        ? vars.orderBy
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
    const orderByArray = buildOrderBy(orderByInput, INVESTMENT_DESCRIPTORS)

    const query = `
      query GetInvestmentsForExport(
        $limit: Int
        $offset: Int
        $where: InvestmentBoolExp
        $orderBy: [InvestmentOrderBy!]
      ) {
        Investment(limit: $limit offset: $offset orderBy: $orderBy where: $where) {
          ${fragment}
        }
      }
    `

    const result = await graphqlClient.request<{ Investment: any[] }>(query, {
      limit: vars.limit,
      offset: 0,
      where: whereObj,
      orderBy: orderByArray
    })

    return (result.Investment || []) as Investment[]
  }, [graphqlClient, queryVariables, totalCount])

  const activeGroup = investmentGroups.find(g => g.tabId === currentSection)
  const showEquityMetrics = activeGroup?.code === 'EQUITY'

  const summaryRows = useMemo(
    () => buildInvestmentSummaryRows(currentState.listAggregates, displayCurrencyCode, showEquityMetrics),
    [currentState.listAggregates, displayCurrencyCode, showEquityMetrics]
  )

  return useExportBase<Investment>({
    fetchAllItems,
    formatItem: formatInvestmentForExport,
    columns: INVESTMENT_EXPORT_COLUMNS,
    dateColumnKeys: INVESTMENT_DATE_COLUMN_KEYS,
    sheetName: 'Investments',
    entityLabel: 'investments',
    totalCount,
    filenamePrefix,
    summaryRows
  })
}
