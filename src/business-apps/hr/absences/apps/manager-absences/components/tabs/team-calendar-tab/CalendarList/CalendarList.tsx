import React, { useMemo, useState, useEffect } from 'react'
import { CalendarTimeline, TimelineItem, TimelineEvent } from '@newwork/gravity-ui-catalog'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel, getAbsenceStatusColor } from '../../../../../../utils/absenceStatusUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ABSENCES_FOR_CALENDAR } from '../../../../queries/AbsenceQueries'
import { getAbsenceTypeName, getAbsenceStatusDisplay } from '../../../../utils'
import { useAbsenceTypeCatalog } from '../../../../../personal-absences/hooks/useAbsenceTypeCatalog'

interface AbsenceTimelineItem extends TimelineItem {
  name: string
  detail?: string
}

const CalendarList: React.FC<BusinessAppContextProps> = props => {
  const { accessToken, userInfo } = props
  const supervisorId = userInfo?.employeeDetails?.employeeId
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const [employees, setEmployees] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const { mapType } = useAbsenceTypeCatalog(accessToken)

  const loadCalendarData = async () => {
    if (!supervisorId) {
      setError('Supervisor ID not found')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = GET_ABSENCES_FOR_CALENDAR()
      const result = await graphqlClient.request<{
        Employee: any[]
        EmployeeAbsence: any[]
      }>(query, { supervisorId })

      setEmployees(result.Employee || [])
      setAbsences(result.EmployeeAbsence || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCalendarData()
  }, [supervisorId])

  const directReportsData = useMemo(() => {
    return employees.map((employee: any) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeePosition: employee.employeePosition
    }))
  }, [employees])

  const timelineItems: AbsenceTimelineItem[] = useMemo(() => {
    if (directReportsData.length === 0) return []

    const items = directReportsData.map((employee: any) => {
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'
      const orgUnit = employee.employeePosition?.organizationalUnit?.name || ''

      return {
        id: employee.id,
        name: employeeName,
        detail: orgUnit,
        picture: undefined
      }
    })

    return items
  }, [directReportsData])

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!absences || absences.length === 0 || timelineItems.length === 0) return []

    const events: TimelineEvent[] = []

    absences.forEach((absence: any) => {
      if (!absence.startDate || !absence.endDate) {
        return
      }

      if (!absence.employee?.id) {
        return
      }

      if (!timelineItems.some(item => item.id === absence.employee.id)) {
        return
      }

      const uniqueEventId = `absence-${absence.id}`
      const statusDisplay = getAbsenceStatusDisplay(absence.status)
      const translatedAbsenceType = getAbsenceTypeName(absence.type, userLocale)

      // Get color from absence type catalog (like personal calendar)
      const typeCode = absence.type?.value || absence.type
      const catalogType = mapType(typeCode)
      const eventColor = catalogType?.color || getAbsenceStatusColor(absence.status)

      const event: TimelineEvent = {
        id: uniqueEventId,
        itemId: absence.employee.id,
        title: translatedAbsenceType,
        startDate: absence.startDate,
        endDate: absence.endDate,
        status: statusDisplay.label,
        type: statusDisplay.type,
        color: eventColor,
        note: `${translatedAbsenceType} - ${statusDisplay.label}`
      }

      events.push(event)
    })

    return events
  }, [absences, timelineItems, userLocale])

  const renderDataBody = () => {
    if (loading)
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
          <Spinner size="xl" />
        </div>
      )

    if (error) {
      return (
        <Alert variant="destructive">
          <div className="gba:font-medium">Error Loading Data</div>
          <div className="gba:text-sm gba:opacity-90">{error}</div>
        </Alert>
      )
    }

    if (timelineItems.length === 0 && timelineEvents.length === 0) {
      return (
        <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_calendar.no_absence_data_available',
            'No absence data available.'
          )}
        </div>
      )
    }

    return (
      <CalendarTimeline<AbsenceTimelineItem, TimelineEvent>
        title={getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.title', 'Team Absence Calendar')}
        items={timelineItems}
        events={timelineEvents}
        itemLabel={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
        itemDetailLabel={getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.search_employee_list.recent_employees_table.department',
          'Department'
        )}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_table.employee_search_filter',
          'Search Employee...'
        )}
        initialDate={new Date()}
        initialViewRange={31}
        renderItemContent={item => (
          <div className="gba:p-2">
            <div className="gba:font-semibold">{item.name}</div>
            {item.detail && <div className="gba:text-xs gba:block gba:text-muted-foreground">{item.detail}</div>}
          </div>
        )}
        legendItems={statusLegend}
      />
    )
  }

  const statusLegend = [
    {
      label: getAbsenceStatusLabel('APPROVED'),
      color: getAbsenceStatusColor('APPROVED')
    },
    {
      label: getAbsenceStatusLabel('PENDING'),
      color: getAbsenceStatusColor('PENDING')
    },
    {
      label: getAbsenceStatusLabel('REJECTED'),
      color: getAbsenceStatusColor('REJECTED')
    },
    {
      label: getAbsenceStatusLabel('CANCELLED'),
      color: getAbsenceStatusColor('CANCELLED')
    }
  ]

  return (
    <div className="team-absence-calendar-overrides">
      <style>
        {`
          /* Green pills (approved) */
          .team-absence-calendar-overrides .guic-bg-green-500 {
            background-color: #ffffff !important;
            border: 1px solid #73d9be !important;
          }
          .team-absence-calendar-overrides .guic-bg-green-500 .guic-text-white {
            color: #73d9be !important;
          }

          /* Yellow/Orange pills (pending/warning) */
          .team-absence-calendar-overrides .guic-bg-yellow-500,
          .team-absence-calendar-overrides .guic-bg-orange-500 {
            background-color: #ffffff !important;
            border: 1px solid #F5A400 !important;
          }
          .team-absence-calendar-overrides .guic-bg-yellow-500 .guic-text-white,
          .team-absence-calendar-overrides .guic-bg-orange-500 .guic-text-white {
            color: #F5A400 !important;
          }

          /* Custom vacation color */
          .team-absence-calendar-overrides .guic-bg-\\[\\#F5A400\\] {
            background-color: #ffffff !important;
            border: 1px solid #F5A400 !important;
          }
          .team-absence-calendar-overrides .guic-bg-\\[\\#F5A400\\] .guic-text-white {
            color: #F5A400 !important;
          }

          /* Red pills (rejected/sick) */
          .team-absence-calendar-overrides .guic-bg-red-500,
          .team-absence-calendar-overrides .guic-bg-\\[\\#ef4444\\],
          .team-absence-calendar-overrides .guic-bg-\\[\\#DB4315\\] {
            background-color: #ffffff !important;
            border: 1px solid #DB4315 !important;
          }
          .team-absence-calendar-overrides .guic-bg-red-500 .guic-text-white,
          .team-absence-calendar-overrides .guic-bg-\\[\\#ef4444\\] .guic-text-white,
          .team-absence-calendar-overrides .guic-bg-\\[\\#DB4315\\] .guic-text-white {
            color: #DB4315 !important;
          }

          /* Blue pills (personal/home office) */
          .team-absence-calendar-overrides .guic-bg-blue-500,
          .team-absence-calendar-overrides .guic-bg-\\[\\#648ECA\\] {
            background-color: #ffffff !important;
            border: 1px solid #648ECA !important;
          }
          .team-absence-calendar-overrides .guic-bg-blue-500 .guic-text-white,
          .team-absence-calendar-overrides .guic-bg-\\[\\#648ECA\\] .guic-text-white {
            color: #648ECA !important;
          }

          /* Purple pills (holiday) */
          .team-absence-calendar-overrides .guic-bg-purple-500 {
            background-color: #ffffff !important;
            border: 1px solid #a855f7 !important;
          }
          .team-absence-calendar-overrides .guic-bg-purple-500 .guic-text-white {
            color: #a855f7 !important;
          }

          /* Light green pills (special leave) */
          .team-absence-calendar-overrides .guic-bg-\\[\\#B9E163\\] {
            background-color: #ffffff !important;
            border: 1px solid #B9E163 !important;
          }
          .team-absence-calendar-overrides .guic-bg-\\[\\#B9E163\\] .guic-text-white {
            color: #B9E163 !important;
          }

          /* Gray pills (cancelled/default) */
          .team-absence-calendar-overrides .guic-bg-gray-500 {
            background-color: #ffffff !important;
            border: 1px solid #9ca3af !important;
          }
          .team-absence-calendar-overrides .guic-bg-gray-500 .guic-text-white {
            color: #9ca3af !important;
          }
        `}
      </style>
      {renderDataBody()}
    </div>
  )
}

export default CalendarList
