/**
 * GraphQL query to get Gap Rate data per Organizational Unit
 * Gap Rate = (Vacant Positions / Total Positions) * 100
 */
export const GET_GAP_RATE_BY_ORG_UNIT = `
  query GetGapRateByOrgUnit($structureId: uuid!) {
    # Get organizational units with their position counts
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
      
      # Get total job positions count for this org unit
      totalPositions: organizationalUnitEmployeeAggregate(
        where: {
          _and: [
            { structureId: { _eq: $structureId } },
            { jobPositionId: { _isNull: false } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Get vacant job positions count for this org unit
      vacantPositions: organizationalUnitEmployeeAggregate(
        where: {
          _and: [
            { structureId: { _eq: $structureId } },
            { jobPositionId: { _isNull: false } },
            { employeeId: { _isNull: true } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`
