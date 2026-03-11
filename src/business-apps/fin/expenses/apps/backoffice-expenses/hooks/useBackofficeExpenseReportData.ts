import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import dayjs from 'dayjs'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  GET_EXPENSE_ITEMS_BACKOFFICE,
  GET_EXPENSE_PLANS_BACKOFFICE,
  GET_EXPENSE_REQUESTS_BACKOFFICE,
  GET_ADVANCE_PAYMENTS_REPORT_BACKOFFICE,
  GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE,
  GET_EXPENSES_SLA_POLICY,
  GET_SLA_KPI_COMMENTS,
  GET_SLA_KPI_PAYMENTS,
  GET_EXPENSE_EMPLOYEE_NAMES
} from '../queries/backofficeReportQueries'
import { useBackofficeExpensesOverview } from './useBackofficeExpensesOverview'
import {
  DEFAULT_EXPENSES_SLA_POLICY,
  getFirstNumberAtPaths,
  parseAdditionalProperties,
  extractBusinessDaysByLabel,
  toUpperText,
  computeSlaKpiFromFlat,
  type ExpensesSlaPolicy,
  type SlaKpiCounts
} from './backofficeReportUtils'
import {
  getFilterValues,
  buildReportExpenseRequestWhere,
  buildExpensePlanWhereForExport,
  buildAdvancePaymentWhereForExport,
  buildExpenseItemWhereForReport,
  type DateRanges
} from './queryFilterUtils'
import { useEmployeeResolver } from './useEmployeeResolver'
import {
  mapRequestsFromOverview,
  mapPlansFromOverview,
  mapPaymentsFromOverview,
  processExpenseItemsData,
  processExpensePlansData,
  processExpenseRequestsData,
  processApprovalPayoutCycleData,
  mapAdvancePaymentToReport
} from './reportDataMappers'
import {
  mapSortingToOrderBy,
  DEFAULT_EXPENSE_REQUEST_ORDER,
  DEFAULT_EXPENSE_PLAN_ORDER,
  DEFAULT_ADVANCE_PAYMENT_ORDER
} from './reportSortingUtils'
import {
  ReportType,
  type ReportItem,
  type ReportMetadata,
  type UseBackofficeExpenseReportDataReturn,
  type ExportFilterOverrides
} from '../types/reportTypes'
import type { ReportFilters } from '../components/pages/reportFilterUtils'

export { ReportType } from '../types/reportTypes'
export type {
  ReportItem,
  ReportMetadata,
  ExpenseItemReport,
  ExpensePlanReport,
  ExpenseRequestReport,
  AdvancePaymentReport,
  ApprovalPayoutCycleReport,
  UseBackofficeExpenseReportDataReturn
} from '../types/reportTypes'

const EMPTY_STRING_ARRAY: string[] = []

interface FetchResult {
  rows: ReportItem[]
  totalCount: number
}

const resolveOverride = (override: unknown, fallback: unknown): string[] => {
  if (Array.isArray(override)) return override.map(String)
  if (Array.isArray(fallback)) return fallback.map(String)
  return []
}

const extractIds = (items: any[], paths: string[]): string[] =>
  items
    .flatMap((item: any) => paths.map(p => String(p.split('.').reduce((o: any, k: string) => o?.[k], item) || '')))
    .filter(Boolean)

const AGGREGATE_KEY: Record<string, string> = {
  [ReportType.EXPENSE_ITEM]: 'ExpenseItemAggregate',
  [ReportType.EXPENSE_PLAN]: 'ExpensePlanAggregate',
  [ReportType.EXPENSE_REQUEST]: 'ExpenseRequestAggregate',
  [ReportType.ADVANCE_PAYMENT]: 'AdvancePaymentAggregate',
  [ReportType.APPROVAL_PAYOUT_CYCLE]: 'ExpenseRequestAggregate'
}

export const useBackofficeExpenseReportData = (
  { accessToken, userInfo }: BusinessAppContextProps,
  activeFiltersByReportType: Partial<Record<ReportType, ReportFilters>> = {},
  sorting: SortingState = []
): UseBackofficeExpenseReportDataReturn => {
  const { graphqlClient, resolveEmployeeNamesByIds, resolveDisplayName, resolveDepartmentName } =
    useEmployeeResolver(accessToken)

  const [reportData, setReportData] = useState<ReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(ReportType.APPROVAL_PAYOUT_CYCLE)
  const [reportDataType, setReportDataType] = useState<ReportType | null>(ReportType.APPROVAL_PAYOUT_CYCLE)
  const activeFetchTokenRef = useRef(0)
  const reportCacheRef = useRef<Partial<Record<ReportType, FetchResult>>>({})
  const reportQuerySignatureRef = useRef<Partial<Record<ReportType, string>>>({})
  const expensesSlaPolicyRef = useRef<ExpensesSlaPolicy>(DEFAULT_EXPENSES_SLA_POLICY)
  const reportOrderBy = useMemo(() => mapSortingToOrderBy(selectedReportType, sorting), [selectedReportType, sorting])
  const activeFilters = selectedReportType ? (activeFiltersByReportType[selectedReportType] ?? {}) : {}

  const selectedDateFrom = useMemo(() => {
    const raw = (activeFilters as any)?.dateFrom
    return typeof raw === 'string' && raw ? dayjs(raw).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss') : undefined
  }, [(activeFilters as any)?.dateFrom])

  const selectedDateTo = useMemo(() => {
    const raw = (activeFilters as any)?.dateTo
    return typeof raw === 'string' && raw ? dayjs(raw).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss') : undefined
  }, [(activeFilters as any)?.dateTo])

  const fmtStart = (v?: string) => (v ? dayjs(v).startOf('day').format('YYYY-MM-DD[T]HH:mm:ss') : undefined)
  const fmtEnd = (v?: string) => (v ? dayjs(v).endOf('day').format('YYYY-MM-DD[T]HH:mm:ss') : undefined)

  const selectedDates = useMemo(
    () => ({
      dateFrom: selectedDateFrom,
      dateTo: selectedDateTo,
      effectiveDateFrom: fmtStart((activeFilters as any)?.effectiveDateFrom),
      effectiveDateTo: fmtEnd((activeFilters as any)?.effectiveDateTo),
      requestDateFrom: fmtStart((activeFilters as any)?.requestDateFrom),
      requestDateTo: fmtEnd((activeFilters as any)?.requestDateTo),
      planDateFrom: fmtStart((activeFilters as any)?.planDateFrom),
      planDateTo: fmtEnd((activeFilters as any)?.planDateTo)
    }),
    [
      selectedDateFrom,
      selectedDateTo,
      (activeFilters as any)?.effectiveDateFrom,
      (activeFilters as any)?.effectiveDateTo,
      (activeFilters as any)?.requestDateFrom,
      (activeFilters as any)?.requestDateTo,
      (activeFilters as any)?.planDateFrom,
      (activeFilters as any)?.planDateTo
    ]
  )

  const overview = useBackofficeExpensesOverview(
    { accessToken, userInfo },
    {
      currencyRef: undefined,
      searchTerm,
      requests: {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: selectedReportType === ReportType.EXPENSE_REQUEST ? reportOrderBy : DEFAULT_EXPENSE_REQUEST_ORDER
      },
      plans: {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: selectedReportType === ReportType.EXPENSE_PLAN ? reportOrderBy : DEFAULT_EXPENSE_PLAN_ORDER
      },
      payments: {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: selectedReportType === ReportType.ADVANCE_PAYMENT ? reportOrderBy : DEFAULT_ADVANCE_PAYMENT_ORDER
      },
      requestsStatus: getFilterValues(
        activeFiltersByReportType,
        ReportType.EXPENSE_REQUEST,
        selectedReportType,
        'status'
      ),
      requestsEmployeeNames: getFilterValues(
        activeFiltersByReportType,
        ReportType.EXPENSE_REQUEST,
        selectedReportType,
        'employeeName'
      ),
      requestsDepartmentNames: getFilterValues(
        activeFiltersByReportType,
        ReportType.EXPENSE_REQUEST,
        selectedReportType,
        'departmentName'
      ),
      plansStatus: getFilterValues(activeFiltersByReportType, ReportType.EXPENSE_PLAN, selectedReportType, 'status'),
      plansEmployeeNames: getFilterValues(
        activeFiltersByReportType,
        ReportType.EXPENSE_PLAN,
        selectedReportType,
        'employeeName'
      ),
      plansDepartmentNames: getFilterValues(
        activeFiltersByReportType,
        ReportType.EXPENSE_PLAN,
        selectedReportType,
        'departmentName'
      ),
      paymentsStatus: getFilterValues(
        activeFiltersByReportType,
        ReportType.ADVANCE_PAYMENT,
        selectedReportType,
        'status'
      ),
      paymentsEmployeeNames: getFilterValues(
        activeFiltersByReportType,
        ReportType.ADVANCE_PAYMENT,
        selectedReportType,
        'employeeName'
      ),
      paymentsDepartmentNames: getFilterValues(
        activeFiltersByReportType,
        ReportType.ADVANCE_PAYMENT,
        selectedReportType,
        'departmentName'
      ),
      requestsRequestDateRange:
        selectedReportType === ReportType.EXPENSE_REQUEST &&
        (selectedDates.requestDateFrom || selectedDates.requestDateTo)
          ? { from: selectedDates.requestDateFrom, to: selectedDates.requestDateTo }
          : undefined,
      requestsEffectiveDateRange:
        selectedReportType === ReportType.EXPENSE_REQUEST &&
        (selectedDates.effectiveDateFrom || selectedDates.effectiveDateTo)
          ? { from: selectedDates.effectiveDateFrom, to: selectedDates.effectiveDateTo }
          : undefined,
      plansEffectiveDateRange:
        selectedReportType === ReportType.EXPENSE_PLAN &&
        (selectedDates.effectiveDateFrom || selectedDates.effectiveDateTo)
          ? { from: selectedDates.effectiveDateFrom, to: selectedDates.effectiveDateTo }
          : undefined,
      plansPlanDateRange:
        selectedReportType === ReportType.EXPENSE_PLAN && (selectedDates.planDateFrom || selectedDates.planDateTo)
          ? { from: selectedDates.planDateFrom, to: selectedDates.planDateTo }
          : undefined,
      includeRequests: selectedReportType === ReportType.EXPENSE_REQUEST,
      includePlans: selectedReportType === ReportType.EXPENSE_PLAN,
      includePayments: selectedReportType === ReportType.ADVANCE_PAYMENT,
      includeKpis: false
    }
  )

  const handleSelectedReportTypeChange = useCallback((nextType: ReportType) => {
    const cached = reportCacheRef.current[nextType]
    setReportDataType(nextType)
    if (cached) {
      setReportData(cached.rows)
      setTotalCount(cached.totalCount)
    } else {
      setReportData([])
      setTotalCount(0)
    }
    setSelectedReportType(nextType)
  }, [])

  const selectedStatusFilters = useMemo(
    () => (Array.isArray(activeFilters?.status) ? activeFilters.status : EMPTY_STRING_ARRAY),
    [activeFilters?.status]
  )
  const selectedEmployeeFilters = useMemo(
    () => (Array.isArray(activeFilters?.employeeName) ? activeFilters.employeeName : EMPTY_STRING_ARRAY),
    [activeFilters?.employeeName]
  )
  const selectedDepartmentFilters = useMemo(
    () => (Array.isArray(activeFilters?.departmentName) ? activeFilters.departmentName : EMPTY_STRING_ARRAY),
    [activeFilters?.departmentName]
  )

  const passthrough = useCallback((filters: string[]) => filters, [])

  const buildRequestWhere = useCallback(
    (
      search: string,
      statuses: string[] = [],
      employees: string[] = [],
      departments: string[] = [],
      dates: DateRanges = {}
    ) => buildReportExpenseRequestWhere(search, statuses, employees, departments, passthrough, dates),
    [passthrough]
  )

  const applyRows = useCallback((type: ReportType, rows: ReportItem[], count: number) => {
    setReportData(rows)
    setReportDataType(type)
    setTotalCount(count)
    reportCacheRef.current[type] = { rows, totalCount: count }
    setError(null)
  }, [])

  // Overview-based loading for requests, plans, payments
  useEffect(() => {
    if (
      !selectedReportType ||
      selectedReportType === ReportType.EXPENSE_ITEM ||
      selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
    )
      return
    setIsLoading(overview.isLoading)
    if (overview.error) {
      setError(overview.error)
      return
    }
    if (overview.isLoading) return

    let cancelled = false
    const load = async () => {
      const { data } = overview
      const resolvers = { resolveEmployeeNamesByIds, resolveDisplayName, resolveDepartmentName }
      switch (selectedReportType) {
        case ReportType.EXPENSE_REQUEST: {
          const rows = data?.expenseRequests || []
          const nameById = await resolvers.resolveEmployeeNamesByIds(extractIds(rows, ['employeeId', 'createdBy']))
          if (cancelled) return
          applyRows(
            ReportType.EXPENSE_REQUEST,
            mapRequestsFromOverview(rows, nameById, resolvers.resolveDisplayName, resolvers.resolveDepartmentName),
            data?.expenseRequestsTotal || 0
          )
          break
        }
        case ReportType.EXPENSE_PLAN: {
          const rows = data?.expensePlans || []
          const nameById = await resolvers.resolveEmployeeNamesByIds(extractIds(rows, ['employeeId', 'createdBy']))
          if (cancelled) return
          applyRows(
            ReportType.EXPENSE_PLAN,
            mapPlansFromOverview(rows, nameById, resolvers.resolveDisplayName, resolvers.resolveDepartmentName),
            data?.expensePlansTotal || 0
          )
          break
        }
        case ReportType.ADVANCE_PAYMENT: {
          const rows = data?.advancePayments || []
          const nameById = await resolvers.resolveEmployeeNamesByIds(
            extractIds(rows, ['expensePlan.employeeId', 'createdBy', 'expensePlan.createdBy'])
          )
          if (cancelled) return
          applyRows(
            ReportType.ADVANCE_PAYMENT,
            mapPaymentsFromOverview(rows, nameById, resolvers.resolveDisplayName, resolvers.resolveDepartmentName),
            data?.advancePaymentsTotal || 0
          )
          break
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [
    selectedReportType,
    overview.data,
    overview.isLoading,
    overview.error,
    resolveEmployeeNamesByIds,
    resolveDisplayName,
    resolveDepartmentName,
    applyRows
  ])

  const loadSlaPolicy = useCallback(async (): Promise<ExpensesSlaPolicy> => {
    if (!graphqlClient) return expensesSlaPolicyRef.current
    try {
      const result = await graphqlClient.request(GET_EXPENSES_SLA_POLICY, {
        searchTerm: '%expenses-approval-payout-sla%'
      })
      const entry = Array.isArray(result?.ContentEntry) ? result.ContentEntry[0] : null
      if (!entry) return expensesSlaPolicyRef.current
      const props = parseAdditionalProperties(entry.additionalProperties)
      const content = String(entry.content || '')
      const approval =
        getFirstNumberAtPaths(props, [
          'approvalSlaBusinessDays',
          'approvalSla.days',
          'approval.businessDays',
          'thresholds.approvalBusinessDays'
        ]) ?? extractBusinessDaysByLabel(content, 'Approval SLA')
      const payout =
        getFirstNumberAtPaths(props, ['payoutRunWeekday', 'payout.runWeekday', 'thresholds.payoutRunWeekday']) ??
        (toUpperText(content).includes('MONDAY') ? 1 : null)
      const total =
        getFirstNumberAtPaths(props, [
          'totalCycleSlaBusinessDays',
          'totalSlaBusinessDays',
          'totalCycleSla.days',
          'totalCycle.businessDays',
          'thresholds.totalCycleBusinessDays'
        ]) ?? extractBusinessDaysByLabel(content, 'Total Cycle SLA')
      expensesSlaPolicyRef.current = {
        approvalSlaBusinessDays: approval ?? DEFAULT_EXPENSES_SLA_POLICY.approvalSlaBusinessDays,
        payoutRunWeekday:
          payout === null ? DEFAULT_EXPENSES_SLA_POLICY.payoutRunWeekday : Math.max(0, Math.min(6, Math.trunc(payout))),
        totalCycleSlaBusinessDays: total ?? DEFAULT_EXPENSES_SLA_POLICY.totalCycleSlaBusinessDays
      }
      return expensesSlaPolicyRef.current
    } catch {
      return expensesSlaPolicyRef.current
    }
  }, [graphqlClient])

  /**
   * Single fetch function for all report types. Returns rows + totalCount.
   * Used by page-level fetch, export, filter options, and prefetch.
   */
  const fetchReport = useCallback(
    async (
      type: ReportType,
      offset: number,
      limit: number,
      overrides?: ExportFilterOverrides
    ): Promise<FetchResult> => {
      const search = overrides?.searchTerm ?? searchTerm
      const empFilters = resolveOverride(overrides?.employeeFilters, selectedEmployeeFilters)
      const deptFilters = resolveOverride(overrides?.departmentFilters, selectedDepartmentFilters)
      const getCount = (result: any) => result?.[AGGREGATE_KEY[type]]?.aggregate?.count ?? 0

      switch (type) {
        case ReportType.EXPENSE_ITEM: {
          const statuses = resolveOverride(overrides?.statusFilters, selectedStatusFilters)
          const dates = overrides?.dates ?? { dateFrom: selectedDates.dateFrom, dateTo: selectedDates.dateTo }
          const where = buildExpenseItemWhereForReport(search, statuses, empFilters, deptFilters, dates)
          const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BACKOFFICE, {
            limit,
            offset,
            orderBy: reportOrderBy,
            where
          })
          const nameById = await resolveEmployeeNamesByIds(
            extractIds(result?.ExpenseItem || [], ['employeeId', 'createdBy'])
          )
          return {
            rows: processExpenseItemsData(result, nameById, resolveDepartmentName),
            totalCount: getCount(result)
          }
        }
        case ReportType.EXPENSE_PLAN: {
          const dates = overrides?.dates ?? selectedDates
          const where = buildExpensePlanWhereForExport(search, empFilters, deptFilters, dates)
          const result = await graphqlClient.request(GET_EXPENSE_PLANS_BACKOFFICE, {
            where,
            limit,
            offset,
            orderBy: reportOrderBy
          })
          const nameById = await resolveEmployeeNamesByIds(
            extractIds(result?.ExpensePlan || [], ['employeeId', 'createdBy'])
          )
          return {
            rows: processExpensePlansData(result, nameById, resolveDisplayName, resolveDepartmentName),
            totalCount: getCount(result)
          }
        }
        case ReportType.EXPENSE_REQUEST: {
          const statuses = resolveOverride(overrides?.statusFilters, [])
          const dates = overrides?.dates ?? selectedDates
          const where = buildRequestWhere(search, statuses, empFilters, deptFilters, dates)
          const result = await graphqlClient.request(GET_EXPENSE_REQUESTS_BACKOFFICE, {
            where,
            limit,
            offset,
            orderBy: reportOrderBy
          })
          const nameById = await resolveEmployeeNamesByIds(
            extractIds(result?.ExpenseRequest || [], ['employeeId', 'createdBy'])
          )
          return {
            rows: processExpenseRequestsData(result, nameById, resolveDisplayName, resolveDepartmentName),
            totalCount: getCount(result)
          }
        }
        case ReportType.ADVANCE_PAYMENT: {
          const dates = overrides?.dates ?? selectedDates
          const where = buildAdvancePaymentWhereForExport(search, empFilters, deptFilters, dates)
          const result = await graphqlClient.request(GET_ADVANCE_PAYMENTS_REPORT_BACKOFFICE, {
            where,
            limit,
            offset,
            orderBy: reportOrderBy
          })
          const nameById = await resolveEmployeeNamesByIds(
            extractIds(result?.AdvancePayment || [], ['expensePlan.employeeId', 'createdBy', 'expensePlan.createdBy'])
          )
          return {
            rows: (result?.AdvancePayment || []).map((p: any) =>
              mapAdvancePaymentToReport(p, nameById, resolveDisplayName, resolveDepartmentName)
            ),
            totalCount: getCount(result)
          }
        }
        case ReportType.APPROVAL_PAYOUT_CYCLE: {
          const statuses = resolveOverride(overrides?.statusFilters, selectedStatusFilters)
          const dates = overrides?.dates ?? selectedDates
          const where = buildRequestWhere(search, statuses, empFilters, deptFilters, dates)
          const slaPolicyPromise = loadSlaPolicy()
          const result = await graphqlClient.request(GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE, {
            where,
            limit,
            offset,
            orderBy: reportOrderBy
          })
          const [nameById, slaPolicy] = await Promise.all([
            resolveEmployeeNamesByIds(extractIds(result?.ExpenseRequest || [], ['employeeId', 'createdBy'])),
            slaPolicyPromise
          ])
          return {
            rows: processApprovalPayoutCycleData(
              result,
              nameById,
              resolveDisplayName,
              resolveDepartmentName,
              slaPolicy
            ),
            totalCount: getCount(result)
          }
        }
        default:
          return { rows: [], totalCount: 0 } as FetchResult
      }
    },
    [
      graphqlClient,
      searchTerm,
      reportOrderBy,
      selectedStatusFilters,
      selectedEmployeeFilters,
      selectedDepartmentFilters,
      selectedDates,
      buildRequestWhere,
      resolveEmployeeNamesByIds,
      resolveDisplayName,
      resolveDepartmentName,
      loadSlaPolicy
    ]
  )

  const fetchBatched = useCallback(
    async (type: ReportType, overrides?: ExportFilterOverrides): Promise<ReportItem[]> => {
      const batchLimit = 1000
      const maxBatches = 500
      const all: ReportItem[] = []
      let offset = 0
      for (let i = 0; i < maxBatches; i++) {
        const { rows } = await fetchReport(type, offset, batchLimit, overrides)
        if (!Array.isArray(rows)) {
          setError(`Partial export: invalid ${type} batch`)
          break
        }
        all.push(...rows)
        if (rows.length < batchLimit) break
        offset += batchLimit
      }
      return all
    },
    [fetchReport]
  )

  // Page-level fetch for direct-fetch types (EXPENSE_ITEM, APPROVAL_PAYOUT_CYCLE)
  const fetchPageData = useCallback(
    async (type: ReportType, fetchToken: number, querySignature: string) => {
      if (!graphqlClient) return
      const hasCached = Boolean(reportCacheRef.current[type]?.rows?.length)
      try {
        if (!hasCached) setIsLoading(true)
        setError(null)
        const { rows, totalCount: count } = await fetchReport(type, (currentPage - 1) * pageSize, pageSize)
        if (fetchToken !== activeFetchTokenRef.current) return
        applyRows(type, rows, count)
        reportQuerySignatureRef.current[type] = querySignature
      } catch {
        setError(`Failed to load ${type} data`)
      } finally {
        if (!hasCached) setIsLoading(false)
      }
    },
    [graphqlClient, currentPage, pageSize, fetchReport, applyRows]
  )

  // Prefetch removed — the page-level useEffect already fetches expense_item data

  const fetchAllForExport = useCallback(async (): Promise<ReportItem[]> => {
    if (!graphqlClient || !selectedReportType) return []
    try {
      return await fetchBatched(selectedReportType)
    } catch {
      setError('Failed to export report data')
      return []
    }
  }, [graphqlClient, selectedReportType, fetchBatched])

  const [allEmployeeNames, setAllEmployeeNames] = useState<string[]>([])

  useEffect(() => {
    if (!graphqlClient) return
    let cancelled = false
    const load = async () => {
      try {
        const result = await graphqlClient.request(GET_EXPENSE_EMPLOYEE_NAMES, {})
        if (cancelled) return
        const extractNames = (rows: any[]) =>
          rows
            .map((r: any) => {
              const e = r?.employee
              if (!e) return ''
              const full = (e.fullName || '').trim()
              if (full) return full
              return [e.firstName, e.lastName].filter(Boolean).join(' ').trim()
            })
            .filter(Boolean)
        const names = [...extractNames(result?.requestEmployees || []), ...extractNames(result?.planEmployees || [])]
        setAllEmployeeNames(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)))
      } catch {
        /* ignore */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [graphqlClient])

  const [slaKpiCounts, setSlaKpiCounts] = useState<SlaKpiCounts | null>(null)

  useEffect(() => {
    if (!graphqlClient) return
    let cancelled = false
    const run = async () => {
      try {
        const [slaPolicy, commentsResult, paymentsResult] = await Promise.all([
          loadSlaPolicy(),
          graphqlClient.request(GET_SLA_KPI_COMMENTS, {}),
          graphqlClient.request(GET_SLA_KPI_PAYMENTS, {})
        ])
        if (cancelled) return
        const comments = (commentsResult?.ExpenseRequestComment ?? []).map((c: any) => ({
          expenseRequestId: c.expenseRequestId,
          commentDate: c.commentDate,
          comment: c.comment
        }))
        const payments = (paymentsResult?.AdvancePayment ?? []).flatMap((p: any) => {
          const requests = p?.expensePlan?.expenseRequest
          const reqId = Array.isArray(requests) ? requests[0]?.id : requests?.id
          if (!reqId) return []
          return [
            {
              transactionDate: p.transactionDate,
              decisionDate: p.decisionDate,
              createdAt: p.createdAt,
              requestId: reqId
            }
          ]
        })
        setSlaKpiCounts(computeSlaKpiFromFlat(comments, payments, slaPolicy))
      } catch {
        /* SLA KPI fetch failed */
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [graphqlClient, loadSlaPolicy])

  // Auto-fetch on parameter change for direct-fetch types
  const lastFetchSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    if (
      !selectedReportType ||
      (selectedReportType !== ReportType.EXPENSE_ITEM && selectedReportType !== ReportType.APPROVAL_PAYOUT_CYCLE)
    )
      return
    const signature = JSON.stringify({
      selectedReportType,
      currentPage,
      pageSize,
      searchTerm,
      reportOrderBy,
      selectedStatusFilters: selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedStatusFilters : [],
      selectedEmployeeFilters: selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedEmployeeFilters : [],
      selectedDepartmentFilters:
        selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedDepartmentFilters : [],
      selectedDates:
        selectedReportType === ReportType.EXPENSE_ITEM || selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
          ? selectedDates
          : {}
    })
    if (lastFetchSignatureRef.current === signature) return
    if (
      reportCacheRef.current[selectedReportType]?.rows?.length &&
      reportQuerySignatureRef.current[selectedReportType] === signature
    )
      return
    lastFetchSignatureRef.current = signature
    const token = ++activeFetchTokenRef.current
    void fetchPageData(selectedReportType, token, signature)
  }, [
    selectedReportType,
    currentPage,
    pageSize,
    searchTerm,
    reportOrderBy,
    selectedStatusFilters,
    selectedEmployeeFilters,
    selectedDepartmentFilters,
    selectedDates,
    fetchPageData
  ])

  const reportTypes: ReportMetadata[] = [
    {
      id: 'report-1',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.approval_payout_cycle',
        'Approval & Payout Cycle'
      ),
      type: ReportType.APPROVAL_PAYOUT_CYCLE,
      selected: selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
    },
    {
      id: 'report-2',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_item_report',
        'Expense Item Report'
      ),
      type: ReportType.EXPENSE_ITEM,
      selected: selectedReportType === ReportType.EXPENSE_ITEM
    },
    {
      id: 'report-3',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_plan_report',
        'Expense Plan Report'
      ),
      type: ReportType.EXPENSE_PLAN,
      selected: selectedReportType === ReportType.EXPENSE_PLAN
    },
    {
      id: 'report-4',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_request_report',
        'Expense Request Report'
      ),
      type: ReportType.EXPENSE_REQUEST,
      selected: selectedReportType === ReportType.EXPENSE_REQUEST
    },
    {
      id: 'report-5',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:advance_payment_report.search_module',
        'Advance Payment Report'
      ),
      type: ReportType.ADVANCE_PAYMENT,
      selected: selectedReportType === ReportType.ADVANCE_PAYMENT
    }
  ]

  return {
    reportTypes,
    selectedReportType,
    reportDataType,
    setSelectedReportType: handleSelectedReportTypeChange,
    reportData,
    isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    fetchReportData: useCallback(async () => {
      if (
        !selectedReportType ||
        (selectedReportType !== ReportType.EXPENSE_ITEM && selectedReportType !== ReportType.APPROVAL_PAYOUT_CYCLE)
      )
        return
      const token = ++activeFetchTokenRef.current
      const sig = JSON.stringify({ selectedReportType, currentPage, pageSize, searchTerm, reportOrderBy })
      await fetchPageData(selectedReportType, token, sig)
    }, [selectedReportType, currentPage, pageSize, searchTerm, reportOrderBy, fetchPageData]),
    fetchAllForExport,
    allEmployeeNames,
    slaKpiCounts
  }
}
