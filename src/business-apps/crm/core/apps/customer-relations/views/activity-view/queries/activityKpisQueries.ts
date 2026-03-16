/**
 * GraphQL query for Activity KPIs.
 *
 * Single query returning both:
 *   my*   — filtered by $employeeId  (My Workspace Activities tab)
 *   team* — no employee filter        (Activities tab, all users)
 *
 * Mirrors the pattern of GET_CUSTOMER_TASK_STATISTICS.
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
    $lastYearStart: timestamptz!
    $lastYearEnd: timestamptz!
  ) {
    # ── My Activities (current employee) ──────────────────────────────────────

    myTotal: SalesActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myLastYearTotal: SalesActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $lastYearStart, _lte: $lastYearEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myThisWeek: SalesActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $thisWeekStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myLastWeek: SalesActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $lastWeekStart, _lte: $lastWeekEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myThisMonth: SalesActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $thisMonthStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myLastMonth: SalesActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $lastMonthStart, _lte: $lastMonthEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myThisQuarter: SalesActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $thisQuarterStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myLastQuarter: SalesActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $lastQuarterStart, _lte: $lastQuarterEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    # ── Team Activities (all employees, no filter) ────────────────────────────

    teamTotal: SalesActivityAggregate(
      where: { isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamLastYearTotal: SalesActivityAggregate(
      where: { createdAt: { _gte: $lastYearStart, _lte: $lastYearEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamThisWeek: SalesActivityAggregate(
      where: { createdAt: { _gte: $thisWeekStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamLastWeek: SalesActivityAggregate(
      where: { createdAt: { _gte: $lastWeekStart, _lte: $lastWeekEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamThisMonth: SalesActivityAggregate(
      where: { createdAt: { _gte: $thisMonthStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamLastMonth: SalesActivityAggregate(
      where: { createdAt: { _gte: $lastMonthStart, _lte: $lastMonthEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamThisQuarter: SalesActivityAggregate(
      where: { createdAt: { _gte: $thisQuarterStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamLastQuarter: SalesActivityAggregate(
      where: { createdAt: { _gte: $lastQuarterStart, _lte: $lastQuarterEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }
  }
`
