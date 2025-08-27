/**
 * Server-side monthly type breakdown using type.value names.
 * This avoids relying on client raw data and keeps counts consistent with overlap logic.
 */

interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>;
}

export const getOverlapTypeBreakdown = async (
  client: GraphQLRequester,
  params: { startIso: string; endIso: string; typeNames: string[] }
): Promise<Record<string, number>> => {
  const { startIso, endIso, typeNames } = params;

  const whereBase = `{
    _and: [
      { isDeleted: { _eq: false } },
      { startDate: { _lte: "${endIso}" } },
      { endDate: { _gte: "${startIso}" } }
    ]
  }`;

  const selections = typeNames.map((name, idx) => `
    t_${idx}: EmployeeAbsenceAggregate(where: { _and: [${whereBase}, { type: { value: { _eq: "${name}" } } }] }) {
      aggregate { count }
    }
  `).join('\n');

  const query = `
    query OverlapTypeBreakdown {
      ${selections}
    }
  `;

  const res: any = await client.request(query);
  const result: Record<string, number> = {};
  typeNames.forEach((name, idx) => {
    const key = `t_${idx}`;
    result[name] = res?.[key]?.aggregate?.count ?? 0;
  });
  return result;
};


