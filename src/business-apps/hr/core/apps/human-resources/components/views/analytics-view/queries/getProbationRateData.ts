/**
 * GraphQL query to fetch data for calculating the probation rate
 * Probation Rate = (Employees currently in probation) / (Total Employees)
 * Only counts employees with a probation end date in the future
 */
export const GET_PROBATION_RATE_DATA = `
  query GetProbationRateData {
    # Get total employee count
    EmployeePositionAggregate {
      aggregate {
        count
      }
    }
    
    # Get count of working conditions with probation end dates greater than today
    EmployeeWorkingConditionAggregate(
      where: {
        probationEnd: { 
          _isNull: false,
          _gt: "now()"
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
