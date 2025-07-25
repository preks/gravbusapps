export const getAllEmployees = `
  query GetAllEmployees($excludeUserId: String!, $activeStructure: uuid!) {
    Employee(where: {isDeleted: {_eq: true}, userId: {_neq: $excludeUserId}, employeePosition: {structureId: {_eq: $activeStructure}}}, orderBy: {firstName: ASC, lastName: ASC}) {
      id
      userId
      firstName
      lastName
    }
  }
`;

