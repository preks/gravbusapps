/**
 * GraphQL queries for Activity KPIs
 */
export const GET_ACTIVITY_KPIS = `
  query GetActivityKpis(
    $employeeId: uuid!
    $thisWeekStart: timestamptz!
    $lastWeekStart: timestamptz!
    $lastWeekEnd: timestamptz!
    $thisMonthStart: timestamptz!
    $lastMonthStart: timestamptz!
    $lastMonthEnd: timestamptz!
    $thisQuarterStart: timestamptz!
    $lastQuarterStart: timestamptz!
    $lastQuarterEnd: timestamptz!
    $thisYearStart: timestamptz!
    $lastYearStart: timestamptz!
    $lastYearEnd: timestamptz!
  ) {
    # Total Activities (All Time)
    totalActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # Last Year Total (for comparison)
    lastYearTotal: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $lastYearStart, _lte: $lastYearEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # This Year YTD (for better comparison)
    thisYearActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $thisYearStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # This Week
    thisWeekActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $thisWeekStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # Last Week
    lastWeekActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $lastWeekStart, _lte: $lastWeekEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # This Month
    thisMonthActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $thisMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # Last Month
    lastMonthActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $lastMonthStart, _lte: $lastMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # This Quarter
    thisQuarterActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $thisQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # Last Quarter
    lastQuarterActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $lastQuarterStart, _lte: $lastQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
