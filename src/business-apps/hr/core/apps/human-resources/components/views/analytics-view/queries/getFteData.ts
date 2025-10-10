/**
 * GraphQL query to get FTE (Full Time Equivalent) data for all employees
 * This fetches the fullTimeEquivalent field from EmployeeWorkingHours
 */
export const GET_FTE_DATA = `
  query GetFteData {
    EmployeeWorkingHours(
      where: {
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      id
      fullTimeEquivalent
      employee {
        id
      }
    }
    
    # Get aggregate data for FTE sum
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
