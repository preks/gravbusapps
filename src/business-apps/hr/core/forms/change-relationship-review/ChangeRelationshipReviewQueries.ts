export const GET_EMPLOYEE_NAME = `
  query GetEmployeeById($employeeId: uuid!) {
    employee: EmployeeByPk(id: $employeeId) {
      firstName
      lastName
      id
    }
  }
`

export const GET_EMPLOYEE_DOCUMENT_BY_ID = `
  query EmployeeDocumentById($id: uuid!) {
    doc: EmployeeDocumentByPk(id: $id) {
      id
      version
      name
    }
  }
`

export const GET_RELATIONSHIP_REVIEW_AUX = `
  query GetRelationshipReviewAux(
    $ids: [String!],
    $activeUserLocale: String!,
    $oldDocId: uuid,
    $newDocId: uuid
  ) {
    entries: CatalogEntry(where: {id: {_in: $ids}}) {
      id
      value
      code
      alternativeCode
      additionalValue1
      additionalValue2
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog { identifier version defaultLocale }
    }
    docOld: EmployeeDocument(where: {id: {_eq: $oldDocId}}, limit: 1) { id version name }
    docNew: EmployeeDocument(where: {id: {_eq: $newDocId}}, limit: 1) { id version name }
  }
`

export const GET_CATALOG_ENTRIES_BY_IDS = `
  query GetCatalogEntriesByIds($ids: [String!], $activeUserLocale: String!) {
    entries: CatalogEntry(where: {id: {_in: $ids}}) {
      id
      value
      code
      alternativeCode
      additionalValue1
      additionalValue2
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog { identifier version defaultLocale }
    }
  }
`
