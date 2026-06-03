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
        isDeleted: { _eq: false }
      }
      orderBy: [{ employeeId: ASC }, { activeFrom: DESC }, { createdAt: DESC }]
    ) {
      id
      employeeId
      activeFrom
      activeTo
      annualGrossSalary
    }
  }
`
