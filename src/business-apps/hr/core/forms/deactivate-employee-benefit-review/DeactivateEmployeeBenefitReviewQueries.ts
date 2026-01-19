export const GET_EMPLOYEE_NAME = `
  query GetEmployeeById($employeeId: uuid!) {
    employee: EmployeeByPk(id: $employeeId) {
      firstName
      lastName
      id
      pictureThumbnail
    }
    EmployeePosition(where: {employeeId: {_eq: $employeeId}}, limit: 1) {
      jobPosition {
        name
      }
    }
  }
`

export const GET_INITIATOR_EMPLOYEE_NAME = `
  query GetInitiatorEmployeeById($initiatorEmployeeId: uuid!) {
    initiator: EmployeeByPk(id: $initiatorEmployeeId) {
      firstName
      lastName
      id
    }
  }
`

export const BENEFIT_TYPE_CATALOG_QUERY = `query fetchBenefitTypeCatalog($benefitTypeRef: String!) {
  CatalogEntry(
    where: {
      id: { _eq: $benefitTypeRef }
    }
  ) {
    id
    code
    value
    displayOrder
    objectValue
    translations {
      localeCode
      value
      objectValue
    }
    catalog {
      identifier
      version
      defaultLocale
    }
  }
}
`

export const BENEFIT_PROVIDER_CATALOG_QUERY = `query fetchBenefitProviderCatalog($benefitProviderRef: String!) {
  CatalogEntry(
    where: {
      id: { _eq: $benefitProviderRef }
    }
  ) {
    id
    code
    value
    translations {
      localeCode
      value
    }
  }
}
`
