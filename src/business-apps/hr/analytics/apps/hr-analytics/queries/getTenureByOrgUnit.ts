/**
 * GraphQL query to get employee tenure data grouped by organizational unit
 * This fetches employee data with hire dates and organizational unit information
 * to calculate tenure distribution across different organizational units
 */
export const getTenureByOrgUnitQuery = `
  query getTenureByOrgUnit($structureId: uuid!) {
    # Get all employees with their hire dates
    Employee {
      id
      firstName
      lastName
      # Get hire date from working condition
      workingCondition {
        hireDate
      }
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
    
    # Get all organizational units for the given structure
    OrganizationalUnit(where: {structureId: {_eq: $structureId}}) {
      id
      name
    }
  }
`;
