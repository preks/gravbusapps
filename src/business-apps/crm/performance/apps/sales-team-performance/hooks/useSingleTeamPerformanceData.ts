import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'

export interface SingleTeamPerformanceDataProps {
  accessToken: string
  teamMemberIds: string[]
  currencyCode?: string
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{ id: string; desc: boolean }>
}

export interface TeamMemberPerformance {
  employeeId: string
  employeeName: string
  firstName: string
  lastName: string
  displayName: string
  position: string
  avatar: string | null
  managerId: string | null
  managerName: string | null
  managerAvatar: string | null
  totalRevenue: number
  totalOpportunities: number
  wonOpportunities: number
  winRate: number
  pipelineValue: number
  totalActivities: number
  activityScore: number
  // 30-day comparisons
  revenueChange: number
  winRateChange: number
  activitiesChange: number
}

export interface SingleTeamKPIs {
  totalRevenue: number
  avgWinRate: number
  totalActivities: number
  totalPipeline: number
  memberCount: number
  // 30-day comparisons
  revenueChange: number
  winRateChange: number
  activitiesChange: number
  pipelineChange: number
  // Year-over-year comparison
  memberCountChange: number
  // Avg Revenue per Member trend (30-day comparison)
  avgRevenuePerMemberChange: number
}

export interface CurrencyInfo {
  code: string
  label: string
}

export interface UseSingleTeamPerformanceDataResult {
  members: TeamMemberPerformance[]
  totalCount: number
  kpis: SingleTeamKPIs | null
  availableCurrencies: CurrencyInfo[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useSingleTeamPerformanceData = ({
  accessToken,
  teamMemberIds,
  currencyCode = 'EUR',
  limit = 20,
  offset = 0,
  search = '',
  orderBy = []
}: SingleTeamPerformanceDataProps): UseSingleTeamPerformanceDataResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [members, setMembers] = useState<TeamMemberPerformance[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [kpis, setKpis] = useState<SingleTeamKPIs | null>(null)
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch team-level KPIs separately (for ALL members, independent of pagination)
  const fetchTeamKPIs = useCallback(async () => {
    if (!accessToken || !teamMemberIds || teamMemberIds.length === 0) {
      setKpis(null)
      return
    }

    try {
      const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString()
      const oneYearAgo = dayjs().subtract(1, 'year').toISOString()
      const currencyFilter = currencyCode ? `, currencyRef: { _ilike: "%${currencyCode}" }` : ''
      const employeeIdsFilter = teamMemberIds.map(id => `"${id}"`).join(', ')

      // Fetch aggregates for ALL team members
      const kpiQuery = `
        query GetTeamKPIs {
          # Total revenue for all team members
          totalRevenue: OpportunityAggregate(where: {
            isDeleted: { _eq: false },
            opportunityStatus: { code: { _eq: "WON" } },
            ownerEmployeeId: { _in: [${employeeIdsFilter}] }${currencyFilter}
          }) {
            aggregate {
              sum { estimatedAmount }
            }
          }

          # Total activities for all team members
          totalActivities: SalesActivityAggregate(where: {
            isDeleted: { _eq: false },
            ownerEmployeeId: { _in: [${employeeIdsFilter}] }
          }) {
            aggregate {
              count
            }
          }

          # Historical revenue (30 days ago) for trend
          revenue30d: OpportunityAggregate(where: {
            isDeleted: { _eq: false },
            opportunityStatus: { code: { _eq: "WON" } },
            ownerEmployeeId: { _in: [${employeeIdsFilter}] },
            closeDate: { _lte: "${thirtyDaysAgo}" }${currencyFilter}
          }) {
            aggregate {
              sum { estimatedAmount }
            }
          }

          # Historical activities (30 days ago) for trend
          activities30d: SalesActivityAggregate(where: {
            isDeleted: { _eq: false },
            ownerEmployeeId: { _in: [${employeeIdsFilter}] },
            createdAt: { _lte: "${thirtyDaysAgo}" }
          }) {
            aggregate {
              count
            }
          }

          # Team member count from one year ago
          # Count employees who were active one year ago (not exited or exited after that date)
          memberCount1YearAgo: EmployeeAggregate(where: {
            id: { _in: [${employeeIdsFilter}] },
            isDeleted: { _eq: false },
            _or: [
              { activeTo: { _isNull: true } },
              { activeTo: { _gte: "${oneYearAgo}" } }
            ]
          }) {
            aggregate {
              count
            }
          }
        }
      `

      const response = await graphqlClient.request<any>(kpiQuery)

      const totalRevenue = response.totalRevenue?.aggregate?.sum?.estimatedAmount || 0
      const totalActivities = response.totalActivities?.aggregate?.count || 0
      const revenue30d = response.revenue30d?.aggregate?.sum?.estimatedAmount || 0
      const activities30d = response.activities30d?.aggregate?.count || 0
      const memberCount1YearAgo = response.memberCount1YearAgo?.aggregate?.count || 0

      // Calculate revenue change percentage
      let revenueChange = 0
      if (revenue30d > 0) {
        revenueChange = ((totalRevenue - revenue30d) / revenue30d) * 100
      } else if (totalRevenue > 0) {
        revenueChange = 100
      }

      // Calculate activities change percentage
      let activitiesChange = 0
      if (activities30d > 0) {
        activitiesChange = ((totalActivities - activities30d) / activities30d) * 100
      } else if (totalActivities > 0) {
        activitiesChange = 100
      }

      // Calculate member count change percentage (year-over-year)
      let memberCountChange = 0
      const currentMemberCount = teamMemberIds.length
      if (memberCount1YearAgo > 0) {
        memberCountChange = ((currentMemberCount - memberCount1YearAgo) / memberCount1YearAgo) * 100
      } else if (currentMemberCount > 0) {
        memberCountChange = 100
      }

      // Calculate avg revenue per member change (30-day comparison)
      let avgRevenuePerMemberChange = 0
      const currentAvgRevenuePerMember = currentMemberCount > 0 ? totalRevenue / currentMemberCount : 0
      const avgRevenuePerMember30d = currentMemberCount > 0 ? revenue30d / currentMemberCount : 0

      if (avgRevenuePerMember30d > 0) {
        avgRevenuePerMemberChange =
          ((currentAvgRevenuePerMember - avgRevenuePerMember30d) / avgRevenuePerMember30d) * 100
      } else if (currentAvgRevenuePerMember > 0) {
        avgRevenuePerMemberChange = 100
      }

      setKpis({
        totalRevenue,
        avgWinRate: 0, // Not displayed
        totalActivities,
        totalPipeline: 0, // Not displayed
        memberCount: currentMemberCount, // Total team size, not current page
        revenueChange,
        winRateChange: 0, // Not displayed
        activitiesChange,
        pipelineChange: 0, // Not displayed
        memberCountChange,
        avgRevenuePerMemberChange
      })
    } catch {
      // Don't set error state, just log it
    }
  }, [accessToken, teamMemberIds, currencyCode, graphqlClient])

  // Fetch team KPIs separately (only when team or currency changes)
  useEffect(() => {
    void fetchTeamKPIs()
  }, [fetchTeamKPIs])

  // Fetch distinct currencies from opportunities for team members
  const fetchAvailableCurrencies = useCallback(async () => {
    if (!accessToken || !teamMemberIds || teamMemberIds.length === 0) {
      setAvailableCurrencies([])
      return
    }

    try {
      const employeeIdsFilter = teamMemberIds.map(id => `"${id}"`).join(', ')

      const currenciesQuery = `
        query GetDistinctCurrencies {
          currencies: Opportunity(
            distinctOn: currencyRef
            orderBy: [{ currencyRef: ASC }]
            where: {
              isDeleted: { _eq: false }
              ownerEmployeeId: { _in: [${employeeIdsFilter}] }
              currencyRef: { _isNull: false }
            }
          ) {
            currencyRef
            currency {
              code
              value
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        currencies: Array<{
          currencyRef: string | null
          currency: { code: string; value: string } | null
        }>
      }>(currenciesQuery)

      const currencies = (result.currencies || [])
        .filter(item => item.currency?.code)
        .map(item => ({
          code: item.currency!.code,
          label: item.currency!.code
        }))

      // Sort currencies: EUR, USD, GBP first, then alphabetically
      const priorityCurrencies = ['EUR', 'USD', 'GBP']
      const sortedCurrencies = currencies.toSorted((a, b) => {
        const aIndex = priorityCurrencies.indexOf(a.code)
        const bIndex = priorityCurrencies.indexOf(b.code)

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1

        return a.code.localeCompare(b.code)
      })

      setAvailableCurrencies(sortedCurrencies)
    } catch (err) {
      console.error('Error fetching available currencies:', err)
      setAvailableCurrencies([])
    }
  }, [accessToken, teamMemberIds, graphqlClient])

  // Fetch available currencies when team members change
  useEffect(() => {
    void fetchAvailableCurrencies()
  }, [fetchAvailableCurrencies])

  // Helper: Build where clause for team members query
  const buildMemberWhereClause = useCallback((memberIds: string[], searchTerm?: string) => {
    const quotedIds = memberIds.map(id => `"${id}"`).join(', ')
    const whereConditions: string[] = [`id: { _in: [${quotedIds}] }`, `isDeleted: { _eq: false }`]

    if (searchTerm?.trim()) {
      const searchPattern = `%${searchTerm.trim()}%`
      whereConditions.push(`_or: [
        { firstName: { _ilike: "${searchPattern}" } },
        { lastName: { _ilike: "${searchPattern}" } },
        { displayName: { _ilike: "${searchPattern}" } },
        { employeePosition: { jobPosition: { name: { _ilike: "${searchPattern}" } } } }
      ]`)
    }

    return `{ ${whereConditions.join(', ')} }`
  }, [])

  // Helper: Build orderBy clause for team members query
  const buildMemberOrderByClause = useCallback((sortConfig?: Array<{ id: string; desc: boolean }>) => {
    if (!sortConfig || sortConfig.length === 0) {
      return '{ displayName: ASC }'
    }

    const sort = sortConfig[0]
    const direction = sort.desc ? 'DESC' : 'ASC'

    if (sort.id === 'name' || sort.id === 'displayName') {
      return `{ displayName: ${direction} }`
    } else if (sort.id === 'position') {
      return `{ employeePosition: { jobPosition: { name: ${direction} } } }`
    }

    return '{ displayName: ASC }' // Default for computed fields
  }, [])

  // Fetch team members with server-side pagination and search
  const fetchTeamMembers = useCallback(async () => {
    if (!accessToken || !teamMemberIds || teamMemberIds.length === 0) {
      setMembers([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString()
      const currencyFilter = currencyCode ? `, currencyRef: { _ilike: "%${currencyCode}" }` : ''

      const whereClause = buildMemberWhereClause(teamMemberIds, search)
      const orderByClause = buildMemberOrderByClause(orderBy)

      const employeeQuery = `
        query GetTeamMembersWithPagination {
          # Get total count (respects search filter)
          totalCount: EmployeeAggregate(where: ${whereClause}) {
            aggregate {
              count
            }
          }

          # Get paginated employees with server-side search
          employees: Employee(
            where: ${whereClause}
            orderBy: ${orderByClause}
            limit: ${limit}
            offset: ${offset}
          ) {
            id
            firstName
            lastName
            displayName
            pictureThumbnail
            employeePosition {
              jobPosition { name }
              supervisor {
                id
                firstName
                lastName
                displayName
                pictureThumbnail
              }
            }
          }
        }
      `

      const response = await graphqlClient.request<any>(employeeQuery)

      const allEmployees = response.employees || []
      const totalCount = response.totalCount?.aggregate?.count || 0

      // Build a single batched query for ALL employees' metrics (only what's displayed in UI)
      const metricsQuery = allEmployees
        .map((employee: any, index: number) => {
          const alias = `emp${index}`
          return `
          # Employee ${index} (${employee.id}) metrics
          ${alias}_revenue: OpportunityAggregate(where: {
            isDeleted: { _eq: false },
            opportunityStatus: { code: { _eq: "WON" } },
            ownerEmployeeId: { _eq: "${employee.id}" }${currencyFilter}
          }) {
            aggregate {
              sum { estimatedAmount }
              count
            }
          }

          ${alias}_activities: SalesActivityAggregate(where: {
            isDeleted: { _eq: false },
            ownerEmployeeId: { _eq: "${employee.id}" }
          }) {
            aggregate { count }
          }

          ${alias}_revenue30d: OpportunityAggregate(where: {
            isDeleted: { _eq: false },
            opportunityStatus: { code: { _eq: "WON" } },
            ownerEmployeeId: { _eq: "${employee.id}" },
            closeDate: { _lte: "${thirtyDaysAgo}" }${currencyFilter}
          }) {
            aggregate {
              sum { estimatedAmount }
            }
          }

          ${alias}_activities30d: SalesActivityAggregate(where: {
            isDeleted: { _eq: false },
            ownerEmployeeId: { _eq: "${employee.id}" },
            createdAt: { _lte: "${thirtyDaysAgo}" }
          }) {
            aggregate { count }
          }
        `
        })
        .join('\n')

      // Fetch all metrics in a single query
      const batchedQuery = `
        query GetAllEmployeesMetrics {
          ${metricsQuery}
        }
      `

      const metricsResponse = await graphqlClient.request<any>(batchedQuery)

      // Process members data (only fields displayed in UI)
      const membersData: TeamMemberPerformance[] = allEmployees.map((employee: any, index: number) => {
        const alias = `emp${index}`
        const metrics = {
          revenue: metricsResponse[`${alias}_revenue`],
          activities: metricsResponse[`${alias}_activities`],
          revenue30d: metricsResponse[`${alias}_revenue30d`],
          activities30d: metricsResponse[`${alias}_activities30d`]
        }

        // Current metrics (only what's displayed)
        const revenue = metrics.revenue?.aggregate?.sum?.estimatedAmount || 0
        const wonCount = metrics.revenue?.aggregate?.count || 0
        const activities = metrics.activities?.aggregate?.count || 0

        // Historical metrics (for trend calculations)
        const revenue30d = metrics.revenue30d?.aggregate?.sum?.estimatedAmount || 0
        const activities30d = metrics.activities30d?.aggregate?.count || 0

        // Calculate displayed metrics
        const activityScore = Math.round((activities / Math.max(wonCount, 1)) * 10)

        // Calculate revenue change percentage
        let revenueChange = 0
        if (revenue30d > 0) {
          revenueChange = ((revenue - revenue30d) / revenue30d) * 100
        } else if (revenue > 0) {
          revenueChange = 100
        }

        // Calculate activities change percentage
        let activitiesChange = 0
        if (activities30d > 0) {
          activitiesChange = ((activities - activities30d) / activities30d) * 100
        } else if (activities > 0) {
          activitiesChange = 100
        }

        // Extract supervisor info
        const supervisor = employee.employeePosition?.supervisor

        return {
          employeeId: employee.id,
          employeeName: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          displayName: employee.displayName || '',
          position: employee.employeePosition?.jobPosition?.name || '',
          avatar: employee.pictureThumbnail || null,
          managerId: supervisor?.id || null,
          managerName: supervisor
            ? supervisor.displayName || `${supervisor.firstName} ${supervisor.lastName}`.trim()
            : null,
          managerAvatar: supervisor?.pictureThumbnail || null,
          totalRevenue: revenue,
          totalOpportunities: 0, // Not used, keeping for interface compatibility
          wonOpportunities: wonCount, // Used in activityScore calculation
          winRate: 0, // Not displayed, keeping for interface compatibility
          pipelineValue: 0, // Not displayed, keeping for interface compatibility
          totalActivities: activities,
          activityScore,
          revenueChange,
          winRateChange: 0, // Not displayed, keeping for interface compatibility
          activitiesChange
        }
      })

      // Apply client-side sorting for computed fields
      let sortedMembers = membersData
      if (orderBy && orderBy.length > 0) {
        const sort = orderBy[0]
        if (sort.id === 'totalRevenue' || sort.id === 'activityScore' || sort.id === 'manager') {
          sortedMembers = [...membersData].sort((a, b) => {
            let aVal: any
            let bVal: any

            if (sort.id === 'manager') {
              aVal = a.managerName || ''
              bVal = b.managerName || ''
            } else {
              aVal = a[sort.id as keyof TeamMemberPerformance]
              bVal = b[sort.id as keyof TeamMemberPerformance]
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return sort.desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
            }

            if (typeof aVal === 'number' && typeof bVal === 'number') {
              return sort.desc ? bVal - aVal : aVal - bVal
            }

            return 0
          })
        }
      }

      setMembers(sortedMembers)
      setTotalCount(totalCount)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team performance'
      setError(errorMessage)
      setMembers([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    teamMemberIds,
    currencyCode,
    limit,
    offset,
    search,
    orderBy,
    graphqlClient,
    buildMemberWhereClause,
    buildMemberOrderByClause
  ])

  // Fetch team members (re-fetches on pagination/search/sort changes)
  useEffect(() => {
    void fetchTeamMembers()
  }, [fetchTeamMembers])

  return {
    members,
    totalCount,
    kpis,
    availableCurrencies,
    isLoading,
    error,
    refetch: () => void fetchTeamMembers()
  }
}
