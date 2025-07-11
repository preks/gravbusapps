export const getDocumentByIdQuery = `
  query GetDocumentById($id: uuid!) {
    CrmDocument(
      where: { id: { _eq: $id } }
    ) {
      id
      additionalProperties
    }
  }
`;
