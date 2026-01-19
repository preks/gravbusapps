import React, { useState, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityViewFilter } from '../../types'
import { useCalendarActivitiesData } from '@/business-apps/crm/performance/apps/sales-team-performance/components/team-performance-view/hooks/useCalendarActivitiesData'
import {
  SharedActivitiesCalendar,
  CalendarActivity,
  CalendarAbsence
} from '@/business-apps/crm/performance/apps/sales-team-performance/components/shared/SharedActivitiesCalendar'
import { calculateActivityScore } from '@/business-apps/crm/performance/apps/sales-team-performance/utils/activityScoreCalculator'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Spinner } from '@newwork/nw-design-system'
import dayjs from 'dayjs'

interface Activity360CalendarTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  filter: ActivityViewFilter
  entityId?: string
  compact?: boolean
}

// Sales Associate capability name for filtering (consistent with Sales Performance module)
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

// Query to get sales associates only - consistent with Sales Performance module
const GET_ALL_EMPLOYEES = `
  query GetAllEmployees {
    Employee(
      where: { 
        isDeleted: { _eq: false }
        employeePosition: {
          employeeCapabilities: {
            capability: {
              name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
            }
          }
        }
      }
      limit: 1000
    ) {
      id
      fullName
    }
  }
`

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

// Query to get activities filtered by entity (account, contact, lead, opportunity)
// Note: occurredAt is timestamptz type, so we use timestamptz for date filtering
const buildEntityActivitiesQuery = (entityField: string) => `
  query GetEntityActivities($entityId: uuid!, $dateFrom: timestamptz!, $dateTo: timestamptz!) {
    SalesActivity(
      where: {
        _and: [
          { ${entityField}: { _eq: $entityId } }
          { isDeleted: { _eq: false } }
          { occurredAt: { _gte: $dateFrom, _lte: $dateTo } }
        ]
      }
      orderBy: [{ occurredAt: DESC_NULLS_LAST }]
      limit: 500
    ) {
      id
      title
      description
      source
      createdAt
      occurredAt
      ownerEmployeeId
      ownerEmployee {
        id
        fullName
        firstName
        lastName
        pictureThumbnail
      }
      activityType {
        id
        value
      }
      accountId
      account {
        id
        name
      }
      contactId
      contact {
        id
        firstName
        lastName
      }
      leadId
      lead {
        id
        name
        contact {
          firstName
          lastName
        }
      }
      opportunityId
      opportunity {
        id
        name
      }
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
  const [allEmployeeIds, setAllEmployeeIds] = useState<string[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(filter === 'all')
  const [entityActivities, setEntityActivities] = useState<any[]>([])
  const [entityLoading, setEntityLoading] = useState(false)
  const [entityError, setEntityError] = useState<string | null>(null)
  const [absences, setAbsences] = useState<CalendarAbsence[]>([])

  const graphqlClient = useGraphQLClient(accessToken)

  // Calculate date range for the current month (using ISO strings for timestamptz)
  const { dateFrom, dateTo } = useMemo(() => {
    return {
      dateFrom: currentDate.startOf('month').toISOString(),
      dateTo: currentDate.endOf('month').toISOString()
    }
  }, [currentDate])

  // For "all" view, fetch all employee IDs
  useEffect(() => {
    if (filter === 'all' || filter === 'by-employee') {
      if (filter === 'all') {
        setLoadingEmployees(true)
        graphqlClient
          .request<{ Employee: Array<{ id: string; fullName: string }> }>(GET_ALL_EMPLOYEES)
          .then(result => {
            setAllEmployeeIds(result.Employee?.map(e => e.id) || [])
          })
          .catch(err => {
            console.error('Failed to load employees:', err)
            setAllEmployeeIds([])
          })
          .finally(() => {
            setLoadingEmployees(false)
          })
      }
    }
  }, [filter, graphqlClient])

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

      graphqlClient
        .request(buildEntityActivitiesQuery(entityField), {
          entityId,
          dateFrom,
          dateTo
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
  }, [filter, entityId, dateFrom, dateTo, graphqlClient])

  // Determine employeeIds for calendar hook
  const employeeIds = useMemo(() => {
    if (filter === 'all') return allEmployeeIds
    if (filter === 'by-employee' && entityId) return [entityId]
    return [] // Entity-based filters don't use this hook
  }, [filter, entityId, allEmployeeIds])

  // Use calendar hook for employee-based views
  const shouldUseHook = filter === 'all' || filter === 'by-employee'
  const hookResult = useCalendarActivitiesData({
    employeeIds: shouldUseHook ? employeeIds : [],
    dateFrom,
    dateTo,
    accessToken,
    userInfo
  })

  // Determine which data source to use
  const isLoading = loadingEmployees || (shouldUseHook ? hookResult.loading : entityLoading)
  const error = shouldUseHook ? hookResult.error : entityError
  const rawActivities = shouldUseHook ? hookResult.activities : entityActivities
  const retry = shouldUseHook
    ? hookResult.retry
    : () => {
        // Trigger re-fetch for entity activities
        setEntityError(null)
      }

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

  // Show loading while fetching employee IDs for "all" view
  if (loadingEmployees) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
        <Spinner size="lg" />
      </div>
    )
  }

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
