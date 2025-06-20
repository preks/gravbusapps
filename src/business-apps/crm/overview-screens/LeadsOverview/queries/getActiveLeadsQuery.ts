
export const getActiveLeadsQuery = `
  query GetActiveLeads($offset: Int, $limit: Int) {
    Lead(offset: $offset, limit: $limit) {
    id
		ownerEmployee {
      fullName
    }
    createdAt
    status {
      id
    }
    version
    companyName
    updatedBy
    updatedAt
  }
  }
`;
