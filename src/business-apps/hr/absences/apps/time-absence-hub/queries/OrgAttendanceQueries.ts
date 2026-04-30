/**
 * Org-wide attendance queries for the Time & Absence Hub Attendance view.
 *
 * IMPORTANT (B1 verdict):
 * The codebase has no precedent for unfiltered EmployeeAttendance reads, and the
 * GraphQL client does not send `x-hasura-role`. We therefore fetch the matching
 * employee population first, then batch attendance reads in chunks of 200 IDs
 * using the same `GET_TEAM_ATTENDANCE_FOR_RANGE` shape used by my-team-time.
 *
 * TODO(B1-followup): replace batched ID query with backend-supported org-wide
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
        siteLocation {
          id
          name
        }
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
  employeePosition?: {
    organizationalUnitId?: string | null
    organizationalUnit?: { id: string; name: string } | null
    company?: { id: string; name: string } | null
    supervisor?: { id: string; firstName: string; lastName: string } | null
    siteLocation?: { id: string; name: string } | null
  } | null
}

export interface AttendanceRow {
  id: string
  employeeId: string
  attendanceDate: string
  startTime?: string | null
  endTime?: string | null
  recordedTime?: number | null
  breakTime?: number | null
  effectiveTime?: number | null
  plannedTime?: number | null
  differenceTime?: number | null
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
