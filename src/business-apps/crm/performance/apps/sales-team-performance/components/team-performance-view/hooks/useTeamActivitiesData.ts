import { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits'
import type { CustomerActivity } from '@/common/data/customer/types/customerActivityTypes'
import {
  buildCustomerActivityOrderBy,
  buildCustomerActivityQuery
} from '@/common/data/customer/queries/customerActivityQueries'

export type TeamSalesActivity = CustomerActivity

export interface TeamActivitiesFilters {
  activityTypeRef?: string[]
  source?: string
  ownerEmployeeId?: string[]
  referenceType?: string[]
  accountId?: string[]
  contactId?: string[]
  leadId?: string[]
  opportunityId?: string[]
  unlinkedOnly?: boolean
  createdAtFrom?: string
  createdAtTo?: string
  occurredAtFrom?: string
  occurredAtTo?: string
}

interface UseTeamActivitiesDataProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeIds: string[] // Array of employee IDs for the team
  search?: string
  sortField?: 'createdAt' | 'occurredAt' | 'title' | 'ownerEmployee.fullName' | 'activityType.value'
  sortOrder?: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  limit?: number
  offset?: number
  filters?: TeamActivitiesFilters
}

interface UseTeamActivitiesDataResult {
  activities: TeamSalesActivity[]
  total: number
  loading: boolean
  error: string | null
  loadActivities: () => Promise<void>
  fetchActivities: (vars: {
    limit?: number
    offset?: number
    enforceLimit?: boolean
  }) => Promise<{ activities: TeamSalesActivity[]; total: number }>
  retry: () => void
}

const mapSortField = (field: UseTeamActivitiesDataProps['sortField']): string => {
  if (field === 'activityType.value') return 'activityType'
  if (field === 'ownerEmployee.fullName') return 'ownerEmployee'
  return field ?? 'createdAt'
}

const mapSortDirection = (direction: UseTeamActivitiesDataProps['sortOrder']) => {
  if (direction === 'ASC') return 'ASC_NULLS_LAST'
  if (direction === 'DESC') return 'DESC_NULLS_LAST'
  return direction ?? 'DESC_NULLS_LAST'
}

export const useTeamActivitiesData = ({
  employeeIds,
  search = '',
  sortField = 'createdAt',
  sortOrder = 'DESC_NULLS_LAST',
  limit = 20,
  offset = 0,
  filters = {},
  accessToken,
  userInfo
}: UseTeamActivitiesDataProps): UseTeamActivitiesDataResult => {
  const [activities, setActivities] = useState<TeamSalesActivity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Stabilize arrays and objects to prevent unnecessary re-renders
  const stableEmployeeIds = useMemo(() => employeeIds, [JSON.stringify(employeeIds)])
  const stableFilters = useMemo(() => filters, [JSON.stringify(filters)])

  // Helper: Build base where conditions for team activities
  const buildBaseWhereConditions = useCallback((employeeIds: string[], userInfo: any) => {
    return {
      _and: [
        {
          _or: [
            { ownerEmployeeId: { _in: employeeIds } },
            ...(userInfo && employeeIds.includes(userInfo.id)
              ? [{ _and: [{ ownerEmployeeId: { _eq: null } }, { createdBy: { _eq: userInfo.id } }] }]
              : [])
          ]
        },
        { isDeleted: { _eq: false } }
      ]
    }
  }, [])

  // Helper: Add search conditions
  const addSearchConditions = useCallback((baseWhere: any, search?: string) => {
    if (search?.trim()) {
      const searchPattern = { _ilike: `%${search.trim()}%` }
      baseWhere._and.push({
        _or: [
          { title: searchPattern },
          { description: searchPattern },
          { source: searchPattern },
          { account: { name: searchPattern } },
          { contact: { firstName: searchPattern } },
          { contact: { lastName: searchPattern } },
          { lead: { companyName: searchPattern } },
          { lead: { firstName: searchPattern } },
          { lead: { lastName: searchPattern } },
          { lead: { code: searchPattern } },
          { opportunity: { name: searchPattern } },
          { ownerEmployee: { displayName: searchPattern } },
          { ownerEmployee: { fullName: searchPattern } },
          { ownerEmployee: { firstName: searchPattern } },
          { ownerEmployee: { lastName: searchPattern } }
        ]
      })
    }
  }, [])

  // Helper: Build reference entity conditions
  const buildReferenceEntityConditions = useCallback((referenceTypes: string[]) => {
    const conditions: any[] = []
    if (referenceTypes.includes('account')) conditions.push({ accountId: { _isNull: false } })
    if (referenceTypes.includes('contact')) conditions.push({ contactId: { _isNull: false } })
    if (referenceTypes.includes('lead')) conditions.push({ leadId: { _isNull: false } })
    if (referenceTypes.includes('opportunity')) conditions.push({ opportunityId: { _isNull: false } })
    return conditions
  }, [])

  // Helper: Add filter conditions
  const addFilterConditions = useCallback(
    (baseWhere: any, filters: TeamActivitiesFilters) => {
      if (filters.activityTypeRef?.length) {
        baseWhere._and.push({ activityTypeRef: { _in: filters.activityTypeRef } })
      }

      if (filters.source?.trim()) {
        baseWhere._and.push({ source: { _ilike: `%${filters.source.trim()}%` } })
      }

      if (filters.ownerEmployeeId?.length) {
        baseWhere._and.push({ ownerEmployeeId: { _in: filters.ownerEmployeeId } })
      }

      // Reference entity filters
      if (filters.referenceType?.length) {
        const referenceConditions = buildReferenceEntityConditions(filters.referenceType)
        if (referenceConditions.length > 0) {
          baseWhere._and.push({ _or: referenceConditions })
        }
      }

      if (filters.accountId?.length) baseWhere._and.push({ accountId: { _in: filters.accountId } })
      if (filters.contactId?.length) baseWhere._and.push({ contactId: { _in: filters.contactId } })
      if (filters.leadId?.length) baseWhere._and.push({ leadId: { _in: filters.leadId } })
      if (filters.opportunityId?.length) baseWhere._and.push({ opportunityId: { _in: filters.opportunityId } })
      if (filters.unlinkedOnly) {
        baseWhere._and.push(
          { accountId: { _isNull: true } },
          { contactId: { _isNull: true } },
          { leadId: { _isNull: true } },
          { opportunityId: { _isNull: true } }
        )
      }
    },
    [buildReferenceEntityConditions]
  )

  // Helper: Add date range filters
  const addDateRangeFilters = useCallback((baseWhere: any, filters: TeamActivitiesFilters) => {
    if (filters.createdAtFrom) baseWhere._and.push({ createdAt: { _gte: filters.createdAtFrom } })
    if (filters.createdAtTo) baseWhere._and.push({ createdAt: { _lte: filters.createdAtTo } })
    if (filters.occurredAtFrom) baseWhere._and.push({ occurredAt: { _gte: filters.occurredAtFrom } })
    if (filters.occurredAtTo) baseWhere._and.push({ occurredAt: { _lte: filters.occurredAtTo } })
  }, [])

  const fetchActivities = useCallback(
    async (vars: { limit?: number; offset?: number; enforceLimit?: boolean } = {}) => {
      const baseWhere: any = buildBaseWhereConditions(stableEmployeeIds, userInfo)
      addSearchConditions(baseWhere, search)
      addFilterConditions(baseWhere, stableFilters)
      addDateRangeFilters(baseWhere, stableFilters)

      const query = buildCustomerActivityQuery()
      const orderBy = buildCustomerActivityOrderBy([
        {
          field: mapSortField(sortField),
          direction: mapSortDirection(sortOrder)
        }
      ])

      const requestedLimit = vars.limit ?? limit
      const queryLimit = vars.enforceLimit ? enforceQueryLimit(requestedLimit) : requestedLimit

      const result = await graphqlClient.request<{
        SalesActivity: TeamSalesActivity[]
        SalesActivityAggregate: {
          aggregate: { count: number }
        }
      }>(query, {
        where: baseWhere,
        orderBy,
        limit: queryLimit,
        offset: vars.offset ?? offset
      })

      return {
        activities: result.SalesActivity || [],
        total: result.SalesActivityAggregate?.aggregate?.count || 0
      }
    },
    [
      stableEmployeeIds,
      userInfo,
      search,
      stableFilters,
      sortField,
      sortOrder,
      graphqlClient,
      limit,
      offset,
      buildBaseWhereConditions,
      addSearchConditions,
      addFilterConditions,
      addDateRangeFilters
    ]
  )

  const loadActivities = useCallback(async () => {
    if (!accessToken || stableEmployeeIds.length === 0) {
      setActivities([])
      setTotal(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchActivities({ limit, offset, enforceLimit: true })
      setActivities(result.activities)
      setTotal(result.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team activities'
      setError(errorMessage)
      setActivities([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [accessToken, stableEmployeeIds, limit, offset, fetchActivities])

  const retry = useCallback(() => {
    loadActivities()
  }, [loadActivities])

  // Auto-load activities when dependencies change
  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  return {
    activities,
    total,
    loading,
    error,
    loadActivities,
    fetchActivities,
    retry
  }
}
