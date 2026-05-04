import React, { useCallback, useEffect, useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { useGraphQLClient } from '../../../../../../../../common/network/graphql/useGraphQLClient'
import { Spinner } from '@newwork/nw-design-system'
import { CalendarTimeline } from '@newwork/gravity-ui-catalog'
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale
} from '../../../../../../../../common/utils/windowUtils'
import {
  getAbsenceStatusLabel,
  getAbsenceStatusColor,
  getAbsenceStatusType
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import {
  getGetAllEmployeesWithAbsencesQuery,
  getGetEmployeesWithAbsencesByDepartmentsQuery,
  type CalendarEmployeesWithAbsencesResponse
} from '../../../queries/absenceQueries'
import { useBackofficeTeamCalendarDays } from '../../../hooks/useBackofficeTeamCalendarDays'
import { useAbsenceTypeCatalog } from '../../../../personal-absences/hooks/useAbsenceTypeCatalog'

interface EmployeeAbsence {
  id: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail: string
    employeePosition: {
      organizationalUnit: {
        id: string
        name: string
      } | null
    } | null
  }
  type: {
    objectValue: string
    id: string
    value: string
    parentEntryId: string
    translations?: {
      localeCode: string
      value: string
    }[]
  }
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  employeePosition: {
    organizationalUnit: {
      name: string
    }
  }
}

const CalendarTab: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const graphQLClient = useGraphQLClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'
  const [employeeAbsences, setEmployeeAbsences] = useState<EmployeeAbsence[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [selectedOrgUnits] = useState<string[]>(['All Departments'])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Catalog mapping for labels/colors (optional for note/title)
  const { mapType } = useAbsenceTypeCatalog(accessToken)

  // Build employeeIds list for the selected departments
  const employeeIds = useMemo(() => {
    if (!Array.isArray(allEmployees)) return []
    return allEmployees
      .filter(emp => {
        const dept = emp.employeePosition?.organizationalUnit?.name || 'No Department'
        return selectedOrgUnits.includes('All Departments') || selectedOrgUnits.includes(dept)
      })
      .map(emp => emp.id)
      .filter(Boolean)
  }, [allEmployees, selectedOrgUnits])

  // Fetch view-backed events for the whole current year to ensure month navigation displays data
  const yearFrom = dayjs().startOf('year').format('YYYY-MM-DD')
  const yearTo = dayjs().endOf('year').format('YYYY-MM-DD')
  const { events: viewEvents } = useBackofficeTeamCalendarDays(accessToken, employeeIds, yearFrom, yearTo, mapType)

  const getAbsenceTypeName = (type: EmployeeAbsence['type'], locale = userLocale): string => {
    const translation = type.translations?.find(t => t.localeCode === locale)
    return translation?.value || type.value || type.objectValue || 'Unknown Type'
  }

  const getStatusName = (status: string): string => {
    return getAbsenceStatusLabel(status)
  }

  const fetchData = useCallback(
    async (departments: string[] = selectedOrgUnits) => {
      setIsLoading(true)
      setError(null)

      try {
        const currentDate = new Date().toISOString()
        let employees: Employee[] = []
        let absences: EmployeeAbsence[] = []

        if (departments.includes('All Departments')) {
          const combinedQuery = getGetAllEmployeesWithAbsencesQuery(currentDate)
          const combinedResult = await graphQLClient.request<CalendarEmployeesWithAbsencesResponse>(combinedQuery)
          const employeePositions = combinedResult?.employees || []
          const allAbsences = combinedResult?.absences || []

          employees = employeePositions
            .filter((position: any) => position?.employee?.id)
            .map((position: any) => ({
              id: position.employee.id,
              firstName: position.employee.firstName,
              lastName: position.employee.lastName,
              pictureThumbnail: position.employee.pictureThumbnail || '',
              employeePosition: {
                organizationalUnit: {
                  name: position.organizationalUnit?.name || 'Unknown Department'
                }
              }
            }))

          absences = allAbsences.filter((absence: any) => absence?.employee?.id)
        } else {
          const combinedQuery = getGetEmployeesWithAbsencesByDepartmentsQuery(currentDate, departments)
          const combinedResult = await graphQLClient.request<CalendarEmployeesWithAbsencesResponse>(combinedQuery)
          const employeePositions = combinedResult?.employees || []
          const allAbsences = combinedResult?.absences || []

          employees = employeePositions
            .filter((position: any) => position?.employee?.id)
            .map((position: any) => ({
              id: position.employee.id,
              firstName: position.employee.firstName,
              lastName: position.employee.lastName,
              pictureThumbnail: position.employee.pictureThumbnail || '',
              employeePosition: {
                organizationalUnit: {
                  name: position.organizationalUnit?.name || 'Unknown Department'
                }
              }
            }))

          const employeeIdSet = new Set(employees.map(emp => emp.id))
          absences = allAbsences.filter(
            (absence: any) => absence?.employee?.id && employeeIdSet.has(absence.employee.id)
          )
        }

        setAllEmployees(employees)
        setEmployeeAbsences(absences)
      } catch (err) {
        console.error('Error in enhanced fetch:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch data'))
      } finally {
        setIsLoading(false)
      }
    },
    [graphQLClient, selectedOrgUnits]
  )

  useEffect(() => {
    if (accessToken) {
      fetchData()
    }
  }, [accessToken, selectedOrgUnits, fetchData])

  const timelineItems = useMemo(() => {
    const items = allEmployees.map(employee => {
      const empId = employee.id
      const empName = `${employee.firstName} ${employee.lastName}`.trim()
      const dept = employee.employeePosition?.organizationalUnit?.name || 'No Department'

      return {
        id: empId,
        name: empName,
        department: dept,
        picture: employee.pictureThumbnail
      }
    })

    return items
  }, [allEmployees])

  const getStatusColor = (status: string): string => {
    return getAbsenceStatusColor(status)
  }

  const getStatusType = (status: string): string => {
    return getAbsenceStatusType(status)
  }

  const timelineEvents = useMemo(() => {
    const events: any[] = []
    const eventIdSet = new Set()

    employeeAbsences.forEach(absence => {
      if (!absence?.employee?.id || !absence?.type?.value || !absence?.startDate || !absence?.endDate) {
        return
      }

      const eventId = `${absence.employee.id}-${absence.startDate}-${absence.endDate}-${absence.type.value}`

      if (!eventIdSet.has(eventId)) {
        eventIdSet.add(eventId)

        const absenceType = getAbsenceTypeName(absence.type)

        events.push({
          id: eventId,
          itemId: absence.employee.id,
          title: absenceType,
          startDate: new Date(absence.startDate).toISOString(),
          endDate: new Date(absence.endDate).toISOString(),
          color: getStatusColor(absence.status),
          status: getStatusName(absence.status),
          type: getStatusType(absence.status),
          note: absenceType
        })
      }
    })

    return events
  }, [employeeAbsences, selectedOrgUnits])

  const legendItems = [
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

  const getInitials = (name: string): string => {
    if (!name) {
      return ''
    }

    return name
      .split(' ')
      .map((namePart: string) => namePart[0])
      .join('')
      .toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4 gba:text-destructive gba:bg-destructive-secondary gba:rounded">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.calendar.error_loading_absences',
          'Error loading absences'
        )}
        : {error.message}
      </div>
    )
  }

  const events = Array.isArray(viewEvents) && viewEvents.length > 0 ? viewEvents : timelineEvents

  return (
    <div className="gba:relative" data-testid="calendar-content">
      <CalendarTimeline
        key={selectedOrgUnits.join(',') || 'all'}
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
