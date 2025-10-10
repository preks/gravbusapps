/**
 * GraphQL query to get the count of new hires in the current month
 *
 * This query uses the EmployeeWorkingCondition.hireDate field to accurately identify
 * when employees were hired in the specified date range.
 * Note: hireDate is of type 'timestamp' (without timezone), not 'timestamptz'
 */
export const getNewHiresCountQuery = `
  query GetNewHiresCount($startDate: timestamp!, $endDate: timestamp!) {
    EmployeeWorkingConditionAggregate(
      where: {
        # Use the specific hireDate field for accurate hire date filtering
        hireDate: {
          _gte: $startDate,
          _lt: $endDate
        },
        # Only include non-deleted employees
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
`
