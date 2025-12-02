import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMember } from '../types'
import { useSalesTeamQueries, EmployeeOwnershipData, OpportunityData } from '../queries/SalesTeamQueries'
import { useEmployeeActivitiesQueries } from '../../sales-member-performance/queries/EmployeeActivitiesQueries'
import { getCachedActivityScore } from '../../sales-member-performance/hooks/useEmployeeActivitiesData'

export interface UseSalesTeamDataIntegrationResult {
  members: SalesTeamMember[]
  total: number // This will be an estimate now
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadPage: (page: number, pageSize: number, search?: string) => Promise<void>
  refetch: () => void
}

export const useSalesTeamDataIntegration = (context: BusinessAppContextProps): UseSalesTeamDataIntegrationResult => {
  const [members, setMembers] = useState<SalesTeamMember[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(!!context.accessToken) // Only set to true if accessToken exists
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentPageSize, setCurrentPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentSearch, setCurrentSearch] = useState<string>('')

  const { fetchSalesTeamEmployees, fetchOpportunityTotals } = useSalesTeamQueries(context)
  const { fetchEmployeeActivities } = useEmployeeActivitiesQueries(context)

  // Helper function to calculate the exact same average activity score as shown in statistics
  const calculateEmployeeActivityScore = useCallback(
    async (employeeId: string): Promise<number> => {
      try {
        // Use the same approach as the activities data hook - let fetchEmployeeActivities handle base filtering
        const variables: any = {
          employeeId,
          limit: 100, // Get all activities to calculate proper average
          offset: 0,
          orderBy: [{ createdAt: 'DESC_NULLS_LAST' }]
          // No manual where clause - let fetchEmployeeActivities add ownerEmployeeId and isDeleted filters
        }

        // Fetch activities for this employee using the same query as the activities data hook
        const activitiesData = await fetchEmployeeActivities(variables)

        if (!activitiesData.SalesActivity || activitiesData.SalesActivity.length === 0) {
          return 0
        }

        // Filter out activities with null createdAt (same as activities data hook)
        const validActivities = activitiesData.SalesActivity.filter((activity: any) => activity.createdAt !== null)

        if (validActivities.length === 0) {
          return 0
        }

        // Calculate activity scores using the same cached function
        const scores = validActivities.map((activity: any) => {
          const activityId = activity.id
          const createdAt = activity.createdAt
          return getCachedActivityScore(activityId, createdAt)
        })

        // Calculate average the same way as the statistics hook
        const totalScore = scores.reduce((sum: number, score: number) => sum + score, 0)
        const averageScore = Math.round(totalScore / scores.length)

        return averageScore
      } catch (error) {
        console.warn(`Failed to calculate activity score for employee ${employeeId}:`, error)
        return 0
      }
    },
    [fetchEmployeeActivities]
  )

  const transformEmployeeData = useCallback(
    async (employees: EmployeeOwnershipData[], opportunities: OpportunityData[]): Promise<SalesTeamMember[]> => {
      // Create a map of employee sales totals
      const salesTotals = new Map<string, { total: number; currencyId: string }>()
      // Calculate total revenue per employee from opportunities
      opportunities.forEach(opportunity => {
        if (opportunity.ownerEmployeeId && opportunity.estimatedAmount && opportunity.currencyRef) {
          const existing = salesTotals.get(opportunity.ownerEmployeeId)
          if (existing) {
            existing.total += opportunity.estimatedAmount
          } else {
            salesTotals.set(opportunity.ownerEmployeeId, {
              total: opportunity.estimatedAmount,
              currencyId: opportunity.currencyRef
            })
          }
        }
      })

      // Calculate activity scores for all employees in parallel
      const activityScorePromises = employees.map(async employee => {
        const score = await calculateEmployeeActivityScore(employee.id)
        return { employeeId: employee.id, score }
      })

      const activityScoreResults = await Promise.all(activityScorePromises)
      const activityScoresMap = new Map(activityScoreResults.map(result => [result.employeeId, result.score]))

      // Transform employees to SalesTeamMember format
      const transformedMembers = employees.map((employee): SalesTeamMember => {
        const salesData = salesTotals.get(employee.id)
        const name =
          employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'

        // Use the calculated activity score (exact same as Average Activity Score KPI)
        const activityScore = activityScoresMap.get(employee.id) || 0

        // Transform manager data
        const manager = employee.employeePosition?.supervisor
          ? {
              id: employee.employeePosition.supervisor.id,
              name:
                employee.employeePosition.supervisor.displayName ||
                `${employee.employeePosition.supervisor.firstName || ''} ${
                  employee.employeePosition.supervisor.lastName || ''
                }`.trim() ||
                'Unknown Manager',
              avatar: employee.employeePosition.supervisor.pictureThumbnail
            }
          : null
        return {
          id: employee.id,
          name,
          position: employee.employeePosition?.jobPosition?.name || 'Unknown Position',
          totalRevenue: salesData?.total || 0,
          currencyId: salesData?.currencyId || 'EUR',
          activityScore,
          avatar: employee?.pictureThumbnail,
          employeeId: employee.id,
          manager
        }
      })
      return transformedMembers
    },
    [calculateEmployeeActivityScore]
  )

  // Load data for a specific page
  const loadData = useCallback(
    async (page: number, pageSize: number, search?: string) => {
      if (!context.accessToken) {
        // Silently skip loading when accessToken is empty (intentionally disabled)
        setIsLoading(false)
        setError(null) // Don't set error - this is intentional
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Update current search state
        if (search !== undefined) {
          setCurrentSearch(search)
        }

        const finalSearch = search !== undefined ? search : currentSearch

        // Fetch employees and opportunities in parallel
        const [employees, opportunities] = await Promise.all([
          fetchSalesTeamEmployees({
            limit: pageSize * 2, // Fetch more to account for filtering
            offset: (page - 1) * pageSize,
            search: finalSearch
          }),
          fetchOpportunityTotals()
        ])

        // Transform data (now async due to activity score calculation)
        const transformedMembers = await transformEmployeeData(employees, opportunities)

        // Sort members by name for consistency
        const sortedMembers = transformedMembers.sort((a, b) => a.name.localeCompare(b.name))

        // Estimate pagination (since we don't have exact counts)
        const estimatedTotal = sortedMembers.length
        const paginatedMembers = sortedMembers.slice(0, pageSize)
        const calculatedHasMore = sortedMembers.length === pageSize * 2 // Estimate based on fetch size

        setMembers(paginatedMembers)
        setTotal(estimatedTotal)
        setHasMore(calculatedHasMore)
        setCurrentPage(page)
        setCurrentPageSize(pageSize)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load sales team data'
        console.error(`❌ Error in loadData:`, err)
        setError(errorMessage)
        setMembers([])
        setTotal(0)
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchSalesTeamEmployees, fetchOpportunityTotals, transformEmployeeData]
  )

  // Load page function for external use
  const loadPage = useCallback(
    async (page: number, pageSize: number, search?: string) => {
      await loadData(page, pageSize, search)
    },
    [loadData]
  )

  // Refetch current data
  const refetch = useCallback(() => {
    loadData(currentPage, currentPageSize, currentSearch)
  }, [loadData, currentPage, currentPageSize, currentSearch])

  return {
    members,
    total,
    isLoading,
    error,
    hasMore,
    loadPage,
    refetch
  }
}
