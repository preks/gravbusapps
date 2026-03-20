/**
 * ⚡ PERFORMANCE OPTIMIZED: Dashboard Statistics Hook
 *
 * Uses Query Manager SQL dataset queries for KPI cards and trends.
 * KPI sections load progressively so slower queries do not block the full dashboard.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { DashboardStats } from '../types'

interface UseDashboardStatsResult {
  stats: DashboardStats
  loading: boolean
  loadingBySection: {
    core: boolean
    trends: boolean
    planActual: boolean
  }
  errorsBySection: {
    core: Error | null
    trends: Error | null
    planActual: Error | null
  }
  error: Error | null
  refetch: () => void
}

const EMPTY_FILTERS: { currency?: string; department?: string; period?: string } = {}
const YEARLY_PERIOD_AND_YTD_QUERY = 'getExpensePeriodAndYtdKpis'
const YEARLY_WORKFLOW_QUERY = 'getExpenseWorkflowKpis'
const YEARLY_PLAN_ACTUAL_QUERY_NO_DEPT = 'getExpensePlanActualKpisNoDept'
const YEARLY_PLAN_ACTUAL_QUERY_BY_DEPT = 'getExpensePlanActualKpisByDept'
const MONTHLY_TRENDS_QUERY = 'getDashboardMonthlyTrends'
const PERIOD_COMPARISON_QUERY = 'getExpenseComparisonKpis'
type YearlyKpiCategory =
  | 'currentYearExpensesComparison'
  | 'previousYearExpensesComparison'
  | 'currentYearExpenses'
  | 'previousYearExpenses'
  | 'transferRequired'
  | 'pendingRequests'
  | 'avgSpendPerTrip'
  | 'advancePaymentsApproved'
  | 'actualExpenses'
  | 'plannedExpenses'
type DatasetKpiRow = {
  category?: string
  value?: number
  count?: number
}
type MonthlyTrendRow = {
  category?: string
  value?: number
  count?: number
  item_count?: number
  date_category?: string
  month_start?: string
  month_end?: string
  month_label?: string
}
type QueryParamValue = string | number | boolean
type YearlyKpiMap = Record<YearlyKpiCategory, { value: number; count: number }>
type KpiDateRanges = {
  currentYear: number
  quarterStart: string
  quarterEnd: string
  previousQuarterStart: string
  previousQuarterEnd: string
  currentMonthStart: string
  currentMonthEnd: string
  previousMonthStart: string
  previousMonthEnd: string
  currentQTD: string
  sameQuarterLastYearStart: string
  sameMonthLastYearStart: string
  previousQTD: string
  sameQuarterLastYearEnd: string
  sameMonthLastYearEnd: string
  startOfYearTs: string
  endOfYearTs: string
  currentYTD: string
  previousYearStart: string
  previousYTD: string
}
type NonYearlyWindow = {
  isQuarterly: boolean
  currentPeriodStart: string
  currentPeriodEnd: string
  previousPeriodStart: string
  previousPeriodEnd: string
  currentComparisonStart: string
  currentComparisonEnd: string
  previousComparisonStart: string
  previousComparisonEnd: string
}

const asNumber = (val: unknown) => (typeof val === 'number' && Number.isFinite(val) ? val : 0)

const toAggregate = (value: number, count: number, sumKey: 'reimbursableAmount' | 'amount' | 'totalAmount') => ({
  aggregate: {
    count,
    sum: {
      [sumKey]: value
    }
  }
})

const toYearlyCategoryMap = (rows: DatasetKpiRow[]): YearlyKpiMap => {
  const initial: YearlyKpiMap = {
    currentYearExpensesComparison: { value: 0, count: 0 },
    previousYearExpensesComparison: { value: 0, count: 0 },
    currentYearExpenses: { value: 0, count: 0 },
    previousYearExpenses: { value: 0, count: 0 },
    transferRequired: { value: 0, count: 0 },
    pendingRequests: { value: 0, count: 0 },
    avgSpendPerTrip: { value: 0, count: 0 },
    advancePaymentsApproved: { value: 0, count: 0 },
    actualExpenses: { value: 0, count: 0 },
    plannedExpenses: { value: 0, count: 0 }
  }
  const isYearlyKpiCategory = (value: string): value is YearlyKpiCategory => value in initial
  const normalizeYearlyCategory = (category?: string): YearlyKpiCategory | undefined => {
    if (!category) return undefined
    const categoryMap: Partial<Record<string, YearlyKpiCategory>> = {
      currentPeriodExpensesComparison: 'currentYearExpensesComparison',
      previousPeriodExpensesComparison: 'previousYearExpensesComparison',
      currentYtdExpenses: 'currentYearExpenses',
      previousYtdExpenses: 'previousYearExpenses'
    }
    const normalized = categoryMap[category] ?? category
    return isYearlyKpiCategory(normalized) ? normalized : undefined
  }

  for (const row of rows) {
    const key = normalizeYearlyCategory(row?.category)
    if (key && key in initial) {
      initial[key] = {
        value: asNumber(row?.value),
        count: asNumber(row?.count)
      }
    }
  }
  return initial
}

const mapTrendsByMonth = (rows: MonthlyTrendRow[]): Map<number, MonthlyTrendRow> => {
  const monthlyTrendsByMonth = new Map<number, MonthlyTrendRow>()
  for (const row of rows) {
    const monthStart = row?.month_start ?? row?.date_category
    if (typeof monthStart === 'string' && monthStart.length >= 7) {
      const parsedMonth = Number(monthStart.slice(5, 7))
      if (Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
        monthlyTrendsByMonth.set(parsedMonth, row)
        continue
      }
    }
    const category = row?.category ?? ''
    const match = /^m(\d{1,2})$/.exec(category)
    if (match) {
      const parsedMonth = Number(match[1])
      if (Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
        monthlyTrendsByMonth.set(parsedMonth, row)
      }
    }
  }
  return monthlyTrendsByMonth
}

type KpiMetric = { value: number; count: number }
type NonYearlyKpiMetrics = {
  currentPeriod: KpiMetric
  previousPeriod: KpiMetric
  currentYtd: KpiMetric
  previousYtd: KpiMetric
  transferRequired: KpiMetric
  pendingRequests: KpiMetric
  avgSpendPerTrip: KpiMetric
  advancePaymentsApproved: KpiMetric
  actualExpenses: KpiMetric
  plannedExpenses: KpiMetric
  comparisonCurrent: KpiMetric
  comparisonPrevious: KpiMetric
}

const getMetricFromRows = (rows: DatasetKpiRow[], category: string): KpiMetric => {
  const row = rows.find(item => item?.category === category)
  return {
    value: asNumber(row?.value),
    count: asNumber(row?.count)
  }
}

const buildNonYearlyKpiMetrics = (rows: DatasetKpiRow[]): NonYearlyKpiMetrics => ({
  currentPeriod: getMetricFromRows(rows, 'currentPeriodExpensesComparison'),
  previousPeriod: getMetricFromRows(rows, 'previousPeriodExpensesComparison'),
  currentYtd: getMetricFromRows(rows, 'currentYtdExpenses'),
  previousYtd: getMetricFromRows(rows, 'previousYtdExpenses'),
  transferRequired: getMetricFromRows(rows, 'transferRequired'),
  pendingRequests: getMetricFromRows(rows, 'pendingRequests'),
  avgSpendPerTrip: getMetricFromRows(rows, 'avgSpendPerTrip'),
  advancePaymentsApproved: getMetricFromRows(rows, 'advancePaymentsApproved'),
  actualExpenses: getMetricFromRows(rows, 'actualExpenses'),
  plannedExpenses: getMetricFromRows(rows, 'plannedExpenses'),
  comparisonCurrent: getMetricFromRows(rows, 'currentComparisonExpenses'),
  comparisonPrevious: getMetricFromRows(rows, 'previousComparisonExpenses')
})

const buildBaseNonYearlyKpiResponse = (metrics: NonYearlyKpiMetrics) => ({
  currentYearExpenses: toAggregate(metrics.currentYtd.value, metrics.currentYtd.count, 'reimbursableAmount'),
  previousYearExpenses: toAggregate(metrics.previousYtd.value, metrics.previousYtd.count, 'reimbursableAmount'),
  transferRequired: toAggregate(metrics.transferRequired.value, metrics.transferRequired.count, 'reimbursableAmount'),
  pendingRequests: { aggregate: { count: metrics.pendingRequests.count } },
  avgSpendPerTrip: {
    aggregate: {
      avg: { reimbursableAmount: metrics.avgSpendPerTrip.value },
      count: metrics.avgSpendPerTrip.count
    }
  },
  advancePaymentsApproved: toAggregate(
    metrics.advancePaymentsApproved.value,
    metrics.advancePaymentsApproved.count,
    'amount'
  ),
  actualExpenses: toAggregate(metrics.actualExpenses.value, metrics.actualExpenses.count, 'reimbursableAmount'),
  plannedExpenses: toAggregate(metrics.plannedExpenses.value, metrics.plannedExpenses.count, 'totalAmount')
})

const buildQuarterlyKpiResponse = (metrics: NonYearlyKpiMetrics) => ({
  ...buildBaseNonYearlyKpiResponse(metrics),
  currentQTDExpenses: toAggregate(
    metrics.comparisonCurrent.value,
    metrics.comparisonCurrent.count,
    'reimbursableAmount'
  ),
  previousQTDExpenses: toAggregate(
    metrics.comparisonPrevious.value,
    metrics.comparisonPrevious.count,
    'reimbursableAmount'
  ),
  currentQuarterExpenses: toAggregate(metrics.currentPeriod.value, metrics.currentPeriod.count, 'reimbursableAmount'),
  previousQuarterExpenses: toAggregate(metrics.previousPeriod.value, metrics.previousPeriod.count, 'reimbursableAmount')
})

const buildMonthlyKpiResponse = (metrics: NonYearlyKpiMetrics) => ({
  ...buildBaseNonYearlyKpiResponse(metrics),
  currentMonthExpenses: toAggregate(metrics.currentPeriod.value, metrics.currentPeriod.count, 'reimbursableAmount'),
  previousMonthExpenses: toAggregate(metrics.previousPeriod.value, metrics.previousPeriod.count, 'reimbursableAmount'),
  sameMonthLastYearExpenses: toAggregate(
    metrics.comparisonPrevious.value,
    metrics.comparisonPrevious.count,
    'reimbursableAmount'
  )
})

const getNonYearlyWindow = (period: string, dateRanges: KpiDateRanges): NonYearlyWindow => {
  if (period === 'quarterly') {
    return {
      isQuarterly: true,
      currentPeriodStart: dateRanges.quarterStart,
      currentPeriodEnd: dateRanges.quarterEnd,
      previousPeriodStart: dateRanges.previousQuarterStart,
      previousPeriodEnd: dateRanges.previousQuarterEnd,
      currentComparisonStart: dateRanges.quarterStart,
      currentComparisonEnd: dateRanges.currentQTD,
      previousComparisonStart: dateRanges.sameQuarterLastYearStart,
      previousComparisonEnd: dateRanges.previousQTD
    }
  }

  return {
    isQuarterly: false,
    currentPeriodStart: dateRanges.currentMonthStart,
    currentPeriodEnd: dateRanges.currentMonthEnd,
    previousPeriodStart: dateRanges.previousMonthStart,
    previousPeriodEnd: dateRanges.previousMonthEnd,
    currentComparisonStart: dateRanges.currentMonthStart,
    currentComparisonEnd: dateRanges.currentMonthEnd,
    previousComparisonStart: dateRanges.sameMonthLastYearStart,
    previousComparisonEnd: dateRanges.sameMonthLastYearEnd
  }
}

const buildPlanActualParams = (
  selectedCurrency: string,
  currentPeriodStart: string,
  currentPeriodEnd: string,
  selectedDepartment: string | null
): Record<string, QueryParamValue> => ({
  selectedCurrency,
  currentPeriodStart,
  currentPeriodEnd,
  ...(selectedDepartment ? { selectedDepartment } : {})
})

export const useDashboardStats = ({
  accessToken,
  filters = EMPTY_FILTERS,
  isActive = true
}: Pick<BusinessAppContextProps, 'accessToken'> & {
  filters?: {
    currency?: string
    department?: string
    period?: string
  }
  isActive?: boolean
}): UseDashboardStatsResult => {
  const [stats, setStats] = useState<DashboardStats>({
    ytdStats: {
      totalAmount: 0,
      count: 0,
      previousTotalAmount: 0,
      previousCount: 0
    },
    actualVsPlanned: {
      actualExpenses: { totalAmount: 0, count: 0 },
      plannedExpenses: { totalAmount: 0, count: 0 }
    },
    monthlyTrends: Array.from({ length: 12 }).map((_, i) => ({
      month: i + 1,
      monthName: new Date(0, i).toLocaleString(getCurrentActiveUserLocale(), { month: 'short' }),
      totalAmount: 0,
      count: 0
    })),
    monthlySpendComparison: {
      currentMonthTotal: 0,
      previousMonthTotal: 0,
      currentMonthCount: 0,
      previousMonthCount: 0,
      percentChange: null, // null indicates undefined ratio when previous period is 0
      isIncrease: false
    },
    transferRequired: 0,
    pendingRequestsCount: 0,
    avgSpendPerTrip: 0,
    travelExpensesCount: 0,
    advancePaymentsApproved: { count: 0, totalAmount: 0 },
    totalCompanySpend: {
      currentPeriodTotal: 0,
      previousPeriodTotal: 0,
      currentPeriodCount: 0,
      previousPeriodCount: 0,
      percentChange: null, // null indicates undefined ratio when previous period is 0
      isIncrease: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [loadingBySection, setLoadingBySection] = useState({
    core: true,
    trends: true,
    planActual: false
  })
  const [errorsBySection, setErrorsBySection] = useState<{
    core: Error | null
    trends: Error | null
    planActual: Error | null
  }>({
    core: null,
    trends: null,
    planActual: null
  })
  const [error, setError] = useState<Error | null>(null)

  // Request deduplication using refs
  const lastRequestKey = useRef<string>('')
  const isLoadingRef = useRef<boolean>(false)

  // Use empty string fallback to match manager-expenses pattern (useGetApprovals.ts L62)
  // Dashboard is the default tab, so it loads before accessToken might be ready
  // Guard in fetchEssentialStats prevents requests when accessToken is empty
  const datasetClient = useQueryExecutionClient(accessToken || '', Services.EMPLOYEE_EXPENSE)

  const calculateDateRanges = useCallback(() => {
    const now = new Date()
    const Y = now.getFullYear()
    const M = now.getMonth()
    const D = now.getDate()
    const h = now.getHours()
    const m = now.getMinutes()
    const s = now.getSeconds()
    const prevY = Y - 1

    const ts = (year: number, month: number, day: number, hh = 0, mm = 0, ss = 0) => {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hh)}:${pad(mm)}:${pad(ss)}`
    }
    const lastDay = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

    const startOfYearTs = ts(Y, 0, 1)
    const endOfYearTs = ts(Y, 11, 31, 23, 59, 59)
    const currentYTD = ts(Y, M, D, h, m, s)
    const previousYearStart = ts(prevY, 0, 1)
    const previousYTD = ts(prevY, M, D, h, m, s)

    const currentMonthStart = ts(Y, M, 1)
    const currentMonthEnd = ts(Y, M + 1, 1)
    const prevM = M - 1 < 0 ? 11 : M - 1
    const prevMYear = M - 1 < 0 ? Y - 1 : Y
    const previousMonthStart = ts(prevMYear, prevM, 1)
    const previousMonthEnd = ts(prevMYear, prevM, lastDay(prevMYear, prevM), 23, 59, 59)

    const quarter = Math.floor(M / 3)
    const qStart = quarter * 3
    const qEnd = qStart + 2
    const quarterStart = ts(Y, qStart, 1)
    const quarterEnd = ts(Y, qEnd, lastDay(Y, qEnd), 23, 59, 59)

    let prevQ = quarter - 1
    let prevQYear = Y
    if (prevQ < 0) {
      prevQ = 3
      prevQYear = Y - 1
    }
    const pqStart = prevQ * 3
    const pqEnd = pqStart + 2
    const previousQuarterStart = ts(prevQYear, pqStart, 1)
    const previousQuarterEnd = ts(prevQYear, pqEnd, lastDay(prevQYear, pqEnd), 23, 59, 59)

    const monthInQuarter = M - qStart
    const sameQuarterLastYearStart = ts(prevY, qStart, 1)
    const sameQuarterLastYearEnd = ts(prevY, qEnd, lastDay(prevY, qEnd), 23, 59, 59)
    const previousQTD = ts(prevY, qStart + monthInQuarter, D, h, m, s)

    const sameMonthLastYearStart = ts(prevY, M, 1)
    const sameMonthLastYearEnd = ts(prevY, M + 1, 1)

    return {
      currentYear: Y,
      startOfYearTs,
      endOfYearTs,
      currentYTD,
      previousYearStart,
      previousYTD,
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd,
      sameMonthLastYearStart,
      sameMonthLastYearEnd,
      quarterStart,
      quarterEnd,
      previousQuarterStart,
      previousQuarterEnd,
      currentQTD: currentYTD,
      sameQuarterLastYearStart,
      sameQuarterLastYearEnd,
      previousQTD
    }
  }, [])

  const executeYearlyKpiQuery = useCallback(
    async (
      selectedCurrency: string,
      selectedDepartment: string | null,
      dateRanges: ReturnType<typeof calculateDateRanges>,
      includePlanActual: boolean
    ) => {
      const hasDepartment = !!selectedDepartment
      const periodAndYtdParams: Record<string, QueryParamValue> = {
        selectedDepartment: selectedDepartment ?? 'null',
        selectedCurrency,
        currentPeriodStart: dateRanges.startOfYearTs,
        currentPeriodEnd: dateRanges.endOfYearTs,
        previousPeriodStart: dateRanges.previousYearStart,
        previousPeriodEnd: `${dateRanges.currentYear - 1}-12-31T23:59:59`,
        currentYtdStart: dateRanges.startOfYearTs,
        currentYtdEnd: dateRanges.currentYTD,
        previousYtdStart: dateRanges.previousYearStart,
        previousYtdEnd: dateRanges.previousYTD
      }
      const workflowParams: Record<string, QueryParamValue> = {
        selectedDepartment: selectedDepartment ?? 'null',
        selectedCurrency,
        currentPeriodStart: dateRanges.startOfYearTs,
        currentPeriodEnd: dateRanges.endOfYearTs
      }
      const planActualQueryName = hasDepartment ? YEARLY_PLAN_ACTUAL_QUERY_BY_DEPT : YEARLY_PLAN_ACTUAL_QUERY_NO_DEPT
      const planActualParams: Record<string, QueryParamValue> = {
        selectedCurrency,
        currentPeriodStart: dateRanges.startOfYearTs,
        currentPeriodEnd: dateRanges.endOfYearTs
      }
      if (hasDepartment && selectedDepartment) {
        planActualParams.selectedDepartment = selectedDepartment
      }

      const [periodAndYtdResponse, workflowResponse, planActualResponse] = await Promise.all([
        datasetClient.executeQuery(YEARLY_PERIOD_AND_YTD_QUERY, QueryType.DATASET, periodAndYtdParams),
        datasetClient.executeQuery(YEARLY_WORKFLOW_QUERY, QueryType.DATASET, workflowParams),
        includePlanActual ? datasetClient.executeQuery(planActualQueryName, QueryType.DATASET, planActualParams) : null
      ])
      const rows = [
        ...(Array.isArray(periodAndYtdResponse?.data) ? periodAndYtdResponse.data : []),
        ...(Array.isArray(workflowResponse?.data) ? workflowResponse.data : []),
        ...(Array.isArray(planActualResponse?.data) ? planActualResponse.data : [])
      ] as DatasetKpiRow[]
      const yearlyMap = toYearlyCategoryMap(rows)

      return {
        currentYearExpensesComparison: toAggregate(
          yearlyMap.currentYearExpensesComparison.value,
          yearlyMap.currentYearExpensesComparison.count,
          'reimbursableAmount'
        ),
        previousYearExpensesComparison: toAggregate(
          yearlyMap.previousYearExpensesComparison.value,
          yearlyMap.previousYearExpensesComparison.count,
          'reimbursableAmount'
        ),
        currentYearExpenses: toAggregate(
          yearlyMap.currentYearExpenses.value,
          yearlyMap.currentYearExpenses.count,
          'reimbursableAmount'
        ),
        previousYearExpenses: toAggregate(
          yearlyMap.previousYearExpenses.value,
          yearlyMap.previousYearExpenses.count,
          'reimbursableAmount'
        ),
        transferRequired: toAggregate(
          yearlyMap.transferRequired.value,
          yearlyMap.transferRequired.count,
          'reimbursableAmount'
        ),
        pendingRequests: {
          aggregate: {
            count: yearlyMap.pendingRequests.count
          }
        },
        avgSpendPerTrip: {
          aggregate: {
            avg: {
              reimbursableAmount: yearlyMap.avgSpendPerTrip.value
            },
            count: yearlyMap.avgSpendPerTrip.count
          }
        },
        advancePaymentsApproved: toAggregate(
          yearlyMap.advancePaymentsApproved.value,
          yearlyMap.advancePaymentsApproved.count,
          'amount'
        ),
        actualExpenses: toAggregate(
          yearlyMap.actualExpenses.value,
          yearlyMap.actualExpenses.count,
          'reimbursableAmount'
        ),
        plannedExpenses: toAggregate(yearlyMap.plannedExpenses.value, yearlyMap.plannedExpenses.count, 'totalAmount')
      }
    },
    [datasetClient, calculateDateRanges]
  )

  const executeKpiQuery = useCallback(
    async (
      period: string,
      selectedCurrency: string,
      selectedDepartment: string | null,
      dateRanges: ReturnType<typeof calculateDateRanges>,
      includePlanActual = true
    ) => {
      if (period === 'yearly') {
        return executeYearlyKpiQuery(selectedCurrency, selectedDepartment, dateRanges, includePlanActual)
      }

      const hasDepartment = !!selectedDepartment
      const window = getNonYearlyWindow(period, dateRanges)

      const periodAndYtdParams: Record<string, QueryParamValue> = {
        selectedDepartment: selectedDepartment ?? 'null',
        selectedCurrency,
        currentPeriodStart: window.currentPeriodStart,
        currentPeriodEnd: window.currentPeriodEnd,
        previousPeriodStart: window.previousPeriodStart,
        previousPeriodEnd: window.previousPeriodEnd,
        currentYtdStart: dateRanges.startOfYearTs,
        currentYtdEnd: dateRanges.currentYTD,
        previousYtdStart: dateRanges.previousYearStart,
        previousYtdEnd: dateRanges.previousYTD
      }
      const workflowParams: Record<string, QueryParamValue> = {
        selectedDepartment: selectedDepartment ?? 'null',
        selectedCurrency,
        currentPeriodStart: window.currentPeriodStart,
        currentPeriodEnd: window.currentPeriodEnd
      }
      const planActualQueryName = hasDepartment ? YEARLY_PLAN_ACTUAL_QUERY_BY_DEPT : YEARLY_PLAN_ACTUAL_QUERY_NO_DEPT
      const planActualParams = buildPlanActualParams(
        selectedCurrency,
        window.currentPeriodStart,
        window.currentPeriodEnd,
        hasDepartment ? selectedDepartment : null
      )
      const comparisonParams: Record<string, QueryParamValue> = {
        selectedDepartment: selectedDepartment ?? 'null',
        selectedCurrency,
        currentComparisonStart: window.currentComparisonStart,
        currentComparisonEnd: window.currentComparisonEnd,
        previousComparisonStart: window.previousComparisonStart,
        previousComparisonEnd: window.previousComparisonEnd
      }

      const [periodAndYtdResponse, workflowResponse, planActualResponse, comparisonResponse] = await Promise.all([
        datasetClient.executeQuery(YEARLY_PERIOD_AND_YTD_QUERY, QueryType.DATASET, periodAndYtdParams),
        datasetClient.executeQuery(YEARLY_WORKFLOW_QUERY, QueryType.DATASET, workflowParams),
        includePlanActual ? datasetClient.executeQuery(planActualQueryName, QueryType.DATASET, planActualParams) : null,
        datasetClient.executeQuery(PERIOD_COMPARISON_QUERY, QueryType.DATASET, comparisonParams)
      ])

      const rows = [
        ...(Array.isArray(periodAndYtdResponse?.data) ? periodAndYtdResponse.data : []),
        ...(Array.isArray(workflowResponse?.data) ? workflowResponse.data : []),
        ...(Array.isArray(planActualResponse?.data) ? planActualResponse.data : []),
        ...(Array.isArray(comparisonResponse?.data) ? comparisonResponse.data : [])
      ] as DatasetKpiRow[]

      const metrics = buildNonYearlyKpiMetrics(rows)
      return window.isQuarterly ? buildQuarterlyKpiResponse(metrics) : buildMonthlyKpiResponse(metrics)
    },
    [datasetClient, executeYearlyKpiQuery]
  )

  const executeYearlyPlanActualQuery = useCallback(
    async (
      selectedCurrency: string,
      selectedDepartment: string | null,
      dateRanges: ReturnType<typeof calculateDateRanges>
    ) => {
      const hasDepartment = !!selectedDepartment
      const planActualQueryName = hasDepartment ? YEARLY_PLAN_ACTUAL_QUERY_BY_DEPT : YEARLY_PLAN_ACTUAL_QUERY_NO_DEPT
      const planActualParams: Record<string, QueryParamValue> = {
        selectedCurrency,
        currentPeriodStart: dateRanges.startOfYearTs,
        currentPeriodEnd: dateRanges.endOfYearTs
      }
      if (hasDepartment && selectedDepartment) {
        planActualParams.selectedDepartment = selectedDepartment
      }

      const response = await datasetClient.executeQuery(planActualQueryName, QueryType.DATASET, planActualParams)
      const asNumber = (val: unknown) => (typeof val === 'number' && Number.isFinite(val) ? val : 0)
      const rows = (Array.isArray(response?.data) ? response.data : []) as DatasetKpiRow[]
      const getRow = (category: YearlyKpiCategory) => rows.find(row => row?.category === category)

      return {
        advancePaymentsApproved: {
          value: asNumber(getRow('advancePaymentsApproved')?.value),
          count: asNumber(getRow('advancePaymentsApproved')?.count)
        },
        actualExpenses: {
          value: asNumber(getRow('actualExpenses')?.value),
          count: asNumber(getRow('actualExpenses')?.count)
        },
        plannedExpenses: {
          value: asNumber(getRow('plannedExpenses')?.value),
          count: asNumber(getRow('plannedExpenses')?.count)
        }
      }
    },
    [datasetClient]
  )

  const executeTrendsQuery = useCallback(
    async (selectedCurrency: string, selectedDepartment: string | null, currentYear: number) => {
      const variables: Record<string, string | number | boolean> = {
        selectedDepartment: selectedDepartment ?? 'null',
        selectedCurrency,
        rangeStart: `${currentYear}-01-01T00:00:00`,
        rangeEnd: `${currentYear + 1}-01-01T00:00:00`
      }
      const result = await datasetClient.executeQuery(MONTHLY_TRENDS_QUERY, QueryType.DATASET, variables)
      return result
    },
    [datasetClient]
  )

  const patchYearlyPlanActualInBackground = useCallback(
    (
      requestKeySnapshot: string,
      selectedCurrency: string,
      selectedDepartment: string | null,
      dateRanges: ReturnType<typeof calculateDateRanges>
    ) => {
      const isStaleRequest = () => lastRequestKey.current !== requestKeySnapshot
      void executeYearlyPlanActualQuery(selectedCurrency, selectedDepartment, dateRanges)
        .then(planActual => {
          if (isStaleRequest()) {
            return
          }
          setStats(prev => ({
            ...prev,
            advancePaymentsApproved: {
              count: planActual.advancePaymentsApproved.count,
              totalAmount: planActual.advancePaymentsApproved.value
            },
            actualVsPlanned: {
              actualExpenses: {
                totalAmount: planActual.actualExpenses.value,
                count: planActual.actualExpenses.count
              },
              plannedExpenses: {
                totalAmount: planActual.plannedExpenses.value,
                count: planActual.plannedExpenses.count
              }
            }
          }))
        })
        .catch(() => {
          if (isStaleRequest()) {
            return
          }
          setErrorsBySection(prev => ({
            ...prev,
            planActual: new Error('Failed to load actual vs planned metrics')
          }))
        })
        .finally(() => {
          if (isStaleRequest()) {
            return
          }
          setLoadingBySection(prev => ({ ...prev, planActual: false }))
        })
    },
    [executeYearlyPlanActualQuery, calculateDateRanges]
  )

  const calculatePercentChange = useCallback((currentValue: number, previousValue: number) => {
    if (previousValue > 0) {
      return {
        percentChange: ((currentValue - previousValue) / previousValue) * 100,
        isIncrease: currentValue > previousValue
      }
    }
    return {
      percentChange: null as any,
      isIncrease: false
    }
  }, [])

  const fetchEssentialStats = useCallback(async () => {
    const hasValidAccessToken = Boolean(accessToken && typeof accessToken === 'string' && accessToken.trim() !== '')
    if (!hasValidAccessToken) {
      setLoading(false)
      return
    }

    // Build stable key for deduplication
    const requestKey = [filters.currency || '', filters.department || '', filters.period || ''].join('|')

    // ⚡ DEDUPLICATION: Only block if same request is already loading
    // This allows refetch() and filter changes to proceed
    if (isLoadingRef.current && requestKey === lastRequestKey.current) {
      return
    }

    lastRequestKey.current = requestKey
    isLoadingRef.current = true

    setLoading(true)
    setError(null)
    setErrorsBySection({
      core: null,
      trends: null,
      planActual: null
    })

    try {
      // Calculate all date ranges using extracted helper
      const dateRanges = calculateDateRanges()

      const selectedCurrency = filters.currency && filters.currency.trim() !== '' ? filters.currency : 'Currency:v1:EUR'
      const selectedDepartment = filters.department?.trim() && filters.department !== 'all' ? filters.department : null

      const activePeriod = filters.period || 'yearly'
      setLoadingBySection({
        core: true,
        trends: true,
        planActual: true
      })

      const requestKeySnapshot = requestKey
      const safeNum = (val: any): number => val ?? 0
      let remainingInitialTasks = 2
      const completeInitialTask = () => {
        remainingInitialTasks -= 1
        if (remainingInitialTasks <= 0) {
          setLoading(false)
          isLoadingRef.current = false
        }
      }
      const runCoreTask = async () => {
        try {
          const combinedResponse: any = await executeKpiQuery(
            activePeriod,
            selectedCurrency,
            selectedDepartment,
            dateRanges,
            activePeriod !== 'yearly'
          )
          if (lastRequestKey.current !== requestKeySnapshot) {
            return
          }

          const getPeriodAgg = (current: boolean) => {
            if (activePeriod === 'yearly') {
              return current ? combinedResponse?.currentYearExpenses : combinedResponse?.previousYearExpenses
            }
            if (activePeriod === 'quarterly') {
              return current ? combinedResponse?.currentQTDExpenses : combinedResponse?.previousQTDExpenses
            }
            return current ? combinedResponse?.currentMonthExpenses : combinedResponse?.sameMonthLastYearExpenses
          }
          const getComparisonAgg = (current: boolean) => {
            if (activePeriod === 'yearly') {
              return current
                ? combinedResponse?.currentYearExpensesComparison
                : combinedResponse?.previousYearExpensesComparison
            }
            if (activePeriod === 'quarterly') {
              return current ? combinedResponse?.currentQuarterExpenses : combinedResponse?.previousQuarterExpenses
            }
            return current ? combinedResponse?.currentMonthExpenses : combinedResponse?.previousMonthExpenses
          }

          const currentPeriodAgg = getPeriodAgg(true)
          const previousPeriodAgg = getPeriodAgg(false)
          const currentComparisonAgg = getComparisonAgg(true)
          const previousComparisonAgg = getComparisonAgg(false)
          const monthlyComparison = {
            currentMonthTotal: safeNum(currentComparisonAgg?.aggregate?.sum?.reimbursableAmount),
            previousMonthTotal: safeNum(previousComparisonAgg?.aggregate?.sum?.reimbursableAmount),
            currentMonthCount: safeNum(currentComparisonAgg?.aggregate?.count),
            previousMonthCount: safeNum(previousComparisonAgg?.aggregate?.count),
            ...calculatePercentChange(
              safeNum(currentComparisonAgg?.aggregate?.sum?.reimbursableAmount),
              safeNum(previousComparisonAgg?.aggregate?.sum?.reimbursableAmount)
            )
          }
          const totalCompanySpend = {
            currentPeriodTotal: safeNum(currentPeriodAgg?.aggregate?.sum?.reimbursableAmount),
            previousPeriodTotal: safeNum(previousPeriodAgg?.aggregate?.sum?.reimbursableAmount),
            currentPeriodCount: safeNum(currentPeriodAgg?.aggregate?.count),
            previousPeriodCount: safeNum(previousPeriodAgg?.aggregate?.count),
            ...calculatePercentChange(
              safeNum(currentPeriodAgg?.aggregate?.sum?.reimbursableAmount),
              safeNum(previousPeriodAgg?.aggregate?.sum?.reimbursableAmount)
            )
          }

          setStats(prev => ({
            ...prev,
            ytdStats: {
              totalAmount: safeNum(combinedResponse?.currentYearExpenses?.aggregate?.sum?.reimbursableAmount),
              count: safeNum(combinedResponse?.currentYearExpenses?.aggregate?.count),
              previousTotalAmount: safeNum(combinedResponse?.previousYearExpenses?.aggregate?.sum?.reimbursableAmount),
              previousCount: safeNum(combinedResponse?.previousYearExpenses?.aggregate?.count)
            },
            monthlySpendComparison: monthlyComparison,
            transferRequired: safeNum(combinedResponse?.transferRequired?.aggregate?.sum?.reimbursableAmount),
            pendingRequestsCount: safeNum(combinedResponse?.pendingRequests?.aggregate?.count),
            avgSpendPerTrip: safeNum(combinedResponse?.avgSpendPerTrip?.aggregate?.avg?.reimbursableAmount),
            totalCompanySpend,
            advancePaymentsApproved:
              activePeriod === 'yearly'
                ? prev.advancePaymentsApproved
                : {
                    count: safeNum(combinedResponse?.advancePaymentsApproved?.aggregate?.count),
                    totalAmount: safeNum(combinedResponse?.advancePaymentsApproved?.aggregate?.sum?.amount)
                  },
            actualVsPlanned:
              activePeriod === 'yearly'
                ? prev.actualVsPlanned
                : {
                    actualExpenses: {
                      totalAmount: safeNum(combinedResponse?.actualExpenses?.aggregate?.sum?.reimbursableAmount),
                      count: safeNum(combinedResponse?.actualExpenses?.aggregate?.count)
                    },
                    plannedExpenses: {
                      totalAmount: safeNum(combinedResponse?.plannedExpenses?.aggregate?.sum?.totalAmount),
                      count: safeNum(combinedResponse?.plannedExpenses?.aggregate?.count)
                    }
                  }
          }))
          setLoadingBySection(prev => ({
            ...prev,
            core: false,
            planActual: activePeriod === 'yearly' ? prev.planActual : false
          }))
          if (activePeriod === 'yearly') {
            patchYearlyPlanActualInBackground(requestKeySnapshot, selectedCurrency, selectedDepartment, dateRanges)
          }
        } catch (err) {
          if (lastRequestKey.current !== requestKeySnapshot) {
            return
          }
          const sectionError = err instanceof Error ? err : new Error('Failed to fetch dashboard stats')
          setError(sectionError)
          setErrorsBySection(prev => ({ ...prev, core: sectionError }))
          setLoadingBySection(prev => ({ ...prev, core: false, planActual: false }))
        } finally {
          if (lastRequestKey.current === requestKeySnapshot) {
            completeInitialTask()
          }
        }
      }

      const runTrendsTask = async () => {
        try {
          const trendsResponse = await executeTrendsQuery(selectedCurrency, selectedDepartment, dateRanges.currentYear)
          if (lastRequestKey.current !== requestKeySnapshot) {
            return
          }

          const trendRows = (
            Array.isArray((trendsResponse as any)?.data) ? (trendsResponse as any).data : []
          ) as MonthlyTrendRow[]
          const monthlyTrendsByMonth = mapTrendsByMonth(trendRows)
          const monthlyTrends = Array.from({ length: 12 }, (_, index) => {
            const month = index + 1
            const row = monthlyTrendsByMonth.get(month)
            const fallbackMonthName = new Date(dateRanges.currentYear, index).toLocaleString('default', {
              month: 'short'
            })
            return {
              month,
              monthName:
                typeof row?.month_label === 'string' && row.month_label.trim() !== ''
                  ? row.month_label
                  : fallbackMonthName,
              totalAmount: safeNum(row?.value),
              count: safeNum(row?.item_count ?? row?.count)
            }
          })
          setStats(prev => ({ ...prev, monthlyTrends }))
          setLoadingBySection(prev => ({ ...prev, trends: false }))
        } catch (err) {
          if (lastRequestKey.current !== requestKeySnapshot) {
            return
          }
          const sectionError = err instanceof Error ? err : new Error('Failed to fetch dashboard trends')
          setErrorsBySection(prev => ({ ...prev, trends: sectionError }))
          setLoadingBySection(prev => ({ ...prev, trends: false }))
        } finally {
          if (lastRequestKey.current === requestKeySnapshot) {
            completeInitialTask()
          }
        }
      }

      void runCoreTask()
      void runTrendsTask()
      return
    } catch (err) {
      const sectionError = err instanceof Error ? err : new Error('Failed to fetch dashboard stats')
      setError(sectionError)
      setErrorsBySection(prev => ({ ...prev, core: sectionError }))
      setLoadingBySection(prev => ({ ...prev, core: false, trends: false, planActual: false }))
      setLoading(false)
      isLoadingRef.current = false
    } finally {
      // Loading is resolved by async branch completions above.
    }
  }, [
    accessToken,
    filters.currency,
    filters.period,
    filters.department,
    calculateDateRanges,
    executeKpiQuery,
    executeYearlyPlanActualQuery,
    executeTrendsQuery,
    patchYearlyPlanActualInBackground,
    calculatePercentChange
  ])

  useEffect(() => {
    // ⚡ CRITICAL: Only fetch when tab is active AND accessToken is valid
    // Prevents 401 errors when component mounts before auth is ready
    if (isActive && accessToken && accessToken.trim() !== '') {
      void fetchEssentialStats()
    }
  }, [fetchEssentialStats, isActive, accessToken])

  return { stats, loading, loadingBySection, errorsBySection, error, refetch: fetchEssentialStats }
}

export default useDashboardStats
