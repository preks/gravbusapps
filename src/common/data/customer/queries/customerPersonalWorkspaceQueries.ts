/**
 * Customer Personal Workspace Queries
 * GraphQL queries for personal workspace views (My Activities, My Tasks, My KPIs)
 */

// =====================================================
// MY ACTIVITIES QUERIES
// =====================================================

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

export const GET_MY_ACTIVITIES_PAGINATED = `
  query GetMyActivitiesPaginated(
    $employeeId: uuid!
    $limit: Int!
    $offset: Int!
    $orderBy: [SalesActivityOrderBy!]
  ) {
    SalesActivity(
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
    SalesActivityAggregate(
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
// MY TASKS QUERIES
// =====================================================

export const GET_MY_TASKS = `
  query GetMyTasks(
    $employeeId: uuid!
    $limit: Int
    $offset: Int
    $statusFilter: [String!]
  ) {
    SalesTask(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { status: { value: { _in: $statusFilter } } }
        ]
      }
      orderBy: [{ dueDate: ASC_NULLS_LAST }, { priority: { value: DESC } }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      description
      createdAt
      dueDate
      startDate
      status {
        value
        code
      }
      priority {
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
        name
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
    SalesTaskAggregate(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { status: { value: { _in: $statusFilter } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_UPCOMING_TASKS = `
  query GetUpcomingTasks($employeeId: uuid!, $limit: Int!) {
    SalesTask(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { status: { value: { _in: ["PENDING", "IN_PROGRESS"] } } }
        ]
      }
      orderBy: [{ dueDate: ASC_NULLS_LAST }]
      limit: $limit
    ) {
      id
      name
      dueDate
      priority {
        value
      }
      status {
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
    }
  }
`

// =====================================================
// MY KPIS QUERIES
// =====================================================

export const GET_MY_KPIS = `
  query GetMyKpis(
    $employeeId: uuid!
    $currentMonthStart: timestamptz!
    $previousMonthStart: timestamptz!
    $previousMonthEnd: timestamptz!
    $currentQuarterStart: timestamptz!
    $previousQuarterStart: timestamptz!
    $previousQuarterEnd: timestamptz!
  ) {
    # Current Month Data
    currentLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentConvertedLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
        leadStatus: { code: { _eq: "CONVERTED" } }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentWonOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Previous Month Data
    previousLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total Counts
    totalLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Accounts Data (Quarterly Comparison)
    currentQuarterAccounts: AccountAggregate(
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
    
    previousQuarterAccounts: AccountAggregate(
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
    
    totalAccounts: AccountAggregate(
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
