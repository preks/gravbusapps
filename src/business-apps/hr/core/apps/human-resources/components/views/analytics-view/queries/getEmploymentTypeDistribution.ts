/**
 * GraphQL query to fetch employment type distribution data
 * This query gets all active employee working conditions with their employment type
 */
export const GET_EMPLOYMENT_TYPE_DISTRIBUTION = `
  query GetEmploymentTypeDistribution {
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
      employmentType {
        id
        value
      }
      employeeId
    }
  }
`
