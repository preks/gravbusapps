export const GET_EMPLOYEE_NAME = `
  query GetEmployeeById($employeeId: uuid!) {
    employee: EmployeeByPk(id: $employeeId) {
      firstName
      lastName
      id
    }
  }
`

export const GET_PERSONAL_REVIEW_AUX = `
  query GetPersonalReviewAux(
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
