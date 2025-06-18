export const getContactsQuery = `
  query GetContacts($offset: Int, $limit: Int) {
    Contact(offset: $offset, limit: $limit) {
      id
      firstName
      lastName
      email
      phone
      createdAt
      updatedAt
    }
  }
`;
