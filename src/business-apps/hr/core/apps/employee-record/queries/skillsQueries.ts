
export const employeeSkillsQuery = `
  query GetEmployeeSkills($employeeId: uuid!) {
    EmployeeSkill(where: { employee: { id: { _eq: $employeeId } } }) {
      id
      skill {
        id
        name
      }
      level
    }
  }
`;
