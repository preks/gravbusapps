import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { useGraphQLClient } from '../../../../../../../../common/network/graphql/useGraphQLClient'
import { CalendarTimeline } from '@newwork/gravity-ui-catalog'
import { Select } from 'antd'
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
  getGetAllEmployeesFromPositionsQuery,
  getGetAllEmployeesWithAbsencesQuery,
  getGetEmployeesWithAbsencesByDepartmentsQuery,
  type CalendarEmployeePositionResponse,
  type CalendarEmployeesWithAbsencesResponse
} from '../../../queries/absenceQueries'
const { Option } = Select

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

interface OrganizationalUnit {
  id: string
  name: string
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

type EmployeePositionResponse = CalendarEmployeePositionResponse

const CalendarTab: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const graphQLClient = useGraphQLClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'
  const [employeeAbsences, setEmployeeAbsences] = useState<EmployeeAbsence[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([])
  const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>(
    userInfo?.employeeDetails?.organizationalUnit?.name
      ? [userInfo.employeeDetails.organizationalUnit.name]
      : ['All Departments']
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

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

  useEffect(() => {
    const fetchAllOrgUnits = async () => {
      if (!accessToken) return

      try {
        const currentDate = new Date().toISOString()
        const getAllEmployeesQuery = getGetAllEmployeesFromPositionsQuery(currentDate)
        const result = await graphQLClient.request<EmployeePositionResponse>(getAllEmployeesQuery)
        const allEmployeePositions = result?.EmployeePosition || []

        const orgUnitsMap = new Map<string, OrganizationalUnit>()

        allEmployeePositions.forEach((position: any) => {
          if (position.organizationalUnit?.name) {
            const orgUnitName = position.organizationalUnit.name
            orgUnitsMap.set(orgUnitName, {
              id: orgUnitName,
              name: orgUnitName
            })
          }
        })

        const uniqueOrgUnits = Array.from(orgUnitsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
        setOrganizationalUnits(uniqueOrgUnits)
      } catch (error) {
        console.error('Error fetching organizational units:', error)
      }
    }

    fetchAllOrgUnits()
  }, [accessToken, graphQLClient])

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
  }, [allEmployees, selectedOrgUnits])

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
    if (!name) return ''
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-t-2 gba:border-b-2 gba:border-info"></div>
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

  return (
    <div className="gba:relative" data-testid="calendar-content">
      <div className="gba:absolute gba:top-2 gba:right-2 gba:z-20 gba:w-64">
        <Select
          value={selectedOrgUnits}
          mode="multiple"
          onChange={(values: string[]) => {
            if (!values || values.length === 0) {
              setSelectedOrgUnits(['All Departments'])
              return
            }

            const validValues = values.filter(
              value => value && typeof value === 'string' && value !== 'department' && value.trim() !== ''
            )

            if (validValues.length === 0) {
              setSelectedOrgUnits(['All Departments'])
              return
            }

            const currentState = selectedOrgUnits
            const newSelection = validValues

            const currentHasAllDepartments = currentState.includes('All Departments')
            const newHasAllDepartments = newSelection.includes('All Departments')
            const specificDepartmentsInNew = newSelection.filter(val => val !== 'All Departments')

            if (currentHasAllDepartments && newHasAllDepartments && specificDepartmentsInNew.length > 0) {
              setSelectedOrgUnits(specificDepartmentsInNew)
            } else if (newHasAllDepartments && !currentHasAllDepartments) {
              setSelectedOrgUnits(['All Departments'])
            } else if (newHasAllDepartments && specificDepartmentsInNew.length === 0) {
              setSelectedOrgUnits(['All Departments'])
            } else {
              setSelectedOrgUnits(validValues)
            }
          }}
          onClear={() => {
            setSelectedOrgUnits(['All Departments'])
          }}
          disabled={isLoading}
          allowClear
          style={{ width: '100%' }}
          data-testid="calendar-department-filter"
        >
          <Option key="all" value="All Departments">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.calendar.all_departments',
              'All Departments'
            )}
          </Option>
          {organizationalUnits
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(org => (
              <Option key={org.id} value={org.name}>
                {org.name}
              </Option>
            ))}
        </Select>
      </div>

      <CalendarTimeline
        key={selectedOrgUnits.join(',') || 'all'}
        items={timelineItems}
        events={timelineEvents}
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
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-1 gba:w-full gba:hover:bg-muted gba:rounded">
            <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-muted gba:flex-shrink-0 gba:overflow-hidden">
              {item.picture ? (
                <img
                  src={`data:image/gif;base64,${item.picture}`}
                  alt={getInitials(item.name)}
                  className="gba:w-full gba:h-full gba:object-cover"
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('gba:hidden')
                  }}
                />
              ) : null}
              <div
                className={`gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-info-secondary gba:text-info gba:text-xs gba:font-medium ${item.picture ? 'gba:hidden' : ''}`}
              >
                {getInitials(item.name)}
              </div>
            </div>
            <div className="gba:flex-grow gba:min-w-0">
              <div className="gba:truncate gba:font-medium">{item.name}</div>
              <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{item.department}</div>
            </div>
          </div>
        )}
      />
    </div>
  )
}

export { CalendarTab }
