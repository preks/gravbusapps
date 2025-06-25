// GraphQL queries as plain template strings

/**
 * Query to fetch all opportunities
 */
export const GET_OPPORTUNITIES = `
  query GetOpportunities($offset: Int, $limit: Int) {
    Opportunity(offset: $offset, limit: $limit) {
      id
      version
      account {
        name
      }
      createdAt
      currency {
        id
      }
      name
      ownerEmployee {
        fullName
        id
      }
      estimatedAmount
      stage
    }
  }
`;

