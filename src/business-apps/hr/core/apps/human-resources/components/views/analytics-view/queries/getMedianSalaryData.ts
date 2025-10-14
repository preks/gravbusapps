/**
 * GraphQL query to get all employee salaries for median salary calculation
 *
 * This query fetches all employee working conditions with salary data
 * to calculate the median salary across all current employees.
 */
export const getMedianSalaryData = `
  query GetMedianSalaryData {
    # Get individual records for median calculation
    EmployeeWorkingCondition(
      where: {
        # Only include non-deleted employees
        employee: {
          isDeleted: { _eq: false, _isNull: false }
        },
        # Ensure salary is available (greater than 0)
        annualGrossSalary: { _gt: 0 }
      }
    ) {
      id
      annualGrossSalary
    }
    
    # Get count to verify data availability
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
        count
      }
    }
  }
`
