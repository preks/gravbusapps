/**
 * GraphQL query to get employee salary data grouped by organizational unit
 * This fetches employee working conditions with salary information and organizational unit assignments
 * to calculate average salary across different organizational units
 */
export const getSalaryByOrgUnitQuery = `
  query getSalaryByOrgUnit($structureId: uuid!) {
    # Get all employees with their salary information
    EmployeeWorkingCondition(
      where: {
        employee: {
          isDeleted: { _eq: false, _isNull: false }
        },
        isDeleted: { _eq: false }
      }
      orderBy: [{ employeeId: ASC }, { activeFrom: DESC }, { createdAt: DESC }]
    ) {
      id
      employeeId
      monthlyGrossSalary
      activeFrom
      activeTo
      hireDate
      exitDate
    }
    
    # Get all organizational unit assignments with employee data
    EmployeeOrganizationalUnit(where: {structureId: {_eq: $structureId}}) {
      id
      employeeId
      organizationalUnitId
      # Get organizational unit details
      organizationalUnit {
        id
        name
      }
    }
    
    # Get all organizational units for the given structure (excluding deleted)
    OrganizationalUnit(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { structureId: { _eq: $structureId } }
        ]
      }
    ) {
      id
      name
    }
  }
`
