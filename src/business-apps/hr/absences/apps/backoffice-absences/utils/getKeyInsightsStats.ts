interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>;
}

export interface KeyInsightsStatsInput {
  year: number;
  /** Optional: known type names to classify planned vs unplanned */
  typeNames?: string[];
  /** Optional: classify by AbsenceGroup parentEntryId values (preferred) */
  vacationGroupIds?: string[];
  sickGroupIds?: string[];
}

export interface KeyInsightsStatsResult {
  totalCount: number;
  avgDaysPerRequest: number;
  approvalRatePct: number;
  plannedPct: number;
  unplannedPct: number;
  vacationCount: number;
  sickCount: number;
}

/**
 * Fetches core Key Insights metrics for a given year using GraphQL variables.
 * - totalCount: all requests overlapping the year
 * - totalDays: sum of effectiveDays (all statuses)
 * - approvalRatePct: APPROVED count / totalCount * 100
 * - planned/unplanned: derived from type label heuristics using per-type counts
 */
export const getKeyInsightsStatsByYear = async (
  client: GraphQLRequester,
  params: KeyInsightsStatsInput
): Promise<KeyInsightsStatsResult> => {
  const { year, typeNames = [], vacationGroupIds = [], sickGroupIds = [] } = params;
  const startIso = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString();
  const endIso = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString();

  const variableDecls: string[] = ['$whereBase: EmployeeAbsenceBoolExp!', '$whereApproved: EmployeeAbsenceBoolExp!'];
  const variables: Record<string, any> = {
    // Base: all statuses (for approval rate denominator)
    whereBase: {
      _and: [
        { isDeleted: { _eq: false } },
        { startDate: { _lte: endIso } },
        { endDate: { _gte: startIso } }
      ]
    },
    // Approved-only (for approval rate numerator and avg days/request)
    whereApproved: {
      _and: [
        { isDeleted: { _eq: false } },
        { status: { _eq: "APPROVED" } },
        { startDate: { _lte: endIso } },
        { endDate: { _gte: startIso } }
      ]
    }
  };

  const selections: string[] = [
    // All statuses: for approval rate denominator
    `total: EmployeeAbsenceAggregate(where: $whereBase) {
      aggregate { count }
    }`,
    // Approved-only: for approval rate numerator and avg days/request
    `approved: EmployeeAbsenceAggregate(where: $whereApproved) {
      aggregate { count sum { effectiveDays } }
    }`
  ];

  // Per-type counts (optional, used for secondary breakdowns)
  typeNames.forEach((name, idx) => {
    const varName = `t_${idx}`;
    variableDecls.push(`$${varName}: String!`);
    variables[varName] = name;
    selections.push(`
      ${varName}: EmployeeAbsenceAggregate(where: { _and: [$whereBase, { type: { value: { _eq: $${varName} } } }] }) {
        aggregate { count }
      }
    `);
  });

  // Strict: require groupIds; otherwise throw
  if (vacationGroupIds.length === 0 || sickGroupIds.length === 0) {
    throw new Error('Missing AbsenceGroup IDs for Vacation/Sick');
  }

  // Vacation classification selection (require group IDs)
  variableDecls.push('$vacationGroupIds: [String!]!');
  variables['vacationGroupIds'] = vacationGroupIds;
  selections.push(`
    vacationByGroup: EmployeeAbsenceAggregate(
      where: { _and: [ $whereApproved, { type: { parentEntryId: { _in: $vacationGroupIds } } } ] }
    ) { aggregate { count sum { effectiveDays } } }
  `);

  // Sick classification selection (require group IDs)
  variableDecls.push('$sickGroupIds: [String!]!');
  variables['sickGroupIds'] = sickGroupIds;
  selections.push(`
    sickByGroup: EmployeeAbsenceAggregate(
      where: { _and: [ $whereApproved, { type: { parentEntryId: { _in: $sickGroupIds } } } ] }
    ) { aggregate { count sum { effectiveDays } } }
  `);

  const query = `query KeyInsightsByYear(${variableDecls.join(', ')}) { ${selections.join('\n')} }`;
  const res: any = await client.request(query, variables);

  const totalCount = Number(res?.total?.aggregate?.count || 0);
  const approvedCount = Number(res?.approved?.aggregate?.count || 0);
  const sumDaysApproved = Number(res?.approved?.aggregate?.sum?.effectiveDays || 0);

  // Avg days/request: APPROVED only for current year
  const avgDaysPerRequest = approvedCount > 0
    ? Math.round((sumDaysApproved / approvedCount) * 100) / 100
    : 0;
  const approvalRatePct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  // Planned vs Unplanned using ONLY Vacation vs Sick Leave (prefer group IDs, fallback to name patterns)
  const sickAgg = res?.sickByGroup?.aggregate;
  const vacationAgg = res?.vacationByGroup?.aggregate;
  const sickCount = Number(sickAgg?.count || 0);
  const vacationCount = Number(vacationAgg?.count || 0);
  const countDenom = vacationCount + sickCount;
  const plannedPct = countDenom > 0 ? Math.round((vacationCount / countDenom) * 100) : 0;
  const unplannedPct = plannedPct > 0 ? Math.max(0, 100 - plannedPct) : 0;

  return {
    totalCount,
    avgDaysPerRequest,
    approvalRatePct,
    plannedPct,
    unplannedPct,
    vacationCount,
    sickCount
  };
};


