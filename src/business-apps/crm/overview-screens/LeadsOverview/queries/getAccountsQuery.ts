export const getAccountsQuery = `
  query GetAccounts($offset: Int, $limit: Int) {
    Account(offset: $offset, limit: $limit) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;