export const EMPLOYEE_DATA_QUERY = `query fetchEmployee($idEmployee: uuid!) {
  EmployeeByPk(id: $idEmployee) {
    id
    code
    firstName
    lastName
    displayName
    pictureThumbnail
  }
  EmployeePosition(where: {employeeId: {_eq: $idEmployee}}, limit: 1) {
    jobPosition {
      name
    }
  }
}
`

export const CATALOG_DATA_QUERY = `query fetchCatalogData($activeUserLocale: String!) {
  bonusType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "EmployeeBonusType"}}, isDeleted: {_eq: false}}, orderBy: {displayOrder: ASC}) {
    value
    id
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

export const EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY = `query fetchEmployeeBankAccountCurrency($idEmployee: uuid!) {
  EmployeeBankAccount(
    where: {
      employeeId: { _eq: $idEmployee }
      isDeleted: { _eq: false }
    }
    orderBy: [{ createdAt: DESC }]
    limit: 1
  ) {
    currencyRef
  }
}
`

export const GET_EMPLOYEE_REGION_ID = `query GetEmployeeRegionId($employeeId: uuid!) {
  Employee(where: { isDeleted: { _eq: false }, id: { _eq: $employeeId } }) {
    id
    workingCondition {
      region {
        id
      }
    }
  }
}
`

export const GET_REGION_COUNTRY_ID = `query GetRegionCountryId($regionId: String!) {
  CatalogEntry(where: { id: { _eq: $regionId }, isDeleted: { _eq: false } }) {
    id
    additionalValue3
  }
}
`

export const GET_COUNTRY_OBJECT_VALUE = `query GetCountryObjectValue($id: String!) {
  CatalogEntry(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
    id
    objectValue
  }
}
`
