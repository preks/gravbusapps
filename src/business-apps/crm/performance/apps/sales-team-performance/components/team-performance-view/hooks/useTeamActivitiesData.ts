import { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesActivity } from '../../sales-member-performance/types/activitiesTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits'

// Extended interface for team activities with employee info
// Omit conflicting property 'ownerEmployee' from base SalesActivity
export interface TeamSalesActivity extends Omit<SalesActivity, 'ownerEmployee'> {
  ownerEmployeeId: string | null
  ownerEmployee: {
    fullName: string
    pictureThumbnail?: string | null
  } | null
  accountId: string | null
  contactId: string | null
  leadId: string | null
  opportunityId: string | null
  account: {
    email?: string | null
    name: string
    pictureUrl?: string | null
  } | null
  contact: {
    firstName: string
    lastName: string
    phone?: string | null
    pictureUrl?: string | null
    email?: string | null
  } | null
  lead: {
    name: string
    companyEmail?: string | null
    companyPhone?: string | null
    contact?: {
      firstName: string
      lastName: string
    } | null
  } | null
  opportunity: {
    name: string
    ownerEmployee?: {
      fullName: string
    } | null
  } | null
}

export interface TeamActivitiesFilters {
  activityTypeRef?: string[]
  source?: string
  ownerEmployeeId?: string[]
  referenceType?: string[]
  accountId?: string[]
  contactId?: string[]
  leadId?: string[]
  opportunityId?: string[]
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
  retry: () => void
}

// Build GraphQL query for team activities dynamically (to handle nested orderBy properly)
const buildTeamActivitiesQuery = (orderByClause: string) => `
  query GetTeamActivities($where: SalesActivityBoolExp, $limit: Int, $offset: Int) {
    SalesActivity(
      where: $where,
      ${orderByClause}
      limit: $limit,
      offset: $offset
    ) {
      id
      contactId
      leadId
      accountId
      opportunityId
      source
      description
      createdAt
      occurredAt
      createdBy
      ownerEmployeeId
      ownerEmployee {
        fullName
        pictureThumbnail
      }
      title
      activityType {
        value
      }
      account {
        email
        name
        pictureUrl
      }
      contact {
        firstName
        lastName
        phone
        pictureUrl
        email
      }
      lead {
        name
        companyEmail
        companyPhone
        contact {
          firstName
          lastName
        }
      }
      opportunity {
        name
        ownerEmployee {
          fullName
        }
      }
    }
    SalesActivityAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

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
          { lead: { name: searchPattern } },
          { opportunity: { name: searchPattern } },
          { ownerEmployee: { fullName: searchPattern } }
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
      // Build where conditions using helper functions
      const baseWhere: any = buildBaseWhereConditions(stableEmployeeIds, userInfo)
      addSearchConditions(baseWhere, search)
      addFilterConditions(baseWhere, stableFilters)
      addDateRangeFilters(baseWhere, stableFilters)

      // Build orderBy clause as string (to handle nested catalog entries and employee fields properly)
      const buildOrderByEntry = (field: string, direction: string): string => {
        // Nested catalog entry fields (activityType is a CatalogEntry)
        if (field === 'activityType.value' || field === 'activityType') {
          return `{ activityType: { value: ${direction} } }`
        }

        // Nested employee fields (ownerEmployee is an Employee relation)
        if (field === 'ownerEmployee.fullName' || field === 'ownerEmployee') {
          return `{ ownerEmployee: { fullName: ${direction} } }`
        }
        if (field === 'ownerEmployee.displayName') {
          return `{ ownerEmployee: { displayName: ${direction} } }`
        }

        // Direct scalar fields
        return `{ ${field}: ${direction} }`
      }

      const orderByEntry = buildOrderByEntry(sortField, sortOrder)
      const orderByClause = `orderBy: [${orderByEntry}]`

      // Build query with orderBy as part of the string (not a variable)
      const query = buildTeamActivitiesQuery(orderByClause)

      const result = await graphqlClient.request<{
        SalesActivity: TeamSalesActivity[]
        SalesActivityAggregate: {
          aggregate: { count: number }
        }
      }>(query, {
        where: baseWhere,
        limit: enforceQueryLimit(limit),
        offset
      })

      setActivities(result.SalesActivity || [])
      setTotal(result.SalesActivityAggregate?.aggregate?.count || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team activities'
      setError(errorMessage)
      setActivities([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [
    accessToken,
    stableEmployeeIds,
    search,
    sortField,
    sortOrder,
    limit,
    offset,
    stableFilters,
    userInfo,
    graphqlClient,
    buildBaseWhereConditions,
    addSearchConditions,
    addFilterConditions,
    addDateRangeFilters
  ])

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
    retry
  }
}
