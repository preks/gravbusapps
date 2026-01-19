interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>
}

const buildOverlapWhereVars = (startIso: string, endIso: string) => ({
  _and: [
    { isDeleted: { _eq: false } },
    { status: { _eq: 'APPROVED' } },
    { startDate: { _lte: endIso } },
    { endDate: { _gte: startIso } }
  ]
})

export const getYearRange = async (client: GraphQLRequester): Promise<{ minYear: number; maxYear: number } | null> => {
  if (!client || typeof client.request !== 'function') {
    throw new Error('Invalid client provided to getYearRange')
  }

  const q = `
    query MinMaxYears {
      min: EmployeeAbsence(orderBy: [{ startDate: ASC }], limit: 1, where: { isDeleted: { _eq: false } }) { startDate }
      max: EmployeeAbsence(orderBy: [{ startDate: DESC }], limit: 1, where: { isDeleted: { _eq: false } }) { startDate }
    }
  `

  const res: any = await client.request(q)
  const minDate = res?.min?.[0]?.startDate ? new Date(res.min[0].startDate) : null
  const maxDate = res?.max?.[0]?.startDate ? new Date(res.max[0].startDate) : null

  if (!minDate || !maxDate) return null

  return { minYear: minDate.getUTCFullYear(), maxYear: maxDate.getUTCFullYear() }
}

export const getYearlyDaysAggregates = async (
  client: GraphQLRequester,
  fromYear: number,
  toYear: number
): Promise<Record<number, number>> => {
  const varDecls: string[] = []
  const variables: Record<string, any> = {}
  const selections: string[] = []

  for (let y = fromYear; y <= toYear; y++) {
    const startIso = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)).toISOString()
    const endIso = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)).toISOString()
    const whereVar = `where_${y}`
    varDecls.push(`$${whereVar}: EmployeeAbsenceBoolExp!`)
    variables[whereVar] = buildOverlapWhereVars(startIso, endIso)
    selections.push(`
      y_${y}: EmployeeAbsenceAggregate(where: $${whereVar}) { aggregate { sum { effectiveDays } } }
    `)
  }

  const query = `query YearlyDaysAggregates(${varDecls.join(', ')}) { ${selections.join('\n')} }`
  const res: any = await client.request(query, variables)
  const map: Record<number, number> = {}
  for (let y = fromYear; y <= toYear; y++) {
    map[y] = Number(res?.[`y_${y}`]?.aggregate?.sum?.effectiveDays || 0)
  }
  return map
}
