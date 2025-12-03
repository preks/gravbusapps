/**
 * Combined query: current/previous month terminations and headcount as-of cutoffs
 */
export const getTurnoverMetricsQuery = `
  query GetTurnoverMetrics(
    $currentStart: timestamp!,
    $currentEnd: timestamp!,
    $previousStart: timestamp!,
    $previousEnd: timestamp!,
    $currentCutoff: timestamp!,
    $previousCutoff: timestamp!
  ) {
    currentTerminations: EmployeeWorkingConditionAggregate(
      where: {
        exitDate: { _gte: $currentStart, _lt: $currentEnd },
        employee: { isDeleted: { _eq: false } }
      }
    ) {
      aggregate { count(distinct: true, columns: employeeId) }
    }

    previousTerminations: EmployeeWorkingConditionAggregate(
      where: {
        exitDate: { _gte: $previousStart, _lt: $previousEnd },
        employee: { isDeleted: { _eq: false } }
      }
    ) {
      aggregate { count(distinct: true, columns: employeeId) }
    }

    currentHeadcount: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [{ hireDate: { _lte: $currentCutoff } }, { hireDate: { _isNull: true } }] },
          { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: $currentCutoff } }] },
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) {
      aggregate { count(distinct: true, columns: employeeId) }
    }

    currentHeadcountStart: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [{ hireDate: { _lte: $currentStart } }, { hireDate: { _isNull: true } }] },
          { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: $currentStart } }] },
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) {
      aggregate { count(distinct: true, columns: employeeId) }
    }

    previousHeadcount: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [{ hireDate: { _lte: $previousCutoff } }, { hireDate: { _isNull: true } }] },
          { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: $previousCutoff } }] },
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) {
      aggregate { count(distinct: true, columns: employeeId) }
    }

    previousHeadcountStart: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [{ hireDate: { _lte: $previousStart } }, { hireDate: { _isNull: true } }] },
          { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: $previousStart } }] },
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) {
      aggregate { count(distinct: true, columns: employeeId) }
    }
  }
`
