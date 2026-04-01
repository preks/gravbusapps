/**
 * GraphQL queries related to employee documents
 */

export const employeeDocumentsQuery = `
query screenData($employeeId: uuid!, $activeUserLocale: String = "en-US") {
  EmployeeDocument(where: {isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}}) {
    id
    version
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
  documentType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentType"}}, isDeleted: {_eq: false}}) {
    id
    value
    code
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    parentEntryId
  }
  documentGroup: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentGroup"}}, additionalValue1: {_eq: "HRM"}, isDeleted: {_eq: false}}) {
    id
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
  }
}
`

export const documentTypeCatalogQuery = `
query catalogData($documentTypeRefs: [String!]!, $activeUserLocale: String = "en-US") {
  CatalogEntry(where: {id: {_in: $documentTypeRefs}, isDeleted: {_eq: false}}) {
    id
    value
    code
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
}
`
