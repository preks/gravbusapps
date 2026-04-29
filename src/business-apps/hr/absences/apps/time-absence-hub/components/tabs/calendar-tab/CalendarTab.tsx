import React, { useCallback, useEffect, useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { useGraphQLClient } from '../../../../../../../../common/network/graphql/useGraphQLClient'
import {
  Badge,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
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

          const employeeIds = employees.map(emp => emp.id)
          absences = allAbsences.filter(
            (absence: any) => absence?.employee?.id && employeeIds.includes(absence.employee.id)
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
  const eventsByEmployee = new Map<string, typeof events>()
  events.forEach(event => {
    const existing = eventsByEmployee.get(event.itemId) ?? []
    eventsByEmployee.set(event.itemId, [...existing, event])
  })

  return (
    <Card data-testid="calendar-content">
      <CardContent className="gba:p-0">
        <div className="gba:border-b gba:p-4">
          <h3 className="gba:text-base gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.title', 'Team Absence Calendar')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.calendar.description',
              'Upcoming and current absence events for employees in the selected global filter scope.'
            )}
          </p>
        </div>
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_list.search_employee_list.recent_employees_table.department',
                    'Department'
                  )}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absences', 'Absences')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timelineItems.map(item => {
                const employeeEvents = eventsByEmployee.get(item.id) ?? []
                return (
                  <TableRow key={item.id}>
                    <TableCell className="gba:font-medium">{item.name}</TableCell>
                    <TableCell className="gba:text-muted-foreground">{item.department}</TableCell>
                    <TableCell>
                      {employeeEvents.length === 0 ? (
                        <span className="gba:text-sm gba:text-muted-foreground">-</span>
                      ) : (
                        <div className="gba:flex gba:flex-wrap gba:gap-2">
                          {employeeEvents.map(event => (
                            <Badge key={event.id} variant="outline">
                              {event.title}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export { CalendarTab }
