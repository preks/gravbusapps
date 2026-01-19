/**
 * GraphQL query to fetch employee demographic data
 * Retrieves employee information including gender, nationality, birth date, and hire date
 * Used to generate demographic distribution charts and statistics
 */
export const getEmployeeDemographicDataQuery = `
  query GetEmployeeDemographics {
    EmployeePosition(
      orderBy: [{ firstName: ASC }, { lastName: ASC }],
      where: {
        employee: {
          isDeleted: { _eq: false }
        }
      }
    ) {
      hireDate
      employee {
        id
        firstName
        lastName
        birthDate
        gender {
          value
          id
        }
        nationality {
          value
          id
        }
      }
    }
    
    # Get the total count to ensure it matches with the employee compensation table
    EmployeePositionAggregate {
      aggregate {
        count
      }
    }
  }
`
