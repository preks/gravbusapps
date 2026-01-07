import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface UseTeamAnalyticsAggregatesProps {
  employeeIds: string[]
  accessToken: string
}

interface ActivityTypeAggregate {
  activityType: string
  count: number
}

interface EmployeeActivityAggregate {
  employeeId: string
  employeeName: string
  count: number
}

interface EntityTypeAggregate {
  entityType: string
  count: number
}

interface TimelineAggregate {
  date: string
  count: number
}

interface UseTeamAnalyticsAggregatesResult {
  activityTypeAggregates: ActivityTypeAggregate[]
  employeeActivityAggregates: EmployeeActivityAggregate[]
  entityTypeAggregates: EntityTypeAggregate[]
  timelineAggregates: TimelineAggregate[]
  totalActivities: number
  totalActivitiesLast30Days: number
  thisWeekActivities: number
  thisWeekActivitiesLast30Days: number
  loading: boolean
  error: string | null
  loadAggregates: () => Promise<void>
  retry: () => void
}

// Step 1: Get total count and employee info (no need to query for activity types - use catalog instead)
const GET_METADATA_QUERY = `
  query GetMetadata($employeeIds: [uuid!]!) {
    # Total count using aggregate (most efficient)
    totalCount: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Get employee info
    employees: Employee(
      where: {
        id: { _in: $employeeIds }
      }
    ) {
      id
      fullName
    }
  }
`

// Query to get trend data for comparison
const GET_TREND_DATA_QUERY = `
  query GetTrendData(
    $employeeIds: [uuid!]!,
    $last30DaysStart: timestamptz!,
    $thisWeekStart: timestamptz!,
    $prev30DaysStart: timestamptz!,
    $prev30DaysEnd: timestamptz!,
    $prevWeekStart: timestamptz!,
    $prevWeekEnd: timestamptz!
  ) {
    # Last 30 days total
    last30DaysTotal: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { occurredAt: { _gte: $last30DaysStart } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    # This week activities
    thisWeek: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { occurredAt: { _gte: $thisWeekStart } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Previous 30 days total (30-60 days ago)
    prev30DaysTotal: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { occurredAt: { _gte: $prev30DaysStart } }
          { occurredAt: { _lt: $prev30DaysEnd } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Same week from 30 days ago (for week comparison)
    prevWeek: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { occurredAt: { _gte: $prevWeekStart } }
          { occurredAt: { _lt: $prevWeekEnd } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

// Build dynamic timeline aggregate query for each day
const buildTimelineAggregateQuery = (days: Array<{ date: string; startTime: string; endTime: string }>) => {
  const dayAggregates = days
    .map((day, index) => {
      return `
    day${index}: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { occurredAt: { _gte: "${day.startTime}" } }
          { occurredAt: { _lt: "${day.endTime}" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }`
    })
    .join('\n')

  return `
    query GetTimelineAggregates($employeeIds: [uuid!]!) {
      ${dayAggregates}
    }
  `
}

// Step 2: Build dynamic aggregate queries for each activity type, employee, and entity type
const buildAggregateQuery = (
  activityTypes: Array<{ activityTypeRef: string; value: string }>,
  employees: Array<{ id: string; fullName: string }>
) => {
  const typeAggregates = activityTypes
    .map((type, index) => {
      return `
    activityType${index}: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { activityTypeRef: { _eq: "${type.activityTypeRef}" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }`
    })
    .join('\n')

  const employeeAggregates = employees
    .map((emp, index) => {
      return `
    employee${index}: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _eq: "${emp.id}" } }
          { isDeleted: { _eq: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }`
    })
    .join('\n')

  // Entity type aggregates - count by which ID field is populated
  const entityTypeAggregates = `
    accountActivities: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { accountId: { _isNull: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    contactActivities: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { contactId: { _isNull: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    leadActivities: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { leadId: { _isNull: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    
    opportunityActivities: SalesActivityAggregate(
      where: {
        _and: [
          { ownerEmployeeId: { _in: $employeeIds } }
          { isDeleted: { _eq: false } }
          { opportunityId: { _isNull: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  `

  return `
    query GetAggregates($employeeIds: [uuid!]!) {
      ${typeAggregates}
      ${employeeAggregates}
      ${entityTypeAggregates}
    }
  `
}

export const useTeamAnalyticsAggregates = ({
  employeeIds,
  accessToken
}: UseTeamAnalyticsAggregatesProps): UseTeamAnalyticsAggregatesResult => {
  const [activityTypeAggregates, setActivityTypeAggregates] = useState<ActivityTypeAggregate[]>([])
  const [employeeActivityAggregates, setEmployeeActivityAggregates] = useState<EmployeeActivityAggregate[]>([])
  const [entityTypeAggregates, setEntityTypeAggregates] = useState<EntityTypeAggregate[]>([])
  const [timelineAggregates, setTimelineAggregates] = useState<TimelineAggregate[]>([])
  const [totalActivities, setTotalActivities] = useState(0)
  const [totalActivitiesLast30Days, setTotalActivitiesLast30Days] = useState(0)
  const [thisWeekActivities, setThisWeekActivities] = useState(0)
  const [thisWeekActivitiesLast30Days, setThisWeekActivitiesLast30Days] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadAggregates = useCallback(async () => {
    if (!employeeIds.length || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Get activity types from catalog (more efficient than querying database)
      const catalogResponse = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'SalesActivityType',
          version: 'v1'
        },
        {
          limit: 100, // Get all activity types
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale
        }
      )

      const activityTypes =
        catalogResponse?.data
          ?.filter((entry: any) => entry.value)
          .map((entry: any) => ({
            activityTypeRef: entry.id,
            value: entry.value
          })) || []

      // Step 2: Get metadata (total count and employees)
      const metadataResult = await graphqlClient.request<{
        totalCount: {
          aggregate: { count: number }
        }
        employees: Array<{
          id: string
          fullName: string
        }>
      }>(GET_METADATA_QUERY, {
        employeeIds
      })

      const totalCount = metadataResult.totalCount.aggregate.count
      const employees = metadataResult.employees.filter(emp => emp.fullName) // Filter out employees without fullName

      // Step 2.5: Get trend data for comparisons
      const now = new Date()
      const thisWeekStart = new Date(now)
      thisWeekStart.setDate(now.getDate() - now.getDay()) // Start of this week (Sunday)
      thisWeekStart.setHours(0, 0, 0, 0)

      const last30DaysStart = new Date(now)
      last30DaysStart.setDate(now.getDate() - 30)
      last30DaysStart.setHours(0, 0, 0, 0)

      const prev30DaysStart = new Date(now)
      prev30DaysStart.setDate(now.getDate() - 60)
      prev30DaysStart.setHours(0, 0, 0, 0)

      const prev30DaysEnd = new Date(last30DaysStart)

      const prevWeekStart = new Date(thisWeekStart)
      prevWeekStart.setDate(prevWeekStart.getDate() - 30)

      const prevWeekEnd = new Date(prevWeekStart)
      prevWeekEnd.setDate(prevWeekEnd.getDate() + 7)

      const trendResult = await graphqlClient.request<{
        last30DaysTotal: { aggregate: { count: number } }
        thisWeek: { aggregate: { count: number } }
        prev30DaysTotal: { aggregate: { count: number } }
        prevWeek: { aggregate: { count: number } }
      }>(GET_TREND_DATA_QUERY, {
        employeeIds,
        last30DaysStart: last30DaysStart.toISOString(),
        thisWeekStart: thisWeekStart.toISOString(),
        prev30DaysStart: prev30DaysStart.toISOString(),
        prev30DaysEnd: prev30DaysEnd.toISOString(),
        prevWeekStart: prevWeekStart.toISOString(),
        prevWeekEnd: prevWeekEnd.toISOString()
      })

      const thisWeek = trendResult.thisWeek.aggregate.count
      const prev30DaysTotal = trendResult.prev30DaysTotal.aggregate.count
      const prevWeek = trendResult.prevWeek.aggregate.count

      // Step 2.6: Build timeline aggregate query for last 30 days
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today

      const timelineDays = []
      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() - (29 - i)) // Start from 30 days ago

        const startTime = new Date(date)
        startTime.setHours(0, 0, 0, 0)

        const endTime = new Date(date)
        endTime.setHours(23, 59, 59, 999)

        timelineDays.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
      }

      // Execute timeline aggregate query
      const timelineQuery = buildTimelineAggregateQuery(timelineDays)
      const timelineResult = await graphqlClient.request<Record<string, { aggregate: { count: number } }>>(
        timelineQuery,
        { employeeIds }
      )

      // Extract timeline aggregates
      const timelineData: TimelineAggregate[] = timelineDays.map((day, index) => ({
        date: day.date,
        count: timelineResult[`day${index}`]?.aggregate?.count || 0
      }))

      // Step 3: Build and execute aggregate queries
      if (activityTypes.length > 0 || employees.length > 0) {
        const aggregateQuery = buildAggregateQuery(activityTypes, employees)
        const aggregateResult = await graphqlClient.request<Record<string, { aggregate: { count: number } }>>(
          aggregateQuery,
          { employeeIds }
        )

        // Extract activity type aggregates
        const typeAggregates: ActivityTypeAggregate[] = activityTypes.map((type, index) => ({
          activityType: type.value,
          count: aggregateResult[`activityType${index}`]?.aggregate?.count || 0
        }))

        // Extract employee aggregates
        const employeeAggregates: EmployeeActivityAggregate[] = employees.map((emp, index) => ({
          employeeId: emp.id,
          employeeName: emp.fullName,
          count: aggregateResult[`employee${index}`]?.aggregate?.count || 0
        }))

        // Extract entity type aggregates
        const entityAggregates: EntityTypeAggregate[] = [
          {
            entityType: 'Account',
            count: aggregateResult.accountActivities?.aggregate?.count || 0
          },
          {
            entityType: 'Contact',
            count: aggregateResult.contactActivities?.aggregate?.count || 0
          },
          {
            entityType: 'Lead',
            count: aggregateResult.leadActivities?.aggregate?.count || 0
          },
          {
            entityType: 'Opportunity',
            count: aggregateResult.opportunityActivities?.aggregate?.count || 0
          }
        ].filter(entity => entity.count > 0) // Only show entity types with activities

        setActivityTypeAggregates(typeAggregates)
        setEmployeeActivityAggregates(employeeAggregates)
        setEntityTypeAggregates(entityAggregates)
        setTimelineAggregates(timelineData)
      } else {
        setActivityTypeAggregates([])
        setEmployeeActivityAggregates([])
        setEntityTypeAggregates([])
        setTimelineAggregates([])
      }

      setTotalActivities(totalCount)
      setTotalActivitiesLast30Days(prev30DaysTotal)
      setThisWeekActivities(thisWeek)
      setThisWeekActivitiesLast30Days(prevWeek)
    } catch (err) {
      console.error('useTeamAnalyticsAggregates: Error loading aggregates:', err)

      // Check for 401 unauthorized errors
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Authentication expired. Please refresh the page to continue.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load team analytics aggregates')
      }
    } finally {
      setLoading(false)
    }
  }, [employeeIds, accessToken, graphqlClient, catalogClient, userLocale])

  const retry = useCallback(() => {
    loadAggregates()
  }, [loadAggregates])

  return {
    activityTypeAggregates,
    employeeActivityAggregates,
    entityTypeAggregates,
    timelineAggregates,
    totalActivities,
    totalActivitiesLast30Days,
    thisWeekActivities,
    thisWeekActivitiesLast30Days,
    loading,
    error,
    loadAggregates,
    retry
  }
}
