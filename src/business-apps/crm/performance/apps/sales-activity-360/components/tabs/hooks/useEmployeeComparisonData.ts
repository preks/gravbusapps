import { useState, useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'

const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'
const EMPLOYEES_PAGE_SIZE = 20

// Lightweight employee entry for the comparison picker
export interface EmployeeOption {
  id: string
  displayName: string
  fullName: string
  pictureThumbnail?: string
  jobPosition?: string
  organizationalUnit?: string
}

// Aggregated activity statistics for a single employee
export interface EmployeeMetrics {
  totalActivities: number
  thisWeekActivities: number
  thisMonthActivities: number
  last30DaysActivities: number
  prev30DaysActivities: number
  trend: number // Percentage change vs previous 30 days
  lastActivityDate?: string
}

// Full comparison entry combining display info + metrics
export interface EmployeeComparison extends EmployeeOption, EmployeeMetrics {}

interface UseEmployeeComparisonDataProps {
  accessToken: string
  entityId?: string // For filtering by specific entity (account, contact, etc.)
  entityType?: 'accountId' | 'contactId' | 'leadId' | 'opportunityId'
}

interface UseEmployeeComparisonDataResult {
  employeeOptions: EmployeeOption[]
  optionsById: Record<string, EmployeeOption>
  optionsLoading: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => void
  search: (query: string) => void
  metricsById: Record<string, EmployeeMetrics>
  metricsLoadingById: Record<string, boolean>
  loadEmployeeMetrics: (employeeId: string) => void
}

interface EmployeeRow {
  id: string
  displayName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
  employeePosition?: Array<{
    jobPosition?: { name?: string }
    organizationalUnit?: { name?: string }
  }>
}

// Paginated, searchable list of sales-associate employees for the picker
const GET_COMPARISON_EMPLOYEES_QUERY = `
  query GetComparisonEmployees($limit: Int!, $offset: Int!, $searchPattern: String!) {
    Employee(
      where: {
        isDeleted: { _eq: false }
        employeePosition: {
          employeeCapabilities: { capability: { name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" } } }
        }
        _or: [
          { displayName: { _ilike: $searchPattern } }
          { firstName: { _ilike: $searchPattern } }
          { lastName: { _ilike: $searchPattern } }
        ]
      }
      orderBy: { displayName: ASC_NULLS_LAST }
      limit: $limit
      offset: $offset
    ) {
      id
      displayName
      firstName
      lastName
      pictureThumbnail
      employeePosition {
        jobPosition { name }
        organizationalUnit { name }
      }
    }
  }
`

// Aggregated activity metrics for a single employee (executed on selection only)
const GET_EMPLOYEE_METRICS_QUERY = (entityFilter?: { field: string; id: string }) => {
  const entityClause = entityFilter ? `{ ${entityFilter.field}: { _eq: "${entityFilter.id}" } }` : ''
  return `
  query GetEmployeeActivityMetrics(
    $employeeId: uuid!,
    $thisWeekStart: timestamptz!,
    $thisMonthStart: timestamptz!,
    $last30DaysStart: timestamptz!,
    $prev30DaysStart: timestamptz!,
    $prev30DaysEnd: timestamptz!
  ) {
    total: SalesActivityAggregate(
      where: { _and: [ { isDeleted: { _eq: false } } { ownerEmployeeId: { _eq: $employeeId } } ${entityClause} ] }
    ) {
      aggregate { count max { createdAt } }
    }
    thisWeek: SalesActivityAggregate(
      where: { _and: [ { isDeleted: { _eq: false } } { ownerEmployeeId: { _eq: $employeeId } } { createdAt: { _gte: $thisWeekStart } } ${entityClause} ] }
    ) {
      aggregate { count }
    }
    thisMonth: SalesActivityAggregate(
      where: { _and: [ { isDeleted: { _eq: false } } { ownerEmployeeId: { _eq: $employeeId } } { createdAt: { _gte: $thisMonthStart } } ${entityClause} ] }
    ) {
      aggregate { count }
    }
    last30: SalesActivityAggregate(
      where: { _and: [ { isDeleted: { _eq: false } } { ownerEmployeeId: { _eq: $employeeId } } { createdAt: { _gte: $last30DaysStart } } ${entityClause} ] }
    ) {
      aggregate { count }
    }
    prev30: SalesActivityAggregate(
      where: { _and: [ { isDeleted: { _eq: false } } { ownerEmployeeId: { _eq: $employeeId } } { createdAt: { _gte: $prev30DaysStart, _lt: $prev30DaysEnd } } ${entityClause} ] }
    ) {
      aggregate { count }
    }
  }
`
}

interface AggregateCount {
  aggregate?: { count?: number; max?: { createdAt?: string } }
}

interface MetricsResponse {
  total: AggregateCount
  thisWeek: AggregateCount
  thisMonth: AggregateCount
  last30: AggregateCount
  prev30: AggregateCount
}

const toOption = (row: EmployeeRow): EmployeeOption => {
  const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim()
  const position = row.employeePosition?.[0]
  return {
    id: row.id,
    displayName: row.displayName || fullName || 'Unknown Employee',
    fullName: fullName || 'Unknown',
    pictureThumbnail: row.pictureThumbnail,
    jobPosition: position?.jobPosition?.name,
    organizationalUnit: position?.organizationalUnit?.name
  }
}

const mapMetrics = (res: MetricsResponse): EmployeeMetrics => {
  const totalActivities = res.total.aggregate?.count ?? 0
  const thisWeekActivities = res.thisWeek.aggregate?.count ?? 0
  const thisMonthActivities = res.thisMonth.aggregate?.count ?? 0
  const last30DaysActivities = res.last30.aggregate?.count ?? 0
  const prev30DaysActivities = res.prev30.aggregate?.count ?? 0

  let trend = 0
  if (prev30DaysActivities > 0) {
    trend = ((last30DaysActivities - prev30DaysActivities) / prev30DaysActivities) * 100
  } else if (last30DaysActivities > 0) {
    trend = 100
  }

  return {
    totalActivities,
    thisWeekActivities,
    thisMonthActivities,
    last30DaysActivities,
    prev30DaysActivities,
    trend,
    lastActivityDate: res.total.aggregate?.max?.createdAt
  }
}

export const useEmployeeComparisonData = ({
  accessToken,
  entityId,
  entityType
}: UseEmployeeComparisonDataProps): UseEmployeeComparisonDataResult => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [optionsById, setOptionsById] = useState<Record<string, EmployeeOption>>({})
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [metricsById, setMetricsById] = useState<Record<string, EmployeeMetrics>>({})
  const [metricsLoadingById, setMetricsLoadingById] = useState<Record<string, boolean>>({})

  // Refs mirror cache state so callbacks stay stable and can short-circuit duplicates
  const metricsByIdRef = useRef<Record<string, EmployeeMetrics>>({})
  const metricsLoadingRef = useRef<Record<string, boolean>>({})
  const listRequestRef = useRef<{ key: string; promise: Promise<unknown> } | null>(null)

  const registerOptions = useCallback((rows: EmployeeOption[]) => {
    setOptionsById(prev => {
      const next = { ...prev }
      rows.forEach(row => {
        next[row.id] = row
      })
      return next
    })
  }, [])

  const fetchPage = useCallback(
    async (term: string, pageOffset: number, append: boolean) => {
      if (!accessToken) {
        setOptionsLoading(false)
        return
      }

      setOptionsLoading(true)
      setError(null)
      try {
        const searchPattern = term ? `%${term.trim()}%` : '%%'
        const key = `${searchPattern}|${pageOffset}`

        if (listRequestRef.current?.key === key) {
          await listRequestRef.current.promise
          return
        }

        const promise = graphqlClient.request<{ Employee: EmployeeRow[] }>(GET_COMPARISON_EMPLOYEES_QUERY, {
          limit: EMPLOYEES_PAGE_SIZE,
          offset: pageOffset,
          searchPattern
        })
        listRequestRef.current = { key, promise }

        const result = await promise
        const rows = (result?.Employee || []).map(toOption)

        registerOptions(rows)
        setEmployeeOptions(prev => {
          if (!append) return rows
          const map = new Map<string, EmployeeOption>()
          prev.forEach(p => map.set(p.id, p))
          rows.forEach(r => map.set(r.id, r))
          return Array.from(map.values())
        })
        setHasMore(rows.length === EMPLOYEES_PAGE_SIZE)
        setOffset(pageOffset)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load employees'
        setError(message)
        console.error('Error loading comparison employees:', message)
      } finally {
        listRequestRef.current = null
        setOptionsLoading(false)
      }
    },
    [accessToken, graphqlClient, registerOptions]
  )

  const search = useCallback(
    (query: string) => {
      const term = (query || '').trim()
      setSearchTerm(term)
      fetchPage(term, 0, false).catch(() => undefined)
    },
    [fetchPage]
  )

  const loadMore = useCallback(() => {
    if (!hasMore || optionsLoading) return
    fetchPage(searchTerm, offset + EMPLOYEES_PAGE_SIZE, true).catch(() => undefined)
  }, [fetchPage, hasMore, optionsLoading, offset, searchTerm])

  const loadEmployeeMetrics = useCallback(
    (employeeId: string) => {
      if (!accessToken || !employeeId) return
      if (metricsByIdRef.current[employeeId] || metricsLoadingRef.current[employeeId]) return

      metricsLoadingRef.current = { ...metricsLoadingRef.current, [employeeId]: true }
      setMetricsLoadingById(prev => ({ ...prev, [employeeId]: true }))

      const now = dayjs()
      const variables = {
        employeeId,
        thisWeekStart: now.startOf('week').format('YYYY-MM-DDTHH:mm:ss'),
        thisMonthStart: now.startOf('month').format('YYYY-MM-DDTHH:mm:ss'),
        last30DaysStart: now.subtract(30, 'day').format('YYYY-MM-DDTHH:mm:ss'),
        prev30DaysStart: now.subtract(60, 'day').format('YYYY-MM-DDTHH:mm:ss'),
        prev30DaysEnd: now.subtract(30, 'day').format('YYYY-MM-DDTHH:mm:ss')
      }

      const entityFilter = entityId && entityType ? { field: entityType, id: entityId } : undefined
      const query = GET_EMPLOYEE_METRICS_QUERY(entityFilter)

      graphqlClient
        .request<MetricsResponse>(query, variables)
        .then(res => {
          const metrics = mapMetrics(res)
          metricsByIdRef.current = { ...metricsByIdRef.current, [employeeId]: metrics }
          setMetricsById(prev => ({ ...prev, [employeeId]: metrics }))
        })
        .catch(err => {
          const message = err instanceof Error ? err.message : 'Failed to load employee metrics'
          console.error('Error loading employee metrics:', message)
        })
        .finally(() => {
          metricsLoadingRef.current = { ...metricsLoadingRef.current, [employeeId]: false }
          setMetricsLoadingById(prev => ({ ...prev, [employeeId]: false }))
        })
    },
    [accessToken, entityId, entityType, graphqlClient]
  )

  // Reset metric cache whenever the entity scope changes
  useEffect(() => {
    metricsByIdRef.current = {}
    metricsLoadingRef.current = {}
    setMetricsById({})
    setMetricsLoadingById({})
  }, [entityId, entityType])

  // Initial load of the first employee page
  useEffect(() => {
    if (!accessToken) return
    fetchPage('', 0, false).catch(() => undefined)
  }, [accessToken, fetchPage])

  return {
    employeeOptions,
    optionsById,
    optionsLoading,
    hasMore,
    error,
    loadMore,
    search,
    metricsById,
    metricsLoadingById,
    loadEmployeeMetrics
  }
}
