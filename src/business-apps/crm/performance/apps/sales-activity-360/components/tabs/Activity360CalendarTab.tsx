import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityViewFilter } from '../../types'
import { useCalendarActivitiesData } from '../../hooks/useCalendarActivitiesData'
import { SharedActivitiesCalendar, CalendarActivity, CalendarAbsence } from '../shared/SharedActivitiesCalendar'
import { calculateActivityScore } from '../../utils/activityScoreCalculator'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildCustomerActivityOrderBy,
  buildCustomerActivityQuery
} from '@/common/data/customer/queries/customerActivityQueries'
import dayjs from 'dayjs'

interface Activity360CalendarTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  filter: ActivityViewFilter
  entityId?: string
  compact?: boolean
}

// Query to get employee absences for a date range
const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($employeeId: uuid!, $startDate: timestamp!, $endDate: timestamp!) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId }
        status: { _eq: "APPROVED" }
        _or: [
          { startDate: { _gte: $startDate, _lte: $endDate } }
          { endDate: { _gte: $startDate, _lte: $endDate } }
          { _and: [{ startDate: { _lte: $startDate } }, { endDate: { _gte: $endDate } }] }
        ]
      }
      orderBy: { startDate: ASC }
    ) {
      id
      employeeId
      startDate
      endDate
      status
      type { value }
    }
  }
`

export const Activity360CalendarTab: React.FC<Activity360CalendarTabProps> = ({
  accessToken,
  userInfo,
  filter,
  entityId,
  compact = false
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [entityActivities, setEntityActivities] = useState<any[]>([])
  const [entityLoading, setEntityLoading] = useState(false)
  const [entityError, setEntityError] = useState<string | null>(null)
  const [entityRefreshKey, setEntityRefreshKey] = useState(0)
  const [absences, setAbsences] = useState<CalendarAbsence[]>([])

  const graphqlClient = useGraphQLClient(accessToken)

  // Calculate date range for the current month (using ISO strings for timestamptz)
  const { dateFrom, dateTo } = useMemo(() => {
    return {
      dateFrom: currentDate.startOf('month').toISOString(),
      dateTo: currentDate.endOf('month').toISOString()
    }
  }, [currentDate])

  // Fetch absences for employee view
  useEffect(() => {
    if (filter === 'by-employee' && entityId) {
      const startDate = currentDate.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const endDate = currentDate.endOf('month').format('YYYY-MM-DD HH:mm:ss')

      graphqlClient
        .request<{
          EmployeeAbsence: Array<{
            id: string
            employeeId: string
            startDate: string
            endDate: string
            status: string
            type?: { value: string }
          }>
        }>(GET_EMPLOYEE_ABSENCES, {
          employeeId: entityId,
          startDate,
          endDate
        })
        .then(result => {
          const mappedAbsences: CalendarAbsence[] = (result.EmployeeAbsence || []).map(a => ({
            id: a.id,
            employeeId: a.employeeId,
            startDate: a.startDate,
            endDate: a.endDate,
            type: a.type?.value,
            status: a.status
          }))
          setAbsences(mappedAbsences)
        })
        .catch(err => {
          console.error('Failed to fetch absences:', err)
          setAbsences([])
        })
    } else {
      setAbsences([])
    }
  }, [filter, entityId, currentDate, graphqlClient])

  // For entity-based filters, fetch activities directly
  useEffect(() => {
    const entityFilters = ['by-account', 'by-contact', 'by-lead', 'by-opportunity']
    if (entityFilters.includes(filter) && entityId) {
      const entityFieldMap: Record<string, string> = {
        'by-account': 'accountId',
        'by-contact': 'contactId',
        'by-lead': 'leadId',
        'by-opportunity': 'opportunityId'
      }
      const entityField = entityFieldMap[filter]

      setEntityLoading(true)
      setEntityError(null)

      const where = {
        _and: [
          { [entityField]: { _eq: entityId } },
          { isDeleted: { _eq: false } },
          { occurredAt: { _gte: dateFrom, _lte: dateTo } }
        ]
      }
      const orderBy = buildCustomerActivityOrderBy([{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }])
      const query = buildCustomerActivityQuery()

      graphqlClient
        .request(query, {
          where,
          orderBy,
          limit: 500
        })
        .then((result: any) => {
          setEntityActivities(result.SalesActivity || [])
        })
        .catch(err => {
          console.error('Failed to load entity activities:', err)
          setEntityError(err.message || 'Failed to load activities')
          setEntityActivities([])
        })
        .finally(() => {
          setEntityLoading(false)
        })
    }
  }, [filter, entityId, dateFrom, dateTo, entityRefreshKey, graphqlClient])

  // Determine employeeIds for calendar hook. For aggregate views ("all"/"by-general")
  // we scope to Sales Associates via a nested filter instead of pre-fetching ids.
  const employeeIds = useMemo(() => {
    if (filter === 'by-employee' && entityId) return [entityId]
    return [] // "all"/"by-general" use scopeToSalesAssociates; entity views don't use this hook
  }, [filter, entityId])

  // Use calendar hook for employee-based views
  const shouldUseHook = filter === 'all' || filter === 'by-general' || filter === 'by-employee'
  const hookResult = useCalendarActivitiesData({
    employeeIds: shouldUseHook ? employeeIds : [],
    scopeToSalesAssociates: filter === 'all' || filter === 'by-general',
    dateFrom,
    dateTo,
    accessToken,
    userInfo,
    unlinkedOnly: filter === 'by-general'
  })

  // Determine which data source to use
  const isLoading = shouldUseHook ? hookResult.loading : entityLoading
  const error = shouldUseHook ? hookResult.error : entityError
  const rawActivities = shouldUseHook ? hookResult.activities : entityActivities
  const retry = useCallback(() => {
    if (shouldUseHook) {
      hookResult.retry()
      return
    }

    setEntityError(null)
    setEntityRefreshKey(prev => prev + 1)
  }, [shouldUseHook, hookResult.retry])

  // Transform activities to calendar format
  const calendarActivities: CalendarActivity[] = useMemo(() => {
    return rawActivities.map((activity: any) => {
      const score = calculateActivityScore(activity.createdAt, activity.occurredAt)
      return {
        id: activity.id,
        title: activity.title,
        activityType: activity.activityType,
        occurredAt: activity.occurredAt,
        createdAt: activity.createdAt,
        activityScore: score,
        ownerEmployee: activity.ownerEmployee,
        ownerEmployeeId: activity.ownerEmployeeId,
        account: activity.account,
        contact: activity.contact,
        lead: activity.lead,
        opportunity: activity.opportunity,
        description: activity.description
      }
    })
  }, [rawActivities])

  return (
    <SharedActivitiesCalendar
      activities={calendarActivities}
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      showActivityScores={true}
      accessToken={accessToken}
      dataTestIdPrefix="SalesActivity360-Calendar"
      compact={compact}
      absences={absences}
    />
  )
}

export default Activity360CalendarTab
