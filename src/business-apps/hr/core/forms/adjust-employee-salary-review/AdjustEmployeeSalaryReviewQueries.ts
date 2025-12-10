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

export const SALARY_ADJUST_REASON_CATALOG_QUERY = `query fetchSalaryAdjustReasonCatalog {
  CatalogEntry(
    where: {
      _and: [
        { catalog: { identifier: { _eq: "SalaryAdjustReason" }, version: { _eq: "v1" } } },
        { isDeleted: { _neq: true } }
      ]
    }
    orderBy: [{ displayOrder: ASC }, { value: ASC }]
  ) {
    id
    code
    value
    displayOrder
    translations {
      localeCode
      value
    }
    catalog {
      identifier
      version
      defaultLocale
    }
  }
}
`
