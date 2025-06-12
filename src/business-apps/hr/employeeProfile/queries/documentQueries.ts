/**
 * GraphQL queries related to employee documents
 */

export const employeeDocumentsQuery = `
query screenData($employeeId: uuid!) {
  EmployeeDocument(where: {isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}}) {
    id
    employeeId
    name
    file
    documentGroup
    createdBy
    description
    type
    mimeType
    employee {
      firstName
      lastName
      employeePosition {
        supervisor {
          id
        }
      }
    }
    createdAt
    validTo
  }
  documentType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentType"}}}) {
    id
    value
    code
  }
}
`;

export const documentTypeCatalogQuery = `
query catalogData($documentTypeRefs: [String!]!) {
  CatalogEntry(where: {id: {_in: $documentTypeRefs}}) {
    id
    value
    code
  }
}
`;
