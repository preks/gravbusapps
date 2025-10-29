import dayjs from 'dayjs'
import { useCallback, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_PLANS_OVERVIEW } from '../queries/expensePlans'

export interface PlansOverviewResult {
  items: any[]
  totalCount: number
  statistics: {
    currentMonthTotal: number
    previousMonthTotal: number
    totalEstimated: number
    pendingApproval: number
    topDestination: string
    currentMonthClosedPlans: number
    previousMonthClosedPlans: number
  }
}

export const useExpensePlansOverview = (context: BusinessAppContextProps) => {
  const [data, setData] = useState<PlansOverviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inflightRef = useRef<Map<string, Promise<any>>>(new Map())
  const lastKeyRef = useRef<string>()
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchOverview = useCallback(
    async (
      filters: Record<string, any>,
      page: number,
      pageSize: number,
      sortField: string | null,
      sortOrder: 'ascend' | 'descend' | null,
      currencyRef: string
    ) => {
      const employeeId = context.userInfo?.employeeDetails?.employeeId
      const accessToken = context.accessToken
      if (!employeeId || !accessToken) return

      const now = dayjs()
      const currentStart = now.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const currentEnd = now.endOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previous = now.subtract(1, 'month')
      const previousStart = previous.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previousEnd = previous.endOf('month').format('YYYY-MM-DD HH:mm:ss')

      const offset = (page - 1) * pageSize
      const orderBy = (() => {
        if (sortField && sortOrder) {
          const direction = sortOrder === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          return [{ [sortField]: direction }]
        }
        return [{ createdAt: 'DESC_NULLS_LAST' }]
      })()

      const variables = {
        employeeId,
        filters,
        limit: pageSize,
        offset,
        orderBy,
        activeUserLocale: 'en',
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currencyRef
      }

      // Create a stable key to avoid duplicates due to key order or transient object identity
      const normalize = (val: any): any => {
        if (Array.isArray(val)) {
          return val.map(normalize)
        }
        if (val && typeof val === 'object') {
          const sorted: any = {}
          Object.keys(val)
            .sort()
            .forEach(k => {
              sorted[k] = normalize(val[k])
            })
          return sorted
        }
        return val
      }
      const key = JSON.stringify(normalize(variables))
      if (lastKeyRef.current === key) return
      lastKeyRef.current = key

      if (inflightRef.current.has(key)) {
        await inflightRef.current.get(key)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const p = graphqlClient.request<any>(GET_EXPENSE_PLANS_OVERVIEW, variables).finally(() => {
          inflightRef.current.delete(key)
        })
        inflightRef.current.set(key, p)
        const data = await p

        const items = data?.plans ?? []
        const totalCount = data?.plansAggregate?.aggregate?.count ?? 0

        const destinationRegions: string[] = (data?.destinations ?? [])
          .flatMap((plan: any) =>
            (plan.expenseRequestTrip || []).map(
              (trip: any) => trip?.travelRegion?.translations?.[0]?.value || trip?.travelRegion?.value
            )
          )
          .filter(Boolean)
        const topDestination = (() => {
          if (destinationRegions.length === 0) return 'N/A'
          const map = destinationRegions.reduce((acc: Record<string, number>, v: string) => {
            acc[v] = (acc[v] || 0) + 1
            return acc
          }, {})
          return Object.keys(map).reduce((a, b) => (map[a] > map[b] ? a : b))
        })()

        setData({
          items,
          totalCount,
          statistics: {
            currentMonthTotal: data?.currentMonthTotal?.aggregate?.count ?? 0,
            previousMonthTotal: data?.previousMonthTotal?.aggregate?.count ?? 0,
            totalEstimated: data?.totalEstimated?.aggregate?.sum?.totalAmount ?? 0,
            pendingApproval: data?.pendingApproval?.aggregate?.count ?? 0,
            topDestination,
            currentMonthClosedPlans: data?.currentMonthClosedPlans?.aggregate?.count ?? 0,
            previousMonthClosedPlans: data?.previousMonthClosedPlans?.aggregate?.count ?? 0
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setData(null)
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, context.userInfo?.employeeDetails?.employeeId]
  )

  return { data, isLoading, error, fetchOverview }
}
