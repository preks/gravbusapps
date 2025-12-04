/**
 * Batched GraphQL query to get end-of-year active headcount for the last 5 years in one request.
 * Uses "active at cutoff" logic:
 *   (hireDate <= cutoff OR hireDate IS NULL) AND (exitDate IS NULL OR exitDate > cutoff) AND employee.isDeleted = false
 * Distinct count by employeeId to avoid double-counting.
 *
 * Variables:
 *   y0 = end of current year (e.g., 2025-12-31 23:59:59)
 *   y1 = end of previous year
 *   ...
 *   y4 = end of (currentYear-4)
 */
export const getEmployeesPerYearBatchQuery = `
  query GetEmployeesPerYearBatch(
    $y0: timestamp!,
    $y1: timestamp!,
    $y2: timestamp!,
    $y3: timestamp!,
    $y4: timestamp!
  ) {
    y0: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [
            { hireDate: { _lte: $y0 } },
            { hireDate: { _isNull: true } }
          ]},
          { _or: [
            { exitDate: { _isNull: true } },
            { exitDate: { _gt: $y0 } }
          ]},
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }

    y1: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [
            { hireDate: { _lte: $y1 } },
            { hireDate: { _isNull: true } }
          ]},
          { _or: [
            { exitDate: { _isNull: true } },
            { exitDate: { _gt: $y1 } }
          ]},
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }

    y2: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [
            { hireDate: { _lte: $y2 } },
            { hireDate: { _isNull: true } }
          ]},
          { _or: [
            { exitDate: { _isNull: true } },
            { exitDate: { _gt: $y2 } }
          ]},
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }

    y3: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [
            { hireDate: { _lte: $y3 } },
            { hireDate: { _isNull: true } }
          ]},
          { _or: [
            { exitDate: { _isNull: true } },
            { exitDate: { _gt: $y3 } }
          ]},
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }

    y4: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [
            { hireDate: { _lte: $y4 } },
            { hireDate: { _isNull: true } }
          ]},
          { _or: [
            { exitDate: { _isNull: true } },
            { exitDate: { _gt: $y4 } }
          ]},
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) { aggregate { count(distinct: true, columns: employeeId) } }
  }
`
