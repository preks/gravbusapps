export const getContactsQuery = `
  query GetContacts($offset: Int, $limit: Int, $where: ContactBoolExp) {
    Contact(
      offset: $offset, 
      limit: $limit,
      where: $where
    ) {
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
