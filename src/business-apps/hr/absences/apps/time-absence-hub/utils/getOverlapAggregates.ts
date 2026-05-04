export interface OverlapAggregateInput {
  startIso: string
  endIso: string
  departmentId?: string | null
  departmentName?: string | null
  status?: string | null
  departmentIds?: string[]
  includeNoDepartment?: boolean
  statuses?: string[]
  employeeIds?: string[]
  groupIds?: string[]
}

export interface OverlapAggregateResult {
  totalRequests: number
  totalDays: number
  distinctEmployees: number
  avgDaysPerRequest: number
  avgRequestsPerEmployee: number
}

interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>
}

interface OverlapFilterCriteria {
  departmentId?: string | null
  departmentName?: string | null
  status?: string | null
  departmentIds?: string[]
  includeNoDepartment?: boolean
  statuses?: string[]
  employeeIds?: string[]
  groupIds?: string[]
}

const applyDepartmentWhereClause = (
  where: any,
  departmentId?: string | null,
  departmentName?: string | null,
  departmentIds?: string[],
  includeNoDepartment?: boolean
): void => {
  if (departmentId) {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { id: { _eq: departmentId } } } } })
    return
  }

  if (departmentName === 'NO_DEPARTMENT_SPECIAL') {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { _isNull: true } } } })
  } else if (departmentName) {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { name: { _eq: departmentName } } } } })
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
      where._and.push({ employee: { employeePosition: { _or: departmentOr } } })
    }
  }
}

const applyStatusWhereClause = (where: any, status?: string | null, statuses?: string[]): void => {
  if (status) {
    where._and.push({ status: { _eq: status } })
  }
  if (statuses && statuses.length > 0) {
    where._and.push({ status: { _in: statuses } })
  }
}

const applyEmployeeWhereClause = (where: any, employeeIds?: string[]): void => {
  if (!employeeIds || employeeIds.length === 0) {
    return
  }

  where.employee = where.employee ? { ...where.employee, id: { _in: employeeIds } } : { id: { _in: employeeIds } }
}

const applyGroupWhereClause = (where: any, groupIds?: string[]): void => {
  if (groupIds && groupIds.length > 0) {
    where._and.push({ type: { parentEntryId: { _in: groupIds } } })
  }
}

const createBaseOverlapWhere = (criteria: OverlapFilterCriteria): any => {
  const where: any = {
    _and: [{ isDeleted: { _eq: false } }]
  }

  applyDepartmentWhereClause(
    where,
    criteria.departmentId,
    criteria.departmentName,
    criteria.departmentIds,
    criteria.includeNoDepartment
  )
  applyStatusWhereClause(where, criteria.status, criteria.statuses)
  applyEmployeeWhereClause(where, criteria.employeeIds)
  applyGroupWhereClause(where, criteria.groupIds)

  return where
}

const extractAggregateValues = (aggregateData: any) => {
  const count = aggregateData?.aggregate?.count ?? 0
  const days = aggregateData?.aggregate?.sum?.effectiveDays ?? 0
  const distinct = aggregateData?.aggregate?.distinctEmployees ?? 0

  const avgDaysPerRequest = count > 0 ? Math.round((days / count) * 100) / 100 : 0
  const avgRequestsPerEmployee = distinct > 0 ? Math.round((count / distinct) * 100) / 100 : 0

  return {
    totalRequests: count,
    totalDays: days,
    distinctEmployees: distinct,
    avgDaysPerRequest,
    avgRequestsPerEmployee
  }
}

export const getOverlapAggregates = async (
  client: GraphQLRequester,
  params: OverlapAggregateInput
): Promise<OverlapAggregateResult> => {
  const {
    startIso,
    endIso,
    departmentId,
    departmentName,
    status,
    departmentIds,
    includeNoDepartment,
    statuses,
    employeeIds,
    groupIds
  } = params

  const where = createBaseOverlapWhere({
    departmentId,
    departmentName,
    status,
    departmentIds,
    includeNoDepartment,
    statuses,
    employeeIds,
    groupIds
  })
  where._and.push({ startDate: { _lte: endIso } }, { endDate: { _gte: startIso } })

  const query = `
    query OverlapAggregates($where: EmployeeAbsenceBoolExp!) {
      total: EmployeeAbsenceAggregate(where: $where) {
        aggregate {
          count
          sum { effectiveDays }
          distinctEmployees: count(columns: [employeeId], distinct: true)
        }
      }
    }
  `

  const res: any = await client.request(query, { where })
  return extractAggregateValues(res?.total)
}

export interface MonthlyOverlapAggregateInput {
  months: Array<{
    label: string
    startIso: string
    endIso: string
  }>
  departmentId?: string | null
  departmentName?: string | null
  status?: string | null
  departmentIds?: string[]
  includeNoDepartment?: boolean
  statuses?: string[]
  employeeIds?: string[]
  groupIds?: string[]
}

export interface MonthlyOverlapAggregateResult {
  [monthLabel: string]: OverlapAggregateResult
}

type MonthRange = MonthlyOverlapAggregateInput['months'][number]

const buildMonthAggregateSelection = (index: number): string => `
      month${index}: EmployeeAbsenceAggregate(where: $where${index}) {
        aggregate {
          count
          sum { effectiveDays }
          distinctEmployees: count(columns: [employeeId], distinct: true)
        }
      }
    `

const buildMultipleOverlapAggregatesQuery = (months: MonthRange[]): string => {
  const queryParams = months.map((_, index) => `$where${index}: EmployeeAbsenceBoolExp!`).join(', ')
  const aggregateSelections = months.map((_, index) => buildMonthAggregateSelection(index)).join('\n')

  return `
    query MultipleOverlapAggregates(${queryParams}) {
      ${aggregateSelections}
    }
  `
}

const buildMonthWhere = (baseWhere: any, month: MonthRange): any => ({
  ...baseWhere,
  _and: [...baseWhere._and, { startDate: { _lte: month.endIso } }, { endDate: { _gte: month.startIso } }]
})

const buildMonthlyWhereVariables = (baseWhere: any, months: MonthRange[]): Record<string, any> =>
  months.reduce<Record<string, any>>((variables, month, index) => {
    variables[`where${index}`] = buildMonthWhere(baseWhere, month)
    return variables
  }, {})

const mapMonthlyAggregateResult = (months: MonthRange[], response: any): MonthlyOverlapAggregateResult =>
  months.reduce<MonthlyOverlapAggregateResult>((result, month, index) => {
    result[month.label] = extractAggregateValues(response?.[`month${index}`])
    return result
  }, {})

export const getMultipleOverlapAggregates = async (
  client: GraphQLRequester,
  params: MonthlyOverlapAggregateInput
): Promise<MonthlyOverlapAggregateResult> => {
  const {
    months,
    departmentId,
    departmentName,
    status,
    departmentIds,
    includeNoDepartment,
    statuses,
    employeeIds,
    groupIds
  } = params

  const baseWhere = createBaseOverlapWhere({
    departmentId,
    departmentName,
    status,
    departmentIds,
    includeNoDepartment,
    statuses,
    employeeIds,
    groupIds
  })
  const query = buildMultipleOverlapAggregatesQuery(months)
  const variables = buildMonthlyWhereVariables(baseWhere, months)
  const response: any = await client.request(query, variables)

  return mapMonthlyAggregateResult(months, response)
}
