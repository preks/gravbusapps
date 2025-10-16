// import { getCombinedStatisticsQuery, CombinedStatisticsResponse } from '../queries/absenceQueries'
import { getYearRange } from './getYearlyDaysAggregates'

interface GraphQLRequester {
  request: (query: string, variables?: Record<string, any>) => Promise<any>
}

export interface CombinedStatisticsInput {
  year: number
  typeNames: string[]
  vacationGroupIds: string[]
  sickGroupIds: string[]
}

export interface CombinedStatisticsResult {
  distinctTypes: string[]
  typeCounts: Record<string, number>
  keyStats: {
    totalCount: number
    avgDaysPerRequest: number
    approvalRatePct: number
    plannedPct: number
    unplannedPct: number
    vacationCount: number
    sickCount: number
  }
  monthlyCounts: number[]
  yearlyCounts: Record<number, number>
}

export const getCombinedStatistics = async (
  client: GraphQLRequester,
  params: CombinedStatisticsInput
): Promise<CombinedStatisticsResult> => {
  const { year, typeNames, vacationGroupIds, sickGroupIds } = params
  const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString()
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString()

  // Get year range for yearly aggregates
  const yearRange = await getYearRange(client)
  if (!yearRange) {
    throw new Error('Could not get year range')
  }

  // Create a single combined query that gets all the data in one request
  const variableDecls: string[] = ['$whereBase: EmployeeAbsenceBoolExp!', '$whereApproved: EmployeeAbsenceBoolExp!']
  const variables: Record<string, any> = {
    whereBase: {
      _and: [{ isDeleted: { _eq: false } }, { startDate: { _lte: endOfYear } }, { endDate: { _gte: startOfYear } }]
    },
    whereApproved: {
      _and: [
        { isDeleted: { _eq: false } },
        { status: { _eq: 'APPROVED' } },
        { startDate: { _lte: endOfYear } },
        { endDate: { _gte: startOfYear } }
      ]
    }
  }

  const selections: string[] = [
    `distinctTypes: EmployeeAbsence(where: $whereBase, limit: 1000) {
      type { value }
    }`,
    `total: EmployeeAbsenceAggregate(where: $whereBase) {
      aggregate { count }
    }`,
    `approved: EmployeeAbsenceAggregate(where: $whereApproved) {
      aggregate { count sum { effectiveDays } }
    }`
  ]

  // Type-specific counts (for getOverlapTypeCountsByYear)
  typeNames.forEach((name, idx) => {
    const varName = `t_${idx}`
    variableDecls.push(`$${varName}: String!`)
    variables[varName] = name
    selections.push(`
      ${varName}: EmployeeAbsenceAggregate(where: { _and: [$whereApproved, { type: { value: { _eq: $${varName} } } }] }) {
        aggregate { count }
      }
    `)
  })

  // Vacation and sick group counts (for getKeyInsightsStatsByYear)
  if (vacationGroupIds.length > 0) {
    variableDecls.push('$vacationGroupIds: [String!]!')
    variables['vacationGroupIds'] = vacationGroupIds
    selections.push(`
      vacationByGroup: EmployeeAbsenceAggregate(
        where: { _and: [ $whereApproved, { type: { parentEntryId: { _in: $vacationGroupIds } } } ] }
      ) { aggregate { count } }
    `)
  }

  if (sickGroupIds.length > 0) {
    variableDecls.push('$sickGroupIds: [String!]!')
    variables['sickGroupIds'] = sickGroupIds
    selections.push(`
      sickByGroup: EmployeeAbsenceAggregate(
        where: { _and: [ $whereApproved, { type: { parentEntryId: { _in: $sickGroupIds } } } ] }
      ) { aggregate { count } }
    `)
  }

  // Monthly aggregates (for getMonthlyAggregates)
  for (let m = 0; m < 12; m++) {
    const monthStartIso = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0)).toISOString()
    const monthEndIso = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999)).toISOString()
    const whereVar = `wm_${m}`
    variableDecls.push(`$${whereVar}: EmployeeAbsenceBoolExp!`)
    variables[whereVar] = {
      _and: [
        { isDeleted: { _eq: false } },
        { status: { _eq: 'APPROVED' } },
        { startDate: { _lte: monthEndIso } },
        { endDate: { _gte: monthStartIso } }
      ]
    }
    selections.push(`m_${m}: EmployeeAbsenceAggregate(where: $${whereVar}) { aggregate { count } }`)
  }

  // Yearly aggregates (for OrgYearComparisonCard)
  for (let y = yearRange.minYear; y <= yearRange.maxYear; y++) {
    const yearStartIso = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)).toISOString()
    const yearEndIso = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)).toISOString()
    const whereVar = `wy_${y}`
    variableDecls.push(`$${whereVar}: EmployeeAbsenceBoolExp!`)
    variables[whereVar] = {
      _and: [
        { isDeleted: { _eq: false } },
        { status: { _eq: 'APPROVED' } },
        { startDate: { _lte: yearEndIso } },
        { endDate: { _gte: yearStartIso } }
      ]
    }
    selections.push(`y_${y}: EmployeeAbsenceAggregate(where: $${whereVar}) { aggregate { count } }`)
  }

  const query = `query CombinedStatistics(${variableDecls.join(', ')}) { ${selections.join('\n')} }`

  // Make a single network request
  if (!client || typeof client.request !== 'function') {
    throw new Error('Invalid GraphQL client: client.request is not a function')
  }
  const res: any = await client.request(query, variables)

  // Extract distinct types
  const distinctTypes = Array.from(
    new Set(
      (res?.distinctTypes || [])
        .map((r: any) => String(r?.type?.value || ''))
        .filter((v: string) => v.trim().length > 0)
    )
  ) as string[]

  // Extract type counts
  const typeCounts: Record<string, number> = {}
  typeNames.forEach((name, idx) => {
    const key = `t_${idx}`
    typeCounts[name] = Number(res?.[key]?.aggregate?.count || 0)
  })

  // Extract key stats
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

  // Extract monthly counts
  const monthlyCounts: number[] = []
  for (let m = 0; m < 12; m++) {
    monthlyCounts[m] = Number(res?.[`m_${m}`]?.aggregate?.count || 0)
  }

  // Extract yearly counts
  const yearlyCounts: Record<number, number> = {}
  for (let y = yearRange.minYear; y <= yearRange.maxYear; y++) {
    yearlyCounts[y] = Number(res?.[`y_${y}`]?.aggregate?.count || 0)
  }

  return {
    distinctTypes,
    typeCounts,
    keyStats: {
      totalCount,
      avgDaysPerRequest,
      approvalRatePct,
      plannedPct,
      unplannedPct,
      vacationCount,
      sickCount
    },
    monthlyCounts,
    yearlyCounts
  }
}
