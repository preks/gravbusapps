/**
 * GraphQL query to fetch data for calculating the probation rate by organizational unit
 * Probation Rate = (Employees currently in probation in org unit) / (Total Employees in org unit) * 100
 * Only counts employees with a probation end date in the future
 */
export const GET_PROBATION_RATE_BY_ORG_UNIT = `
  query GetProbationRateByOrgUnit($structureId: uuid!) {
    # Get all organizational units for the given structure
    OrganizationalUnit(
      where: {
        structureId: {_eq: $structureId},
        isDeleted: { _eq: false }
      }
    ) {
      id
      name
    }
    
    # Get all employees in organizational units with their org unit ID
    EmployeeOrganizationalUnit(
      where: {
        structureId: {_eq: $structureId},
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      organizationalUnitId
      employeeId
    }
    
    # Get all employees with probation end dates greater than today
    EmployeeWorkingCondition(
      where: {
        probationEnd: { 
          _isNull: false,
          _gt: "now()"
        }
      }
    ) {
      employeeId
    }
  }
`
