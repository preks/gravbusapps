export const ADD_SKILL_QUERY = `query MyQuery($id: uuid!) {
  employee: EmployeeByPk(id: $id) {
    firstName
    lastName
    id
    pictureThumbnail
    employeePosition {
      jobPosition {
        name
      }
    }
    skills(where: {isDeleted: {_eq: false}}) {
      version
      id
      level
      activeFrom
      activeTo
      skill {
        id
        name
      }
    }
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
