import React, { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Spinner } from '@newwork/nw-design-system'
import { CalendarTimeline } from '@newwork/gravity-ui-catalog'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import {
  getCurrentActiveStructureId,
  getTranslationFromI18nKeyAndLabel
} from '../../../../../../../../common/utils/windowUtils'
import { useGraphQLClient } from '../../../../../../../../common/network/graphql/useGraphQLClient'
import { getAbsenceStatusColor, getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { useBackofficeTeamCalendarDays } from '../../../hooks/useBackofficeTeamCalendarDays'
import { useAbsenceTypeCatalog } from '../../../../personal-absences/hooks/useAbsenceTypeCatalog'
import { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import { buildEmployeeWhereForHubFilters } from '../../../hooks/useOrgAttendanceData'
import { FilteredEmployee, GET_FILTERED_EMPLOYEE_IDS } from '../../../queries/OrgAttendanceQueries'

interface CalendarTabProps extends BusinessAppContextProps {
  departmentIds: string[]
}

const CALENDAR_DATE_FORMAT = 'YYYY-MM-DD'

const buildCalendarEmployeeFilters = (departmentIds: string[]): HubGlobalFilters => ({
  timeScope: 'current-year',
  dateFrom: undefined,
  dateTo: undefined,
  departmentIds,
  locationIds: [],
  legalEntityIds: [],
  managerIds: [],
  employeeQuery: '',
  absenceTypeIds: [],
  statusIds: []
})

const getInitials = (name: string): string => {
  if (!name) {
    return ''
  }

  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

const CalendarTab: React.FC<CalendarTabProps> = ({ accessToken, departmentIds }) => {
  const graphQLClient = useGraphQLClient(accessToken)
  const { mapType } = useAbsenceTypeCatalog(accessToken)
  const [employees, setEmployees] = useState<FilteredEmployee[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [employeesError, setEmployeesError] = useState<Error | null>(null)
  const calendarEmployeeFilters = useMemo(() => buildCalendarEmployeeFilters(departmentIds), [departmentIds])

  const employeeScopeKey = useMemo(
    () =>
      JSON.stringify({
        d: departmentIds
      }),
    [departmentIds]
  )

  useEffect(() => {
    const structureId = getCurrentActiveStructureId()
    if (!accessToken || !structureId) {
      setEmployees([])
      setEmployeesError(null)
      setEmployeesLoading(false)
      return
    }

    let cancelled = false
    setEmployeesLoading(true)
    setEmployeesError(null)

    graphQLClient
      .request<{ Employee: FilteredEmployee[] }>(GET_FILTERED_EMPLOYEE_IDS, {
        where: buildEmployeeWhereForHubFilters(structureId, calendarEmployeeFilters)
      })
      .then(response => {
        if (cancelled) {
          return
        }
        setEmployees(response.Employee ?? [])
      })
      .catch(error => {
        if (cancelled) {
          return
        }
        setEmployeesError(error instanceof Error ? error : new Error('Failed to load employees'))
        setEmployees([])
      })
      .finally(() => {
        if (!cancelled) {
          setEmployeesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, calendarEmployeeFilters, employeeScopeKey, graphQLClient])

  const employeeIds = useMemo(() => employees.map(employee => employee.id).filter(Boolean), [employees])
  const rangeFrom = dayjs().startOf('year').format(CALENDAR_DATE_FORMAT)
  const rangeTo = dayjs().endOf('year').format(CALENDAR_DATE_FORMAT)

  const {
    events,
    loading: eventsLoading,
    error: eventsError
  } = useBackofficeTeamCalendarDays(accessToken, employeeIds, rangeFrom, rangeTo, mapType)

  const timelineItems = useMemo(
    () =>
      employees.map(employee => ({
        id: employee.id,
        name: `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
        department: employee.employeePosition?.organizationalUnit?.name ?? 'No Department',
        picture: employee.pictureThumbnail ?? ''
      })),
    [employees]
  )

  const legendItems = [
    { label: getAbsenceStatusLabel('APPROVED'), color: getAbsenceStatusColor('APPROVED') },
    { label: getAbsenceStatusLabel('PENDING'), color: getAbsenceStatusColor('PENDING') },
    { label: getAbsenceStatusLabel('REJECTED'), color: getAbsenceStatusColor('REJECTED') },
    { label: getAbsenceStatusLabel('CANCELLED'), color: getAbsenceStatusColor('CANCELLED') }
  ]

  const isLoading = employeesLoading || eventsLoading
  const error = employeesError ?? eventsError

  if (isLoading) {
    return (
      <div className="gba:flex gba:h-64 gba:items-center gba:justify-center">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:rounded gba:bg-destructive-secondary gba:p-4 gba:text-destructive">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.calendar.error_loading_absences',
          'Error loading absences'
        )}
        : {error.message}
      </div>
    )
  }

  return (
    <div className="gba:relative" data-testid="calendar-content">
      <CalendarTimeline
        key={`${rangeFrom}-${rangeTo}-${departmentIds.join(',')}`}
        items={timelineItems}
        events={events}
        title={getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.title', 'Team Absence Calendar')}
        legendItems={legendItems}
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
          <div className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded gba:p-1 gba:hover:bg-muted">
            <div className="gba:h-6 gba:w-6 gba:flex-shrink-0 gba:overflow-hidden gba:rounded-full gba:bg-muted">
              {item.picture ? (
                <img
                  src={`data:image/gif;base64,${item.picture}`}
                  alt={getInitials(item.name)}
                  className="gba:h-full gba:w-full gba:object-cover"
                  onError={event => {
                    event.currentTarget.style.display = 'none'
                    event.currentTarget.nextElementSibling?.classList.remove('gba:hidden')
                  }}
                />
              ) : null}
              <div
                className={`gba:flex gba:h-full gba:w-full gba:items-center gba:justify-center gba:bg-info-secondary gba:text-xs gba:font-medium gba:text-info ${item.picture ? 'gba:hidden' : ''}`}
              >
                {getInitials(item.name)}
              </div>
            </div>
            <div className="gba:min-w-0 gba:flex-grow">
              <div className="gba:truncate gba:font-medium">{item.name}</div>
              <div className="gba:truncate gba:text-xs gba:text-muted-foreground">{item.department}</div>
            </div>
          </div>
        )}
      />
    </div>
  )
}

export { CalendarTab }
