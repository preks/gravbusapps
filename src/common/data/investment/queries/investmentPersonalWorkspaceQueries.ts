/**
 * Investment Personal Workspace Queries
 * GraphQL queries for personal workspace views (My Activities, My Tasks, My KPIs)
 */

// =====================================================
// MY INVESTMENT ACTIVITIES QUERIES
// =====================================================

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

// =====================================================
// MY INVESTMENT TASKS QUERIES
// =====================================================

export const GET_MY_INVESTMENT_TASKS = `
  query GetMyInvestmentTasks(
    $employeeId: uuid!
    $limit: Int
    $offset: Int
    $statusFilter: [String!]
  ) {
    InvestmentTask(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { taskStatus: { code: { _in: $statusFilter } } }
        ]
      }
      orderBy: [{ dueDate: ASC_NULLS_LAST }, { taskPriority: { value: DESC } }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      description
      createdAt
      dueDate
      startDate
      taskStatus {
        value
        code
      }
      taskPriority {
        value
      }
      creatorEmployee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
      }
      taskAssignees {
        assignedEmployee {
          id
          displayName
          fullName
          pictureThumbnail
        }
      }
      lead {
        id
        code
        firstName
        lastName
        companyName
      }
      account {
        id
        name
      }
      contact {
        id
        firstName
        lastName
      }
      opportunity {
        id
        name
      }
    }
    InvestmentTaskAggregate(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { taskStatus: { code: { _in: $statusFilter } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

// =====================================================
// MY INVESTMENT KPIS QUERIES
// =====================================================

export const GET_MY_INVESTMENT_KPIS = `
  query GetMyInvestmentKpis(
    $employeeId: uuid!
    $currentQuarterStart: timestamptz!
    $previousQuarterStart: timestamptz!
    $previousQuarterEnd: timestamptz!
  ) {
    # Current Quarter Data
    currentQuarterOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentQuarterAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentQuarterContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentQuarterInvestments: InvestmentAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Previous Quarter Data
    previousQuarterOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousQuarterAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousQuarterContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousQuarterInvestments: InvestmentAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total Counts
    totalOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalInvestments: InvestmentAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
