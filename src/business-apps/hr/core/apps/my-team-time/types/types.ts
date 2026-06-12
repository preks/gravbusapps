export type ViewMode = 'day' | 'week' | 'month'

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  hireDate?: string
  pictureThumbnail?: string
  orgUnit?: string
  workingHours?: WeeklyWorkingHours | WeeklyWorkingHours[]
  timeRelevant: boolean
}

export interface WeeklyWorkingHours {
  activeFrom?: string | null
  activeTo?: string | null
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
  typeLabel?: string
  parentEntryId?: string
  startDate?: string
  endDate?: string
  employeeName?: string
  pictureThumbnail?: string
}

export interface AbsenceNetEntry {
  employeeId: string
  typeRef: string
  dayDate: string
  netSignedEps: number | null
  netConsumed: number | null
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

export interface PendingActionItem {
  id: string
  kind: 'absence' | 'time-correction'
  status: string
  createdAt: string
  attendanceDate?: string
  startDate?: string
  endDate?: string
  effectiveDays?: number
  typeLabel?: string
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
export type CoverageRisk = 'low' | 'medium' | 'high'
export type ImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

export interface CapabilityCoverage {
  capabilityId: string
  capabilityName: string
  totalMembers: number
  absentMembers: number
  coverage: number
  risk: CoverageRisk
  holders: string[]
  absentHolders: string[]
}

export interface MatrixImpactScenario {
  employeeId: string
  employeeName: string
  impactLevel: ImpactLevel
  newCoverage: number
  newRisk: CoverageRisk
  description: string
  affectedCapabilities: { capabilityId?: string; capabilityName: string; newCoverage: number; newRisk: CoverageRisk }[]
}

export interface MatrixTeamCoverage {
  id: string
  name: string
  totalMembers: number
  absentCount: number
  coverage: number
  risk: CoverageRisk
  members: string[]
  absentMembers: string[]
  capabilities: CapabilityCoverage[]
  impactScenarios: MatrixImpactScenario[]
}

export interface OrgUnitCoverage {
  id: string
  name: string
  totalMembers: number
  absentCount: number
  coverage: number
  risk: CoverageRisk
  members: string[]
  absentMembers: string[]
  impactedMatrixTeams: {
    matrixTeamId?: string
    matrixTeamName: string
    coverage: number
    risk: CoverageRisk
    orgUnitMembersInMatrix: string[]
    impactScenarios: { employeeName: string; impactLevel: ImpactLevel; newCoverage: number; description: string }[]
  }[]
}

export interface CoverageOverview {
  totalCapabilities: number
  atRiskCapabilities: number
  avgCoverage: number
  overallRisk: CoverageRisk
  orgUnits: OrgUnitCoverage[]
  matrixTeams: MatrixTeamCoverage[]
  highImpactCount: number
}

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
