/**
 * GraphQL query to get the count of employee terminations in the previous month
 * 
 * This query uses the EmployeeWorkingCondition.exitDate field to identify
 * when employees left the company.
 * The exitDate field is a timestamp type (without timezone).
 */
export const getTurnoverRateQuery = `
  query GetTerminatedEmployees($startDate: timestamp!, $endDate: timestamp!) {
    EmployeeWorkingConditionAggregate(
      where: {
        exitDate: {
          _gte: $startDate,
          _lt: $endDate
        },
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      aggregate {
        # Count distinct employee IDs to avoid duplicates
        count(distinct: true, columns: employeeId)
      }
    }
  }
`;
