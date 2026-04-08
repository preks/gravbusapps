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
      validFrom
      validTo
      verificationDocumentId
      verificationDocument {
        id
        type
        validTo
      }
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

/** Document Type catalog for attach verification (Training&Development group only, filtered by parentEntryId in code). */
export const ADD_SKILL_DOCUMENT_CATALOGS_QUERY = `query AddSkillDocumentCatalogs($activeUserLocale: String!) {
  documentType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentType"}}, isDeleted: {_eq: false}}) {
    value
    id
    parentEntryId
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog { defaultLocale }
  }
}
`
