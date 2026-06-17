import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'

export interface SingleTeamPerformanceDataProps {
  accessToken: string
  teamMemberIds: string[]
  /** Visible column ids the free-text search is scoped to; undefined searches the default fields. */
  searchColumns?: string[]
  currencyCode?: string
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{ id: string; desc: boolean }>
}

export interface TeamMemberPerformance {
  employeeId: string
  employeeName: string
  position: string
  avatar: string | null
  totalRevenue: number
}

export interface SingleTeamKPIs {
  totalRevenue: number
  avgWinRate: number
  totalWonOpportunities: number
  totalPipeline: number
  memberCount: number
  // 30-day comparisons
  revenueChange: number
  winRateChange: number
  wonOpportunitiesChange: number
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
  searchColumns,
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

          # Total won opportunities for all team members
          totalWonOpportunities: OpportunityAggregate(where: {
            isDeleted: { _eq: false },
            opportunityStatus: { code: { _eq: "WON" } },
            ownerEmployeeId: { _in: [${employeeIdsFilter}] }${currencyFilter}
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

          # Historical won opportunities (30 days ago) for trend
          wonOpportunities30d: OpportunityAggregate(where: {
            isDeleted: { _eq: false },
            opportunityStatus: { code: { _eq: "WON" } },
            ownerEmployeeId: { _in: [${employeeIdsFilter}] },
            closeDate: { _lte: "${thirtyDaysAgo}" }${currencyFilter}
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
      const totalWonOpportunities = response.totalWonOpportunities?.aggregate?.count || 0
      const revenue30d = response.revenue30d?.aggregate?.sum?.estimatedAmount || 0
      const wonOpportunities30d = response.wonOpportunities30d?.aggregate?.count || 0
      const memberCount1YearAgo = response.memberCount1YearAgo?.aggregate?.count || 0

      // Calculate revenue change percentage
      let revenueChange = 0
      if (revenue30d > 0) {
        revenueChange = ((totalRevenue - revenue30d) / revenue30d) * 100
      } else if (totalRevenue > 0) {
        revenueChange = 100
      }

      // Calculate won opportunities change percentage
      let wonOpportunitiesChange = 0
      if (wonOpportunities30d > 0) {
        wonOpportunitiesChange = ((totalWonOpportunities - wonOpportunities30d) / wonOpportunities30d) * 100
      } else if (totalWonOpportunities > 0) {
        wonOpportunitiesChange = 100
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
        totalWonOpportunities,
        totalPipeline: 0, // Not displayed
        memberCount: currentMemberCount, // Total team size, not current page
        revenueChange,
        winRateChange: 0, // Not displayed
        wonOpportunitiesChange,
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
    fetchTeamKPIs().catch(() => undefined)
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
      const errorMessage = err instanceof Error ? err.message : 'Error fetching available currencies'
      console.error(errorMessage)
      setAvailableCurrencies([])
    }
  }, [accessToken, teamMemberIds, graphqlClient])

  // Fetch available currencies when team members change
  useEffect(() => {
    fetchAvailableCurrencies().catch(() => undefined)
  }, [fetchAvailableCurrencies])

  // Helper: Build the where clause object for the team members query, scoped to the visible columns.
  // Returned as an object so it can be passed as a GraphQL `$where` variable (no string interpolation).
  const buildMemberWhereClause = useCallback(
    (memberIds: string[], searchTerm?: string, searchCols?: string[]): Record<string, any> => {
      const where: Record<string, any> = {
        id: { _in: memberIds },
        isDeleted: { _eq: false }
      }

      if (searchTerm?.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`
        const predicateMap: Record<string, Array<Record<string, any>>> = {
          name: [
            { firstName: { _ilike: searchPattern } },
            { lastName: { _ilike: searchPattern } },
            { displayName: { _ilike: searchPattern } }
          ],
          position: [{ employeePosition: { jobPosition: { name: { _ilike: searchPattern } } } }]
        }

        const columns = searchCols && searchCols.length > 0 ? searchCols : Object.keys(predicateMap)
        const orConditions = columns.flatMap(column => predicateMap[column] || [])

        if (orConditions.length > 0) {
          where._or = orConditions
        }
      }

      return where
    },
    []
  )

  // Helper: Build the orderBy clause for the team members query.
  // Returned as an array so it can be passed as a GraphQL `$orderBy` variable.
  const buildMemberOrderByClause = useCallback(
    (sortConfig?: Array<{ id: string; desc: boolean }>): Array<Record<string, any>> => {
      if (!sortConfig || sortConfig.length === 0) {
        return [{ displayName: 'ASC' }]
      }

      const sort = sortConfig[0]
      const direction = sort.desc ? 'DESC' : 'ASC'

      if (sort.id === 'name' || sort.id === 'displayName') {
        return [{ displayName: direction }]
      } else if (sort.id === 'position') {
        return [{ employeePosition: { jobPosition: { name: direction } } }]
      }

      return [{ displayName: 'ASC' }] // Default for computed fields
    },
    []
  )

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
      const currencyFilter = currencyCode ? `, currencyRef: { _ilike: "%${currencyCode}" }` : ''

      const whereClause = buildMemberWhereClause(teamMemberIds, search, searchColumns)
      const orderByClause = buildMemberOrderByClause(orderBy)

      const employeeQuery = `
        query GetTeamMembersWithPagination(
          $where: EmployeeBoolExp
          $orderBy: [EmployeeOrderBy!]
          $limit: Int
          $offset: Int
        ) {
          # Get total count (respects search filter)
          totalCount: EmployeeAggregate(where: $where) {
            aggregate {
              count
            }
          }

          # Get paginated employees with server-side search
          employees: Employee(where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
            id
            firstName
            lastName
            displayName
            pictureThumbnail
            employeePosition {
              jobPosition { name }
            }
          }
        }
      `

      const response = await graphqlClient.request<any>(employeeQuery, {
        where: whereClause,
        orderBy: orderByClause,
        limit,
        offset
      })

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
            }
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
        const revenue = metricsResponse[`${alias}_revenue`]?.aggregate?.sum?.estimatedAmount || 0

        return {
          employeeId: employee.id,
          employeeName: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
          position: employee.employeePosition?.jobPosition?.name || '',
          avatar: employee.pictureThumbnail || null,
          totalRevenue: revenue
        }
      })

      // Apply client-side sorting for computed fields
      let sortedMembers = membersData
      if (orderBy && orderBy.length > 0) {
        const sort = orderBy[0]
        if (sort.id === 'totalRevenue') {
          sortedMembers = [...membersData].sort((a, b) => {
            return sort.desc ? b.totalRevenue - a.totalRevenue : a.totalRevenue - b.totalRevenue
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
    searchColumns,
    orderBy,
    graphqlClient,
    buildMemberWhereClause,
    buildMemberOrderByClause
  ])

  // Fetch team members (re-fetches on pagination/search/sort changes)
  useEffect(() => {
    fetchTeamMembers().catch(() => undefined)
  }, [fetchTeamMembers])

  return {
    members,
    totalCount,
    kpis,
    availableCurrencies,
    isLoading,
    error,
    refetch: () => {
      fetchTeamMembers().catch(() => undefined)
    }
  }
}
