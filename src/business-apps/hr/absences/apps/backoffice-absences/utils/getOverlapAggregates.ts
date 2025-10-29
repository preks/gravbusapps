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

  const where: any = {
    _and: [{ isDeleted: { _eq: false } }, { startDate: { _lte: endIso } }, { endDate: { _gte: startIso } }]
  }

  if (departmentId) {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { id: { _eq: departmentId } } } } })
  } else if (departmentName === 'NO_DEPARTMENT_SPECIAL') {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { _isNull: true } } } })
  } else if (departmentName) {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { name: { _eq: departmentName } } } } })
  }

  if ((departmentIds && departmentIds.length > 0) || includeNoDepartment) {
    const deptOr: any[] = []
    if (departmentIds && departmentIds.length > 0) {
      deptOr.push({ organizationalUnit: { id: { _in: departmentIds } } })
    }
    if (includeNoDepartment) {
      deptOr.push({ organizationalUnit: { _isNull: true } })
    }
    if (deptOr.length > 0) {
      where._and.push({ employee: { employeePosition: { _or: deptOr } } })
    }
  }

  if (status) {
    where._and.push({ status: { _eq: status } })
  }
  if (statuses && statuses.length > 0) {
    where._and.push({ status: { _in: statuses } })
  }

  if (employeeIds && employeeIds.length > 0) {
    if (where.employee) {
      where.employee = { ...where.employee, id: { _in: employeeIds } }
    } else {
      where.employee = { id: { _in: employeeIds } }
    }
  }

  if (groupIds && groupIds.length > 0) {
    where._and.push({ type: { parentEntryId: { _in: groupIds } } })
  }

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

  const count = res?.total?.aggregate?.count ?? 0
  const days = res?.total?.aggregate?.sum?.effectiveDays ?? 0
  const distinct = res?.total?.aggregate?.distinctEmployees ?? 0

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

  // Build base where conditions (common for all months)
  const baseWhere: any = {
    _and: [{ isDeleted: { _eq: false } }]
  }

  if (departmentId) {
    baseWhere._and.push({ employee: { employeePosition: { organizationalUnit: { id: { _eq: departmentId } } } } })
  } else if (departmentName === 'NO_DEPARTMENT_SPECIAL') {
    baseWhere._and.push({ employee: { employeePosition: { organizationalUnit: { _isNull: true } } } })
  } else if (departmentName) {
    baseWhere._and.push({ employee: { employeePosition: { organizationalUnit: { name: { _eq: departmentName } } } } })
  }

  if ((departmentIds && departmentIds.length > 0) || includeNoDepartment) {
    const deptOr: any[] = []
    if (departmentIds && departmentIds.length > 0) {
      deptOr.push({ organizationalUnit: { id: { _in: departmentIds } } })
    }
    if (includeNoDepartment) {
      deptOr.push({ organizationalUnit: { _isNull: true } })
    }
    if (deptOr.length > 0) {
      baseWhere._and.push({ employee: { employeePosition: { _or: deptOr } } })
    }
  }

  if (status) {
    baseWhere._and.push({ status: { _eq: status } })
  }
  if (statuses && statuses.length > 0) {
    baseWhere._and.push({ status: { _in: statuses } })
  }

  if (employeeIds && employeeIds.length > 0) {
    if (baseWhere.employee) {
      baseWhere.employee = { ...baseWhere.employee, id: { _in: employeeIds } }
    } else {
      baseWhere.employee = { id: { _in: employeeIds } }
    }
  }

  if (groupIds && groupIds.length > 0) {
    baseWhere._and.push({ type: { parentEntryId: { _in: groupIds } } })
  }

  // Build the query with multiple month aggregations
  const monthQueries = months
    .map((_month, index) => {
      return `
      month${index}: EmployeeAbsenceAggregate(where: $where${index}) {
        aggregate {
          count
          sum { effectiveDays }
          distinctEmployees: count(columns: [employeeId], distinct: true)
        }
      }
    `
    })
    .join('\n')

  const query = `
    query MultipleOverlapAggregates(${months.map((_, index) => `$where${index}: EmployeeAbsenceBoolExp!`).join(', ')}) {
      ${monthQueries}
    }
  `

  const variables: Record<string, any> = {}
  months.forEach((month, index) => {
    const monthWhere = {
      ...baseWhere,
      _and: [...baseWhere._and, { startDate: { _lte: month.endIso } }, { endDate: { _gte: month.startIso } }]
    }
    variables[`where${index}`] = monthWhere
  })

  const res: any = await client.request(query, variables)

  const result: MonthlyOverlapAggregateResult = {}

  months.forEach((month, index) => {
    const monthData = res[`month${index}`]
    const count = monthData?.aggregate?.count ?? 0
    const days = monthData?.aggregate?.sum?.effectiveDays ?? 0
    const distinct = monthData?.aggregate?.distinctEmployees ?? 0

    const avgDaysPerRequest = count > 0 ? Math.round((days / count) * 100) / 100 : 0
    const avgRequestsPerEmployee = distinct > 0 ? Math.round((count / distinct) * 100) / 100 : 0

    result[month.label] = {
      totalRequests: count,
      totalDays: days,
      distinctEmployees: distinct,
      avgDaysPerRequest,
      avgRequestsPerEmployee
    }
  })

  return result
}
