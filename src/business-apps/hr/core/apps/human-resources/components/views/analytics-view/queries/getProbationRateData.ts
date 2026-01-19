/**
 * GraphQL query to fetch data for calculating the probation rate
 * Probation Rate = (Employees currently in probation) / (Total ACTIVE Employees)
 * ACTIVE employee = has an active EmployeePosition at $now and employee.isDeleted = false
 * IN PROBATION = employee.workingCondition.probationEnd > $now
 */
export const GET_PROBATION_RATE_DATA = `
  query GetProbationRateData {
    # Total ACTIVE employees at $now
    totalActive: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [{ hireDate: { _isNull: true } }, { hireDate: { _lte: "now()" } }] },
          { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: "now()" } }] },
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) {
      aggregate { count }
    }

    # ACTIVE employees who are currently IN PROBATION at $now
    inProbationActive: EmployeePositionAggregate(
      where: {
        _and: [
          { _or: [{ hireDate: { _isNull: true } }, { hireDate: { _lte: "now()" } }] },
          { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gt: "now()" } }] },
          { employee: {
              isDeleted: { _eq: false },
              workingCondition: { probationEnd: { _isNull: false, _gt: "now()" } }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
  }
`
