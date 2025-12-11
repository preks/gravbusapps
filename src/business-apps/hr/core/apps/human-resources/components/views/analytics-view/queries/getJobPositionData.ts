/**
 * GraphQL query to get job position data for calculating Gap Rate
 * Gap Rate = (Total Job Positions without assigned employees) / (Total Job Positions)
 */
export const GET_JOB_POSITION_DATA = `
  query GetJobPositionData($structureId: uuid!) {
    # Get the total count of job positions in the structure
    TotalJobPositionAggregate: JobPositionAggregate(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { organizationalUnitEmployees: { 
              structureId: { _eq: $structureId },
              jobPositionId: { _isNull: false },
              organizationalUnit: { isDeleted: { _eq: false } }
            } 
          }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Get count of job positions with no employee assigned (vacant positions)
    VacantJobPositionAggregate: JobPositionAggregate(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { organizationalUnitEmployees: { 
              structureId: { _eq: $structureId },
              jobPositionId: { _isNull: false },
              employeeId: { _isNull: true },
              organizationalUnit: { isDeleted: { _eq: false } }
            }
          }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
