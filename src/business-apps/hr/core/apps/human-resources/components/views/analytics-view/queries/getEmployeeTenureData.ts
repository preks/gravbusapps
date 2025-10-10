/**
 * GraphQL query to fetch hire dates of all active employees for tenure calculation
 *
 * This query retrieves the hire date from employee working conditions
 * to calculate the average tenure across all current employees.
 */
export const getEmployeeTenureDataQuery = `
  query GetEmployeeTenureData {
    # Get ALL employees who are not deleted
    Employee(where: { isDeleted: { _eq: false, _isNull: false } }) {
      id
    }
    
    # Get hire dates for employees who have this data
    EmployeeWorkingCondition(
      where: {
        # Only include non-deleted employees
        employee: {
          isDeleted: { _eq: false, _isNull: false }
        }
      }
    ) {
      # Get employee ID and hire date
      employeeId
      hireDate
    }
  }
`
