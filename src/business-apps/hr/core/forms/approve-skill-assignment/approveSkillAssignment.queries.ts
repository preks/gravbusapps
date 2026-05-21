export const GET_SKILLS_BY_IDS = `
query GetSkillsByIds($ids: [uuid!]!) {
  Skill(where: { id: { _in: $ids }, isDeleted: { _eq: false } }) {
    id
    name
  }
}
`

export const GET_EMPLOYEE_SKILLS = `
query GetEmployeeSkills($id: uuid!) {
  employee: EmployeeByPk(id: $id) {
    skills(where: { isDeleted: { _eq: false } }) {
      id
      version
      level
      validFrom
      validTo
      verificationDocumentId
      skill {
        id
        name
      }
    }
  }
}
`

export const GET_EMPLOYEE_DOCUMENTS_BY_IDS = `
query GetEmployeeDocumentsByIds($ids: [uuid!]!) {
  EmployeeDocument(where: { id: { _in: $ids }, isDeleted: { _eq: false } }) {
    id
    version
    employeeId
    type
    name
    file
    mimeType
    fileSize
  }
}
`
