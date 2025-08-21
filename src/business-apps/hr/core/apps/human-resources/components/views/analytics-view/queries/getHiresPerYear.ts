/**
 * GraphQL query to get the count of hires per year for the last 5 years
 * 
 * This query uses the EmployeeWorkingCondition.hireDate field to count
 * employees hired in each year.
 */
export const getHiresPerYearQuery = `
  query GetHiresPerYear($startDate: timestamp!, $endDate: timestamp!) {
    EmployeeWorkingConditionAggregate(
      where: {
        hireDate: {
          _gte: $startDate,
          _lt: $endDate
        },
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      aggregate {
        count(distinct: true, columns: employeeId)
      }
    }
  }
`;
