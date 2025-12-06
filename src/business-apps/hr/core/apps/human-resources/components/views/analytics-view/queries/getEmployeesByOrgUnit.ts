/**
 * GraphQL query to get employee count data grouped by organizational unit
 * This fetches organizational unit assignments to calculate employee distribution across org units
 */
export const getEmployeesByOrgUnitQuery = `
  query getEmployeesByOrgUnit($structureId: uuid!, $asOf: timestamp!) {
    # Get all organizational unit assignments with employee data
    EmployeeOrganizationalUnit(
      where: {
        structureId: {_eq: $structureId},
        # Only include non-deleted employees
        employee: {
          isDeleted: { _eq: false, _isNull: false },
          # Active as of now(): hireDate <= now AND (exitDate is null OR exitDate > now)
          workingCondition: {
            _and: [
              { hireDate: { _lte: $asOf } },
              { _or: [
                { exitDate: { _isNull: true } },
                { exitDate: { _gt: $asOf } }
              ]}
            ]
          }
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
`
