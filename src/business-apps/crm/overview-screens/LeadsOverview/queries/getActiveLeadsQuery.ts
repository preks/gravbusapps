export const getActiveLeadsQuery = `
  query GetActiveLeads($offset: Int, $limit: Int) {
    Lead(offset: $offset, limit: $limit, where: { isDeleted: { _eq: false } }) {
      id
      createdAt
      status {
        id
      }
      version
      companyName
      updatedBy
      updatedAt
      ownerEmployee {
        fullName
      }
      account {
        id
        name
      }
      contact {
        lastName
        firstName
        id
      }
    }
  }
`;
