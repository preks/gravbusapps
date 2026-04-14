import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { employmentRegionHolidaysQuery } from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
import { GET_TEAM_ABSENCE_DETAILS_FOR_RANGE, GET_TEAM_MEMBER_REGIONS } from '../queries/queries'

export const WORK_ABSENCE_GROUP = 'AbsenceGroup:v1:WORK'
export const HEALTH_ABSENCE_GROUP = 'AbsenceGroup:v1:HEALTH'
export const VACATION_ABSENCE_GROUP = 'AbsenceGroup:v1:RECR'

type GraphqlClient = {
  request<T>(query: string, variables?: Record<string, unknown>): Promise<T>
}

interface HolidayCatalogEntry {
  alternativeCode?: string
  code?: string
  additionalValue3?: string
  translations?: Array<{ value?: string }>
  value?: string
}

interface TeamMemberRegionRow {
  id: string
  workingCondition?: Array<{
    region?: {
      id?: string
    }
  }>
}

interface TeamAbsenceDetailsResult {
  EmployeeAbsence?: Array<{
    id: string
    employeeId: string
    startDate: string
    endDate: string
    status: string
    typeRef?: string
    effectiveDays?: number
    workingDays?: number
    calendarDays?: number
    type?: {
      value?: string
      parentEntryId?: string
      translations?: Array<{ value?: string }>
    }
    employee?: {
      firstName?: string
      lastName?: string
      pictureThumbnail?: string
    }
  }>
}

interface TeamMemberRegionsResult {
  Employee?: TeamMemberRegionRow[]
}

interface HolidaysResult {
  holidays?: HolidayCatalogEntry[]
}

export interface TeamDetailedAbsence {
  id: string
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  startDate: string
  endDate: string
  status: string
  typeRef: string
  typeLabel: string
  parentEntryId?: string
  effectiveDays: number
  workingDays: number
  calendarDays: number
}

export interface TeamHolidayData {
  datesByEmployeeId: Map<string, Set<string>>
  namesByEmployeeId: Map<string, Record<string, string>>
}

const toDateKey = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const toLocalDate = (value: string): Date => new Date(`${value}T00:00:00`)

const toRangeBoundaryTimestamp = (dateKey: string, boundary: 'start' | 'end'): string => {
  return boundary === 'start' ? `${dateKey}T00:00:00.000` : `${dateKey}T23:59:59.999`
}

const isDateWithinRange = (dateKey: string, from: string, to: string): boolean => dateKey >= from && dateKey <= to

export const getActiveLocale = (): string => getCurrentActiveUserLocale() || 'en-US'

export const expandDateRange = (startDate: string, endDate: string, from: string, to: string): string[] => {
  const dates: string[] = []
  const start = toLocalDate(startDate)
  const end = toLocalDate(endDate)

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const dateKey = toDateKey(cursor)
    if (isDateWithinRange(dateKey, from, to)) {
      dates.push(dateKey)
    }
  }

  return dates
}

export const isWorkAbsence = (absence?: Pick<TeamDetailedAbsence, 'parentEntryId' | 'typeRef'> | null): boolean => {
  if (!absence) return false

  if (absence.parentEntryId === WORK_ABSENCE_GROUP) {
    return true
  }

  const upperRef = (absence.typeRef || '').toUpperCase()
  return upperRef.includes('REMOTE') || upperRef.includes('BUSINESS_TRIP')
}

export const isSickAbsence = (absence?: Pick<TeamDetailedAbsence, 'parentEntryId' | 'typeRef'> | null): boolean => {
  if (!absence) return false

  if (absence.parentEntryId === HEALTH_ABSENCE_GROUP) {
    return true
  }

  const upperRef = (absence.typeRef || '').toUpperCase()
  return upperRef.includes('SICK') || upperRef.includes('ILLNESS')
}

export const isVacationAbsence = (absence?: Pick<TeamDetailedAbsence, 'parentEntryId' | 'typeRef'> | null): boolean => {
  if (!absence) return false

  if (absence.parentEntryId === VACATION_ABSENCE_GROUP) {
    return true
  }

  const upperRef = (absence.typeRef || '').toUpperCase()
  return upperRef.includes('VACATION') || upperRef.includes('HOLIDAY') || upperRef.includes('RECREATION')
}

export const getApprovedAbsencesForDate = (
  absences: TeamDetailedAbsence[],
  employeeId: string,
  dateKey: string
): TeamDetailedAbsence[] =>
  absences.filter(
    absence =>
      absence.employeeId === employeeId &&
      absence.status === 'APPROVED' &&
      isDateWithinRange(dateKey, absence.startDate, absence.endDate)
  )

export const fetchTeamDetailedAbsences = async (
  graphqlClient: GraphqlClient,
  employeeIds: string[],
  from: string,
  to: string,
  locale = getActiveLocale()
): Promise<TeamDetailedAbsence[]> => {
  if (employeeIds.length === 0) {
    return []
  }

  const result = await graphqlClient.request<TeamAbsenceDetailsResult>(GET_TEAM_ABSENCE_DETAILS_FOR_RANGE, {
    employeeIds,
    from: toRangeBoundaryTimestamp(from, 'start'),
    to: toRangeBoundaryTimestamp(to, 'end'),
    activeUserLocale: locale
  })

  return (result.EmployeeAbsence ?? []).map(absence => ({
    id: absence.id,
    employeeId: absence.employeeId,
    employeeName: `${absence.employee?.firstName ?? ''} ${absence.employee?.lastName ?? ''}`.trim(),
    pictureThumbnail: absence.employee?.pictureThumbnail,
    startDate: toDateKey(absence.startDate),
    endDate: toDateKey(absence.endDate),
    status: absence.status,
    typeRef: absence.typeRef ?? '',
    typeLabel: absence.type?.translations?.[0]?.value || absence.type?.value || absence.typeRef || '',
    parentEntryId: absence.type?.parentEntryId,
    effectiveDays: Number(absence.effectiveDays ?? 0),
    workingDays: Number(absence.workingDays ?? 0),
    calendarDays: Number(absence.calendarDays ?? 0)
  }))
}

export const fetchTeamHolidayData = async (
  graphqlClient: GraphqlClient,
  employeeIds: string[],
  from: string,
  to: string,
  locale = getActiveLocale()
): Promise<TeamHolidayData> => {
  const datesByEmployeeId = new Map<string, Set<string>>()
  const namesByEmployeeId = new Map<string, Record<string, string>>()

  if (employeeIds.length === 0) {
    return { datesByEmployeeId, namesByEmployeeId }
  }

  const teamResult = await graphqlClient.request<TeamMemberRegionsResult>(GET_TEAM_MEMBER_REGIONS, {
    employeeIds,
    activeUserLocale: locale
  })

  const employeeRows = teamResult.Employee ?? []
  const employeeIdsByRegion = new Map<string, string[]>()

  employeeRows.forEach(employee => {
    const regionId = employee.workingCondition?.[0]?.region?.id
    if (!regionId) {
      return
    }

    const ids = employeeIdsByRegion.get(regionId) ?? []
    ids.push(employee.id)
    employeeIdsByRegion.set(regionId, ids)
  })

  const regionEntries = Array.from(employeeIdsByRegion.entries())
  await Promise.all(
    regionEntries.map(async ([regionId, regionEmployeeIds]) => {
      const holidaysResult = await graphqlClient.request<HolidaysResult>(employmentRegionHolidaysQuery, {
        activeUserLocale: locale,
        regionId
      })

      const holidayDates = new Set<string>()
      const namesByDate: Record<string, string> = {}

      ;(holidaysResult.holidays ?? []).forEach(holiday => {
        const code = String(holiday.alternativeCode ?? holiday.code ?? '')
        const match = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
        if (!match) {
          return
        }

        const dateKey = `${match[1]}-${match[2]}-${match[3]}`
        if (!isDateWithinRange(dateKey, from, to)) {
          return
        }

        holidayDates.add(dateKey)
        namesByDate[dateKey] = holiday.translations?.[0]?.value || holiday.value || 'Holiday'
      })

      regionEmployeeIds.forEach(employeeId => {
        datesByEmployeeId.set(employeeId, new Set(holidayDates))
        namesByEmployeeId.set(employeeId, { ...namesByDate })
      })
    })
  )

  return { datesByEmployeeId, namesByEmployeeId }
}
