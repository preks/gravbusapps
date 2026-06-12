export const GET_LEARNING_ASSIGNMENTS = /* GraphQL */ `
  query GetLearningAssignments {
    LearningAssignment(where: { isDeleted: { _eq: false } }, orderBy: [{ availableUntil: ASC }, { createdAt: DESC }]) {
      id
      version
      title
      audienceMode
      audienceTargets
      availableFrom
      availableUntil
      status
      companyId
      learningCourseId
      learningCourseVersionId
      learningCourse {
        id
        version
        title
        description
        status
      }
      learningCourseVersion {
        id
        version
        versionNo
        generatorAgentId
        generatorModelId
        generatorPromptVersion
        publishedAt
      }
      learningAssignmentTargets(where: { isDeleted: { _eq: false } }) {
        id
        version
        resolutionSource
        learningAssignmentId
        employeeId
        employee {
          id
          displayName
          firstName
          lastName
          pictureThumbnail
        }
      }
      learningAttempts(where: { isDeleted: { _eq: false } }, orderBy: [{ createdAt: DESC }]) {
        id
        version
        status
        employeeId
        employee {
          id
          displayName
          firstName
          lastName
          pictureThumbnail
        }
        learningAssignmentId
        learningCourseVersionId
        startedAt
        submittedAt
        gradedAt
        timeTakenSeconds
        scoreRaw
        scorePct
        bandLabel
        passed
      }
    }
  }
`

export const RESOLVE_LEARNING_COMPANY = /* GraphQL */ `
  query ResolveLearningCompany($employeeId: uuid!) {
    Employee(where: { id: { _eq: $employeeId }, isDeleted: { _eq: false } }, limit: 1) {
      id
      companyEmployees(orderBy: [{ updatedAt: DESC }], limit: 1) {
        companyId
      }
    }
  }
`

export const GET_LEARNING_ATTEMPT_RESULT = /* GraphQL */ `
  query GetLearningAttemptResult($assignmentId: uuid!, $courseVersionId: uuid!, $userId: String!) {
    LearningAttempt(
      where: {
        isDeleted: { _eq: false }
        learningAssignmentId: { _eq: $assignmentId }
        learningCourseVersionId: { _eq: $courseVersionId }
        employee: { userId: { _eq: $userId } }
      }
      orderBy: [{ createdAt: DESC }]
      limit: 1
    ) {
      id
      status
      scoreRaw
      scorePct
      bandLabel
      passed
      startedAt
      submittedAt
      gradedAt
      timeTakenSeconds
      learningAssignmentId
      learningCourseVersionId
      employeeId
    }
  }
`

export type {
  GetLearningAssignmentsResponse,
  GetLearningAttemptResultResponse,
  ResolveLearningCompanyResponse
} from '../types'
