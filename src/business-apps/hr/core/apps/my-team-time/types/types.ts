export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  orgUnit?: string
  workingHours?: WeeklyWorkingHours
}

export interface WeeklyWorkingHours {
  mondayHours: number
  tuesdayHours: number
  wednesdayHours: number
  thursdayHours: number
  fridayHours: number
  saturdayHours: number
  sundayHours: number
  weeklyHours?: number
  weeklyDays?: number
}

export interface TeamAttendanceEntry {
  id: string
  employeeId: string
  attendanceDate: string
  startTime?: string
  endTime?: string
  recordedTime?: string
  breakTime?: string
  effectiveTime?: string
  plannedTime?: string
  differenceTime?: string
  manualOverride?: boolean
  attendanceLocation?: 'UNKNOWN_LOCATION' | 'IS_NEAR_HOME' | 'IS_NEAR_OFFICE' | 'IS_OTHER_LOCATION'
}

export interface TeamAbsenceToday {
  employeeId: string
  typeRef: string
  status: string
  dayDate: string
  employeeAbsenceId: string
}

export interface PendingAbsenceRequest {
  id: string
  startDate: string
  endDate: string
  effectiveDays?: number
  status: string
  createdAt: string
  type: {
    id: string
    value: string
    parentEntryId: string
  }
  employee: {
    id: string
    firstName: string
    lastName: string
    pictureThumbnail?: string
  }
}

export interface OperationalStatus {
  workingNow: TeamMember[]
  notClockedIn: TeamMember[]
  onLeaveToday: TeamMember[]
  sickToday: TeamMember[]
  overtimeMinutesMTD: number
  anomalies: Anomaly[]
}

export interface Anomaly {
  employeeId: string
  employeeName: string
  type: 'missing_log' | 'late_clock_in' | 'no_clock_out'
  description: string
  date: string
}

export interface CapacityRow {
  employee: TeamMember
  contractTargetMinutes: number
  workedMinutes: number
  overtimeMinutes: number
  deficitMinutes: number
  ptoUsedDays: number
  sickDays: number
  netBalanceMinutes: number
  missingEntries: number
}

export type RiskLevel = 'low' | 'medium' | 'high'
export type BurnoutRisk = 'low' | 'medium' | 'high'

export interface SustainabilitySignal {
  employeeId: string
  employeeName: string
  riskLevel: BurnoutRisk
  signals: string[]
  avgDailyMinutes: number
  overtimeTrend: 'increasing' | 'stable' | 'decreasing'
  daysSinceLastPTO: number | null
}

export interface ComplianceAlert {
  employeeId: string
  employeeName: string
  type: 'overtime_cap' | 'missing_break' | 'unapproved_overtime' | 'missing_logs' | 'manual_edit_frequency'
  severity: 'warning' | 'critical'
  description: string
  recommendation: string
  date?: string
}
