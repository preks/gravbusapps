/**
 * GraphQL query to fetch data for calculating the probation rate
 * Probation Rate = (Employees still in probation) / (Total Employees)
 */
export const GET_PROBATION_RATE_DATA = `
  query GetProbationRateData {
    # Get total employee count
    EmployeeAggregate(
      where: {
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Get count of working conditions with probation end dates
    EmployeeWorkingConditionAggregate(
      where: {
        probationEnd: { _isNull: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
