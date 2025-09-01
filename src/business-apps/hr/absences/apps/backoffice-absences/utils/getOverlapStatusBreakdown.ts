/**
 * Server-side status breakdown aggregation util matching date/filters
 * Returns counts and total days per status to keep parity with dashboard pie.
 */

export interface OverlapStatusInput {
  startIso: string;
  endIso: string;
  departmentId?: string | null;
  departmentName?: string | null; // fallback only
  status?: string | null; // when provided, narrows to a single status
  // Enhanced filters (optional)
  departmentIds?: string[];
  includeNoDepartment?: boolean;
  employeeIds?: string[];
}

export interface StatusAggregateItem {
  count: number;
  totalDays: number;
}

export interface OverlapStatusResult {
  APPROVED: StatusAggregateItem;
  PENDING: StatusAggregateItem;
  REJECTED: StatusAggregateItem;
  CANCELLED: StatusAggregateItem;
}

interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>;
}

export const getOverlapStatusBreakdown = async (
  client: GraphQLRequester,
  params: OverlapStatusInput
): Promise<OverlapStatusResult> => {
  const { startIso, endIso, departmentId, departmentName, status, departmentIds, includeNoDepartment, employeeIds } = params;

  const baseAnd: any[] = [
    { isDeleted: { _eq: false } },
    // Overlap condition: absence starts on/before end, and ends on/after start
    { startDate: { _lte: endIso } },
    { endDate: { _gte: startIso } }
  ];

  if (departmentId) {
    baseAnd.push({ employee: { employeePosition: { organizationalUnit: { id: { _eq: departmentId } } } } });
  } else if (departmentName === 'NO_DEPARTMENT_SPECIAL') {
    baseAnd.push({ employee: { employeePosition: { organizationalUnit: { _isNull: true } } } });
  } else if (departmentName) {
    baseAnd.push({ employee: { employeePosition: { organizationalUnit: { name: { _eq: departmentName } } } } });
  }

  // Enhanced department filters: multiple IDs and/or no-department
  if ((departmentIds && departmentIds.length > 0) || includeNoDepartment) {
    const deptOr: any[] = [];
    if (departmentIds && departmentIds.length > 0) {
      deptOr.push({ organizationalUnit: { id: { _in: departmentIds } } });
    }
    if (includeNoDepartment) {
      deptOr.push({ organizationalUnit: { _isNull: true } });
    }
    if (deptOr.length > 0) {
      baseAnd.push({ employee: { employeePosition: { _or: deptOr } } });
    }
  }

  // Employee scoping
  if (employeeIds && employeeIds.length > 0) {
    baseAnd.push({ employee: { id: { _in: employeeIds } } });
  }

  // If a specific status filter is provided, we only count that status and return others as 0
  const whereApproved: any = { _and: [...baseAnd, ...(status && status !== 'APPROVED' ? [{ id: { _eq: '__none__' } }] : [{ status: { _eq: 'APPROVED' } }])] };
  const wherePending: any = { _and: [...baseAnd, ...(status && status !== 'PENDING' ? [{ id: { _eq: '__none__' } }] : [{ status: { _eq: 'PENDING' } }])] };
  const whereRejected: any = { _and: [...baseAnd, ...(status && status !== 'REJECTED' ? [{ id: { _eq: '__none__' } }] : [{ status: { _eq: 'REJECTED' } }])] };
  const whereCancelled: any = { _and: [...baseAnd, ...(status && status !== 'CANCELLED' ? [{ id: { _eq: '__none__' } }] : [{ status: { _eq: 'CANCELLED' } }])] };

  const query = `
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
  `;

  const res: any = await client.request(query, {
    whereApproved,
    wherePending,
    whereRejected,
    whereCancelled
  });

  const toItem = (node: any): StatusAggregateItem => ({
    count: node?.aggregate?.count ?? 0,
    totalDays: node?.aggregate?.sum?.effectiveDays ?? 0
  });

  return {
    APPROVED: toItem(res?.approved),
    PENDING: toItem(res?.pending),
    REJECTED: toItem(res?.rejected),
    CANCELLED: toItem(res?.cancelled)
  };
};


