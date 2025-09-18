interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>;
}

export interface MonthlyAggregateResult {
  byMonthCount: number[]; // index 0..11
}

export const getMonthlyAggregates = async (
  client: GraphQLRequester,
  year: number
): Promise<MonthlyAggregateResult> => {
  const varDecls: string[] = [];
  const variables: Record<string, any> = {};
  const selections: string[] = [];

  for (let m = 0; m < 12; m++) {
    const startIso = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0)).toISOString();
    const endIso = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999)).toISOString();
    const whereVar = `wm_${m}`;
    varDecls.push(`$${whereVar}: EmployeeAbsenceBoolExp!`);
    variables[whereVar] = {
      _and: [
        { isDeleted: { _eq: false } },
        { status: { _eq: "APPROVED" } },
        { startDate: { _lte: endIso } },
        { endDate: { _gte: startIso } }
      ]
    };
    selections.push(`
      m_${m}: EmployeeAbsenceAggregate(where: $${whereVar}) { aggregate { count } }
    `);
  }

  const query = `query MonthlyAggregates(${varDecls.join(', ')}) { ${selections.join('\n')} }`;
  const res: any = await client.request(query, variables);
  const byMonthCount: number[] = [];
  for (let m = 0; m < 12; m++) {
    byMonthCount[m] = Number(res?.[`m_${m}`]?.aggregate?.count || 0);
  }
  return { byMonthCount };
};


