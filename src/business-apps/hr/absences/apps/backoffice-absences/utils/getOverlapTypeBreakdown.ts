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

  // Build a base where via variables to prevent string interpolation issues
  // We'll pass $whereBase and per-type variables ($t_0..$t_n)
  const variableDecls: string[] = [
    '$whereBase: EmployeeAbsenceBoolExp!'
  ];
  const selections: string[] = [];
  const variables: Record<string, any> = {
    whereBase: {
      _and: [
        { isDeleted: { _eq: false } },
        { startDate: { _lte: endIso } },
        { endDate: { _gte: startIso } }
      ]
    }
  };

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

  const query = `
    query OverlapTypeBreakdown(${variableDecls.join(', ')}) {
      ${selections.join('\n')}
    }
  `;

  const res: any = await client.request(query, variables);
  const result: Record<string, number> = {};
  typeNames.forEach((name, idx) => {
    const key = `t_${idx}`;
    result[name] = res?.[key]?.aggregate?.count ?? 0;
  });
  return result;
};


