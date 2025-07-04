export const getAccountsQuery = `
  query GetAccounts($offset: Int, $limit: Int, $where: AccountBoolExp ) {
    Account(offset: $offset, limit: $limit, where: $where) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;