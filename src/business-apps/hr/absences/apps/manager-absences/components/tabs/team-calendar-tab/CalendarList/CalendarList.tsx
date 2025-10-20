import React, { useMemo, useState, useEffect } from 'react'
import { CalendarTimeline, TimelineItem, TimelineEvent } from '@newwork/gravity-ui-catalog'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel, getAbsenceStatusColor } from '../../../../../../utils/absenceStatusUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ABSENCES_FOR_CALENDAR } from '../../../../queries/AbsenceQueries'
import { getAbsenceTypeName, getAbsenceStatusDisplay } from '../../../../utils'

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

  const loadCalendarData = async () => {
    if (!supervisorId) {
      setError('Supervisor ID not found')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = GET_ABSENCES_FOR_CALENDAR(supervisorId)
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

      const event: TimelineEvent = {
        id: uniqueEventId,
        itemId: absence.employee.id,
        title: translatedAbsenceType,
        startDate: absence.startDate,
        endDate: absence.endDate,
        status: statusDisplay.label,
        type: statusDisplay.type,
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

  return <div>{renderDataBody()}</div>
}

export default CalendarList
