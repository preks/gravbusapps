/**
 * GraphQL query to get employee count data grouped by organizational unit
 * This fetches organizational unit assignments to calculate employee distribution across org units
 */
export const getEmployeesByOrgUnitQuery = `
  query getEmployeesByOrgUnit($structureId: uuid!) {
    # Get all organizational unit assignments with employee data
    EmployeeOrganizationalUnit(
      where: {
        structureId: {_eq: $structureId},
        # Only include non-deleted employees
        employee: {
          isDeleted: { _eq: false, _isNull: false }
        }
      }
    ) {
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
`;
