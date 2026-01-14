export const GET_MY_ACTIVITIES = `
  query GetMyActivities(
    $employeeId: uuid!
    $dateFrom: timestamptz
    $dateTo: timestamptz
    $limit: Int
    $offset: Int
  ) {
    SalesActivity(
      where: {
        _and: [
          { ownerEmployeeId: { _eq: $employeeId } }
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $dateFrom, _lte: $dateTo } }
        ]
      }
      orderBy: [{ occurredAt: DESC_NULLS_LAST }, { createdAt: DESC }]
      limit: $limit
      offset: $offset
    ) {
      id
      title
      description
      occurredAt
      createdAt
      activityType {
        id
        value
        code
      }
      accountId
      account {
        id
        name
      }
      contactId
      contact {
        id
        firstName
        lastName
      }
      leadId
      lead {
        id
        name
      }
      opportunityId
      opportunity {
        id
        name
      }
    }
    SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _eq: $employeeId } }
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $dateFrom, _lte: $dateTo } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_RECENT_ACTIVITIES = `
  query GetRecentActivities($employeeId: uuid!, $limit: Int!) {
    SalesActivity(
      where: {
        _and: [
          { ownerEmployeeId: { _eq: $employeeId } }
          { isDeleted: { _eq: false } }
        ]
      }
      orderBy: [{ occurredAt: DESC_NULLS_LAST }]
      limit: $limit
    ) {
      id
      title
      occurredAt
      activityType {
        value
      }
      accountId
      account {
        id
        name
      }
      contactId
      contact {
        id
        firstName
        lastName
      }
      leadId
      lead {
        id
        name
      }
      opportunityId
      opportunity {
        id
        name
      }
    }
  }
`
