import { useState, useEffect, useCallback, useRef } from 'react'
import { message } from 'antd'
import { GET_CALENDAR_EXPENSE_PLANS } from '../queries/calendarExpensePlans'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'

// Reuse the ExpensePlan interface since the structure is the same
export interface ExpensePlan {
  id: string
  code: string
  title: string
  description?: string | null
  status: string
  startDate: string
  endDate: string
  planDate: string
  totalAmount: number
  currencyRef?: string
  createdAt: string
  updatedAt: string
  employee: {
    id: string
    displayName?: string
    firstName: string
    lastName: string
    fullName: string
    email?: string
    pictureThumbnail?: string
    employeePosition?: {
      organizationalUnit?: {
        id: string
        name: string
      }
    }
  }
}

export interface ExpensePlanResponse {
  ExpensePlan: ExpensePlan[]
  ExpensePlanAggregate: {
    aggregate: {
      count: number
    }
  }
}

interface UseCalendarExpensePlansProps extends BusinessAppContextProps {
  pageSize?: number
  searchTerm?: string
  currencyFilter?: string | null
}

export const useCalendarExpensePlans = ({
  accessToken,
  userInfo,
  pageSize = 1000, // Default to a larger page size for calendar view
  searchTerm,
  currencyFilter
}: UseCalendarExpensePlansProps) => {
  // Get managerId from userInfo or use a fallback for development
  const managerId = userInfo?.employeeDetails?.employeeId || '00000000-0000-0000-0000-000000000000'

  // Log the managerId to help with debugging

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [plans, setPlans] = useState<ExpensePlan[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)

  const fetchPlans = useCallback(async () => {
    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense plans.'))
      setLoading(false)
      return
    }

    if (!managerId) {
      setError(new Error('Manager ID not found. Cannot fetch expense plans.'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const searchValue = searchTerm ? `%${searchTerm}%` : '%%'

      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_CALENDAR_EXPENSE_PLANS,
          variables: {
            managerId,
            limit: pageSize,
            offset: 0, // Always start from the beginning for calendar view
            searchTerm: searchValue
          }
        })
      })

      const result = await response.json()

      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      const data = result.data as ExpensePlanResponse

      // Filter plans by currency if a currency filter is provided
      let filteredPlans = data.ExpensePlan
      if (currencyFilter) {
        filteredPlans = data.ExpensePlan.filter(plan => {
          const planCurrency = plan.currencyRef ? plan.currencyRef.replace('Currency:v1:', '') : 'EUR'
          return planCurrency === currencyFilter
        })
      }

      setPlans(filteredPlans)
      setTotalCount(data.ExpensePlanAggregate.aggregate.count)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch calendar expense plans'))
      message.error('Failed to load expense plans for calendar view')
    } finally {
      setLoading(false)
    }
  }, [accessToken, managerId, pageSize, searchTerm, currencyFilter])

  // Track the last fetch parameters to avoid redundant requests
  const lastFetchParams = useRef<{
    managerId: string
    searchTerm?: string
    currencyFilter?: string | null
  } | null>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Fetch plans when the component mounts or when dependencies change
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set a new timer to debounce the fetch
    debounceTimer.current = setTimeout(() => {
      // Check if this is a duplicate request with the same parameters
      if (
        lastFetchParams.current &&
        lastFetchParams.current.managerId === managerId &&
        lastFetchParams.current.searchTerm === searchTerm &&
        lastFetchParams.current.currencyFilter === currencyFilter
      ) {
        return
      }

      // Update last fetch parameters
      lastFetchParams.current = { managerId, searchTerm, currencyFilter }

      fetchPlans()
    }, 300) // 300ms debounce delay

    // Cleanup function to clear the timer if the component unmounts
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [fetchPlans, managerId, searchTerm, currencyFilter])

  return {
    plans,
    loading,
    error,
    totalCount,
    fetchPlans
  }
}

export default useCalendarExpensePlans
