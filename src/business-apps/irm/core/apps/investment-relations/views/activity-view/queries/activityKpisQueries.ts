/**
 * GraphQL query for Activity KPIs (IRM).
 *
 * Single query returning both:
 *   my*   — filtered by $employeeId  (My Workspace Activities tab)
 *   team* — no employee filter        (Activities tab, all users)
 *
 * Mirrors GET_INVESTMENT_TASK_STATISTICS pattern.
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

    myTotal: InvestmentActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myLastYearTotal: InvestmentActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $lastYearStart, _lte: $lastYearEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myThisWeek: InvestmentActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $thisWeekStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myLastWeek: InvestmentActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $lastWeekStart, _lte: $lastWeekEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myThisMonth: InvestmentActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $thisMonthStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myLastMonth: InvestmentActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $lastMonthStart, _lte: $lastMonthEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myThisQuarter: InvestmentActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $thisQuarterStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    myLastQuarter: InvestmentActivityAggregate(
      where: { ownerEmployeeId: { _eq: $employeeId }, createdAt: { _gte: $lastQuarterStart, _lte: $lastQuarterEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    # ── Team Activities (all employees, no filter) ────────────────────────────

    teamTotal: InvestmentActivityAggregate(
      where: { isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamLastYearTotal: InvestmentActivityAggregate(
      where: { createdAt: { _gte: $lastYearStart, _lte: $lastYearEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamThisWeek: InvestmentActivityAggregate(
      where: { createdAt: { _gte: $thisWeekStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamLastWeek: InvestmentActivityAggregate(
      where: { createdAt: { _gte: $lastWeekStart, _lte: $lastWeekEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamThisMonth: InvestmentActivityAggregate(
      where: { createdAt: { _gte: $thisMonthStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamLastMonth: InvestmentActivityAggregate(
      where: { createdAt: { _gte: $lastMonthStart, _lte: $lastMonthEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamThisQuarter: InvestmentActivityAggregate(
      where: { createdAt: { _gte: $thisQuarterStart }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    teamLastQuarter: InvestmentActivityAggregate(
      where: { createdAt: { _gte: $lastQuarterStart, _lte: $lastQuarterEnd }, isDeleted: { _eq: false } }
    ) { aggregate { count } }
  }
`
