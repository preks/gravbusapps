export const GET_EMPLOYEE_NAME = `
  query GetEmployeeById($employeeId: uuid!) {
    employee: EmployeeByPk(id: $employeeId) {
      firstName
      lastName
      id
    }
  }
`

export const GET_EMPLOYEE_ADDRESS_BY_ID = `
  query EmployeeAddressById($id: uuid!) {
    address: EmployeeAddressByPk(id: $id) {
      id
      version
      type
    }
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

export const GET_BANK_REVIEW_AUX = `
  query GetBankReviewAux(
    $ids: [String!],
    $activeUserLocale: String!,
    $oldAddressId: uuid,
    $newAddressId: uuid
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
    oldAddress: EmployeeAddress(where: {id: {_eq: $oldAddressId}}, limit: 1) { id version type }
    newAddress: EmployeeAddress(where: {id: {_eq: $newAddressId}}, limit: 1) { id version type }
  }
`
