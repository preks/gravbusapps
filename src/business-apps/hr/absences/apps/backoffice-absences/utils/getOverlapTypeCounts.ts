interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>
}

export const getOverlapTypeCountsByYear = async (
  client: GraphQLRequester,
  params: { year: number; typeNames: string[] }
): Promise<Record<string, number>> => {
  const { year, typeNames } = params
  const startIso = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString()
  const endIso = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString()

  const variableDecls: string[] = ['$whereBase: EmployeeAbsenceBoolExp!']
  const variables: Record<string, any> = {
    whereBase: {
      _and: [
        { isDeleted: { _eq: false } },
        { status: { _eq: 'APPROVED' } },
        { startDate: { _lte: endIso } },
        { endDate: { _gte: startIso } }
      ]
    }
  }

  const selections: string[] = []
  typeNames.forEach((name, idx) => {
    const varName = `t_${idx}`
    variableDecls.push(`$${varName}: String!`)
    variables[varName] = name
    selections.push(`
      ${varName}: EmployeeAbsenceAggregate(where: { _and: [$whereBase, { type: { value: { _eq: $${varName} } } }] }) {
        aggregate { count }
      }
    `)
  })

  const query = `
    query OverlapTypeCountsByYear(${variableDecls.join(', ')}) {
      ${selections.join('\n')}
    }
  `

  const res: any = await client.request(query, variables)
  const result: Record<string, number> = {}
  typeNames.forEach((name, idx) => {
    const key = `t_${idx}`
    result[name] = Number(res?.[key]?.aggregate?.count || 0)
  })
  return result
}
