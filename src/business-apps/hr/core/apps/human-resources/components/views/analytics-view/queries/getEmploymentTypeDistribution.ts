/**
 * GraphQL query to fetch employment type distribution data
 * This query gets all active employee working conditions with their employment type
 */
export const GET_EMPLOYMENT_TYPE_DISTRIBUTION = `
  query GetEmploymentTypeDistribution {
    EmployeeWorkingCondition(
      where: {
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      employmentType {
        id
        value
      }
      employeeId
    }
  }
`;
