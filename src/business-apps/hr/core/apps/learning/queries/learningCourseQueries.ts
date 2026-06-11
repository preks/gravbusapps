export const GET_LEARNING_COURSES = /* GraphQL */ `
  query GetLearningCourses {
    LearningCourse(where: { isDeleted: { _eq: false } }, orderBy: [{ updatedAt: DESC }, { createdAt: DESC }]) {
      id
      version
      title
      description
      status
      sourceDocumentId
      sourceDocumentHash
      passThreshold
      timeLimitMinutes
      maxAttempts
      allowRetake
      anonymous
      ownerEmployeeId
      ownerEmployee {
        displayName
        firstName
        lastName
      }
      createdAt
      createdBy
      updatedAt
      updatedBy
      isDeleted
    }
  }
`

export const GET_LEARNING_COURSE_DETAILS = /* GraphQL */ `
  query GetLearningCourseDetails($courseId: uuid!) {
    LearningCourse(where: { id: { _eq: $courseId }, isDeleted: { _eq: false } }, limit: 1) {
      id
      version
      title
      description
      status
      sourceDocumentId
      sourceDocumentHash
      passThreshold
      timeLimitMinutes
      maxAttempts
      allowRetake
      anonymous
      ownerEmployeeId
      ownerEmployee {
        displayName
        firstName
        lastName
      }
      createdAt
      updatedAt
      isDeleted
      learningMaterials(where: { isDeleted: { _eq: false } }, orderBy: [{ orderNo: ASC }]) {
        id
        version
        contentDocumentId
        role
        orderNo
      }
      learningCourseVersions(
        where: { isDeleted: { _eq: false } }
        orderBy: [{ versionNo: DESC }, { createdAt: DESC }]
        limit: 1
      ) {
        id
        version
        versionNo
        generatorAgentId
        generatorModelId
        generatorPromptVersion
        publishedAt
        snapshot
        learningQuestions(where: { isDeleted: { _eq: false } }, orderBy: [{ orderNo: ASC }]) {
          id
          version
          orderNo
          prompt
          questionType
          options
          correctKeys
          points
          explanation
          pageReference
        }
        learningScoringGrids(where: { isDeleted: { _eq: false } }, limit: 1) {
          id
          version
          passThreshold
          perQuestion
          bandDefinitions
        }
      }
    }
  }
`

export const GET_LEARNING_QUIZ_QUESTIONS = /* GraphQL */ `
  query GetLearningQuizQuestions($courseVersionId: uuid!) {
    LearningCourseVersion(where: { id: { _eq: $courseVersionId }, isDeleted: { _eq: false } }, limit: 1) {
      id
      learningQuestions(where: { isDeleted: { _eq: false } }, orderBy: [{ orderNo: ASC }]) {
        id
        orderNo
        prompt
        questionType
        options
        points
      }
    }
  }
`

export type { GetLearningCourseDetailsResponse, GetLearningCoursesResponse } from '../types'
