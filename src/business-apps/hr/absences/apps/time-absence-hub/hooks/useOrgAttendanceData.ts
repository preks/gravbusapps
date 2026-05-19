import { useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { GET_TEAM_ATTENDANCE_FOR_RANGE } from '@/business-apps/hr/core/apps/my-team-time/queries/queries'
import { fetchTeamHolidayData, getActiveLocale } from '@/business-apps/hr/core/apps/my-team-time/utils/teamTimeDomain'
import {
  AbsenceCalendarDay,
  AttendanceRow,
  FilteredEmployee,
  GET_FILTERED_EMPLOYEE_IDS,
  PublicHolidayDay
} from '../queries/OrgAttendanceQueries'
import { GET_TEAM_CALENDAR_DAYS } from '../queries/CalendarViewQueries'
import { HubGlobalFilters } from './useHubGlobalFilters'
import { LEGAL_ENTITY_NOT_DEFINED_FILTER_ID } from '../constants/routes'

const EMPLOYEE_ID_BATCH_SIZE = 200
const ATTENDANCE_DATA_LOADER_VERSION = 3

const chunk = <T>(items: T[], size: number): T[][] => {
  if (size <= 0 || items.length === 0) {
    return [items]
  }
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export const buildEmployeeWhereForHubFilters = (
  structureId: string,
  filters: HubGlobalFilters
): Record<string, unknown> => {
  const conditions: Record<string, unknown>[] = [{ isDeleted: { _eq: false } }]

  const employeePositionConditions: Record<string, unknown>[] = [{ structureId: { _eq: structureId } }]
  if (filters.departmentIds.length > 0) {
    employeePositionConditions.push({ organizationalUnitId: { _in: filters.departmentIds } })
  }
  if (filters.legalEntityIds.length > 0) {
    const includeMissingLegalEntity = filters.legalEntityIds.includes(LEGAL_ENTITY_NOT_DEFINED_FILTER_ID)
    const definedLegalEntityIds = filters.legalEntityIds.filter(id => id !== LEGAL_ENTITY_NOT_DEFINED_FILTER_ID)

    if (includeMissingLegalEntity && definedLegalEntityIds.length > 0) {
      employeePositionConditions.push({
        _or: [{ companyId: { _in: definedLegalEntityIds } }, { companyId: { _isNull: true } }]
      })
    } else if (includeMissingLegalEntity) {
      employeePositionConditions.push({ companyId: { _isNull: true } })
    } else {
      employeePositionConditions.push({ companyId: { _in: definedLegalEntityIds } })
    }
  }
  if (filters.managerIds.length > 0) {
    employeePositionConditions.push({ supervisorEmployeeId: { _in: filters.managerIds } })
  }
  if (filters.locationIds.length > 0) {
    employeePositionConditions.push({ siteLocationId: { _in: filters.locationIds } })
  }
  if (employeePositionConditions.length > 0) {
    conditions.push({ employeePosition: { _and: employeePositionConditions } })
  }
  if (filters.employeeQuery) {
    const like = `%${filters.employeeQuery}%`
    conditions.push({
      _or: [{ firstName: { _ilike: like } }, { lastName: { _ilike: like } }, { displayName: { _ilike: like } }]
    })
  }

  return { _and: conditions }
}

const mapHolidayData = (holidayData: Awaited<ReturnType<typeof fetchTeamHolidayData>>): PublicHolidayDay[] => {
  const rows: PublicHolidayDay[] = []
  holidayData.datesByEmployeeId.forEach((dates, employeeId) => {
    const namesByDate = holidayData.namesByEmployeeId.get(employeeId) ?? {}
    dates.forEach(date => {
      rows.push({
        employeeId,
        date,
        name: namesByDate[date] ?? 'Bank holiday'
      })
    })
  })
  return rows
}

const filterEmployeesWithPeriodActivity = (
  employees: FilteredEmployee[],
  attendance: AttendanceRow[],
  absences: AbsenceCalendarDay[],
  holidays: PublicHolidayDay[]
): FilteredEmployee[] => {
  const activeEmployeeIds = new Set<string>()

  attendance.forEach(row => activeEmployeeIds.add(row.employeeId))
  absences.forEach(row => activeEmployeeIds.add(row.employeeId))
  holidays.forEach(row => activeEmployeeIds.add(row.employeeId))

  if (activeEmployeeIds.size === 0) {
    return []
  }

  return employees.filter(employee => activeEmployeeIds.has(employee.id))
}

export interface UseOrgAttendanceDataParams {
  accessToken: string
  filters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  includeOverlays?: boolean
}

export interface UseOrgAttendanceDataReturn {
  employees: FilteredEmployee[]
  attendance: AttendanceRow[]
  absences: AbsenceCalendarDay[]
  holidays: PublicHolidayDay[]
  isLoading: boolean
  error: string | null
}

const EMPTY: UseOrgAttendanceDataReturn = {
  employees: [],
  attendance: [],
  absences: [],
  holidays: [],
  isLoading: false,
  error: null
}

export const useOrgAttendanceData = ({
  accessToken,
  filters,
  derivedDateRange,
  includeOverlays = true
}: UseOrgAttendanceDataParams): UseOrgAttendanceDataReturn => {
  const [state, setState] = useState<UseOrgAttendanceDataReturn>({ ...EMPTY })
  const graphqlClient = useGraphQLClient(accessToken)

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        loaderVersion: ATTENDANCE_DATA_LOADER_VERSION,
        d: filters.departmentIds,
        l: filters.locationIds,
        le: filters.legalEntityIds,
        m: filters.managerIds,
        q: filters.employeeQuery,
        t: filters.absenceTypeIds,
        s: filters.statusIds,
        from: derivedDateRange?.dateFrom,
        to: derivedDateRange?.dateTo
      }),
    [filters, derivedDateRange]
  )

  useEffect(() => {
    const structureId = getCurrentActiveStructureId()
    if (!accessToken || !structureId || !derivedDateRange) {
      setState({ ...EMPTY })
      return
    }

    let cancelled = false
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const fetchAll = async () => {
      try {
        const employeesResponse = await graphqlClient.request<{ Employee: FilteredEmployee[] }>(
          GET_FILTERED_EMPLOYEE_IDS,
          { where: buildEmployeeWhereForHubFilters(structureId, filters) }
        )

        const employees = employeesResponse.Employee ?? []
        const employeeIds = employees.map(e => e.id)

        if (cancelled) {
          return
        }

        if (employeeIds.length === 0) {
          setState({ ...EMPTY, employees, isLoading: false })
          return
        }

        const idBatches = chunk(employeeIds, EMPLOYEE_ID_BATCH_SIZE)

        const attendanceBatches = await Promise.all(
          idBatches.map(batch =>
            graphqlClient.request<{ EmployeeAttendance: AttendanceRow[] }>(GET_TEAM_ATTENDANCE_FOR_RANGE, {
              employeeIds: batch,
              dateFrom: derivedDateRange.dateFrom,
              dateTo: derivedDateRange.dateTo
            })
          )
        )

        const absenceBatches = await Promise.all(
          includeOverlays
            ? idBatches.map(batch =>
                graphqlClient.request<{ EmployeeAbsenceCalendarView: AbsenceCalendarDay[] }>(GET_TEAM_CALENDAR_DAYS, {
                  employeeIds: batch,
                  from: derivedDateRange.dateFrom,
                  to: derivedDateRange.dateTo
                })
              )
            : []
        )

        const holidayData = includeOverlays
          ? await fetchTeamHolidayData(
              graphqlClient,
              employeeIds,
              derivedDateRange.dateFrom,
              derivedDateRange.dateTo,
              getActiveLocale()
            )
          : null

        if (cancelled) {
          return
        }

        const attendance = attendanceBatches.flatMap(batch => batch.EmployeeAttendance ?? [])
        const absences = absenceBatches.flatMap(batch => batch.EmployeeAbsenceCalendarView ?? [])
        const filteredAbsences = absences.filter(row => {
          const status = String(row?.status ?? '')
          const typeRef = String(row?.typeRef ?? '')
          const matchesStatus = filters.statusIds.length === 0 || filters.statusIds.includes(status)
          const matchesType = filters.absenceTypeIds.length === 0 || filters.absenceTypeIds.includes(typeRef)
          return matchesStatus && matchesType
        })
        const holidays = holidayData ? mapHolidayData(holidayData) : []
        const visibleEmployees = filterEmployeesWithPeriodActivity(employees, attendance, filteredAbsences, holidays)

        setState({
          employees: visibleEmployees,
          attendance,
          absences: filteredAbsences,
          holidays,
          isLoading: false,
          error: null
        })
      } catch (err) {
        if (cancelled) {
          return
        }
        const message = err instanceof Error ? err.message : 'Failed to load attendance data'
        setState({ ...EMPTY, error: message })
      }
    }

    fetchAll()

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient, filterKey, includeOverlays])

  return state
}
