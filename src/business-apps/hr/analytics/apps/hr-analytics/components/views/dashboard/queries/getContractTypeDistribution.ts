/**
 * GraphQL query to fetch contract type distribution data
 * This query gets all active employee working conditions with their contract type
 */
export const GET_CONTRACT_TYPE_DISTRIBUTION = `
  query GetContractTypeDistribution {
    EmployeeWorkingCondition(
      where: {
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      contractType {
        id
        value
      }
      employeeId
    }
  }
`;
