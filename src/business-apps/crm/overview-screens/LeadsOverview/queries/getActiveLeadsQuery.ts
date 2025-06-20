export const getActiveLeadsQuery = `
  query GetActiveLeads($offset: Int, $limit: Int) {
    Lead(offset: $offset, limit: $limit, where: { isDeleted: { _eq: false } }) {
      id
      name
      createdAt
      status {
        id
      }
      version
      companyName
      updatedBy
      updatedAt
      ownerEmployee {
        id
        fullName
      }
      account {
        id
        name
      }
      contact {
        id
        lastName
        firstName
        email
        phone
      }
      leadSource {
        value
        id
      }
      leadStatus {
        value
        id
      }
      leadRating {
        value
        id
      }
    }
  }
`;
