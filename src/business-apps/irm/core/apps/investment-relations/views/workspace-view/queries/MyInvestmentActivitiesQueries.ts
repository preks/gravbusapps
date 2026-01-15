/**
 * IRM Activity Queries for Personal Investment Manager
 */
export const GET_MY_INVESTMENT_ACTIVITIES = `
  query GetMyInvestmentActivities(
    $employeeId: uuid!
    $dateFrom: timestamptz
    $dateTo: timestamptz
    $limit: Int
    $offset: Int
  ) {
    InvestmentActivity(
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
        code
        firstName
        lastName
        companyName
      }
      opportunityId
      opportunity {
        id
        name
      }
    }
    InvestmentActivityAggregate(
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

export const GET_RECENT_INVESTMENT_ACTIVITIES = `
  query GetRecentInvestmentActivities($employeeId: uuid!, $limit: Int!) {
    InvestmentActivity(
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
      description
      occurredAt
      createdAt
      activityType {
        value
      }
      ownerEmployeeId
      ownerEmployee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
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
        code
        firstName
        lastName
        companyName
      }
      opportunityId
      opportunity {
        id
        name
      }
    }
  }
`

export const GET_MY_INVESTMENT_ACTIVITIES_PAGINATED = `
  query GetMyInvestmentActivitiesPaginated(
    $employeeId: uuid!
    $limit: Int!
    $offset: Int!
    $orderBy: [InvestmentActivityOrderBy!]
  ) {
    InvestmentActivity(
      where: {
        _and: [
          { ownerEmployeeId: { _eq: $employeeId } }
          { isDeleted: { _eq: false } }
        ]
      }
      orderBy: $orderBy
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
        code
        firstName
        lastName
        companyName
      }
      opportunityId
      opportunity {
        id
        name
      }
    }
    InvestmentActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _eq: $employeeId } }
          { isDeleted: { _eq: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
