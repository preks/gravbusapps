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

export const FETCH_BENEFIT_VERSION_QUERY = `
  query FetchBenefitVersion($benefitId: uuid!) {
    EmployeeBenefit(where: { id: { _eq: $benefitId } }) {
      id
      version
    }
  }
`
