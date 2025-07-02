export const getActiveLeadsQuery = `
  query GetActiveLeads($offset: Int, $limit: Int, $orderBy: [LeadOrderBy!], $where: [LeadBoolExp!]) {
    Lead(offset: $offset, limit: $limit, orderBy: $orderBy, where: { isDeleted: { _eq: false }, _and: $where }) {
      id
      name
      createdAt
      status {
        id
        value
      }
      version
      updatedAt
      updatedBy
      companyName
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
        firstName
        lastName
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
    LeadAggregate(where: { isDeleted: { _eq: false }, _and: $where }) {
      aggregate {
        count
      }
    }
  }
`;
