import { useState, useCallback, useEffect } from 'react'
import {
  buildEmployeeActivitiesQuery,
  type EmployeeActivity,
  type EmployeeActivitiesResponse
} from '../queries/EmployeeActivitiesQueries'
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Re-export EmployeeActivity type for use in other files
export type { EmployeeActivity } from '../queries/EmployeeActivitiesQueries'

// Global cache for activity scores - once calculated, never changes
const ACTIVITY_SCORE_CACHE = new Map<string, number>()

// Utility functions for activity data transformation
export const generateOccurredAt = (createdDate: Date, activityId: string): string => {
  // Use activity ID as seed for consistent random generation
  const seed = activityId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const random1 = Math.sin(seed) * 10000
  const random2 = Math.sin(seed * 2) * 10000

  // Generate consistent occurred date that is the same or earlier than created date
  const maxDaysBack = 14 // Up to 2 weeks before logging
  const daysBack = Math.floor((random1 - Math.floor(random1)) * maxDaysBack) // 0-14 days before

  // Generate consistent time offset within the day (0-23 hours back)
  const hoursBack = Math.floor((random2 - Math.floor(random2)) * 24)

  const occurredDate = new Date(createdDate)
  occurredDate.setDate(occurredDate.getDate() - daysBack)
  occurredDate.setHours(occurredDate.getHours() - hoursBack)

  return occurredDate.toISOString()
}

export const calculateActivityScore = (createdAt: string, occurredAt: string): number => {
  const createdDate = new Date(createdAt)
  const occurredDate = new Date(occurredAt)

  // Calculate hours between when activity occurred and when it was logged
  const timeDiffMs = createdDate.getTime() - occurredDate.getTime()
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60)

  // Score based on how quickly the activity was logged after it occurred
  // Same day logging = 90-100 points
  // Within 3 days = 70-89 points
  // Within 1 week = 50-69 points
  // Within 2 weeks = 30-49 points
  // More than 2 weeks = 0-29 points

  if (timeDiffHours <= 24) {
    // Logged same day: 90-100 points
    return Math.max(90, Math.round(100 - (timeDiffHours / 24) * 10))
  } else if (timeDiffHours <= 72) {
    // Logged within 3 days: 70-89 points
    return Math.max(70, Math.round(90 - ((timeDiffHours - 24) / 48) * 20))
  } else if (timeDiffHours <= 168) {
    // Logged within 1 week: 50-69 points
    return Math.max(50, Math.round(70 - ((timeDiffHours - 72) / 96) * 20))
  } else if (timeDiffHours <= 336) {
    // Logged within 2 weeks: 30-49 points
    return Math.max(30, Math.round(50 - ((timeDiffHours - 168) / 168) * 20))
  } else {
    // Logged after 2+ weeks: 0-29 points
    return Math.max(0, Math.round(30 - ((timeDiffHours - 336) / 168) * 30))
  }
}

// Function to get cached activity score or calculate and cache it
export const getCachedActivityScore = (activityId: string, createdAt: string): number => {
  // Check if we already have a cached score for this activity
  if (ACTIVITY_SCORE_CACHE.has(activityId)) {
    return ACTIVITY_SCORE_CACHE.get(activityId)!
  }

  // Calculate score once and cache it forever
  const createdDate = new Date(createdAt)
  const occurredAt = generateOccurredAt(createdDate, activityId)
  const score = calculateActivityScore(createdAt, occurredAt)

  // Lock this score in cache
  ACTIVITY_SCORE_CACHE.set(activityId, score)

  return score
}

interface UseEmployeeActivitiesDataProps {
  employeeId: string
  accessToken: string
  queryVariables: any
}

interface UseEmployeeActivitiesDataReturn {
  activities: EmployeeActivity[]
  totalCount: number
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useEmployeeActivitiesData = ({
  employeeId,
  accessToken,
  queryVariables
}: UseEmployeeActivitiesDataProps): UseEmployeeActivitiesDataReturn => {
  const [activities, setActivities] = useState<EmployeeActivity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Build orderBy clause as string to avoid enum serialization issues
  const buildOrderByClause = useCallback((vars: any): string => {
    if (vars.orderBy && vars.orderBy.length > 0) {
      // Convert from DataTable format to GraphQL format
      const orderByItem = vars.orderBy[0]
      const field = orderByItem.field || 'createdAt'
      const direction = orderByItem.direction || 'DESC_NULLS_LAST'

      // Keep the full direction including NULLS_LAST or NULLS_FIRST
      // GraphQL enum values: ASC, DESC, ASC_NULLS_FIRST, ASC_NULLS_LAST, DESC_NULLS_FIRST, DESC_NULLS_LAST
      const graphqlDirection = direction

      // Handle nested fields (e.g., 'activityType.value', 'ownerEmployee.fullName')
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        return `orderBy: [{ ${parent}: { ${child}: ${graphqlDirection} } }]`
      }

      return `orderBy: [{ ${field}: ${graphqlDirection} }]`
    }

    // Default orderBy with nulls last
    return 'orderBy: [{ createdAt: DESC_NULLS_LAST }]'
  }, [])

  // Helper: Build search conditions
  const buildSearchConditions = useCallback((search: string) => {
    return {
      _or: [
        { title: { _ilike: `%${search}%` } },
        { activityType: { value: { _ilike: `%${search}%` } } },
        { contact: { firstName: { _ilike: `%${search}%` } } },
        { contact: { lastName: { _ilike: `%${search}%` } } },
        { lead: { name: { _ilike: `%${search}%` } } },
        { account: { name: { _ilike: `%${search}%` } } },
        { opportunity: { name: { _ilike: `%${search}%` } } }
      ]
    }
  }, [])

  // Helper: Build reference type conditions
  const buildReferenceTypeConditions = useCallback((referenceTypes: string[]) => {
    const referenceConditions: any[] = []
    if (referenceTypes.includes('account')) referenceConditions.push({ accountId: { _isNull: false } })
    if (referenceTypes.includes('contact')) referenceConditions.push({ contactId: { _isNull: false } })
    if (referenceTypes.includes('lead')) referenceConditions.push({ leadId: { _isNull: false } })
    if (referenceTypes.includes('opportunity')) referenceConditions.push({ opportunityId: { _isNull: false } })
    return referenceConditions.length > 0 ? { _or: referenceConditions } : null
  }, [])

  // Helper: Build date range conditions
  const buildDateRangeConditions = useCallback((vars: any) => {
    const conditions: any[] = []
    if (vars.createdAtFrom) conditions.push({ createdAt: { _gte: vars.createdAtFrom } })
    if (vars.createdAtTo) conditions.push({ createdAt: { _lte: vars.createdAtTo } })
    if (vars.occurredAtFrom) conditions.push({ occurredAt: { _gte: vars.occurredAtFrom } })
    if (vars.occurredAtTo) conditions.push({ occurredAt: { _lte: vars.occurredAtTo } })
    return conditions
  }, [])

  // Build where clause from query variables (stable function)
  const buildWhereClause = useCallback(
    (vars: any) => {
      const conditions: any[] = []

      // Add search conditions
      if (vars.search) {
        conditions.push(buildSearchConditions(vars.search))
      }

      // Add activity type filter
      if (vars.activityTypeRef && vars.activityTypeRef.length > 0) {
        conditions.push({ activityType: { id: { _in: vars.activityTypeRef } } })
      }

      // Add reference type filter
      if (vars.referenceType && vars.referenceType.length > 0) {
        const refCondition = buildReferenceTypeConditions(vars.referenceType)
        if (refCondition) {
          conditions.push(refCondition)
        }
      }

      // Add date range conditions
      conditions.push(...buildDateRangeConditions(vars))

      return conditions.length === 0 ? undefined : { _and: conditions }
    },
    [buildSearchConditions, buildReferenceTypeConditions, buildDateRangeConditions]
  )

  // Stabilize queryVariables to prevent infinite loops (stringify for stable reference)
  const queryVariablesString = JSON.stringify(queryVariables || {})

  // Load data function
  const loadData = useCallback(async () => {
    if (!employeeId) {
      setError(new Error('Employee ID is required'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Parse back to object (with fallback to empty object)
      const vars = queryVariablesString ? JSON.parse(queryVariablesString) : {}

      // Build orderBy clause as string
      const orderByClause = buildOrderByClause(vars)

      // Build query with orderBy as part of the string (not a variable)
      const query = buildEmployeeActivitiesQuery(orderByClause)

      // Build where clause - always include employeeId filter
      const baseWhere = {
        _and: [{ ownerEmployeeId: { _eq: employeeId } }, { isDeleted: { _eq: false } }]
      }

      // Merge with additional where conditions
      const additionalWhere = buildWhereClause(vars)
      const where = additionalWhere ? { _and: [baseWhere, additionalWhere] } : baseWhere

      // Execute GraphQL query
      const result = await graphqlClient.request<EmployeeActivitiesResponse>(query, {
        where,
        offset: vars.offset || 0,
        limit: enforceQueryLimit(vars.limit || 20)
      })

      // Return raw activities without transformation
      setActivities(result?.SalesActivity || [])
      setTotalCount(result.SalesActivityAggregate.aggregate.count)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load employee activities'))
      setActivities([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [employeeId, graphqlClient, queryVariablesString, buildOrderByClause, buildWhereClause])

  // Load data when queryVariables change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Stable refetch function
  const refetch = useCallback(() => {
    loadData()
  }, [loadData])

  return {
    activities,
    totalCount,
    loading,
    error,
    refetch
  }
}
