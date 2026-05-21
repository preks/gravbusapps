import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildInvestmentGroupWhere,
  getCategoryCondition,
  getDistinctQuery,
  getLastYears,
  getMonthsForYears,
  getNextYears,
  parseAggregate,
  toChartKey,
  toDistinctCategories,
  type AggregateResult,
  type InvestmentGroupMonthlyTimelineDatum,
  type InvestmentGroupTimelineDatum,
  type InvestmentGroupTypeTimelineResult,
  type TimelineDateField
} from './shared'

const AGGREGATE_FIELDS = `
  aggregate {
    count
    sum { totalInvestmentAmount }
    avg { totalInvestmentAmount }
  }
`

export const useInvestmentGroupTimelineQueries = (accessToken: string | undefined) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchTimeline = useCallback(
    async (
      groupId: string,
      currencyCode?: string,
      yearsCount = 5,
      dateField: TimelineDateField = 'createdAt'
    ): Promise<InvestmentGroupTimelineDatum[]> => {
      if (!accessToken) return []

      const years = getLastYears(yearsCount)
      const variableDefinitions = years.map((_, i) => `$where${i}: InvestmentBoolExp`).join(', ')
      const aggregateFields = years
        .map((_, i) => `year${i}: InvestmentAggregate(where: $where${i}) { ${AGGREGATE_FIELDS} }`)
        .join('\n')
      const variables = Object.fromEntries(
        years.map((year, i) => {
          const startYear = Number.parseInt(year, 10)
          return [
            `where${i}`,
            buildInvestmentGroupWhere(groupId, currencyCode, [
              { [dateField]: { _gte: `${year}-01-01`, _lt: `${startYear + 1}-01-01` } }
            ])
          ]
        })
      )

      const result = await graphqlClient.request<Record<string, AggregateResult['InvestmentAggregate']>>(
        `query GetInvestmentGroupTimeline(${variableDefinitions}) { ${aggregateFields} }`,
        variables
      )

      let cumulativeAmount = 0
      return years.map((year, i) => {
        const aggregate = parseAggregate({ InvestmentAggregate: result[`year${i}`] })
        cumulativeAmount += aggregate.totalAmount
        return {
          period: year,
          count: aggregate.count,
          totalAmount: aggregate.totalAmount,
          cumulativeAmount,
          averageAmount: aggregate.averageAmount
        }
      })
    },
    [accessToken, graphqlClient]
  )

  const fetchMonthlyTimeline = useCallback(
    async (
      groupId: string,
      currencyCode?: string,
      yearsCount = 5,
      dateField: TimelineDateField = 'createdAt'
    ): Promise<InvestmentGroupMonthlyTimelineDatum[]> => {
      if (!accessToken) return []

      const years = dateField === 'plannedExitDate' ? getNextYears(yearsCount) : getLastYears(yearsCount)
      const months = getMonthsForYears(years)
      const variableDefinitions = months.map((_, index) => `$where${index}: InvestmentBoolExp`).join(', ')
      const aggregateFields = months
        .map((_, index) => `month${index}: InvestmentAggregate(where: $where${index}) { ${AGGREGATE_FIELDS} }`)
        .join('\n')
      const variables = Object.fromEntries(
        months.map((month, index) => {
          const startDate = `${month.period}-01`
          const nextMonth = month.month === 12 ? 1 : month.month + 1
          const nextMonthYear = month.month === 12 ? Number(month.year) + 1 : Number(month.year)
          const endDate = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`

          return [
            `where${index}`,
            buildInvestmentGroupWhere(groupId, currencyCode, [{ [dateField]: { _gte: startDate, _lt: endDate } }])
          ]
        })
      )

      const result = await graphqlClient.request<Record<string, AggregateResult['InvestmentAggregate']>>(
        `query GetInvestmentGroupMonthlyTimeline(${variableDefinitions}) { ${aggregateFields} }`,
        variables
      )

      return months.map((month, index) => {
        const aggregate = parseAggregate({ InvestmentAggregate: result[`month${index}`] })
        return {
          ...month,
          count: aggregate.count,
          totalAmount: aggregate.totalAmount,
          averageAmount: aggregate.averageAmount
        }
      })
    },
    [accessToken, graphqlClient]
  )

  const fetchTimelineByType = useCallback(
    async (groupId: string, currencyCode?: string, yearsCount = 5): Promise<InvestmentGroupTypeTimelineResult> => {
      if (!accessToken) return { timelineData: [], investmentTypes: [], typeKeyByLabel: {} }

      const distinctWhere = buildInvestmentGroupWhere(groupId, currencyCode)
      const distinctResult = await graphqlClient.request<{ Investment: any[] }>(getDistinctQuery('investmentType'), {
        where: distinctWhere
      })
      const investmentTypes = toDistinctCategories('investmentType', distinctResult.Investment || [])

      if (investmentTypes.length === 0) {
        return { timelineData: [], investmentTypes: [], typeKeyByLabel: {} }
      }

      const typeKeyByLabel = Object.fromEntries(
        investmentTypes.map(type => [type.label, toChartKey(type.label)])
      ) as Record<string, string>
      const years = getLastYears(yearsCount)

      // One slot per (year × type) combination — all batched into a single query.
      const slots = years.flatMap((year, yi) => investmentTypes.map((type, ti) => ({ year, yi, type, ti })))
      const variableDefinitions = slots.map((_, i) => `$where${i}: InvestmentBoolExp`).join(', ')
      const aggregateFields = slots
        .map((_, i) => `slot${i}: InvestmentAggregate(where: $where${i}) { ${AGGREGATE_FIELDS} }`)
        .join('\n')
      const variables = Object.fromEntries(
        slots.map(({ year, type }, i) => {
          const startYear = Number.parseInt(year, 10)
          return [
            `where${i}`,
            buildInvestmentGroupWhere(groupId, currencyCode, [
              { createdAt: { _gte: `${year}-01-01`, _lt: `${startYear + 1}-01-01` } },
              getCategoryCondition('investmentType', type.id)
            ])
          ]
        })
      )

      const result = await graphqlClient.request<Record<string, AggregateResult['InvestmentAggregate']>>(
        `query GetInvestmentGroupTypeTimeline(${variableDefinitions}) { ${aggregateFields} }`,
        variables
      )

      const timelineData = years.map((year, yi) => {
        const entries = investmentTypes.map((type, ti) => {
          const slotIndex = yi * investmentTypes.length + ti
          const aggregate = parseAggregate({ InvestmentAggregate: result[`slot${slotIndex}`] })
          return [typeKeyByLabel[type.label], aggregate.totalAmount] as const
        })
        const total = entries.reduce((sum, [, amount]) => sum + amount, 0)
        return { period: year, total, ...Object.fromEntries(entries) }
      })

      return {
        timelineData,
        investmentTypes: investmentTypes.map(type => type.label),
        typeKeyByLabel
      }
    },
    [accessToken, graphqlClient]
  )

  return {
    fetchMonthlyTimeline,
    fetchTimeline,
    fetchTimelineByType
  }
}
