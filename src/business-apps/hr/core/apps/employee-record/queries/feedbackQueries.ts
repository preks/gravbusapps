/**
 * GraphQL queries for employee feedback data
 */

/** Page size for received/given feedback list (server-side pagination). */
export const FEEDBACK_LIST_LIMIT = 10

/** List query with filters and pagination; use for both received and given tabs. */
export const employeeFeedbackListQuery = `
  query GetEmployeeFeedbackList(
    $where: EmployeeFeedbackBoolExp!
    $limit: Int!
    $offset: Int!
    $activeUserLocale: String!
  ) {
    EmployeeFeedback(
      where: $where
      orderBy: [{ feedbackDate: DESC }, { createdAt: DESC }]
      limit: $limit
      offset: $offset
    ) {
      id
      createdAt
      feedback
      feedbackDate
      feedbackPublic
      senderEmployeeId
      employeeId
      rating
      typeRef
      additionalProperties
      type {
        id
        value
        objectValue
        translations(where: { localeCode: { _eq: $activeUserLocale } }) {
          localeCode
          value
        }
      }
      senderEmployee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          employee {
            pictureThumbnail
          }
        }
      }
      employee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          employee {
            pictureThumbnail
          }
        }
      }
    }
    EmployeeFeedbackAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const employeeFeedbackQuery = `
  query GetEmployeeFeedback($employeeId: uuid!, $activeUserLocale: String!) {
    EmployeeFeedback(where: {
      employeeId: {_eq: $employeeId},
      isDeleted: {_neq: true}
    }, orderBy: {feedbackDate: DESC}) {
      id
      createdAt
      feedback
      feedbackDate
      feedbackPublic
      senderEmployeeId
      employeeId
      rating
      feedbackPublic
      typeRef
      type {
        id
        value
        objectValue
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
      }
      additionalProperties
      senderEmployee {
        firstName
        lastName
        employeePosition {
          employee {
            pictureThumbnail
          }
        }
      }
    }
  }
`

/** Feedback given by current user (sender_employee_id = currentUser). */
export const employeeFeedbackGivenQuery = `
  query GetEmployeeFeedbackGiven($senderEmployeeId: uuid!, $activeUserLocale: String!) {
    EmployeeFeedback(
      where: $where
      orderBy: [{ feedbackDate: DESC }, { createdAt: DESC }]
      limit: $limit
      offset: $offset
    ) {
      id
      createdAt
      feedback
      feedbackDate
      feedbackPublic
      senderEmployeeId
      employeeId
      rating
      typeRef
      additionalProperties
      type {
        id
        value
        objectValue
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
      }
      senderEmployee {
        id
        firstName
        lastName
        displayName
        employeePosition { employee { pictureThumbnail } }
      }
      employee {
        id
        firstName
        lastName
        displayName
        employeePosition { employee { pictureThumbnail } }
      }
    }
    EmployeeFeedbackAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

/**
 * Dedicated query for Insights tab.
 * Keeps Insights independent from list-tab loading order.
 */
export const employeeFeedbackInsightsQuery = `
  query GetEmployeeFeedbackInsights(
    $employeeId: uuid!
    $senderEmployeeId: uuid!
    $activeUserLocale: String!
  ) {
    insightsRows: EmployeeFeedback(
      where: {
        isDeleted: { _neq: true }
        _or: [
          { employeeId: { _eq: $employeeId } }
          { senderEmployeeId: { _eq: $senderEmployeeId } }
        ]
      }
      orderBy: [{ feedbackDate: DESC }, { createdAt: DESC }]
    ) {
      id
      createdAt
      feedbackDate
      feedbackPublic
      senderEmployeeId
      typeRef
      additionalProperties
      type {
        id
        value
        objectValue
        translations(where: { localeCode: { _eq: $activeUserLocale } }) {
          localeCode
          value
        }
      }
    }
    receivedSenderRows: EmployeeFeedback(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _neq: true }
      }
    ) {
      senderEmployeeId
    }
    totalRows: EmployeeFeedbackAggregate(
      where: {
        isDeleted: { _neq: true }
        _or: [
          { employeeId: { _eq: $employeeId } }
          { senderEmployeeId: { _eq: $senderEmployeeId } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    publicRows: EmployeeFeedbackAggregate(
      where: {
        isDeleted: { _neq: true }
        feedbackPublic: { _eq: true }
        _or: [
          { employeeId: { _eq: $employeeId } }
          { senderEmployeeId: { _eq: $senderEmployeeId } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    privateRows: EmployeeFeedbackAggregate(
      where: {
        isDeleted: { _neq: true }
        feedbackPublic: { _eq: false }
        _or: [
          { employeeId: { _eq: $employeeId } }
          { senderEmployeeId: { _eq: $senderEmployeeId } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

// Fetch feedback requests for an employee with reviewers
export const employeeFeedbackRequestsQuery = `
  query GetEmployeeFeedbackRequests($employeeId: uuid!) {
    EmployeeFeedbackRequest(
      where: { employeeId: { _eq: $employeeId } }
      orderBy: { requestedOn: DESC }
    ) {
      id
      employeeId
      message
      requestedOn
      dueDate
      recordState
      employeeFeedbackRequestReviewer(orderBy: { createdAt: DESC }) {
        id
        reviewerEmployeeId
        reviewerEmployee {
          id
          firstName
          lastName
          employeePosition {
            employee { pictureThumbnail }
          }
        }
      }
    }
  }
`
