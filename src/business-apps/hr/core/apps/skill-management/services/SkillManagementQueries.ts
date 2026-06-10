export const GET_SKILLS_DIRECTORY = `
query GetSkillsDirectory($limit: Int = 500, $offset: Int = 0) {
  skills: Skill(
    where: { isDeleted: { _eq: false } }
    orderBy: { name: ASC }
    limit: $limit
    offset: $offset
  ) {
    id
    version
    name
    description
    mandatory
    skillCategoryId
    activeFrom
    activeTo
    employeeSkillsAggregate(where: { isDeleted: { _eq: false }, employee: { isDeleted: { _eq: false } } }) {
      aggregate {
        count
      }
    }
  }
}
`

export const GET_SKILL_DETAILS = `
query GetSkillDetails($skillId: uuid!) {
  skill: SkillByPk(id: $skillId) {
    id
    name
    description
    levelScale
    mandatory
    isDeleted
    activeFrom
    activeTo
    recordState
    createdAt
    updatedAt
    createdBy
    employeeSkillsAggregate(where: { isDeleted: { _eq: false }, employee: { isDeleted: { _eq: false } } }) {
      aggregate {
        count
      }
    }
  }
}
`

export const GET_EMPLOYEES_WITH_SKILL = `
query GetEmployeesWithSkill($skillId: uuid!, $limit: Int = 20, $offset: Int = 0) {
  employeeSkills: EmployeeSkill(
    where: {
      skillId: { _eq: $skillId }
      isDeleted: { _eq: false }
      employee: { isDeleted: { _eq: false } }
    }
    limit: $limit
    offset: $offset
  ) {
    id
    level
    employeeSkillStatus
    employee {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
    }
  }
  employeeSkillsAggregate: EmployeeSkillAggregate(
    where: {
      skillId: { _eq: $skillId }
      isDeleted: { _eq: false }
      employee: { isDeleted: { _eq: false } }
    }
  ) {
    aggregate {
      count
    }
  }
}
`

export const GET_SKILL_CATEGORIES = `
query GetSkillCategories {
  skillCategories: SkillCategory(
    where: { isDeleted: { _eq: false } }
    orderBy: { name: ASC }
  ) {
    id
    name
    description
    isDeleted
    version
  }
}
`

export const GET_SKILL_CATEGORY_SKILLS = `
query GetSkillCategorySkills {
  skillCategorySkills: Skill(
    where: { isDeleted: { _eq: false } }
  ) {
    id
    skillCategoryId
    skillCategory {
      id
      name
    }
  }
}
`

export const GET_PENDING_EMPLOYEE_SKILLS = `
query GetPendingEmployeeSkills($limit: Int = 50, $offset: Int = 0) {
  pendingSkills: EmployeeSkill(
    where: {
      isDeleted: { _eq: false }
      employeeSkillStatus: { _eq: "PENDING_SKILL_STATUS" }
      employee: { isDeleted: { _eq: false } }
    }
    orderBy: { createdAt: DESC }
    limit: $limit
    offset: $offset
  ) {
    id
    businessKey
    level
    processInstanceId
    employeeSkillStatus
    createdAt
    employee {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
    }
    skill {
      id
      name
      description
    }
  }
  pendingSkillsAggregate: EmployeeSkillAggregate(
    where: {
      isDeleted: { _eq: false }
      employeeSkillStatus: { _eq: "PENDING_SKILL_STATUS" }
      employee: { isDeleted: { _eq: false } }
    }
  ) {
    aggregate {
      count
    }
  }
}
`

export const GET_EMPLOYEE_SKILLS_FOR_MERGE = `
query GetEmployeeSkillsForMerge($skillId: uuid!) {
  employeeSkills: EmployeeSkill(
    where: {
      skillId: { _eq: $skillId }
      isDeleted: { _eq: false }
      employee: { isDeleted: { _eq: false } }
    }
  ) {
    id
    version
    level
    employeeSkillStatus
    employee {
      id
    }
  }
}
`

export const GET_SKILL_VERSION = `
query GetSkillVersion($skillId: uuid!) {
  skill: SkillByPk(id: $skillId) {
    id
    version
  }
}
`

export const GET_SKILLS_KPI = `
query GetSkillsKpi($today: timestamptz!) {
  totalSkills: SkillAggregate(where: { isDeleted: { _eq: false } }) {
    aggregate {
      count
    }
  }
  activeSkills: SkillAggregate(
    where: {
      isDeleted: { _eq: false }
      _and: [
        { _or: [{ activeFrom: { _isNull: true } }, { activeFrom: { _lte: $today } }] }
        { _or: [{ activeTo: { _isNull: true } }, { activeTo: { _gt: $today } }] }
      ]
    }
  ) {
    aggregate {
      count
    }
  }
  employeesWithSkills: EmployeeSkillAggregate(
    where: { isDeleted: { _eq: false }, employee: { isDeleted: { _eq: false } } }
  ) {
    aggregate {
      count
    }
  }
  pendingRequests: EmployeeSkillAggregate(
    where: {
      isDeleted: { _eq: false }
      employeeSkillStatus: { _eq: "PENDING_SKILL_STATUS" }
      employee: { isDeleted: { _eq: false } }
    }
  ) {
    aggregate {
      count
    }
  }
}
`
