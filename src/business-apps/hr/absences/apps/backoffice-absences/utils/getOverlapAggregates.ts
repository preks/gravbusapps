/**
 * Shared server-side monthly/date-range aggregation util
 * Uses overlap logic and sums effectiveDays only.
 */

export interface OverlapAggregateInput {
  startIso: string
  endIso: string
  departmentId?: string | null
  departmentName?: string | null // fallback only
  status?: string | null // single status (backwards compatible)
  // Enhanced filters (optional)
  departmentIds?: string[] // multiple departments by ID
  includeNoDepartment?: boolean // include employees with no department
  statuses?: string[] // multiple statuses
  employeeIds?: string[] // specific employees
  groupIds?: string[] // absence group parentEntryIds
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

  // Department filtering (single legacy fields)
  if (departmentId) {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { id: { _eq: departmentId } } } } })
  } else if (departmentName === 'NO_DEPARTMENT_SPECIAL') {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { _isNull: true } } } })
  } else if (departmentName) {
    where._and.push({ employee: { employeePosition: { organizationalUnit: { name: { _eq: departmentName } } } } })
  }

  // Department filtering (enhanced multi-select)
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

  // Employee filtering
  if (employeeIds && employeeIds.length > 0) {
    if (where.employee) {
      where.employee = { ...where.employee, id: { _in: employeeIds } }
    } else {
      where.employee = { id: { _in: employeeIds } }
    }
  }

  // Group filtering (type.parentEntryId)
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
