/**
 * GraphQL queries for Activity KPIs (IRM)
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
    totalActivities: InvestmentActivityAggregate(
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
    lastYearTotal: InvestmentActivityAggregate(
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
    thisYearActivities: InvestmentActivityAggregate(
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
    thisWeekActivities: InvestmentActivityAggregate(
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
    lastWeekActivities: InvestmentActivityAggregate(
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
    thisMonthActivities: InvestmentActivityAggregate(
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
    lastMonthActivities: InvestmentActivityAggregate(
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
    thisQuarterActivities: InvestmentActivityAggregate(
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
    lastQuarterActivities: InvestmentActivityAggregate(
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
