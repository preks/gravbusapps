import { useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import {
  GET_TEAM_ABSENCE_NET_FOR_RANGE,
  GET_TEAM_ATTENDANCE_FOR_RANGE
} from '@/business-apps/hr/core/apps/my-team-time/queries/queries'
import { fetchTeamHolidayData, getActiveLocale } from '@/business-apps/hr/core/apps/my-team-time/utils/teamTimeDomain'
import {
  GET_FILTERED_EMPLOYEE_IDS,
  type AbsenceNetDay,
  type AbsenceCalendarDay,
  type AttendanceRow,
  type FilteredEmployee,
  type PublicHolidayDay
} from '../queries/OrgAttendanceQueries'
import { GET_TEAM_CALENDAR_DAYS } from '../queries/CalendarViewQueries'
import { HubGlobalFilters } from './useHubGlobalFilters'
import { LEGAL_ENTITY_NOT_DEFINED_FILTER_ID } from '../constants/routes'
import { clampDateRangeToPast } from '../components/views/attendance/attendanceUtils'

const EMPLOYEE_ID_BATCH_SIZE = 200
const ATTENDANCE_DATA_LOADER_VERSION = 4
const MISSING_ACCESS_TOKEN_ERROR = 'Access token missing'
const MISSING_ORG_STRUCTURE_ERROR = 'Active organization structure missing'
const INVALID_DATE_RANGE_ERROR = 'Invalid date range'

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

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
  const employeeQuery = filters.employeeQuery.trim()
  if (employeeQuery) {
    if (isUuid(employeeQuery)) {
      conditions.push({ id: { _eq: employeeQuery } })
    } else {
      const like = `%${employeeQuery}%`
      conditions.push({
        _or: [{ firstName: { _ilike: like } }, { lastName: { _ilike: like } }, { displayName: { _ilike: like } }]
      })
    }
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

const getEmployeeTimeRelevant = (employee: FilteredEmployee): boolean => {
  const objectValue = employee.workingCondition?.[0]?.contractType?.objectValue

  if (!objectValue || typeof objectValue !== 'object' || Array.isArray(objectValue)) {
    return true
  }

  return objectValue.time_relevant !== false
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
  absenceNet: AbsenceNetDay[]
  dateRange: { dateFrom: string; dateTo: string } | null
  isLoading: boolean
  error: string | null
}

const EMPTY: UseOrgAttendanceDataReturn = {
  employees: [],
  attendance: [],
  absences: [],
  holidays: [],
  absenceNet: [],
  dateRange: null,
  isLoading: false,
  error: null
}

const INITIAL_LOADING_STATE: UseOrgAttendanceDataReturn = {
  ...EMPTY,
  isLoading: true
}

export const useOrgAttendanceData = ({
  accessToken,
  filters,
  derivedDateRange,
  includeOverlays = true
}: UseOrgAttendanceDataParams): UseOrgAttendanceDataReturn => {
  const [state, setState] = useState<UseOrgAttendanceDataReturn>({ ...INITIAL_LOADING_STATE })
  const graphqlClient = useGraphQLClient(accessToken)
  const attendanceDateRange = useMemo(() => clampDateRangeToPast(derivedDateRange), [derivedDateRange])

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        loaderVersion: ATTENDANCE_DATA_LOADER_VERSION,
        d: filters.departmentIds,
        l: filters.locationIds,
        le: filters.legalEntityIds,
        m: filters.managerIds,
        q: filters.employeeQuery,
        from: attendanceDateRange?.dateFrom,
        to: attendanceDateRange?.dateTo
      }),
    [
      filters.departmentIds,
      filters.locationIds,
      filters.legalEntityIds,
      filters.managerIds,
      filters.employeeQuery,
      attendanceDateRange
    ]
  )

  useEffect(() => {
    const structureId = getCurrentActiveStructureId()
    if (!accessToken) {
      setState({ ...EMPTY, error: MISSING_ACCESS_TOKEN_ERROR })
      return
    }

    if (!structureId) {
      setState({ ...EMPTY, error: MISSING_ORG_STRUCTURE_ERROR })
      return
    }

    if (!attendanceDateRange) {
      setState({ ...EMPTY, error: INVALID_DATE_RANGE_ERROR })
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

        const employees = (employeesResponse.Employee ?? [])
          .map(employee => ({
            ...employee,
            timeRelevant: getEmployeeTimeRelevant(employee)
          }))
          .filter(employee => employee.timeRelevant)
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
              dateFrom: attendanceDateRange.dateFrom,
              dateTo: attendanceDateRange.dateTo
            })
          )
        )

        const absenceBatches = await Promise.all(
          includeOverlays
            ? idBatches.map(batch =>
                graphqlClient.request<{ EmployeeAbsenceCalendarView: AbsenceCalendarDay[] }>(GET_TEAM_CALENDAR_DAYS, {
                  employeeIds: batch,
                  from: attendanceDateRange.dateFrom,
                  to: attendanceDateRange.dateTo
                })
              )
            : []
        )

        const absenceNetBatches = await Promise.all(
          includeOverlays
            ? idBatches.map(batch =>
                graphqlClient.request<{ DailyAbsenceNetView: AbsenceNetDay[] }>(GET_TEAM_ABSENCE_NET_FOR_RANGE, {
                  employeeIds: batch,
                  from: attendanceDateRange.dateFrom,
                  to: attendanceDateRange.dateTo
                })
              )
            : []
        )

        const holidayData = includeOverlays
          ? await fetchTeamHolidayData(
              graphqlClient,
              employeeIds,
              attendanceDateRange.dateFrom,
              attendanceDateRange.dateTo,
              getActiveLocale()
            )
          : null

        if (cancelled) {
          return
        }

        const attendance = attendanceBatches.flatMap(batch => batch.EmployeeAttendance ?? [])
        const absences = absenceBatches.flatMap(batch => batch.EmployeeAbsenceCalendarView ?? [])
        const absenceNet = absenceNetBatches.flatMap(batch => batch.DailyAbsenceNetView ?? [])
        const holidays = holidayData ? mapHolidayData(holidayData) : []

        setState({
          employees,
          attendance,
          absences,
          holidays,
          absenceNet,
          dateRange: attendanceDateRange,
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
  }, [accessToken, graphqlClient, filterKey, includeOverlays, attendanceDateRange])

  return state
}
