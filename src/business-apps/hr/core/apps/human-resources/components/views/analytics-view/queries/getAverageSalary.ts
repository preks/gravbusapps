/**
 * GraphQL query to get the average annual gross salary of all active employees
 *
 * This query uses the EmployeeWorkingCondition.annualGrossSalary field to calculate
 * the average salary across all current employees.
 */
export const getAverageSalaryQuery = `
  query GetAverageSalary {
    EmployeeWorkingConditionAggregate(
      where: {
        # Only include non-deleted employees
        employee: {
          isDeleted: { _eq: false, _isNull: false }
        },
        # Ensure salary is available (greater than 0)
        annualGrossSalary: { _gt: 0 }
      }
    ) {
      aggregate {
        avg {
          annualGrossSalary
        }
        count
      }
    }
  }
`
