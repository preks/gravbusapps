/**
 * GraphQL query to get the count of hires per year for the last 5 years
 *
 * This query uses the EmployeeWorkingCondition.hireDate field to count
 * employees hired in each year.
 */
export const getHiresPerYearQuery = `
  query GetHiresPerYear($startDate: timestamp!, $endDate: timestamp!) {
    EmployeeWorkingConditionAggregate(
      where: {
        hireDate: {
          _gte: $startDate,
          _lt: $endDate
        },
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      aggregate {
        count(distinct: true, columns: employeeId)
      }
    }
  }
`

/**
 * Batched GraphQL query to get number of hires per year for the last 5 years in a single request.
 * Counts distinct employees whose hireDate falls within each year's [start, end).
 *
 * Variables:
 *   s0/e0 = start/end of current year
 *   s1/e1 = start/end of previous year
 *   ...
 *   s4/e4 = start/end of (currentYear-4)
 */
export const getHiresPerYearBatchQuery = `
  query GetHiresPerYearBatch(
    $s0: timestamp!, $e0: timestamp!,
    $s1: timestamp!, $e1: timestamp!,
    $s2: timestamp!, $e2: timestamp!,
    $s3: timestamp!, $e3: timestamp!,
    $s4: timestamp!, $e4: timestamp!
  ) {
    y0: EmployeeWorkingConditionAggregate(
      where: {
        hireDate: { _gte: $s0, _lt: $e0 },
        employee: { isDeleted: { _eq: false } }
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }
    y1: EmployeeWorkingConditionAggregate(
      where: {
        hireDate: { _gte: $s1, _lt: $e1 },
        employee: { isDeleted: { _eq: false } }
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }
    y2: EmployeeWorkingConditionAggregate(
      where: {
        hireDate: { _gte: $s2, _lt: $e2 },
        employee: { isDeleted: { _eq: false } }
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }
    y3: EmployeeWorkingConditionAggregate(
      where: {
        hireDate: { _gte: $s3, _lt: $e3 },
        employee: { isDeleted: { _eq: false } }
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }
    y4: EmployeeWorkingConditionAggregate(
      where: {
        hireDate: { _gte: $s4, _lt: $e4 },
        employee: { isDeleted: { _eq: false } }
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }
  }
`
