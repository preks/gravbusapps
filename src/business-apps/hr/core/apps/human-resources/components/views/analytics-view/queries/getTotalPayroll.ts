/**
 * GraphQL query to get the total annual gross salary of all active employees
 *
 * This query uses the EmployeeWorkingCondition.annualGrossSalary field to calculate
 * the total payroll across all current employees.
 */
export const getTotalPayrollQuery = `
  query GetTotalPayroll {
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
        sum {
          annualGrossSalary
        }
        count
      }
    }
  }
`
