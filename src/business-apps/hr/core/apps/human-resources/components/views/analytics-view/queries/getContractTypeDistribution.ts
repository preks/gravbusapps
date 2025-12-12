/**
 * GraphQL query to fetch contract type distribution data
 * This query gets all active employee working conditions with their contract type
 */
export const GET_CONTRACT_TYPE_DISTRIBUTION = `
  query GetContractTypeDistribution {
    EmployeeWorkingCondition(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { _or: [{ activeFrom: { _isNull: true } }, { activeFrom: { _lte: "now()" } }] },
          { _or: [{ activeTo: { _isNull: true } }, { activeTo: { _gt: "now()" } }] },
          { employee: { isDeleted: { _eq: false } } }
        ]
      }
    ) {
      contractType {
        id
        value
      }
      employeeId
    }
  }
`
