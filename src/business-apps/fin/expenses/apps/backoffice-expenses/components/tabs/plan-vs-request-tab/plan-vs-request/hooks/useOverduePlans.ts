import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getOverduePlansCountQuery } from '../queries/getOverduePlans'
import dayjs from 'dayjs'

/**
 * Query variables for overdue plans query
 */
interface OverduePlansQueryVariables {
  currentDate: string
  selectedDepartment?: string
}

/**
 * Hook to fetch count of overdue expense plans
 * @param props - Business app context props including accessToken
 * @returns Object containing loading state, error, the count of overdue plans, and refetch function
 */
export const useOverduePlans = (
  props: BusinessAppContextProps & { selectedDepartment?: string; isActive?: boolean }
) => {
  const { accessToken, selectedDepartment, isActive = true } = props
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [overduePlansCount, setOverduePlansCount] = useState<number>(0)

  const client = useGraphQLClient(accessToken)

  const fetchOverduePlans = useCallback(async () => {
    if (!client || !accessToken) return

    // ⚡ PERFORMANCE: Skip fetch if tab is inactive
    if (!isActive) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get current date as ISO string for comparison
      const currentDate = dayjs().format('YYYY-MM-DDT00:00:00')

      // Build query with or without department filter
      const hasDepartment = !!(selectedDepartment && selectedDepartment !== '')
      const query = getOverduePlansCountQuery(hasDepartment)

      const variables: OverduePlansQueryVariables = { currentDate }
      if (hasDepartment) {
        variables.selectedDepartment = selectedDepartment
      }

      const response = await client.request(query, variables)

      const count = response?.overduePlans?.aggregate?.count || 0
      setOverduePlansCount(count)
    } catch (err) {
      console.error('Error fetching overdue plans count:', err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setLoading(false)
    }
  }, [client, accessToken, selectedDepartment, isActive])

  useEffect(() => {
    fetchOverduePlans()
  }, [fetchOverduePlans])

  return {
    loading,
    error,
    overduePlansCount,
    refetch: fetchOverduePlans
  }
}
