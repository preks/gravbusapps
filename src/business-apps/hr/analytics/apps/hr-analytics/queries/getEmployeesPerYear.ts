/**
 * GraphQL query to get the count of total employees per year for the last 5 years
 * Counts all employees who were registered in the system on or before each year-end (Dec 31)
 * This matches the total employee count approach used in the KPI card
 */
export const getEmployeesPerYearQuery = `
  query GetEmployeesPerYear($year: timestamptz!) {
    EmployeeAggregate(
      where: {
        createdAt: { _lte: $year },
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
