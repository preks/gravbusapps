export const getEmployeesQuery = `
  query GetEmployees($offset: Int, $limit: Int) {
    Employee(offset: $offset, limit: $limit) {
      id
      fullName
      createdAt
      updatedAt
    }
  }
`;