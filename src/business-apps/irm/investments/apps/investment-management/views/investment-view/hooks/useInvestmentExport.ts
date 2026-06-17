import { useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy, buildJsonbContainsConditions } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS, type Investment } from '@/common/data/investment/types/investmentTypes.new'
import { buildInvestmentFragment } from '@/common/data/investment/queries/investmentQueries.new'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import { formatFlatCurrencyAmount } from '../data/shared/investmentAggregatesFormat'
import { buildInvestmentSectionQueryModel } from '../utils/buildInvestmentSectionQueryModel'
import type { InvestmentListColumnConfiguration } from '../utils/investmentListColumnTransformer'

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
  investmentGroups: Array<{ id?: string; code: string; tabId: string; label: string }>
  totalCount: number
  filenamePrefix?: string
  displayCurrencyCode?: string
  columnConfig?: Partial<
    Pick<
      InvestmentListColumnConfiguration,
      'queryFields' | 'sortDescriptors' | 'searchDescriptors' | 'jsonbSearchByColumnId' | 'filterConditionByFilterId'
    >
  >
}

const buildInvestmentSummaryRows = (
  listAggregates: InvestmentListAggregates | undefined,
  displayCurrencyCode: string
): Array<[string, string]> => {
  if (!listAggregates) return []

  const fmt = (v: number | null) => formatFlatCurrencyAmount(v, displayCurrencyCode)

  return [
    ['Investments (filtered):', String(listAggregates.count)],
    ['Total investment:', fmt(listAggregates.totalInvestmentAmount)],
    ['Average investment:', fmt(listAggregates.avgTotalInvestmentAmount)],
    ['Market value:', fmt(listAggregates.investmentMarketValue)],
    ['Average market value:', fmt(listAggregates.avgInvestmentMarketValue)]
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
  displayCurrencyCode = 'EUR',
  columnConfig
}: UseInvestmentExportOptions) {
  const graphqlClient = useGraphQLClient(accessToken)

  const activeGroup = investmentGroups.find(g => g.tabId === currentSection) ?? null
  const queryModel = useMemo(
    () =>
      buildInvestmentSectionQueryModel({
        selectedFilters,
        search: currentState.search || '',
        sortField: currentState.sortField || '',
        sortOrder: currentState.sortOrder || 'DESC',
        limit: totalCount,
        offset: 0,
        group: activeGroup,
        visibleColumns: currentState.visibleColumns,
        columnConfig
      }),
    [
      activeGroup,
      columnConfig,
      currentState.search,
      currentState.sortField,
      currentState.sortOrder,
      currentState.visibleColumns,
      selectedFilters,
      totalCount
    ]
  )

  const fetchAllItems = useCallback(async (): Promise<Investment[]> => {
    const vars = queryModel.queryVariables
    const fragment = buildInvestmentFragment(queryModel.queryFields)

    const varsWithFilters = vars as typeof vars & Record<string, any>
    const customConditions: Record<string, any>[] = Array.isArray(varsWithFilters.customConditions)
      ? [...varsWithFilters.customConditions]
      : []

    const filteredVars = { ...varsWithFilters }
    delete filteredVars.customConditions
    const searchDescriptorKeys = filteredVars.searchDescriptorKeys
    delete filteredVars.searchDescriptorKeys

    const extraSearchConditions = buildJsonbContainsConditions(queryModel.jsonbSearchColumns, filteredVars.search)

    const whereObj = buildWhere({
      variables: filteredVars,
      descriptors: queryModel.searchDescriptors.length
        ? [...INVESTMENT_DESCRIPTORS, ...queryModel.searchDescriptors]
        : INVESTMENT_DESCRIPTORS,
      ids: filteredVars.ids,
      isDeleted: true,
      customConditions,
      searchDescriptorKeys,
      ...(extraSearchConditions.length > 0 ? { extraSearchConditions } : {})
    })

    const orderByInput =
      vars.orderBy && vars.orderBy.length > 0
        ? vars.orderBy
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
    const orderByArray = buildOrderBy(orderByInput, queryModel.sortDescriptors)

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
  }, [graphqlClient, queryModel])

  const summaryRows = useMemo(
    () => buildInvestmentSummaryRows(currentState.listAggregates, displayCurrencyCode),
    [currentState.listAggregates, displayCurrencyCode]
  )

  return useExportBase<Investment>({
    fetchAllItems,
    formatItem: formatInvestmentForExport,
    columns: INVESTMENT_EXPORT_COLUMNS,
    dateColumnKeys: INVESTMENT_DATE_COLUMN_KEYS,
    sheetName: 'Investments',
    entityLabel: 'investments',
    totalCount,
    filenamePrefix: filenamePrefix || queryModel.exportMetadata.filenamePrefix,
    summaryRows
  })
}
