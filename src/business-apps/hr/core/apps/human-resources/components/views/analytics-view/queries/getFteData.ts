/**
 * GraphQL query to get FTE (Full Time Equivalent) data for all employees
 * This fetches the fullTimeEquivalent field from EmployeeWorkingHours
 */
export const GET_FTE_DATA = `
  query GetFteData($now: timestamptz!) {
    EmployeeWorkingHours(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { employee: { isDeleted: { _eq: false } } },
          { _or: [{ activeFrom: { _isNull: true } }, { activeFrom: { _lte: $now } }] },
          { _or: [{ activeTo: { _isNull: true } }, { activeTo: { _gte: $now } }] }
        ]
      }
    ) {
      id
      employeeId
      weeklyHours
      fullTimeEquivalent
      activeFrom
      activeTo
      createdAt
    }
    
    # Keep aggregate for testing (unfiltered sum over non-deleted employees)
    EmployeeWorkingHoursAggregate(
      where: {
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      aggregate {
        sum {
          fullTimeEquivalent
        }
        count
      }
    }
  }
`
