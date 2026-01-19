/**
 * GraphQL query to get yearly payroll data using aggregation
 *
 * This query uses the EmployeeWorkingCondition.annualGrossSalary field to calculate
 * the total payroll for all current employees.
 *
 * Instead of trying to filter historically, we use the same approach as getTotalPayroll
 * to get current data, which we know works correctly.
 */
export const getYearlyPayrollQuery = `
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
