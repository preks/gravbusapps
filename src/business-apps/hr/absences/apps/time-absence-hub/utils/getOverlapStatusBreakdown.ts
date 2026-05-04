export interface OverlapStatusInput {
  startIso: string
  endIso: string
  departmentId?: string | null
  departmentName?: string | null
  status?: string | null
  departmentIds?: string[]
  includeNoDepartment?: boolean
  employeeIds?: string[]
}

export interface StatusAggregateItem {
  count: number
  totalDays: number
}

export interface OverlapStatusResult {
  APPROVED: StatusAggregateItem
  PENDING: StatusAggregateItem
  REJECTED: StatusAggregateItem
  CANCELLED: StatusAggregateItem
}

interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>
}

type SupportedStatus = keyof OverlapStatusResult

const IMPOSSIBLE_CLAUSE = { _and: [{ id: { _isNull: true } }, { id: { _isNull: false } }] }

const STATUS_QUERY = `
  query StatusBreakdown(
    $whereApproved: EmployeeAbsenceBoolExp!,
    $wherePending: EmployeeAbsenceBoolExp!,
    $whereRejected: EmployeeAbsenceBoolExp!,
    $whereCancelled: EmployeeAbsenceBoolExp!
  ) {
    approved: EmployeeAbsenceAggregate(where: $whereApproved) { aggregate { count sum { effectiveDays } } }
    pending: EmployeeAbsenceAggregate(where: $wherePending) { aggregate { count sum { effectiveDays } } }
    rejected: EmployeeAbsenceAggregate(where: $whereRejected) { aggregate { count sum { effectiveDays } } }
    cancelled: EmployeeAbsenceAggregate(where: $whereCancelled) { aggregate { count sum { effectiveDays } } }
  }
`

const toStatusAggregateItem = (node: any): StatusAggregateItem => ({
  count: node?.aggregate?.count ?? 0,
  totalDays: node?.aggregate?.sum?.effectiveDays ?? 0
})

const buildBaseOverlapClauses = (params: OverlapStatusInput): any[] => {
  const { startIso, endIso, departmentId, departmentName, departmentIds, includeNoDepartment, employeeIds } = params
  const baseClauses: any[] = [
    { isDeleted: { _eq: false } },
    { startDate: { _lte: endIso } },
    { endDate: { _gte: startIso } }
  ]

  if (departmentId) {
    baseClauses.push({ employee: { employeePosition: { organizationalUnit: { id: { _eq: departmentId } } } } })
  } else if (departmentName === 'NO_DEPARTMENT_SPECIAL') {
    baseClauses.push({ employee: { employeePosition: { organizationalUnit: { _isNull: true } } } })
  } else if (departmentName) {
    baseClauses.push({ employee: { employeePosition: { organizationalUnit: { name: { _eq: departmentName } } } } })
  }

  if ((departmentIds && departmentIds.length > 0) || includeNoDepartment) {
    const departmentOr: any[] = []

    if (departmentIds && departmentIds.length > 0) {
      departmentOr.push({ organizationalUnit: { id: { _in: departmentIds } } })
    }
    if (includeNoDepartment) {
      departmentOr.push({ organizationalUnit: { _isNull: true } })
    }

    if (departmentOr.length > 0) {
      baseClauses.push({ employee: { employeePosition: { _or: departmentOr } } })
    }
  }

  if (employeeIds && employeeIds.length > 0) {
    baseClauses.push({ employee: { id: { _in: employeeIds } } })
  }

  return baseClauses
}

const buildStatusWhereClause = (
  baseClauses: any[],
  selectedStatus: string | null | undefined,
  status: SupportedStatus
) => ({
  _and: [
    ...baseClauses,
    ...(selectedStatus && selectedStatus !== status ? [IMPOSSIBLE_CLAUSE] : [{ status: { _eq: status } }])
  ]
})

const buildStatusWhereVariables = (
  baseClauses: any[],
  selectedStatus?: string | null
): Record<'whereApproved' | 'wherePending' | 'whereRejected' | 'whereCancelled', any> => ({
  whereApproved: buildStatusWhereClause(baseClauses, selectedStatus, 'APPROVED'),
  wherePending: buildStatusWhereClause(baseClauses, selectedStatus, 'PENDING'),
  whereRejected: buildStatusWhereClause(baseClauses, selectedStatus, 'REJECTED'),
  whereCancelled: buildStatusWhereClause(baseClauses, selectedStatus, 'CANCELLED')
})

const toOverlapStatusResult = (response: any): OverlapStatusResult => ({
  APPROVED: toStatusAggregateItem(response?.approved),
  PENDING: toStatusAggregateItem(response?.pending),
  REJECTED: toStatusAggregateItem(response?.rejected),
  CANCELLED: toStatusAggregateItem(response?.cancelled)
})

export const getOverlapStatusBreakdown = async (
  client: GraphQLRequester,
  params: OverlapStatusInput
): Promise<OverlapStatusResult> => {
  const baseClauses = buildBaseOverlapClauses(params)
  const statusVariables = buildStatusWhereVariables(baseClauses, params.status)
  const response: any = await client.request(STATUS_QUERY, statusVariables)

  return toOverlapStatusResult(response)
}
