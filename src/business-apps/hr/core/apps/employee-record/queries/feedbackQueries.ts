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

/**
 * KPI + suggested actions data.
 * Uses only employee_feedback and employee_feedback_request.
 */
export const employeeFeedbackHubKpiQuery = `
  query GetEmployeeFeedbackHubKpis(
    $employeeId: uuid!
    $senderEmployeeId: uuid!
    $last30Start: timestamp!
    $prev30Start: timestamp!
    $last30StartTz: timestamptz!
    $prev30StartTz: timestamptz!
    $pendingLimit: Int!
    $pendingOffset: Int!
  ) {
    receivedTotal: EmployeeFeedbackAggregate(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _neq: true } }
    ) {
      aggregate {
        count
      }
    }
    receivedLast30: EmployeeFeedbackAggregate(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _neq: true }
        _or: [
          { feedbackDate: { _gte: $last30Start } }
          { _and: [{ feedbackDate: { _isNull: true } }, { createdAt: { _gte: $last30StartTz } }] }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    receivedPrev30: EmployeeFeedbackAggregate(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _neq: true }
        _or: [
          { _and: [{ feedbackDate: { _gte: $prev30Start } }, { feedbackDate: { _lt: $last30Start } }] }
          {
            _and: [
              { feedbackDate: { _isNull: true } }
              { createdAt: { _gte: $prev30StartTz } }
              { createdAt: { _lt: $last30StartTz } }
            ]
          }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    givenTotal: EmployeeFeedbackAggregate(
      where: { senderEmployeeId: { _eq: $senderEmployeeId }, isDeleted: { _neq: true } }
    ) {
      aggregate {
        count
      }
    }
    givenLast30: EmployeeFeedbackAggregate(
      where: {
        senderEmployeeId: { _eq: $senderEmployeeId }
        isDeleted: { _neq: true }
        _or: [
          { feedbackDate: { _gte: $last30Start } }
          { _and: [{ feedbackDate: { _isNull: true } }, { createdAt: { _gte: $last30StartTz } }] }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    givenPrev30: EmployeeFeedbackAggregate(
      where: {
        senderEmployeeId: { _eq: $senderEmployeeId }
        isDeleted: { _neq: true }
        _or: [
          { _and: [{ feedbackDate: { _gte: $prev30Start } }, { feedbackDate: { _lt: $last30Start } }] }
          {
            _and: [
              { feedbackDate: { _isNull: true } }
              { createdAt: { _gte: $prev30StartTz } }
              { createdAt: { _lt: $last30StartTz } }
            ]
          }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    contributorsTotal: EmployeeFeedbackAggregate(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _neq: true }
      }
    ) {
      aggregate {
        count(columns: [senderEmployeeId], distinct: true)
      }
    }
    contributorsLast30: EmployeeFeedbackAggregate(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _neq: true }
        _or: [
          { feedbackDate: { _gte: $last30Start } }
          { _and: [{ feedbackDate: { _isNull: true } }, { createdAt: { _gte: $last30StartTz } }] }
        ]
      }
    ) {
      aggregate {
        count(columns: [senderEmployeeId], distinct: true)
      }
    }
    contributorsPrev30: EmployeeFeedbackAggregate(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _neq: true }
        _or: [
          { _and: [{ feedbackDate: { _gte: $prev30Start } }, { feedbackDate: { _lt: $last30Start } }] }
          {
            _and: [
              { feedbackDate: { _isNull: true } }
              { createdAt: { _gte: $prev30StartTz } }
              { createdAt: { _lt: $last30StartTz } }
            ]
          }
        ]
      }
    ) {
      aggregate {
        count(columns: [senderEmployeeId], distinct: true)
      }
    }
    lastReceived: EmployeeFeedback(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _neq: true } }
      orderBy: [{ feedbackDate: DESC }, { createdAt: DESC }]
      limit: 1
    ) {
      feedbackDate
      createdAt
    }
    lastGiven: EmployeeFeedback(
      where: { senderEmployeeId: { _eq: $senderEmployeeId }, isDeleted: { _neq: true } }
      orderBy: [{ feedbackDate: DESC }, { createdAt: DESC }]
      limit: 1
    ) {
      feedbackDate
      createdAt
    }
    pendingRequests: EmployeeFeedbackRequest(
      where: {
        employeeId: { _eq: $employeeId }
        _or: [
          { statusRef: { _eq: "PENDING" } }
          { statusRef: { _eq: "EmployeeFeedbackRequestStatus:v1:PENDING" } }
          { statusRef: { _isNull: true } }
        ]
        isDeleted: { _neq: true }
      }
      orderBy: { createdAt: DESC }
      limit: $pendingLimit
      offset: $pendingOffset
    ) {
      id
      createdAt
      requesterEmployeeId
      requestedOn
      dueDate
      message
      employeeId
      requesterEmployee {
        id
        displayName
        firstName
        lastName
        employeePosition {
          employee {
            pictureThumbnail
          }
        }
      }
    }
    pendingRequestsAggregate: EmployeeFeedbackRequestAggregate(
      where: {
        employeeId: { _eq: $employeeId }
        _or: [
          { statusRef: { _eq: "PENDING" } }
          { statusRef: { _eq: "EmployeeFeedbackRequestStatus:v1:PENDING" } }
          { statusRef: { _isNull: true } }
        ]
        isDeleted: { _neq: true }
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
