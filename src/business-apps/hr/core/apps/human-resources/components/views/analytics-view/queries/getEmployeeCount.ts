/**
 * GraphQL query to get the total employee count
 */
export const employeeCountQuery = `
query MyQuery(
  $thisYearEnd: timestamp,
  $lastYearEnd: timestamp
) {
  thisYear: EmployeePositionAggregate(
    where: {
      _and: [
        { _or: [
          { hireDate: { _lte: $thisYearEnd } },
          { hireDate: { _isNull: true } }
        ]},
        { _or: [
          { exitDate: { _isNull: true } },
          { exitDate: { _gt: $thisYearEnd } }
        ]},
        { employee: { isDeleted: { _eq: false } } }
      ]
    }
  ) {
    aggregate {
      count
    }
  }
  lastYear: EmployeePositionAggregate(
    where: {
      _and: [
        { _or: [
          { hireDate: { _lte: $lastYearEnd } },
          { hireDate: { _isNull: true } }
        ]},
        { _or: [
          { exitDate: { _isNull: true } },
          { exitDate: { _gt: $lastYearEnd } }
        ]},
        { employee: { isDeleted: { _eq: false } } }
      ]
    }
  ) {
    aggregate {
      count
    }
  }
}

`
