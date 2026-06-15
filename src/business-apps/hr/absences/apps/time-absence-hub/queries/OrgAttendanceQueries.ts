/**
 * Org-wide attendance queries for the Time & Absence Hub Attendance view.
 *
 * IMPORTANT (B1 verdict):
 * The codebase has no precedent for unfiltered EmployeeAttendance reads, and the
 * GraphQL client does not send `x-hasura-role`. We therefore fetch the matching
 * employee population first, then batch attendance reads in chunks of 200 IDs
 * using the same `GET_TEAM_ATTENDANCE_FOR_RANGE` shape used by my-team-time.
 *
 * Follow-up: replace batched ID query with backend-supported org-wide
 * read once HR admin Hasura role exists.
 */

export const GET_FILTERED_EMPLOYEE_IDS = `
  query GetFilteredEmployeeIds($where: EmployeeBoolExp!) {
    Employee(
      where: $where
      orderBy: [{ lastName: ASC }, { firstName: ASC }]
      limit: 5000
    ) {
      id
      firstName
      lastName
      pictureThumbnail
      additionalProperties
      workingCondition(where: { isDeleted: { _eq: false } }, orderBy: [{ activeFrom: DESC }, { createdAt: DESC }], limit: 1) {
        contractType {
          objectValue
        }
      }
      employeePosition {
        organizationalUnitId
        organizationalUnit {
          id
          name
        }
        company {
          id
          name
        }
        supervisor: supervisorEmployee {
          id
          firstName
          lastName
        }
        jobPosition {
          name
        }
        siteLocation {
          id
          name
        }
      }
      workingHours(where: { isDeleted: { _eq: false } }, orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]) {
        activeFrom
        activeTo
        mondayHours
        tuesdayHours
        wednesdayHours
        thursdayHours
        fridayHours
        saturdayHours
        sundayHours
        weeklyHours
        weeklyDays
      }
    }
  }
`

export interface FilteredEmployee {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string | null
  additionalProperties?: Record<string, unknown> | null
  timeRelevant?: boolean
  workingCondition?: Array<{
    contractType?: {
      objectValue?: Record<string, unknown> | null
    } | null
  }> | null
  employeePosition?: {
    organizationalUnitId?: string | null
    organizationalUnit?: { id: string; name: string } | null
    company?: { id: string; name: string } | null
    supervisor?: { id: string; firstName: string; lastName: string } | null
    jobPosition?: { name?: string | null } | null
    siteLocation?: { id: string; name: string } | null
  } | null
  workingHours?: Array<{
    activeFrom?: string | null
    activeTo?: string | null
    mondayHours?: number | null
    tuesdayHours?: number | null
    wednesdayHours?: number | null
    thursdayHours?: number | null
    fridayHours?: number | null
    saturdayHours?: number | null
    sundayHours?: number | null
    weeklyHours?: number | null
    weeklyDays?: number | null
  }> | null
}

export interface AttendanceRow {
  id: string
  employeeId: string
  attendanceDate: string
  startTime?: string | null
  endTime?: string | null
  recordedTime?: number | null
  breakTime?: number | null
  effectiveTime?: string | number | null
  plannedTime?: string | number | null
  differenceTime?: string | number | null
  manualOverride?: boolean | null
  attendanceLocation?: string | null
}

export interface AbsenceCalendarDay {
  employeeId: string
  dayDate: string
  typeRef: string
  status: string
  employeeAbsenceId?: string | null
}

export interface PublicHolidayDay {
  employeeId: string
  date: string
  name: string
}

export interface AbsenceNetDay {
  employeeId: string
  typeRef: string
  dayDate: string
  netSignedEps?: number | null
  netConsumed?: number | null
}
