interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>
}

export interface KeyInsightsStatsInput {
  year: number
  typeNames?: string[]
  vacationGroupIds?: string[]
  sickGroupIds?: string[]
}

export interface KeyInsightsStatsResult {
  totalCount: number
  avgDaysPerRequest: number
  approvalRatePct: number
  plannedPct: number
  unplannedPct: number
  vacationCount: number
  sickCount: number
}

export const getKeyInsightsStatsByYear = async (
  client: GraphQLRequester,
  params: KeyInsightsStatsInput
): Promise<KeyInsightsStatsResult> => {
  const { year, typeNames = [], vacationGroupIds = [], sickGroupIds = [] } = params
  const startIso = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString()
  const endIso = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString()

  const variableDecls: string[] = ['$whereBase: EmployeeAbsenceBoolExp!', '$whereApproved: EmployeeAbsenceBoolExp!']
  const variables: Record<string, any> = {
    whereBase: {
      _and: [{ isDeleted: { _eq: false } }, { startDate: { _lte: endIso } }, { endDate: { _gte: startIso } }]
    },
    whereApproved: {
      _and: [
        { isDeleted: { _eq: false } },
        { status: { _eq: 'APPROVED' } },
        { startDate: { _lte: endIso } },
        { endDate: { _gte: startIso } }
      ]
    }
  }

  const selections: string[] = [
    `total: EmployeeAbsenceAggregate(where: $whereBase) {
      aggregate { count }
    }`,
    `approved: EmployeeAbsenceAggregate(where: $whereApproved) {
      aggregate { count sum { effectiveDays } }
    }`
  ]

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

  if (vacationGroupIds.length === 0 || sickGroupIds.length === 0) {
    throw new Error('Missing AbsenceGroup IDs for Vacation/Sick')
  }

  variableDecls.push('$vacationGroupIds: [String!]!')
  variables['vacationGroupIds'] = vacationGroupIds
  selections.push(`
    vacationByGroup: EmployeeAbsenceAggregate(
      where: { _and: [ $whereApproved, { type: { parentEntryId: { _in: $vacationGroupIds } } } ] }
    ) { aggregate { count sum { effectiveDays } } }
  `)

  variableDecls.push('$sickGroupIds: [String!]!')
  variables['sickGroupIds'] = sickGroupIds
  selections.push(`
    sickByGroup: EmployeeAbsenceAggregate(
      where: { _and: [ $whereApproved, { type: { parentEntryId: { _in: $sickGroupIds } } } ] }
    ) { aggregate { count sum { effectiveDays } } }
  `)

  const query = `query KeyInsightsByYear(${variableDecls.join(', ')}) { ${selections.join('\n')} }`
  const res: any = await client.request(query, variables)

  const totalCount = Number(res?.total?.aggregate?.count || 0)
  const approvedCount = Number(res?.approved?.aggregate?.count || 0)
  const sumDaysApproved = Number(res?.approved?.aggregate?.sum?.effectiveDays || 0)

  const avgDaysPerRequest = approvedCount > 0 ? Math.round((sumDaysApproved / approvedCount) * 100) / 100 : 0
  const approvalRatePct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  const sickAgg = res?.sickByGroup?.aggregate
  const vacationAgg = res?.vacationByGroup?.aggregate
  const sickCount = Number(sickAgg?.count || 0)
  const vacationCount = Number(vacationAgg?.count || 0)
  const countDenom = vacationCount + sickCount
  const plannedPct = countDenom > 0 ? Math.round((vacationCount / countDenom) * 100) : 0
  const unplannedPct = plannedPct > 0 ? Math.max(0, 100 - plannedPct) : 0

  return {
    totalCount,
    avgDaysPerRequest,
    approvalRatePct,
    plannedPct,
    unplannedPct,
    vacationCount,
    sickCount
  }
}
