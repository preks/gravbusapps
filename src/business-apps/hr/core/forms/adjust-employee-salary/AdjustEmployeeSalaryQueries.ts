export const EMPLOYEE_DATA_QUERY = `query fetchEmployee($idEmployee: uuid!) {
  EmployeeByPk(id: $idEmployee) {
    id
    code
    firstName
    lastName
    displayName
  }
}
`

export const EMPLOYEE_COMPENSATION_QUERY = `query fetchEmployeeCompensation($idEmployee: uuid!) {
  EmployeeWorkingCondition(
    where: { employeeId: { _eq: $idEmployee } }
    orderBy: { createdAt: DESC }
    limit: 1
  ) {
    id
    employeeId
    annualGrossSalary
    monthlyGrossSalary
    hourlyGrossSalary
    currencyRef
    currency {
      id
      code
      value
      translations {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
  }
}
`

// No pay frequency catalog query needed - frequency is determined from employee compensation data
