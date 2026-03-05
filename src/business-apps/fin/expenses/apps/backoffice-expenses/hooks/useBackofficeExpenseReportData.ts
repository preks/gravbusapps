/**
 * Backoffice Expense Report Data hook - global data (no supervisor/manager filter).
 * Adapted from manager useExpenseReportData; removes managerId from all queries.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  GET_EXPENSE_ITEMS_BACKOFFICE,
  GET_EXPENSE_PLANS_BACKOFFICE,
  GET_EXPENSE_REQUESTS_BACKOFFICE,
  GET_ADVANCE_PAYMENTS_REPORT_BACKOFFICE,
  GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE
} from '../queries/backofficeReportQueries'
import {
  getExpenseRequestStatusDisplay,
  getExpensePlanStatusDisplay,
  getAdvancePaymentStatusDisplay
} from '../utils/utils'
import { useBackofficeExpensesOverview } from './useBackofficeExpensesOverview'
import {
  buildEmployeeDisplayName,
  FORMER_EMPLOYEE_LABEL,
  DEFAULT_EXPENSES_SLA_POLICY,
  getSettledAdvancePaidAmount,
  isPaidLikeStatus,
  toUpperText,
  hasStatusTransition,
  hasFromToTransition,
  pickEarliest,
  daysDiff,
  getFirstNumberAtPaths,
  parseAdditionalProperties,
  extractBusinessDaysByLabel,
  buildSlaStatus,
  evaluatePayoutSlaAgainstRunDay,
  type ExpensesSlaPolicy
} from './backofficeReportUtils'

export enum ReportType {
  EXPENSE_ITEM = 'expense_item',
  EXPENSE_PLAN = 'expense_plan',
  EXPENSE_REQUEST = 'expense_request',
  ADVANCE_PAYMENT = 'advance_payment',
  APPROVAL_PAYOUT_CYCLE = 'approval_payout_cycle'
}

export interface ReportMetadata {
  id: string
  name: string
  type: ReportType
  description?: string
  selected?: boolean
}

export interface ReportItem {
  id: string
  [key: string]: any
}

export interface ExpenseItemReport extends ReportItem {
  date: string
  title: string
  description: string
  category: string
  amount: number
  employeeName: string
  departmentName?: string
  status: string
  code?: string
  currency?: string
}

export interface ExpensePlanReport extends ReportItem {
  code: string
  title: string
  startDate: string
  endDate: string
  status: string
  totalAmount: number
  advancePaidAmount: number
  remainingAmount: number
  employeeName: string
  departmentName?: string
  expenseRequestCode?: string
  currency: string
  createdAt?: string
}

export interface ExpenseRequestReport extends ReportItem {
  code: string
  planCode?: string
  title: string
  requestDate: string
  startDate: string
  endDate: string
  createdAt: string
  status: string
  totalAmount: number
  advancePaidAmount: number
  remainingAmount: number
  employeeName: string
  departmentName?: string
  currency: string
}

export interface AdvancePaymentReport extends ReportItem {
  code: string
  title: string
  requestDate: string
  status: string
  amount: number
  employeeName: string
  departmentName?: string
  paymentMethod?: string
  costCenter?: string
  currency?: string
}

export interface ApprovalPayoutCycleReport extends ReportItem {
  code: string
  title: string
  employeeName: string
  departmentName?: string
  createdAt: string
  pendingAt: string
  approvedAt: string
  paidAt: string
  approvalDays: number | null
  payoutDays: number | null
  totalCycleDays: number | null
  approvalSlaLimitDays: number
  payoutSlaLimitDays: number | null
  totalCycleSlaLimitDays: number
  approvalSlaStatus: string
  payoutSlaStatus: string
  totalCycleSlaStatus: string
  bottleneckStage: string
  status: string
  totalAmount: number
  currency: string
}

export interface UseBackofficeExpenseReportDataReturn {
  reportTypes: ReportMetadata[]
  selectedReportType: ReportType | null
  reportDataType: ReportType | null
  setSelectedReportType: (type: ReportType) => void
  reportData: ReportItem[]
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  setCurrentPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  fetchReportData: () => Promise<void>
  fetchAllForExport: () => Promise<ReportItem[]>
  fetchAllForFilterOptions: () => Promise<ReportItem[]>
}

interface UseBackofficeExpenseReportFilters {
  status?: string[]
  employeeName?: string[]
  departmentName?: string[]
}

const GET_EMPLOYEE_POSITIONS_BY_IDENTIFIERS = `
  query GetEmployeePositionsByIdentifiers($where: EmployeePositionBoolExp!) {
    EmployeePosition(where: $where) {
      id
      userId
      employeeId
      firstName
      lastName
      organizationalUnit {
        id
        name
      }
    }
  }
`

const GET_EMPLOYEES_BY_IDS = `
  query GetEmployeesByIds($ids: [uuid!]) {
    Employee(where: { id: { _in: $ids }, isDeleted: { _eq: false } }) {
      id
      fullName
      firstName
      lastName
      displayName
    }
  }
`

const GET_EXPENSES_SLA_POLICY = `
  query GetExpensesSlaPolicy($searchTerm: String!) {
    ContentEntry(
      limit: 1
      orderBy: [{ updatedAt: DESC }]
      where: {
        isDeleted: { _eq: false }
        _or: [{ content: { _ilike: $searchTerm } }, { title: { _ilike: $searchTerm } }]
      }
    ) {
      id
      additionalProperties
      content
      updatedAt
      createdAt
    }
  }
`

const DEFAULT_EXPENSE_ITEM_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_EXPENSE_REQUEST_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_EXPENSE_PLAN_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_ADVANCE_PAYMENT_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_APPROVAL_PAYOUT_ORDER: any[] = [{ createdAt: 'DESC' }]

const getFilterValues = (
  filtersByReportType: Partial<Record<ReportType, UseBackofficeExpenseReportFilters>>,
  reportType: ReportType,
  selectedType: ReportType | null,
  key: keyof UseBackofficeExpenseReportFilters
): string[] => {
  if (selectedType !== reportType) return []
  const value = filtersByReportType[reportType]?.[key]
  return Array.isArray(value) ? value.map(String) : []
}

const normalizeFilterValues = (values: string[] = []): string[] =>
  Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)))

const buildDepartmentPredicate = (name: string) => ({
  employeePosition: {
    organizationalUnit: {
      name: { _eq: name }
    }
  }
})

const buildAndConditions = (
  search: string,
  searchPredicates: Array<Record<string, unknown>>,
  employeePredicateBuilder: (name: string) => Record<string, unknown>,
  departmentPredicateBuilder: (name: string) => Record<string, unknown>,
  employeeFilters: string[] = [],
  departmentFilters: string[] = []
) => {
  const andConditions: Record<string, unknown>[] = []
  if (search?.trim()) {
    andConditions.push({ _or: searchPredicates })
  }
  const normalizedEmployees = normalizeFilterValues(employeeFilters)
  if (normalizedEmployees.length > 0) {
    andConditions.push({
      _or: normalizedEmployees.map(name => employeePredicateBuilder(name))
    })
  }
  const normalizedDepartments = normalizeFilterValues(departmentFilters)
  if (normalizedDepartments.length > 0) {
    andConditions.push({
      _or: normalizedDepartments.map(name => departmentPredicateBuilder(name))
    })
  }
  return andConditions
}

function mapSortingToOrderBy(selectedReportType: ReportType | null, sorting: SortingState): any[] {
  const primarySort = Array.isArray(sorting) && sorting.length > 0 ? sorting[0] : undefined
  const sortDirection = primarySort?.desc ? 'DESC' : 'ASC'
  const sortField = String(primarySort?.id || '').trim()

  switch (selectedReportType) {
    case ReportType.EXPENSE_ITEM: {
      const fieldMap: Record<string, string> = {
        title: 'title',
        date: 'expenseDate',
        amount: 'totalAmount',
        status: 'status'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_EXPENSE_ITEM_ORDER
    }
    case ReportType.EXPENSE_REQUEST: {
      const fieldMap: Record<string, string> = {
        title: 'title',
        code: 'code',
        createdAt: 'createdAt',
        status: 'status',
        totalAmount: 'totalAmount',
        requestDate: 'requestDate',
        startDate: 'startDate',
        endDate: 'endDate'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_EXPENSE_REQUEST_ORDER
    }
    case ReportType.EXPENSE_PLAN: {
      const fieldMap: Record<string, string> = {
        title: 'title',
        code: 'code',
        createdAt: 'createdAt',
        status: 'status',
        totalAmount: 'totalAmount',
        startDate: 'startDate',
        endDate: 'endDate'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_EXPENSE_PLAN_ORDER
    }
    case ReportType.ADVANCE_PAYMENT: {
      const fieldMap: Record<string, string> = {
        requestDate: 'createdAt',
        status: 'status',
        amount: 'amount',
        paymentMethod: 'paymentMethod'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_ADVANCE_PAYMENT_ORDER
    }
    case ReportType.APPROVAL_PAYOUT_CYCLE: {
      const fieldMap: Record<string, string> = {
        title: 'title',
        code: 'code',
        status: 'status',
        totalAmount: 'totalAmount'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_APPROVAL_PAYOUT_ORDER
    }
    default:
      return [{ createdAt: 'DESC' }]
  }
}

export const useBackofficeExpenseReportData = (
  { accessToken, userInfo }: BusinessAppContextProps,
  activeFiltersByReportType: Partial<Record<ReportType, UseBackofficeExpenseReportFilters>> = {},
  sorting: SortingState = []
): UseBackofficeExpenseReportDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [reportData, setReportData] = useState<ReportItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(ReportType.APPROVAL_PAYOUT_CYCLE)
  const [reportDataType, setReportDataType] = useState<ReportType | null>(ReportType.APPROVAL_PAYOUT_CYCLE)
  const selectedReportTypeRef = useRef<ReportType | null>(ReportType.APPROVAL_PAYOUT_CYCLE)
  const employeeNameCacheRef = useRef<Record<string, string>>({})
  const employeeDepartmentCacheRef = useRef<Record<string, string>>({})
  const activeFetchTokenRef = useRef(0)
  const reportCacheRef = useRef<Partial<Record<ReportType, { rows: ReportItem[]; totalCount: number }>>>({})
  const reportQuerySignatureRef = useRef<Partial<Record<ReportType, string>>>({})
  const expensesSlaPolicyRef = useRef<ExpensesSlaPolicy>(DEFAULT_EXPENSES_SLA_POLICY)
  const reportOrderBy = useMemo(() => mapSortingToOrderBy(selectedReportType, sorting), [selectedReportType, sorting])
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

  const activeFilters = selectedReportType ? (activeFiltersByReportType[selectedReportType] ?? {}) : {}
  const selectedStatusFilters = Array.isArray(activeFilters?.status) ? activeFilters.status : []
  const selectedEmployeeFilters = Array.isArray(activeFilters?.employeeName) ? activeFilters.employeeName : []
  const selectedDepartmentFilters = Array.isArray(activeFilters?.departmentName) ? activeFilters.departmentName : []

  const mapSelectedStatusFiltersToRawStatuses = useCallback((statusFilters: string[]): string[] => {
    const statusLabelToRawStatuses: Record<string, string[]> = {
      'IN APPROVAL': ['PENDING'],
      'VERIFICATION REQUIRED': ['APPROVED'],
      PAID: ['PAID'],
      'PAYMENT REQUIRED': ['PAYMENT_REQUIRED'],
      PREPARED: ['PREPARED'],
      'TRANSFER REQUIRED': ['VERIFIED', 'BOOKED', 'TRANSFERRED']
    }
    const directlySupportedRawStatuses = new Set([
      'PENDING',
      'APPROVED',
      'PAID',
      'PAYMENT_REQUIRED',
      'PREPARED',
      'VERIFIED',
      'BOOKED',
      'TRANSFERRED'
    ])
    const mappedStatuses = new Set<string>()

    statusFilters.forEach(filter => {
      const normalizedLabel = toUpperText(filter).replaceAll(/[_-]+/g, ' ').replaceAll(/\s+/g, ' ').trim()
      const mappedValues = statusLabelToRawStatuses[normalizedLabel]
      if (Array.isArray(mappedValues)) {
        mappedValues.forEach(value => mappedStatuses.add(value))
        return
      }

      const upperFilter = toUpperText(filter)
      if (directlySupportedRawStatuses.has(upperFilter)) {
        mappedStatuses.add(upperFilter)
      }
    })

    return Array.from(mappedStatuses)
  }, [])

  const cacheEmployeePositionRows = useCallback((rows: any[]) => {
    rows.forEach((row: any) => {
      const displayName = `${row?.firstName || ''} ${row?.lastName || ''}`.trim()
      const departmentName = String(row?.organizationalUnit?.name || '').trim()
      const keys = [row?.id, row?.userId, row?.employeeId].map(value => String(value || '')).filter(Boolean)

      if (displayName) {
        keys.forEach(key => {
          employeeNameCacheRef.current[key] = displayName
        })
      }
      if (departmentName) {
        keys.forEach(key => {
          employeeDepartmentCacheRef.current[key] = departmentName
        })
      }
    })
  }, [])

  const cacheEmployeeRows = useCallback((rows: any[]) => {
    rows.forEach((employee: any) => {
      const displayName =
        String(employee?.fullName || '').trim() ||
        `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() ||
        String(employee?.displayName || '').trim()
      if (!displayName || !employee?.id) return
      employeeNameCacheRef.current[String(employee.id)] = displayName
    })
  }, [])

  const chunkIdentifiers = useCallback((identifiers: string[], chunkSize = 50): string[][] => {
    const chunks: string[][] = []
    for (let index = 0; index < identifiers.length; index += chunkSize) {
      chunks.push(identifiers.slice(index, index + chunkSize))
    }
    return chunks
  }, [])

  const fetchEmployeePositionBatch = useCallback(
    async (batchIds: string[]) => {
      if (!graphqlClient || batchIds.length === 0) return
      try {
        const where = {
          _or: batchIds.flatMap(id => [{ id: { _eq: id } }, { userId: { _eq: id } }, { employeeId: { _eq: id } }])
        }
        const result = await graphqlClient.request(GET_EMPLOYEE_POSITIONS_BY_IDENTIFIERS, { where })
        const rows = Array.isArray(result?.EmployeePosition) ? result.EmployeePosition : []
        cacheEmployeePositionRows(rows)
      } catch {
        // Keep unresolved identifiers empty; UI should not display UUID fallback.
      }
    },
    [graphqlClient, cacheEmployeePositionRows]
  )

  const fetchEmployeeBatch = useCallback(
    async (batchIds: string[]) => {
      if (!graphqlClient || batchIds.length === 0) return
      try {
        const result = await graphqlClient.request(GET_EMPLOYEES_BY_IDS, { ids: batchIds })
        const rows = Array.isArray(result?.Employee) ? result.Employee : []
        cacheEmployeeRows(rows)
      } catch {
        // Keep unresolved IDs as fallback label.
      }
    },
    [graphqlClient, cacheEmployeeRows]
  )

  const resolveEmployeeNamesByIds = useCallback(
    async (employeeIds: string[]) => {
      if (!graphqlClient || employeeIds.length === 0) return employeeNameCacheRef.current

      const uniqueIds = Array.from(new Set(employeeIds.filter(Boolean)))
      const unresolvedIds = uniqueIds.filter(id => !employeeNameCacheRef.current[id])
      if (unresolvedIds.length === 0) return employeeNameCacheRef.current

      const positionChunks = chunkIdentifiers(unresolvedIds)
      for (const batchIds of positionChunks) {
        await fetchEmployeePositionBatch(batchIds)
      }

      const unresolvedAfterPositions = unresolvedIds.filter(id => !employeeNameCacheRef.current[id])
      const employeeChunks = chunkIdentifiers(unresolvedAfterPositions)
      for (const batchIds of employeeChunks) {
        await fetchEmployeeBatch(batchIds)
      }

      return employeeNameCacheRef.current
    },
    [graphqlClient, chunkIdentifiers, fetchEmployeePositionBatch, fetchEmployeeBatch]
  )

  const resolveDisplayName = useCallback(
    (candidates: Array<string | undefined | null>, employeeNameById: Record<string, string>) => {
      for (const id of candidates) {
        const key = String(id || '')
        if (!key) continue
        const resolved = employeeNameById[key]
        if (resolved) return resolved
      }
      return FORMER_EMPLOYEE_LABEL
    },
    []
  )

  const resolveDepartmentName = useCallback(
    (candidates: Array<string | undefined | null>, employeeDepartmentById: Record<string, string>) => {
      for (const id of candidates) {
        const key = String(id || '')
        if (!key) continue
        const resolved = employeeDepartmentById[key]
        if (resolved) return resolved
      }
      return ''
    },
    []
  )

  const mapRequestsFromOverview = useCallback(
    (rows: any[], employeeNameById: Record<string, string>): ExpenseRequestReport[] => {
      return (rows || []).map((request: any) => {
        const statusDisplay = request.status
          ? getExpenseRequestStatusDisplay(request.status)
          : { label: '', type: 'draft' }
        return {
          id: request.id,
          code: request.code || '',
          planCode: request.expensePlan?.code || '',
          title: request.title || '',
          requestDate: request.requestDate || '',
          startDate: request.startDate || '',
          endDate: request.endDate || '',
          createdAt: request.createdAt || '',
          status: statusDisplay.label,
          totalAmount: Number(request.totalAmount || 0),
          advancePaidAmount: getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
          remainingAmount: Math.max(
            Number(request.totalAmount || 0) - getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
            0
          ),
          currency: request.currencyRef ? String(request.currencyRef).split(':').pop() || 'EUR' : 'EUR',
          employeeName:
            buildEmployeeDisplayName(request.employee) ||
            resolveDisplayName([request.employeeId, request.createdBy], employeeNameById),
          departmentName: resolveDepartmentName(
            [request.employeeId, request.createdBy],
            employeeDepartmentCacheRef.current
          )
        } as ExpenseRequestReport
      })
    },
    [resolveDisplayName, resolveDepartmentName]
  )

  const mapPlansFromOverview = useCallback(
    (rows: any[], employeeNameById: Record<string, string>): ExpensePlanReport[] => {
      return (rows || []).map((plan: any) => {
        const statusDisplay = plan.status ? getExpensePlanStatusDisplay(plan.status) : { label: '', type: 'draft' }
        return {
          id: plan.id,
          code: plan.code || '',
          title: plan.title || '',
          startDate: plan.startDate || '',
          endDate: plan.endDate || '',
          status: statusDisplay.label,
          totalAmount: Number(plan.totalAmount || 0),
          advancePaidAmount: getSettledAdvancePaidAmount(plan?.advancePayment),
          remainingAmount: Math.max(
            Number(plan.totalAmount || 0) - getSettledAdvancePaidAmount(plan?.advancePayment),
            0
          ),
          currency: plan.currencyRef ? String(plan.currencyRef).split(':').pop() || 'EUR' : 'EUR',
          employeeName:
            buildEmployeeDisplayName(plan.employee) ||
            resolveDisplayName([plan.employeeId, plan.createdBy], employeeNameById),
          departmentName: resolveDepartmentName([plan.employeeId, plan.createdBy], employeeDepartmentCacheRef.current),
          expenseRequestCode:
            Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0
              ? plan.expenseRequest[0].code || ''
              : '',
          createdAt: plan.createdAt || ''
        } as ExpensePlanReport
      })
    },
    [resolveDisplayName, resolveDepartmentName]
  )

  const mapPaymentsFromOverview = useCallback(
    (rows: any[], employeeNameById: Record<string, string>): AdvancePaymentReport[] => {
      return (rows || []).map((p: any) => {
        const statusDisplay = p.status ? getAdvancePaymentStatusDisplay(p.status) : { label: '', type: 'draft' }
        return {
          id: p.id,
          code: p.expensePlan?.code || p.code || '',
          title: p.expensePlan?.title || '',
          requestDate: p.createdAt || '',
          status: statusDisplay.label,
          amount: Number(p.amount || 0),
          employeeName:
            buildEmployeeDisplayName(p.expensePlan?.employee) ||
            buildEmployeeDisplayName(p.employee) ||
            resolveDisplayName([p.expensePlan?.employeeId, p.createdBy], employeeNameById),
          departmentName: resolveDepartmentName(
            [p.expensePlan?.employeeId, p.createdBy, p.expensePlan?.createdBy],
            employeeDepartmentCacheRef.current
          ),
          paymentMethod: p.paymentMethod || undefined,
          costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
          currency: p.currencyRef ? String(p.currencyRef).split(':').pop() || 'EUR' : 'EUR'
        } as AdvancePaymentReport
      })
    },
    [resolveDisplayName, resolveDepartmentName]
  )

  const applyOverviewRows = useCallback((type: ReportType, mappedRows: ReportItem[], mappedTotalCount: number) => {
    setReportData(mappedRows)
    setReportDataType(type)
    setTotalCount(mappedTotalCount)
    reportCacheRef.current[type] = {
      rows: mappedRows,
      totalCount: mappedTotalCount
    }
    setError(null)
  }, [])

  useEffect(() => {
    if (
      !selectedReportType ||
      selectedReportType === ReportType.EXPENSE_ITEM ||
      selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
    ) {
      return
    }

    setIsLoading(overview.isLoading)
    if (overview.error) {
      setError(overview.error)
      return
    }
    if (overview.isLoading) return

    let cancelled = false
    const loadRows = async () => {
      switch (selectedReportType) {
        case ReportType.EXPENSE_REQUEST: {
          const rows = overview.data?.expenseRequests || []
          const ids = rows
            .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
            .filter(Boolean)
          const employeeNameById = await resolveEmployeeNamesByIds(ids)
          if (cancelled) return
          const mappedRows = mapRequestsFromOverview(rows, employeeNameById) as ReportItem[]
          const mappedTotalCount = overview.data?.expenseRequestsTotal || 0
          applyOverviewRows(ReportType.EXPENSE_REQUEST, mappedRows, mappedTotalCount)
          break
        }
        case ReportType.EXPENSE_PLAN: {
          const rows = overview.data?.expensePlans || []
          const ids = rows
            .flatMap((plan: any) => [String(plan?.employeeId || ''), String(plan?.createdBy || '')])
            .filter(Boolean)
          const employeeNameById = await resolveEmployeeNamesByIds(ids)
          if (cancelled) return
          const mappedRows = mapPlansFromOverview(rows, employeeNameById) as ReportItem[]
          const mappedTotalCount = overview.data?.expensePlansTotal || 0
          applyOverviewRows(ReportType.EXPENSE_PLAN, mappedRows, mappedTotalCount)
          break
        }
        case ReportType.ADVANCE_PAYMENT: {
          const rows = overview.data?.advancePayments || []
          const ids = rows
            .flatMap((payment: any) => [
              String(payment?.expensePlan?.employeeId || ''),
              String(payment?.createdBy || ''),
              String(payment?.expensePlan?.createdBy || '')
            ])
            .filter(Boolean)
          const employeeNameById = await resolveEmployeeNamesByIds(ids)
          if (cancelled) return
          const mappedRows = mapPaymentsFromOverview(rows, employeeNameById) as ReportItem[]
          const mappedTotalCount = overview.data?.advancePaymentsTotal || 0
          applyOverviewRows(ReportType.ADVANCE_PAYMENT, mappedRows, mappedTotalCount)
          break
        }
      }
    }

    void loadRows()
    return () => {
      cancelled = true
    }
  }, [
    selectedReportType,
    overview.data,
    overview.isLoading,
    overview.error,
    resolveEmployeeNamesByIds,
    mapRequestsFromOverview,
    mapPlansFromOverview,
    mapPaymentsFromOverview,
    applyOverviewRows
  ])

  const buildExpenseRequestWhere = useCallback(
    (
      search: string,
      statusFilters: string[] = [],
      employeeFilters: string[] = [],
      departmentFilters: string[] = []
    ) => {
      const mappedStatusFilters = mapSelectedStatusFiltersToRawStatuses(statusFilters)
      const normalizedEmployees = Array.from(
        new Set(employeeFilters.map(value => String(value || '').trim()).filter(Boolean))
      )
      const normalizedDepartments = Array.from(
        new Set(departmentFilters.map(value => String(value || '').trim()).filter(Boolean))
      )
      const where: any = {
        isDeleted: { _eq: false },
        status: mappedStatusFilters.length > 0 ? { _in: mappedStatusFilters } : { _nin: ['CREATED', 'DISCARDED'] }
      }
      const andConditions: any[] = []
      if (search?.trim()) {
        const searchPattern = `%${search.trim()}%`
        andConditions.push({
          _or: [
            { code: { _ilike: searchPattern } },
            { title: { _ilike: searchPattern } },
            { status: { _ilike: searchPattern } }
          ]
        })
      }
      if (normalizedEmployees.length > 0) {
        andConditions.push({
          _or: normalizedEmployees.map(name => ({
            employee: { fullName: { _eq: name } }
          }))
        })
      }
      if (normalizedDepartments.length > 0) {
        andConditions.push({
          _or: normalizedDepartments.map(name => ({
            employee: {
              employeePosition: {
                organizationalUnit: {
                  name: { _eq: name }
                }
              }
            }
          }))
        })
      }
      if (andConditions.length > 0) {
        where._and = andConditions
      }
      return where
    },
    [mapSelectedStatusFiltersToRawStatuses]
  )

  const buildExpensePlanWhereForExport = useCallback(
    (search: string, employeeFilters: string[] = [], departmentFilters: string[] = []) => {
      const where: any = {
        isDeleted: { _eq: false },
        status: { _nin: ['CREATED', 'DISCARDED'] }
      }
      const searchPattern = `%${search.trim()}%`
      const andConditions = buildAndConditions(
        search,
        [{ code: { _ilike: searchPattern } }, { title: { _ilike: searchPattern } }],
        name => ({ employee: { fullName: { _eq: name } } }),
        name => ({ employee: buildDepartmentPredicate(name) }),
        employeeFilters,
        departmentFilters
      )
      if (andConditions.length > 0) {
        where._and = andConditions
      }
      return where
    },
    []
  )

  const buildAdvancePaymentWhereForExport = useCallback(
    (search: string, employeeFilters: string[] = [], departmentFilters: string[] = []) => {
      const where: any = {
        isDeleted: { _eq: false },
        status: { _nin: ['CREATED', 'DISCARDED'] }
      }
      const searchPattern = `%${search.trim()}%`
      const andConditions = buildAndConditions(
        search,
        [
          { code: { _ilike: searchPattern } },
          { description: { _ilike: searchPattern } },
          { expensePlan: { code: { _ilike: searchPattern } } },
          { expensePlan: { title: { _ilike: searchPattern } } }
        ],
        name => ({ expensePlan: { employee: { fullName: { _eq: name } } } }),
        name => ({ expensePlan: { employee: buildDepartmentPredicate(name) } }),
        employeeFilters,
        departmentFilters
      )
      if (andConditions.length > 0) {
        where._and = andConditions
      }
      return where
    },
    []
  )

  const processExpenseItemsData = (data: any, employeeNameById: Record<string, string> = {}): ExpenseItemReport[] => {
    if (!data?.ExpenseItem?.length) return []
    return data.ExpenseItem.map((item: any) => {
      const expenseGroup =
        item.expensePosition && item.expensePosition.length > 0 && item.expensePosition[0].expenseGroupRef
          ? item.expensePosition[0].expenseGroupRef.replaceAll('ExpenseGroup:v1:', '')
          : 'Uncategorized'
      const statusDisplay = item.expenseRequest?.status
        ? getExpenseRequestStatusDisplay(item.expenseRequest.status)
        : { label: '', type: 'draft' }
      return {
        id: item.id,
        code: item.expenseRequest?.code || '',
        currency: item.expenseRequest?.currencyRef
          ? String(item.expenseRequest.currencyRef).split(':').pop() || 'EUR'
          : 'EUR',
        date:
          item.expenseRequest?.requestTypeRef === 'ExpenseRequestType:v1:TRIP'
            ? item.expenseRequest?.startDate || ''
            : item.expenseDate || '',
        title: item.title || '',
        description: item.description || '',
        category: expenseGroup,
        amount: item.totalAmount || 0,
        employeeName:
          buildEmployeeDisplayName(item.employee) ||
          employeeNameById[item.employeeId] ||
          employeeNameById[item.createdBy] ||
          FORMER_EMPLOYEE_LABEL,
        departmentName: resolveDepartmentName([item.employeeId, item.createdBy], employeeDepartmentCacheRef.current),
        status: statusDisplay.label
      }
    })
  }

  const processExpensePlansData = (data: any, employeeNameById: Record<string, string> = {}): ExpensePlanReport[] => {
    if (!data?.ExpensePlan?.length) return []
    return data.ExpensePlan.map((plan: any) => {
      const statusDisplay = plan.status ? getExpensePlanStatusDisplay(plan.status) : { label: '', type: 'draft' }
      return {
        id: plan.id,
        code: plan.code || '',
        title: plan.title || '',
        startDate: plan.startDate || '',
        endDate: plan.endDate || '',
        status: statusDisplay.label,
        totalAmount: plan.totalAmount || 0,
        currency: plan.currencyRef ? String(plan.currencyRef).split(':').pop() || 'EUR' : 'EUR',
        employeeName: resolveDisplayName([plan.employeeId, plan.createdBy], employeeNameById),
        departmentName: resolveDepartmentName([plan.employeeId, plan.createdBy], employeeDepartmentCacheRef.current),
        expenseRequestCode:
          Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0 ? plan.expenseRequest[0].code || '' : '',
        createdAt: plan.createdAt || ''
      }
    })
  }

  const processExpenseRequestsData = (
    data: any,
    employeeNameById: Record<string, string> = {}
  ): ExpenseRequestReport[] => {
    if (!data?.ExpenseRequest?.length) return []
    return data.ExpenseRequest.map((request: any) => {
      const statusDisplay = request.status
        ? getExpenseRequestStatusDisplay(request.status)
        : { label: '', type: 'draft' }
      return {
        id: request.id,
        code: request.code || '',
        planCode: request.expensePlan?.code || '',
        title: request.title || '',
        requestDate: request.requestDate || '',
        startDate: request.startDate || '',
        endDate: request.endDate || '',
        createdAt: request.createdAt || '',
        status: statusDisplay.label,
        totalAmount: Number(request.totalAmount || 0),
        advancePaidAmount: getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
        remainingAmount: Math.max(
          Number(request.totalAmount || 0) - getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
          0
        ),
        currency: request.currencyRef ? String(request.currencyRef).split(':').pop() || 'EUR' : 'EUR',
        employeeName: resolveDisplayName([request.employeeId, request.createdBy], employeeNameById),
        departmentName: resolveDepartmentName(
          [request.employeeId, request.createdBy],
          employeeDepartmentCacheRef.current
        )
      }
    })
  }

  const collectSystemCommentDates = useCallback((comments: any[], fromStatuses: string[], toStatuses: string[]) => {
    return comments
      .filter((comment: any) => {
        const text = String(comment?.comment || '')
        const type = toUpperText(comment?.commentType)
        return type === 'SYSTEM_COMMENT' && hasFromToTransition(text, fromStatuses, toStatuses)
      })
      .map((comment: any) => comment?.commentDate)
  }, [])

  const resolveBottleneckStage = useCallback(
    (
      pendingAt: string,
      approvedAt: string,
      paidAt: string,
      approvalDays: number | null,
      payoutDays: number | null,
      status?: any
    ) => {
      const requestStatus = toUpperText(status)
      const hasFullCycle = Boolean(pendingAt && approvedAt && paidAt)
      const isSameDayCycle = hasFullCycle && approvalDays === 0 && payoutDays === 0

      if (isSameDayCycle || ['PAID', 'CLOSED'].includes(requestStatus)) {
        return ''
      }
      if (approvalDays !== null && payoutDays !== null) {
        return approvalDays >= payoutDays ? 'Approval' : 'Payout'
      }
      return approvedAt ? 'Payout' : 'Approval'
    },
    []
  )

  const mapApprovalPayoutCycleRow = useCallback(
    (
      request: any,
      employeeNameById: Record<string, string>,
      slaPolicy: ExpensesSlaPolicy
    ): ApprovalPayoutCycleReport => {
      const comments = Array.isArray(request?.expenseRequestComment) ? request.expenseRequestComment : []
      const paymentRows = Array.isArray(request?.expensePlan?.advancePayment) ? request.expensePlan.advancePayment : []
      const paymentComments = paymentRows.flatMap((payment: any) =>
        Array.isArray(payment?.advancePaymentComment) ? payment.advancePaymentComment : []
      )

      const pendingAt = pickEarliest(collectSystemCommentDates(comments, ['DRAFT', 'CREATED'], ['PENDING']))
      const approvedAt = pickEarliest(collectSystemCommentDates(comments, ['PENDING'], ['APPROVED', 'APPROVAL']))
      const paidFromPayments = paymentRows
        .filter((payment: any) => isPaidLikeStatus(payment?.status))
        .map((payment: any) => payment?.transactionDate || payment?.decisionDate || payment?.createdAt)
      const paidFromPaymentComments = paymentComments
        .filter((comment: any) => hasStatusTransition(String(comment?.comment || ''), ['PAID', 'CLOSED']))
        .map((comment: any) => comment?.commentDate)
      const paidFromSystemComments = collectSystemCommentDates(
        comments,
        ['APPROVED', 'VERIFIED', 'BOOKED', 'TRANSFERRED'],
        ['PAID', 'CLOSED']
      )
      const paidAt = pickEarliest([...paidFromPayments, ...paidFromPaymentComments, ...paidFromSystemComments]) || ''

      const approvalDays = daysDiff(pendingAt, approvedAt)
      const payoutDays = daysDiff(approvedAt, paidAt)
      const totalCycleDays = daysDiff(pendingAt, paidAt)
      const approvalSlaStatus = buildSlaStatus(approvalDays, slaPolicy.approvalSlaBusinessDays)
      const payoutSlaEvaluation = evaluatePayoutSlaAgainstRunDay(
        approvedAt,
        paidAt,
        slaPolicy.payoutRunWeekday,
        approvalDays,
        slaPolicy.totalCycleSlaBusinessDays
      )
      const totalCycleSlaStatus = buildSlaStatus(totalCycleDays, slaPolicy.totalCycleSlaBusinessDays)
      const statusDisplay = request?.status
        ? getExpenseRequestStatusDisplay(request.status)
        : { label: '', type: 'draft' }

      return {
        id: request.id,
        code: request.code || '',
        title: request.title || '',
        employeeName: resolveDisplayName([request.employeeId, request.createdBy], employeeNameById),
        departmentName: resolveDepartmentName(
          [request.employeeId, request.createdBy],
          employeeDepartmentCacheRef.current
        ),
        createdAt: request.createdAt || '',
        pendingAt,
        approvedAt,
        paidAt,
        approvalDays,
        payoutDays,
        totalCycleDays,
        approvalSlaLimitDays: slaPolicy.approvalSlaBusinessDays,
        payoutSlaLimitDays: payoutSlaEvaluation.limitDays,
        totalCycleSlaLimitDays: slaPolicy.totalCycleSlaBusinessDays,
        approvalSlaStatus,
        payoutSlaStatus: payoutSlaEvaluation.status,
        totalCycleSlaStatus,
        bottleneckStage: resolveBottleneckStage(
          pendingAt,
          approvedAt,
          paidAt,
          approvalDays,
          payoutDays,
          request?.status
        ),
        status: statusDisplay.label,
        totalAmount: Number(request.totalAmount || 0),
        currency: request.currencyRef ? String(request.currencyRef).split(':').pop() || 'EUR' : 'EUR'
      }
    },
    [collectSystemCommentDates, resolveBottleneckStage, resolveDisplayName, resolveDepartmentName]
  )

  const processApprovalPayoutCycleData = (
    data: any,
    employeeNameById: Record<string, string> = {},
    slaPolicy: ExpensesSlaPolicy = DEFAULT_EXPENSES_SLA_POLICY
  ): ApprovalPayoutCycleReport[] => {
    const rows = Array.isArray(data?.ExpenseRequest) ? data.ExpenseRequest : []
    return rows.map((request: any) => mapApprovalPayoutCycleRow(request, employeeNameById, slaPolicy))
  }

  const loadExpensesSlaPolicy = useCallback(async (): Promise<ExpensesSlaPolicy> => {
    if (!graphqlClient) return expensesSlaPolicyRef.current
    try {
      const result = await graphqlClient.request(GET_EXPENSES_SLA_POLICY, {
        searchTerm: '%expenses-approval-payout-sla%'
      })
      const entry = Array.isArray(result?.ContentEntry) ? result.ContentEntry[0] : null
      if (!entry) return expensesSlaPolicyRef.current

      const additionalProperties = parseAdditionalProperties(entry.additionalProperties)
      const content = String(entry.content || '')

      const approval =
        getFirstNumberAtPaths(additionalProperties, [
          'approvalSlaBusinessDays',
          'approvalSla.days',
          'approval.businessDays',
          'thresholds.approvalBusinessDays'
        ]) ?? extractBusinessDaysByLabel(content, 'Approval SLA')
      const payout =
        getFirstNumberAtPaths(additionalProperties, [
          'payoutRunWeekday',
          'payout.runWeekday',
          'thresholds.payoutRunWeekday'
        ]) ?? (toUpperText(content).includes('MONDAY') ? 1 : null)
      const total =
        getFirstNumberAtPaths(additionalProperties, [
          'totalCycleSlaBusinessDays',
          'totalSlaBusinessDays',
          'totalCycleSla.days',
          'totalCycle.businessDays',
          'thresholds.totalCycleBusinessDays'
        ]) ?? extractBusinessDaysByLabel(content, 'Total Cycle SLA')

      let payoutRunWeekday = DEFAULT_EXPENSES_SLA_POLICY.payoutRunWeekday
      if (payout !== null) {
        payoutRunWeekday = Math.max(0, Math.min(6, Math.trunc(payout)))
      }
      expensesSlaPolicyRef.current = {
        approvalSlaBusinessDays: approval ?? DEFAULT_EXPENSES_SLA_POLICY.approvalSlaBusinessDays,
        payoutRunWeekday,
        totalCycleSlaBusinessDays: total ?? DEFAULT_EXPENSES_SLA_POLICY.totalCycleSlaBusinessDays
      }
      return expensesSlaPolicyRef.current
    } catch {
      return expensesSlaPolicyRef.current
    }
  }, [graphqlClient])

  const fetchExpenseItems = useCallback(
    async (fetchToken: number, querySignature: string) => {
      if (!graphqlClient) return
      const hasCachedRows = Boolean(reportCacheRef.current[ReportType.EXPENSE_ITEM]?.rows?.length)
      const shouldSetBlockingLoading = !hasCachedRows
      try {
        if (shouldSetBlockingLoading) {
          setIsLoading(true)
        }
        setError(null)
        const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BACKOFFICE, {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          searchTerm: searchTerm ? `%${searchTerm}%` : '%%',
          orderBy: reportOrderBy
        })
        const employeeIds = (result?.ExpenseItem || [])
          .flatMap((item: any) => [String(item?.employeeId || ''), String(item?.createdBy || '')])
          .filter(Boolean)
        const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
        const processedData = processExpenseItemsData(result, employeeNameById)
        if (fetchToken !== activeFetchTokenRef.current) {
          return
        }
        setReportData(processedData)
        setReportDataType(ReportType.EXPENSE_ITEM)
        const mappedTotalCount = result?.ExpenseItemAggregate?.aggregate?.count || 0
        setTotalCount(mappedTotalCount)
        reportCacheRef.current[ReportType.EXPENSE_ITEM] = {
          rows: processedData as ReportItem[],
          totalCount: mappedTotalCount
        }
        reportQuerySignatureRef.current[ReportType.EXPENSE_ITEM] = querySignature
      } catch {
        setError('Failed to load expense items data')
      } finally {
        if (shouldSetBlockingLoading) {
          setIsLoading(false)
        }
      }
    },
    [graphqlClient, pageSize, currentPage, searchTerm, reportOrderBy, resolveEmployeeNamesByIds]
  )

  const fetchApprovalPayoutCycle = useCallback(
    async (fetchToken: number, querySignature: string) => {
      if (!graphqlClient) return
      const hasCachedRows = Boolean(reportCacheRef.current[ReportType.APPROVAL_PAYOUT_CYCLE]?.rows?.length)
      const shouldSetBlockingLoading = !hasCachedRows
      try {
        if (shouldSetBlockingLoading) {
          setIsLoading(true)
        }
        setError(null)
        const where = buildExpenseRequestWhere(
          searchTerm,
          selectedStatusFilters,
          selectedEmployeeFilters,
          selectedDepartmentFilters
        )
        const result = await graphqlClient.request(GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE, {
          where,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          orderBy: reportOrderBy
        })
        const employeeIds = (result?.ExpenseRequest || [])
          .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
          .filter(Boolean)
        const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
        const slaPolicy = await loadExpensesSlaPolicy()
        const processedData = processApprovalPayoutCycleData(result, employeeNameById, slaPolicy)
        if (fetchToken !== activeFetchTokenRef.current) {
          return
        }
        setReportData(processedData)
        setReportDataType(ReportType.APPROVAL_PAYOUT_CYCLE)
        const mappedTotalCount = result?.ExpenseRequestAggregate?.aggregate?.count || 0
        setTotalCount(mappedTotalCount)
        reportCacheRef.current[ReportType.APPROVAL_PAYOUT_CYCLE] = {
          rows: processedData as ReportItem[],
          totalCount: mappedTotalCount
        }
        reportQuerySignatureRef.current[ReportType.APPROVAL_PAYOUT_CYCLE] = querySignature
      } catch {
        setError('Failed to load approval and payout cycle data')
      } finally {
        if (shouldSetBlockingLoading) {
          setIsLoading(false)
        }
      }
    },
    [
      graphqlClient,
      pageSize,
      currentPage,
      searchTerm,
      selectedStatusFilters,
      selectedEmployeeFilters,
      selectedDepartmentFilters,
      reportOrderBy,
      buildExpenseRequestWhere,
      resolveEmployeeNamesByIds,
      loadExpensesSlaPolicy
    ]
  )

  const mapAdvancePaymentToReport = useCallback(
    (p: any, employeeNameById: Record<string, string>): AdvancePaymentReport => {
      const statusDisplay = p.status ? getAdvancePaymentStatusDisplay(p.status) : { label: '', type: 'draft' }
      const currencyCode = p?.currencyRef ? String(p.currencyRef).split(':').pop() || 'EUR' : 'EUR'
      return {
        id: p.id,
        code: p.expensePlan?.code || p.code || '',
        title: p.expensePlan?.title || '',
        requestDate: p.createdAt || '',
        status: statusDisplay.label,
        amount: p.amount || 0,
        employeeName: resolveDisplayName([p.expensePlan?.employeeId, p.createdBy], employeeNameById),
        departmentName: resolveDepartmentName(
          [p.expensePlan?.employeeId, p.createdBy, p.expensePlan?.createdBy],
          employeeDepartmentCacheRef.current
        ),
        paymentMethod: p.paymentMethod || undefined,
        costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
        currency: currencyCode
      }
    },
    [resolveDisplayName, resolveDepartmentName]
  )

  const fetchBatchedData = useCallback(
    async <T extends ReportItem>(
      fetchFn: (offset: number, limit: number) => Promise<T[]>,
      errorContext: string
    ): Promise<T[]> => {
      const batchLimit = 1000
      const maxBatches = 500
      const all: T[] = []
      let offset = 0
      let batchCount = 0
      try {
        while (true) {
          batchCount += 1
          if (batchCount > maxBatches) {
            setError(`Export stopped: too many ${errorContext} batches`)
            break
          }

          const processed = await fetchFn(offset, batchLimit)
          if (!Array.isArray(processed)) {
            setError(`Partial export: invalid ${errorContext} batch response`)
            break
          }

          all.push(...processed)
          if (processed.length < batchLimit) break
          offset += batchLimit
        }
      } catch {
        setError(`Partial export: some ${errorContext} could not be fetched`)
      }
      return all
    },
    []
  )

  const fetchExpenseItemsForExport = useCallback(
    async (offset: number, limit: number) => {
      const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BACKOFFICE, {
        limit,
        offset,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%',
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.ExpenseItem || [])
        .flatMap((item: any) => [String(item?.employeeId || ''), String(item?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      const rows = processExpenseItemsData(result, employeeNameById)
      const selectedStatuses = Array.isArray(selectedStatusFilters) ? selectedStatusFilters.map(String) : []
      const selectedEmployees = Array.isArray(selectedEmployeeFilters) ? selectedEmployeeFilters.map(String) : []
      const selectedDepartments = Array.isArray(selectedDepartmentFilters) ? selectedDepartmentFilters.map(String) : []
      return rows.filter(row => {
        const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(String(row?.status || ''))
        const employeeMatch =
          selectedEmployees.length === 0 || selectedEmployees.includes(String(row?.employeeName || ''))
        const departmentMatch =
          selectedDepartments.length === 0 || selectedDepartments.includes(String(row?.departmentName || ''))
        return statusMatch && employeeMatch && departmentMatch
      })
    },
    [
      graphqlClient,
      searchTerm,
      reportOrderBy,
      selectedStatusFilters,
      selectedEmployeeFilters,
      selectedDepartmentFilters,
      resolveEmployeeNamesByIds
    ]
  )

  const fetchExpensePlansForExport = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpensePlanWhereForExport(searchTerm, selectedEmployeeFilters, selectedDepartmentFilters)
      const result = await graphqlClient.request(GET_EXPENSE_PLANS_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.ExpensePlan || [])
        .flatMap((plan: any) => [String(plan?.employeeId || ''), String(plan?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processExpensePlansData(result, employeeNameById)
    },
    [
      graphqlClient,
      searchTerm,
      selectedEmployeeFilters,
      selectedDepartmentFilters,
      reportOrderBy,
      buildExpensePlanWhereForExport,
      resolveEmployeeNamesByIds
    ]
  )

  const fetchExpenseRequestsForExport = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpenseRequestWhere(searchTerm, [], selectedEmployeeFilters, selectedDepartmentFilters)
      const result = await graphqlClient.request(GET_EXPENSE_REQUESTS_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.ExpenseRequest || [])
        .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processExpenseRequestsData(result, employeeNameById)
    },
    [
      graphqlClient,
      searchTerm,
      selectedEmployeeFilters,
      selectedDepartmentFilters,
      reportOrderBy,
      buildExpenseRequestWhere,
      resolveEmployeeNamesByIds
    ]
  )

  const fetchAdvancePaymentsForExport = useCallback(
    async (offset: number, limit: number) => {
      const where = buildAdvancePaymentWhereForExport(searchTerm, selectedEmployeeFilters, selectedDepartmentFilters)
      const result = await graphqlClient.request(GET_ADVANCE_PAYMENTS_REPORT_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.AdvancePayment || [])
        .flatMap((payment: any) => [
          String(payment?.expensePlan?.employeeId || ''),
          String(payment?.createdBy || ''),
          String(payment?.expensePlan?.createdBy || '')
        ])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return (result?.AdvancePayment || []).map((payment: any) => mapAdvancePaymentToReport(payment, employeeNameById))
    },
    [
      graphqlClient,
      searchTerm,
      selectedEmployeeFilters,
      selectedDepartmentFilters,
      reportOrderBy,
      buildAdvancePaymentWhereForExport,
      mapAdvancePaymentToReport,
      resolveEmployeeNamesByIds
    ]
  )

  const fetchApprovalPayoutCycleForExport = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpenseRequestWhere(
        searchTerm,
        selectedStatusFilters,
        selectedEmployeeFilters,
        selectedDepartmentFilters
      )
      const result = await graphqlClient.request(GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.ExpenseRequest || [])
        .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      const slaPolicy = await loadExpensesSlaPolicy()
      return processApprovalPayoutCycleData(result, employeeNameById, slaPolicy)
    },
    [
      graphqlClient,
      searchTerm,
      selectedStatusFilters,
      selectedEmployeeFilters,
      selectedDepartmentFilters,
      reportOrderBy,
      buildExpenseRequestWhere,
      resolveEmployeeNamesByIds,
      loadExpensesSlaPolicy
    ]
  )

  useEffect(() => {
    if (!graphqlClient) return
    if (searchTerm.trim()) return

    const prefetchSignature = JSON.stringify({
      selectedReportType: ReportType.EXPENSE_ITEM,
      currentPage,
      pageSize,
      searchTerm
    })

    if (
      reportCacheRef.current[ReportType.EXPENSE_ITEM]?.rows?.length &&
      reportQuerySignatureRef.current[ReportType.EXPENSE_ITEM] === prefetchSignature
    ) {
      return
    }

    let cancelled = false
    const prefetchExpenseItemsCache = async () => {
      try {
        const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BACKOFFICE, {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
        })
        const employeeIds = (result?.ExpenseItem || [])
          .flatMap((item: any) => [String(item?.employeeId || ''), String(item?.createdBy || '')])
          .filter(Boolean)
        const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
        const processedData = processExpenseItemsData(result, employeeNameById)
        if (cancelled) return
        const mappedTotalCount = result?.ExpenseItemAggregate?.aggregate?.count || 0
        reportCacheRef.current[ReportType.EXPENSE_ITEM] = {
          rows: processedData as ReportItem[],
          totalCount: mappedTotalCount
        }
        reportQuerySignatureRef.current[ReportType.EXPENSE_ITEM] = prefetchSignature
      } catch {
        // no-op prefetch failure
      }
    }

    void prefetchExpenseItemsCache()
    return () => {
      cancelled = true
    }
  }, [graphqlClient, currentPage, pageSize, searchTerm, resolveEmployeeNamesByIds])

  const fetchAllForExport = useCallback(async (): Promise<ReportItem[]> => {
    if (!graphqlClient || !selectedReportType) return []
    try {
      switch (selectedReportType) {
        case ReportType.EXPENSE_ITEM:
          return await fetchBatchedData(fetchExpenseItemsForExport, 'items')
        case ReportType.EXPENSE_PLAN:
          return await fetchBatchedData(fetchExpensePlansForExport, 'plans')
        case ReportType.EXPENSE_REQUEST:
          return await fetchBatchedData(fetchExpenseRequestsForExport, 'requests')
        case ReportType.ADVANCE_PAYMENT:
          return await fetchBatchedData(fetchAdvancePaymentsForExport, 'advance payments')
        case ReportType.APPROVAL_PAYOUT_CYCLE:
          return await fetchBatchedData(fetchApprovalPayoutCycleForExport, 'approval and payout cycle')
        default:
          return []
      }
    } catch {
      setError('Failed to export report data')
      return []
    }
  }, [
    graphqlClient,
    selectedReportType,
    fetchBatchedData,
    fetchExpenseItemsForExport,
    fetchExpensePlansForExport,
    fetchExpenseRequestsForExport,
    fetchAdvancePaymentsForExport,
    fetchApprovalPayoutCycleForExport
  ])

  const fetchRawExpenseItemsForFilterOptions = useCallback(
    async (offset: number, limit: number) => {
      const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BACKOFFICE, {
        limit,
        offset,
        searchTerm: '%%',
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.ExpenseItem || [])
        .flatMap((item: any) => [String(item?.employeeId || ''), String(item?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processExpenseItemsData(result, employeeNameById)
    },
    [graphqlClient, reportOrderBy, resolveEmployeeNamesByIds]
  )

  const fetchRawExpensePlansForFilterOptions = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpensePlanWhereForExport('', [], [])
      const result = await graphqlClient.request(GET_EXPENSE_PLANS_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.ExpensePlan || [])
        .flatMap((plan: any) => [String(plan?.employeeId || ''), String(plan?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processExpensePlansData(result, employeeNameById)
    },
    [graphqlClient, buildExpensePlanWhereForExport, reportOrderBy, resolveEmployeeNamesByIds]
  )

  const fetchRawExpenseRequestsForFilterOptions = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpenseRequestWhere('', [], [], [])
      const result = await graphqlClient.request(GET_EXPENSE_REQUESTS_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.ExpenseRequest || [])
        .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processExpenseRequestsData(result, employeeNameById)
    },
    [graphqlClient, buildExpenseRequestWhere, reportOrderBy, resolveEmployeeNamesByIds]
  )

  const fetchRawAdvancePaymentsForFilterOptions = useCallback(
    async (offset: number, limit: number) => {
      const where = buildAdvancePaymentWhereForExport('', [], [])
      const result = await graphqlClient.request(GET_ADVANCE_PAYMENTS_REPORT_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.AdvancePayment || [])
        .flatMap((payment: any) => [
          String(payment?.expensePlan?.employeeId || ''),
          String(payment?.createdBy || ''),
          String(payment?.expensePlan?.createdBy || '')
        ])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return (result?.AdvancePayment || []).map((payment: any) => mapAdvancePaymentToReport(payment, employeeNameById))
    },
    [
      graphqlClient,
      buildAdvancePaymentWhereForExport,
      reportOrderBy,
      resolveEmployeeNamesByIds,
      mapAdvancePaymentToReport
    ]
  )

  const fetchRawApprovalPayoutCycleForFilterOptions = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpenseRequestWhere('', [], [], [])
      const result = await graphqlClient.request(GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: reportOrderBy
      })
      const employeeIds = (result?.ExpenseRequest || [])
        .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      const slaPolicy = await loadExpensesSlaPolicy()
      return processApprovalPayoutCycleData(result, employeeNameById, slaPolicy)
    },
    [graphqlClient, buildExpenseRequestWhere, reportOrderBy, resolveEmployeeNamesByIds, loadExpensesSlaPolicy]
  )

  const fetchAllForFilterOptions = useCallback(async (): Promise<ReportItem[]> => {
    if (!graphqlClient || !selectedReportType) return []
    try {
      switch (selectedReportType) {
        case ReportType.EXPENSE_ITEM:
          return await fetchBatchedData(fetchRawExpenseItemsForFilterOptions, 'items')
        case ReportType.EXPENSE_PLAN:
          return await fetchBatchedData(fetchRawExpensePlansForFilterOptions, 'plans')
        case ReportType.EXPENSE_REQUEST:
          return await fetchBatchedData(fetchRawExpenseRequestsForFilterOptions, 'requests')
        case ReportType.ADVANCE_PAYMENT:
          return await fetchBatchedData(fetchRawAdvancePaymentsForFilterOptions, 'advance payments')
        case ReportType.APPROVAL_PAYOUT_CYCLE:
          return await fetchBatchedData(fetchRawApprovalPayoutCycleForFilterOptions, 'approval and payout cycle')
        default:
          return []
      }
    } catch {
      return []
    }
  }, [
    graphqlClient,
    selectedReportType,
    fetchBatchedData,
    fetchRawExpenseItemsForFilterOptions,
    fetchRawExpensePlansForFilterOptions,
    fetchRawExpenseRequestsForFilterOptions,
    fetchRawAdvancePaymentsForFilterOptions,
    fetchRawApprovalPayoutCycleForFilterOptions
  ])

  const fetchReportData = useCallback(async () => {
    if (!selectedReportType) return
    const fetchToken = ++activeFetchTokenRef.current
    const querySignature = JSON.stringify({
      selectedReportType,
      currentPage,
      pageSize,
      searchTerm,
      reportOrderBy,
      selectedStatusFilters: selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedStatusFilters : [],
      selectedEmployeeFilters: selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedEmployeeFilters : [],
      selectedDepartmentFilters:
        selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedDepartmentFilters : []
    })
    const hasCachedRows = Boolean(reportCacheRef.current[selectedReportType]?.rows?.length)
    const previousSignature = reportQuerySignatureRef.current[selectedReportType]
    const canReuseWithoutRefetch = hasCachedRows && previousSignature === querySignature
    if (
      canReuseWithoutRefetch &&
      (selectedReportType === ReportType.EXPENSE_ITEM || selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE)
    ) {
      return
    }
    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        await fetchExpenseItems(fetchToken, querySignature)
        break
      case ReportType.APPROVAL_PAYOUT_CYCLE:
        await fetchApprovalPayoutCycle(fetchToken, querySignature)
        break
      default:
        break
    }
  }, [
    selectedReportType,
    currentPage,
    pageSize,
    searchTerm,
    reportOrderBy,
    selectedStatusFilters,
    selectedEmployeeFilters,
    selectedDepartmentFilters,
    fetchExpenseItems,
    fetchApprovalPayoutCycle
  ])

  const lastFetchSignatureRef = useRef<string | null>(null)
  const lastSelectedReportTypeRef = useRef<ReportType | null>(selectedReportType)
  useEffect(() => {
    selectedReportTypeRef.current = selectedReportType
    lastSelectedReportTypeRef.current = selectedReportType

    const signature = JSON.stringify({
      selectedReportType,
      currentPage,
      pageSize,
      searchTerm,
      reportOrderBy,
      selectedStatusFilters: selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedStatusFilters : [],
      selectedEmployeeFilters: selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedEmployeeFilters : [],
      selectedDepartmentFilters:
        selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ? selectedDepartmentFilters : []
    })
    if (lastFetchSignatureRef.current === signature) return
    lastFetchSignatureRef.current = signature
    void fetchReportData()
  }, [
    selectedReportType,
    currentPage,
    pageSize,
    searchTerm,
    reportOrderBy,
    selectedStatusFilters,
    selectedEmployeeFilters,
    selectedDepartmentFilters,
    fetchReportData
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
    fetchReportData,
    fetchAllForExport,
    fetchAllForFilterOptions
  }
}
