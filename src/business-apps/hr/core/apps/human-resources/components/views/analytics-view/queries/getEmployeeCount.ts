/**
 * GraphQL query to get the total employee count
 */
export const employeeCountQuery = `
query MyQuery {
  EmployeePositionAggregate {
    aggregate {
      count
    }
  }
}

`;
