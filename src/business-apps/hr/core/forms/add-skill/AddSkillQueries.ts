export const ADD_SKILL_QUERY = `query MyQuery($id: uuid!, $structureId: uuid!) {
  employee: EmployeeByPk(id: $id) {
    firstName
    lastName
    id
    skills(where: {isDeleted: {_eq: false}}) {
      version
      id
      skill {
        id
        name
      }
    }
  }
  allEmployees: Employee(where: {isDeleted: {_eq: false}, employeePosition: {structureId: {_eq: $structureId}}}, orderBy: {firstName: ASC}) {
    firstName
    lastName
    id
  }
}
`

export const SEARCH_SKILLS_QUERY = `
query SearchSkills($search: String!, $limit: Int = 30) {
  skill: Skill(
    where: { isDeleted: { _eq: false }, name: { _ilike: $search } }
    orderBy: { name: ASC }
    limit: $limit
  ) {
    id
    name
    version
  }
}
`

export const GET_SKILLS_BY_NAMES = `
query GetSkillsByNames($names: [String!]!) {
  skill: Skill(
    where: { isDeleted: { _eq: false }, name: { _in: $names } }
    orderBy: { name: ASC }
  ) {
    id
    name
    version
  }
}
`
