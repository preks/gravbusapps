/**
 * GraphQL queries for team-related data
 */

/**
 * Query to fetch team members by manager ID
 */
export const getTeamMembersByManagerQuery = `
  query GetTeamMembersByManager($managerId: uuid!) {
    Employee(
      where: {
        manager: {
          id: {_eq: $managerId}
        },
        isActive: {_eq: true}
      },
      orderBy: {fullName: ASC}
    ) {
      id
      fullName
      firstName
      lastName
      jobTitle
      department
      profilePicture
    }
  }
`
