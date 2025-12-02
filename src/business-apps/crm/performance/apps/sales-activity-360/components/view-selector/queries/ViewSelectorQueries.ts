// Time period configurations
export const TIME_PERIODS = {
  SHORT: 7, // 7 days for quick comparisons
  MEDIUM: 14, // 14 days - 2 weeks
  LONG: 30 // 30 days for trend analysis
} as const

// Default period for main analysis
export const ROLLING_PERIOD_DAYS = TIME_PERIODS.MEDIUM // Use 14 days as default

// Query to get comprehensive activity stats with rolling periods
export const GET_ACTIVITY_STATS = `
  query GetActivityStats(
    $todayStart: timestamptz!, 
    $weekStart: timestamptz!, 
    $last30DaysStart: timestamptz!,
    $prev30DaysStart: timestamptz!,
    $prev30DaysEnd: timestamptz!,
    $quarterStart: timestamptz!,
    $lastQuarterStart: timestamptz!,
    $lastQuarterEnd: timestamptz!
  ) {
    # Total activities
    totalActivities: SalesActivityAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    # Today
    today: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { createdAt: { _gte: $todayStart } }] }
    ) {
      aggregate { count }
    }
    # This week
    thisWeek: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { createdAt: { _gte: $weekStart } }] }
    ) {
      aggregate { count }
    }
    # Last 30 days (rolling)
    last30Days: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { createdAt: { _gte: $last30DaysStart } }] }
    ) {
      aggregate { count }
    }
    # Previous 30 days (for comparison)
    prev30Days: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { createdAt: { _gte: $prev30DaysStart, _lt: $prev30DaysEnd } }] }
    ) {
      aggregate { count }
    }
    # This quarter
    thisQuarter: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { createdAt: { _gte: $quarterStart } }] }
    ) {
      aggregate { count }
    }
    # Last quarter (for comparison)
    lastQuarter: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { createdAt: { _gte: $lastQuarterStart, _lt: $lastQuarterEnd } }] }
    ) {
      aggregate { count }
    }
    # By type counts
    accountActivities: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { accountId: { _isNull: false } }] }
    ) {
      aggregate { count }
    }
    contactActivities: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { contactId: { _isNull: false } }] }
    ) {
      aggregate { count }
    }
    leadActivities: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { leadId: { _isNull: false } }] }
    ) {
      aggregate { count }
    }
    opportunityActivities: SalesActivityAggregate(
      where: { _and: [{ isDeleted: { _eq: false } }, { opportunityId: { _isNull: false } }] }
    ) {
      aggregate { count }
    }
    # Active employees with activities
    activeEmployees: SalesActivity(
      where: { isDeleted: { _eq: false } }
      distinctOn: [ownerEmployeeId]
    ) {
      ownerEmployeeId
    }
  }
`

// Query for employee performance with rolling 30-day comparison
export const GET_EMPLOYEE_PERFORMANCE = `
  query GetEmployeePerformance(
    $last30DaysStart: timestamptz!, 
    $prev30DaysStart: timestamptz!,
    $prev30DaysEnd: timestamptz!
  ) {
    # Get all employees who have ever logged activities with their most recent activity
    allActiveEmployees: SalesActivity(
      where: { isDeleted: { _eq: false } }
      distinctOn: [ownerEmployeeId]
      orderBy: [{ ownerEmployeeId: ASC }, { createdAt: DESC }]
    ) {
      ownerEmployeeId
      createdAt
      ownerEmployee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
        employeePosition {
          jobPosition { name }
          organizationalUnit { name }
        }
      }
    }
    
    # Activities in last 30 days per employee
    activitiesLast30Days: SalesActivity(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $last30DaysStart } }
        ]
      }
    ) {
      ownerEmployeeId
    }
    
    # Activities in previous 30 days per employee (for comparison)
    activitiesPrev30Days: SalesActivity(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $prev30DaysStart, _lt: $prev30DaysEnd } }
        ]
      }
    ) {
      ownerEmployeeId
    }
  }
`

// Query for employee absences - fetches all approved absences overlapping with the period
// Uses timestamp type for startDate/endDate (not timestamptz)
export const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences(
    $periodStart: timestamp!,
    $periodEnd: timestamp!,
    $todayStart: timestamp!,
    $todayEnd: timestamp!
  ) {
    # Absences that overlap with analysis period (for counting leave days)
    periodAbsences: EmployeeAbsence(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { status: { _eq: "APPROVED" } }
          {
            _or: [
              { startDate: { _gte: $periodStart, _lte: $periodEnd } }
              { endDate: { _gte: $periodStart, _lte: $periodEnd } }
              {
                _and: [
                  { startDate: { _lte: $periodStart } }
                  { endDate: { _gte: $periodEnd } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      id
      startDate
      endDate
      effectiveDays
      status
      employeeId
      employee {
        id
      }
      type {
        value
        objectValue
      }
    }
    
    # Employees currently on leave today (approved absence where today is between start and end)
    currentlyOnLeave: EmployeeAbsence(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { status: { _eq: "APPROVED" } }
          { startDate: { _lte: $todayEnd } }
          { endDate: { _gte: $todayStart } }
        ]
      }
    ) {
      id
      startDate
      endDate
      effectiveDays
      employeeId
      employee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
        employeePosition {
          jobPosition { name }
          organizationalUnit { name }
        }
      }
      type {
        value
        objectValue
      }
    }
  }
`
