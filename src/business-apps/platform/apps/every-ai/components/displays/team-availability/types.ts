/**
 * Team availability display types (aligned with flowbot TeamAvailabilityData).
 */

export type AbsenceTypeInfo = {
  id: string
  value: string
}

export type TeamAbsenceEntry = {
  id: string
  employeeId: string
  employeeName?: string | null
  startDate: string
  endDate?: string | null
  type: AbsenceTypeInfo
}

export type AbsenceReasonSummary = {
  typeId: string
  typeValue: string
  count: number
}

export type BottleneckDay = {
  date: string
  absentCount: number
  totalTeamSize?: number | null
}

export type TeamAvailabilityData = {
  type: 'teamAvailability'
  title: string
  description: string
  dateFrom: string
  dateTo: string
  absences: TeamAbsenceEntry[]
  reasonSummary: AbsenceReasonSummary[]
  bottleneckDays?: BottleneckDay[] | null
}
