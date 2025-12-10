// Fetch existing employee additional properties for the properties screen
export const GET_EMPLOYEE_ADDITIONAL_PROPS = `
query GetEmployeeAdditionalProps($id: uuid!) {
  Employee(where: { employeePosition: { employeeId: { _eq: $id } } }, limit: 1) {
    id
    firstName
    lastName
    pictureThumbnail
    additionalProperties(path: "$.selectionSet.EmployeePosition.selectionSet.additionalProperties")
    version
    code
    employeePosition {
      employeeId
      employee {
        additionalProperties
      }
      jobPosition {
        name
      }
    }
  }
}
`
