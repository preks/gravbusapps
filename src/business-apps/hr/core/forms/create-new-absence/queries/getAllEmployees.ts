export const getAllEmployees = `
  query GetAllEmployees($excludeUserId: String!, $activeStructure: uuid!) {
    Employee(where: {isDeleted: {_eq: false}, userId: {_neq: $excludeUserId}, employeePosition: {structureId: {_eq: $activeStructure}}}, orderBy: {firstName: ASC, lastName: ASC}) {
      id
      userId
      firstName
      lastName
    }
  }
`
